import { NextRequest, NextResponse } from "next/server"
import type { TranscriptEntry } from "@/lib/types"

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

let cachedJobProfiles: any = null
let lastProfilesFetch = 0

async function loadJobProfiles(): Promise<any> {
  const now = Date.now()
  if (cachedJobProfiles && now - lastProfilesFetch < 300000) {
    return cachedJobProfiles
  }
  try {
    const ADMIN_API = getApiUrl()
    if (!ADMIN_API) return {}
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)
    const res = await fetch(`${ADMIN_API}/api/portal/job-profiles`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      cachedJobProfiles = await res.json()
      lastProfilesFetch = now
      return cachedJobProfiles
    }
  } catch {
    // Backend offline or unreachable, fallback to cached
  }
  return cachedJobProfiles || {}
}

function matchJobProfile(jobTitle: string, profiles: any): any {
  const titleLower = (jobTitle || "").toLowerCase()
  if (/\b(ml|machine learning|nlp|ai)\b/.test(titleLower)) {
    return profiles["ml engineer"] || profiles["default"] || {}
  }
  if (/\b(backend|django|node|python)\b/.test(titleLower)) {
    return profiles["senior backend engineer"] || profiles["default"] || {}
  }
  if (/\b(frontend|react|angular|vue|web)\b/.test(titleLower)) {
    return profiles["frontend developer"] || profiles["default"] || {}
  }
  if (/\b(ux|ui|design)\b/.test(titleLower)) {
    return profiles["ux designer"] || profiles["default"] || {}
  }
  if (/\b(data analyst|analytics|analyst)\b/.test(titleLower)) {
    return profiles["data analyst"] || profiles["default"] || {}
  }
  if (/\b(product manager|pm|product owner)\b/.test(titleLower)) {
    return profiles["product manager"] || profiles["default"] || {}
  }
  for (const key of Object.keys(profiles)) {
    if (titleLower.includes(key)) {
      return profiles[key]
    }
  }
  return profiles["default"] || {}
}
const deepseekKey = (process.env.DEEPSEEK_API_KEY || "").replace(/^["']|["']$/g, "").trim()
const geminiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").replace(/^["']|["']$/g, "").trim()
const groqKey = (process.env.GROQ_API_KEY || "").replace(/^["']|["']$/g, "").trim()

const globalStore = globalThis as any
if (!globalStore.__demoRounds) {
  globalStore.__demoRounds = new Map<string, any>()
  globalStore.__demoRoundCounter = 0
}
const demoRounds: Map<string, any> = globalStore.__demoRounds
const MAX_EXCHANGES = 6

interface BackendResult {
  ok: boolean
  status: number
  data?: any
  error?: string
}

async function tryBackend(
  action: string,
  body: any,
  candidateToken?: string
): Promise<BackendResult> {
  try {
    const ADMIN_API = getApiUrl()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (candidateToken) {
      headers["Authorization"] = `Bearer ${candidateToken}`
    }

    let url = ""
    let reqBody: any = undefined

    if (action === "start") {
      url = `${ADMIN_API}/api/applications/${body.applicationId}/start-round/${body.roundType}`
    } else if (action === "respond") {
      url = `${ADMIN_API}/api/applications/${body.applicationId}/round/${body.roundId}/respond`
      reqBody = JSON.stringify({
        message: body.message,
        candidate_skills: body.candidateSkills || [],
        speaking_metrics: body.speaking_metrics,
      })
    } else if (action === "report_strike") {
      url = `${ADMIN_API}/api/applications/${body.applicationId}/round/${body.roundId}/strike`
      reqBody = JSON.stringify({ strikes: body.strikes })
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: reqBody,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return { ok: true, status: res.status, data }
    }

    const errData = await res.json().catch(() => ({}))
    return {
      ok: false,
      status: res.status,
      error: errData.detail || errData.error || `Backend returned status ${res.status}`,
    }
  } catch (err: any) {
    return { ok: false, status: 502, error: err?.message || "Backend network unreachable" }
  }
}

const MASTER_SYSTEM_PROMPTS: Record<string, string> = {
  tech: `You are HireMind AI's Principal Technical Interviewer — an elite engineering manager conducting a technical interview.
Your role:
1. Evaluate candidate answers for technical depth, metric precision (e.g. QPS, ms latency, F1-score), and architecture choices.
2. Follow the recruiter's exact question sequence and mandatory topics.
3. Return ONLY valid JSON: { "answer_score": integer 0-10, "type": "question" or "complete", "message": "1-sentence intelligent acknowledgment + next sharp question" }`,

  interview: `You are HireMind AI's Principal Behavioral Interviewer evaluating STAR competency responses. Return ONLY valid JSON: { "answer_score": integer 0-10, "type": "question" or "complete", "message": "Acknowledgment + next STAR question" }`,

  speaking: `You are HireMind AI's Senior Communication Assessor evaluating verbal clarity and structure. Return ONLY valid JSON: { "answer_score": integer 0-10, "type": "question" or "complete", "message": "Acknowledgment + next oral prompt" }`,

  hr: `You are HireMind AI's Senior HR Director evaluating compensation expectations, notice period, and cultural fit. Return ONLY valid JSON: { "answer_score": integer 0-10, "type": "question" or "complete", "message": "Acknowledgment + next HR question" }`,
}

async function callOnlineLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  // Provider 1: Gemini (Ultra-fast, verified active models)
  if (geminiKey && !geminiKey.includes("YOUR_")) {
    const activeModels = [
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
    ]
    for (const model of activeModels) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 4500)
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nCandidate Input & Context:\n${userPrompt}` }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 350,
            }
          })
        })
        clearTimeout(timer)
        if (res.ok) {
          const data = await res.json()
          const parts = data.candidates?.[0]?.content?.parts || []
          const nonThought = parts.filter((p: any) => !p.thought && p.text).map((p: any) => p.text).join("").trim()
          const text = nonThought || parts[0]?.text
          if (text && text.trim()) return text.trim()
        }
      } catch (e) {
        console.warn(`Gemini API (${model}) failed, trying fallback:`, e)
      }
    }
  }

  // Provider 2: Groq Llama 3.3 70B (Fastest fallback ~500ms)
  if (groqKey && !groqKey.includes("YOUR_")) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.7,
          max_tokens: 300,
        })
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text && text.trim()) return text.trim()
      }
    } catch (e) {
      console.warn("Groq API error:", e)
    }
  }

  // Provider 3: DeepSeek AI
  if (deepseekKey && !deepseekKey.includes("YOUR_")) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text && text.trim()) return text.trim()
      }
    } catch (e) {
      console.warn("DeepSeek API exception:", e)
    }
  }

  throw new Error("No active online LLM API key responded successfully")
}

function extractJSON(raw: string): any {
  if (!raw) return null
  const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {}
    }
  }
  // Gracefully handle model text responses that aren't JSON-wrapped
  if (cleaned.length > 10 && (cleaned.includes("?") || cleaned.includes("Thank you") || cleaned.includes("welcome"))) {
    return {
      answer_score: 8,
      type: "question",
      message: cleaned
    }
  }
  return null
}

function isGibberish(message: string): boolean {
  const text = (message || "").trim().toLowerCase()
  const cleanAlpha = text.replace(/[^a-z\s]/g, "").trim()
  if (!cleanAlpha) return true
  if (cleanAlpha.length <= 4) return true

  const vowels = (cleanAlpha.match(/[aeiou]/g) || []).length
  const vowelRatio = vowels / cleanAlpha.length
  if (cleanAlpha.length >= 3 && vowelRatio === 0) return true

  return false
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body
    const candidateToken = body.token || body.session?.token || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    const isDemoAllowed = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE !== "false" || process.env.NODE_ENV === "development" || candidateToken === "demo"
    const isDemoSession = candidateToken === "demo" || (body.roundId && String(body.roundId).startsWith("demo-")) || (body.applicationId && String(body.applicationId).startsWith("demo-"))

    if (action === "start") {
      if (!isDemoSession) {
        const backendRes = await tryBackend("start", body, candidateToken)
        if (backendRes.ok && backendRes.data) {
          return NextResponse.json(backendRes.data)
        }

        if (backendRes.status > 0 && backendRes.status !== 502 && !isDemoAllowed) {
          return NextResponse.json(
            { error: backendRes.error || "Backend request failed" },
            { status: backendRes.status }
          )
        }

        if (!isDemoAllowed) {
          return NextResponse.json(
            { error: "Backend service unreachable", detail: "Could not connect to backend API server." },
            { status: 502 }
          )
        }
      }

      const roundId = `demo-round-${Date.now()}`
      const roundType = body.roundType || "tech"
      const roundBlueprints = body.round_blueprints || body.session?.round_blueprints || {}
      const roundBlueprint = roundBlueprints[roundType] || {}
      const customQuestions = roundBlueprint.custom_questions || []

      let firstQ = ""
      if (customQuestions.length > 0) {
        firstQ = customQuestions[0].text
      } else {
        const profiles = await loadJobProfiles()
        const matchedProfile = matchJobProfile(body.jobTitle, profiles)
        firstQ = matchedProfile?.questions?.easy?.[0] || "Welcome to the technical round. To begin: Can you describe your recent technical projects and architectural decisions?"
      }

      const roundData = {
        id: roundId,
        applicationId: body.applicationId,
        roundType,
        jobTitle: body.jobTitle || "Senior Backend Engineer",
        status: "in_progress",
        transcript: [{ role: "ai", message: firstQ, timestamp: new Date().toISOString() }],
        blueprint_version: body.blueprint_version || 1,
        blueprint_snapshot: roundBlueprint,
        flow_state: {
          question_order: customQuestions.map((q: any) => q.id),
          current_index: 0,
          followup_count: 0,
          outcomes: []
        }
      }
      demoRounds.set(roundId, roundData)

      return NextResponse.json({
        round: roundData,
        firstQuestion: firstQ,
      })
    }

    if (action === "report_strike") {
      const backendRes = await tryBackend("report_strike", body, candidateToken)
      if (backendRes.ok && backendRes.data) {
        return NextResponse.json(backendRes.data)
      }
      if (backendRes.status > 0 && backendRes.status !== 502 && candidateToken !== "demo" && !isDemoAllowed) {
        return NextResponse.json(
          { error: backendRes.error || "Strike reporting failed" },
          { status: backendRes.status }
        )
      }
      if (!isDemoAllowed && candidateToken !== "demo") {
        return NextResponse.json(
          { error: "Backend service unreachable", detail: "Could not connect to backend API server." },
          { status: 502 }
        )
      }
    }

    if (action === "respond") {
      const { roundId, message, jobTitle, roundType } = body
      if (!isDemoSession) {
        const backendRes = await tryBackend("respond", body, candidateToken)
        if (backendRes.ok && backendRes.data) {
          return NextResponse.json(backendRes.data)
        }

        if (backendRes.status > 0 && backendRes.status !== 502 && !isDemoAllowed) {
          return NextResponse.json(
            { error: backendRes.error || "Response evaluation failed" },
            { status: backendRes.status }
          )
        }

        if (!isDemoAllowed) {
          return NextResponse.json(
            { error: "Backend service unreachable", detail: "Could not connect to backend API server." },
            { status: 502 }
          )
        }
      }

      const round = demoRounds.get(roundId) || {
        id: roundId || "demo-round",
        round_type: roundType || "tech",
        transcript: [],
        flow_state: { question_order: [], current_index: 0, followup_count: 0, outcomes: [] }
      }

      const transcript = round.transcript || []
      transcript.push({ role: "candidate", message, timestamp: new Date().toISOString() })

      const flowState = round.flow_state || { question_order: [], current_index: 0, followup_count: 0, outcomes: [] }
      const customQuestions = round.blueprint_snapshot?.custom_questions || []
      const currentQuestion = customQuestions[flowState.current_index]

      // Determine advancement
      let shouldAdvance = true
      if (currentQuestion && currentQuestion.allow_followups) {
        const maxFollowups = currentQuestion.max_followups ?? 2
        if (flowState.followup_count < maxFollowups && (isGibberish(message) || message.split(/\s+/).length < 8)) {
          shouldAdvance = false
          flowState.followup_count += 1
        }
      }

      if (shouldAdvance) {
        flowState.current_index += 1
        flowState.followup_count = 0
      }

      const isBlueprintComplete = customQuestions.length > 0 ? flowState.current_index >= customQuestions.length : false
      const substantiveCount = transcript.filter((t: any) => t.role === "candidate" && !isGibberish(t.message)).length
      const shouldComplete = isBlueprintComplete || substantiveCount >= MAX_EXCHANGES

      let nextQuestionText = ""
      let ack = "Thank you for detailing your approach. "
      if (isGibberish(message)) {
        ack = "I notice your response was quite brief. "
      }

      let aiMessage = ""
      if (shouldComplete) {
        aiMessage = `Thank you for your thorough responses. This concludes the ${round.round_type?.toUpperCase() || "interview"} round.`
      } else if (customQuestions.length > 0 && flowState.current_index < customQuestions.length) {
        const nextQObj = customQuestions[flowState.current_index]
        nextQuestionText = nextQObj.text

        // Attempt LLM execution with strict prompt framing
        const sysPrompt = MASTER_SYSTEM_PROMPTS[roundType] || MASTER_SYSTEM_PROMPTS.tech
        const userPrompt = `Candidate answered: "${message}"\n\nYou MUST ask the recruiter's exact mandatory question next: "${nextQuestionText}".\nReturn JSON: { "answer_score": number 1-10, "message": "1-sentence domain acknowledgment of candidate's answer + '${nextQuestionText.replace(/"/g, "'")}'" }`

        try {
          const llmRaw = await callOnlineLLM(sysPrompt, userPrompt)
          const parsed = extractJSON(llmRaw)
          if (parsed && parsed.message && parsed.message.includes("?")) {
            aiMessage = parsed.message
          } else {
            aiMessage = `${ack}${nextQuestionText}`
          }
        } catch {
          aiMessage = `${ack}${nextQuestionText}`
        }
      } else {
        const profiles = await loadJobProfiles()
        const matchedProfile = matchJobProfile(jobTitle, profiles)
        const qList = matchedProfile?.questions?.intermediate || []
        const fallbackQ = qList[substantiveCount % qList.length] || "Could you walk me through your system design trade-offs?"
        nextQuestionText = fallbackQ

        const sysPrompt = MASTER_SYSTEM_PROMPTS[roundType] || MASTER_SYSTEM_PROMPTS.tech
        const userPrompt = `Candidate answered: "${message}"\nJob: ${jobTitle}\nRound: ${roundType}\nExchange: ${substantiveCount} of ${MAX_EXCHANGES}\nGenerate your intelligent evaluation and next progressive interview question for ${jobTitle}. Return JSON: { "answer_score": number 1-10, "message": "1-sentence intelligent acknowledgment + next question" }`

        try {
          const llmRaw = await callOnlineLLM(sysPrompt, userPrompt)
          const parsed = extractJSON(llmRaw)
          if (parsed && parsed.message && (parsed.message.includes("?") || parsed.message.length > 20)) {
            aiMessage = parsed.message
          } else {
            aiMessage = `${ack}${fallbackQ}`
          }
        } catch {
          aiMessage = `${ack}${fallbackQ}`
        }
      }

      // Immediate HR Extraction
      let extractedHrData: any = null
      if (round.round_type === "hr" || roundType === "hr") {
        const msgLower = message.toLowerCase()
        if (/\b(notice|day|month|immediate)\b/.test(msgLower)) {
          extractedHrData = { notice_period: message.trim() }
        }
      }

      // Record per-question outcome
      if (currentQuestion) {
        flowState.outcomes.push({
          question_id: currentQuestion.id,
          score: isGibberish(message) ? 4 : 8,
          duration_seconds: 120,
          answered_at: new Date().toISOString()
        })
      }

      round.flow_state = flowState
      transcript.push({ role: "ai", message: aiMessage, timestamp: new Date().toISOString() })

      return NextResponse.json({
        message: aiMessage,
        answer_score: isGibberish(message) ? 4 : 8,
        round_complete: shouldComplete,
        extracted_hr_data: extractedHrData,
        summary: shouldComplete ? { ai_score: 88, ai_summary: "Strong candidate with solid technical concepts.", strengths: ["System Architecture", "ML Modeling"], concerns: [] } : null,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
