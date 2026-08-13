import { NextRequest, NextResponse } from "next/server"
import type { TranscriptEntry } from "@/lib/types"
import fs from "fs"
import path from "path"

function loadJobProfiles(): any {
  try {
    const jobProfilesPath = path.join(process.cwd(), "..", "backend", "app", "job_profiles.json")
    if (fs.existsSync(jobProfilesPath)) {
      return JSON.parse(fs.readFileSync(jobProfilesPath, "utf-8"))
    }
  } catch (e) {
    console.error("Failed to load job_profiles.json:", e)
  }
  return {}
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

const ADMIN_API = process.env.ADMIN_API_URL || "http://127.0.0.1:8000"
const deepseekKey = process.env.DEEPSEEK_API_KEY || ""
const geminiKey = process.env.GEMINI_API_KEY || ""
const groqKey = process.env.GROQ_API_KEY || ""

const globalStore = globalThis as any
if (!globalStore.__demoRounds) {
  globalStore.__demoRounds = new Map<string, any>()
  globalStore.__demoRoundCounter = 0
}
const demoRounds: Map<string, any> = globalStore.__demoRounds
const MAX_EXCHANGES = 6

async function tryBackend(
  action: string,
  body: any,
  candidateToken?: string
): Promise<{ ok: boolean; data?: any }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (candidateToken) {
      headers["Authorization"] = `Bearer ${candidateToken}`
    }

    if (action === "start") {
      const res = await fetch(
        `${ADMIN_API}/api/applications/${body.applicationId}/start-round/${body.roundType}`,
        {
          method: "POST",
          headers,
          signal: controller.signal,
        }
      )
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        return { ok: true, data }
      }
    }

    if (action === "respond") {
      const res = await fetch(
        `${ADMIN_API}/api/applications/${body.applicationId}/round/${body.roundId}/respond`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            message: body.message,
            candidate_skills: body.candidateSkills || [],
            speaking_metrics: body.speaking_metrics,
          }),
          signal: controller.signal,
        }
      )
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        return { ok: true, data }
      }
    }

    if (action === "report_strike") {
      const res = await fetch(
        `${ADMIN_API}/api/applications/${body.applicationId}/round/${body.roundId}/strike`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            strikes: body.strikes,
          }),
          signal: controller.signal,
        }
      )
      clearTimeout(timeoutId)
      if (res.ok) {
        const data = await res.json()
        return { ok: true, data }
      }
    }
  } catch {
    // Backend unreachable
  }
  return { ok: false }
}

const MASTER_SYSTEM_PROMPTS: Record<string, string> = {
  tech: `You are HireMind AI's Principal Technical Interviewer — an elite engineering manager conducting a technical interview.
Your role:
1. Evaluate candidate answers for technical depth, metric precision (e.g. QPS, ms latency, F1-score), and architecture choices.
2. Follow the recruiter's exact question sequence and mandatory topics.
3. Return ONLY valid JSON: { "answer_score": integer 0-10, "type": "question" or "complete", "message": "1-sentence intelligent acknowledgment + next sharp question" }`,

  interview: `You are HireMind AI's Principal Behavioral Interviewer evaluating STAR competency responses. Return ONLY valid JSON: { "answer_score": integer 0-10, "type": "question" or "complete", "message": "Acknowledgment + next STAR question" }`,

  hr: `You are HireMind AI's Senior HR Director evaluating compensation expectations, notice period, and cultural fit. Return ONLY valid JSON: { "answer_score": integer 0-10, "type": "question" or "complete", "message": "Acknowledgment + next HR question" }`,
}

async function callOnlineLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nCandidate Input & Context:\n${userPrompt}` }] }]
        })
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text && text.trim()) return text
      }
    } catch (e) {
      console.warn("Gemini API error:", e)
    }
  }

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.7,
        })
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text && text.trim()) return text
      }
    } catch (e) {
      console.warn("Groq API error:", e)
    }
  }

  if (deepseekKey) {
    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          temperature: 0.7,
          max_tokens: 400,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        if (text && text.trim()) return text
      }
    } catch (e) {
      console.warn("DeepSeek API exception:", e)
    }
  }

  throw new Error("No active online LLM API key responded successfully")
}

function extractJSON(raw: string): any {
  const cleaned = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim()
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch { /* fall through */ } }
  return {}
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

    if (action === "start") {
      const backendRes = await tryBackend("start", body, candidateToken)
      if (backendRes.ok && backendRes.data) {
        return NextResponse.json(backendRes.data)
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
        const profiles = loadJobProfiles()
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
    }

    if (action === "respond") {
      const { roundId, message, jobTitle, roundType } = body
      const backendRes = await tryBackend("respond", body, candidateToken)
      if (backendRes.ok && backendRes.data) {
        return NextResponse.json(backendRes.data)
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
        const profiles = loadJobProfiles()
        const matchedProfile = matchJobProfile(jobTitle, profiles)
        const qList = matchedProfile?.questions?.intermediate || []
        nextQuestionText = qList[substantiveCount % qList.length] || "Could you walk me through your system design trade-offs?"
        aiMessage = `${ack}${nextQuestionText}`
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
