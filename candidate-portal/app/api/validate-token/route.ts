import { NextRequest, NextResponse } from "next/server"

function getApiUrl(): string {
  const url = process.env.ADMIN_API_URL || process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    const errorMsg = "Missing required environment variable: ADMIN_API_URL or NEXT_PUBLIC_API_URL"
    if (process.env.NODE_ENV === "development") {
      console.error(errorMsg)
    } else {
      throw new Error(errorMsg)
    }
  }
  return (url || "").replace(/\/$/, "")
}

const ADMIN_API = getApiUrl()

/**
 * POST /api/validate-token
 *
 * Validates a candidate portal access token by calling the backend.
 * The backend (whether in demo mode with DemoStore or production with Supabase)
 * is the single source of truth for token → session data.
 *
 * - Real tokens → looked up in backend's candidate_tokens table (DemoStore or Supabase)
 * - token="demo" → tries backend first (in case there's demo data), falls back to fixture
 */
// In-memory sliding window for Next.js API route
const ipBuckets = new Map<string, { hits: number; windowStart: number }>()

function checkIpRateLimit(ip: string, maxHits = 10, windowMs = 60000): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = ipBuckets.get(ip) || { hits: 0, windowStart: now }

  if (now - entry.windowStart >= windowMs) {
    entry.hits = 1
    entry.windowStart = now
  } else {
    entry.hits += 1
  }

  ipBuckets.set(ip, entry)

  if (entry.hits <= maxHits) {
    return { allowed: true, retryAfter: 0 }
  }

  const elapsedSeconds = Math.floor((now - entry.windowStart) / 1000)
  const retryAfter = Math.max(1, 60 - elapsedSeconds)
  return { allowed: false, retryAfter }
}

export async function POST(req: NextRequest) {
  try {
    // ── Enforce 10 req/min IP Rate Limit ───────────────────────────────────
    const xff = req.headers.get("x-forwarded-for")
    const clientIp = xff ? xff.split(",")[0].trim() : (req.headers.get("x-real-ip") || "127.0.0.1")

    const limitResult = checkIpRateLimit(clientIp, 10, 60000)

    if (!limitResult.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait before retrying." },
        {
          status: 429,
          headers: { "Retry-After": String(limitResult.retryAfter) },
        }
      )
    }

    const { token } = await req.json()

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }


    // ── Always try the backend first ─────────────────────────────────────────
    // This works in demo mode (DemoStore has candidate_tokens) and production (Supabase)
    if (token !== "demo") {
      const backendSession = await validateViaBackend(token)
      if (backendSession) {
        backendSession.token = token
        return NextResponse.json({ session: backendSession })
      }
      // If backend can't find it, it's invalid
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    // ── token === "demo": try backend, fall back to fixture only in dev/demo mode ──
    const backendSession = await validateViaBackend(token)
    if (backendSession) {
      backendSession.token = token
      return NextResponse.json({ session: backendSession })
    }

    const isDemoAllowed = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true" || process.env.NODE_ENV === "development"
    if (!isDemoAllowed) {
      return NextResponse.json({ error: "Invalid or unauthorized portal access token" }, { status: 401 })
    }

    // Fallback fixture — only when backend is unreachable AND demo mode is explicitly enabled
    return NextResponse.json({
      session: {
        token: "demo",
        candidateId: "demo-candidate-001",
        candidateName: "Priya Sharma",
        applicationId: "demo-app-001",
        roundType: "tech",
        jobTitle: "Senior Backend Engineer",
        jobDepartment: "Engineering",
        jobDescription: "Design and build distributed microservices.",
        stage: "tech_round",
        candidateSkills: ["Python", "Go", "Distributed Systems", "PostgreSQL", "Docker"],
        round: null,
        assignment: {
          id: "demo-assignment-001",
          title: "Design a Distributed URL Shortener Service",
          description: "Design a high-throughput URL shortener like bit.ly that handles 10k requests per second and redirects in sub-15ms.",
          requirements: "- Define data model & hash generation logic (Base62)\n- Detail scaling (caching with Redis, read replicas)\n- Handle edge cases (links expiring, custom aliases)",
          status: "pending"
        },
        blueprint_version: 1,
        round_blueprints: {
          tech: {
            enabled: true,
            time_limit_minutes: 30,
            passing_score: 70,
            evaluation_focus: ["System Architecture", "Concurrency"],
            topic_weights: [{ topic: "Docker", weight: 10 }, { topic: "Kubernetes", weight: 8 }, { topic: "PostgreSQL", weight: 7 }],
            custom_questions: [
              {
                id: "q-docker-01",
                text: "How do you optimize Docker multi-stage builds and layer caching for high-concurrency microservices?",
                difficulty: "medium",
                expected_duration_seconds: 120,
                mandatory: true,
                allow_followups: true,
                max_followups: 2,
                tags: ["docker", "containers"],
                order: 1
              },
              {
                id: "q-k8s-02",
                text: "Can you explain how Kubernetes ingress routing and pod autoscaling (HPA) handle sudden traffic spikes?",
                difficulty: "hard",
                expected_duration_seconds: 150,
                mandatory: true,
                allow_followups: true,
                max_followups: 2,
                tags: ["kubernetes", "scaling"],
                order: 2
              }
            ]
          },
          hr: {
            enabled: true,
            time_limit_minutes: 15,
            passing_score: 70,
            custom_questions: [
              {
                id: "q-hr-01",
                text: "What is your current notice period and official availability to start?",
                difficulty: "easy",
                expected_duration_seconds: 60,
                mandatory: true,
                allow_followups: false,
                max_followups: 0,
                tags: ["notice_period"],
                order: 1,
                extracted_field: "notice_period"
              }
            ]
          }
        },
        is_demo: true,
      },
    })
  } catch (err) {
    console.error("Token validation error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * Validate a token by calling the backend's token lookup endpoint.
 * Returns the session object if valid, or null if not found / backend unreachable.
 */
async function validateViaBackend(token: string): Promise<any | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const tokenRes = await fetch(`${ADMIN_API}/api/portal/validate/${token}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    if (!tokenRes.ok) return null
    const data = await tokenRes.json()
    return data.session || null
  } catch {
    // Backend unreachable or timed out
    return null
  }
}
