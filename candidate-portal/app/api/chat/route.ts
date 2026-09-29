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

interface LLMOptions {
  thinkingBudget?: number | null
  maxTokens?: number
}

async function callOnlineLLM(systemPrompt: string, userPrompt: string, options?: LLMOptions): Promise<string> {
  // Provider 1: Gemini (Ultra-fast, verified active models)
  if (geminiKey && !geminiKey.includes("YOUR_")) {
    const activeModels = [
      "gemini-flash-latest",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.8-flash",
      "gemma-4-26b-a4b-it",
      "gemma-4-31b-it",
    ]
    const thinkingBudget = options?.thinkingBudget !== undefined ? options.thinkingBudget : 100
    const maxTokens = options?.maxTokens || 1000

    for (const model of activeModels) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 9000)
        const genConfig: any = {
          temperature: 0.7,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        }
        if (thinkingBudget !== null && !model.startsWith("gemma")) {
          genConfig.thinkingConfig = {
            thinkingBudget
          }
        }
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nCandidate Input & Context:\n${userPrompt}` }] }],
            generationConfig: genConfig
          })
        })
        clearTimeout(timer)
        if (res.ok) {
          const data = await res.json()
          const parts = data.candidates?.[0]?.content?.parts || []
          const nonThought = parts.filter((p: any) => !p.thought && p.text).map((p: any) => p.text).join("").trim()
          const text = nonThought || parts.map((p: any) => p.text || "").join("").trim()
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
        const candidateName = body.candidateName || body.session?.candidateName || "Candidate"
        const jobTitle = body.jobTitle || body.session?.jobTitle || "Software Engineer"
        const candidateSkills = body.candidateSkills || body.session?.candidateSkills || []
        const skillsStr = Array.isArray(candidateSkills) && candidateSkills.length > 0 ? candidateSkills.slice(0, 8).join(", ") : "relevant engineering skills"

        const sysPrompt = MASTER_SYSTEM_PROMPTS[roundType] || MASTER_SYSTEM_PROMPTS.tech
        const userPrompt = `Start the ${roundType} interview for ${candidateName} applying for the role of ${jobTitle}.
Known candidate skills: ${skillsStr}.
Generate a warm, professional 1-sentence opening greeting addressing the candidate by name and ask your very first sharp, domain-specific interview question.
Return ONLY valid JSON: { "answer_score": 10, "type": "question", "message": "1-sentence greeting + opening question" }`

        try {
          const llmRaw = await callOnlineLLM(sysPrompt, userPrompt)
          const parsed = extractJSON(llmRaw)
          if (parsed && parsed.message && (parsed.message.includes("?") || parsed.message.length > 25)) {
            firstQ = parsed.message
          }
        } catch (e) {
          console.warn("Dynamic opening question generation failed, using profile fallback:", e)
        }

        if (!firstQ) {
          const profiles = await loadJobProfiles()
          const matchedProfile = matchJobProfile(body.jobTitle, profiles)
          firstQ = matchedProfile?.questions?.easy?.[0] || `Welcome to the ${roundType} round for ${jobTitle}. To begin: Can you describe your recent technical projects and architectural decisions?`
        }
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

      // Local / Demo strike handling
      const currentStrikes = Number(body.strikes || 0)
      const strikeType = body.strikeType || "browser" // 'browser' or 'camera'
      if (currentStrikes >= 5) {
        const termSummary = {
          ai_score: 35,
          ai_summary: `[DISQUALIFIED] Interview terminated automatically due to exceeding 5 ${strikeType === 'camera' ? 'camera presence' : 'browser tab focus'} strikes. Candidate did not maintain required integrity compliance.`,
          strengths: ["Participated in initial assessment"],
          concerns: [`Candidate exceeded limit with 5 ${strikeType === 'camera' ? 'camera' : 'tab switch'} strikes.`]
        }
        return NextResponse.json({
          type: "complete",
          round_complete: true,
          message: `Interview session terminated due to 5 ${strikeType === 'camera' ? 'camera' : 'tab'} strikes.`,
          summary: termSummary,
          disqualified: true,
          disqualification_reason: `5 ${strikeType === 'camera' ? 'camera presence' : 'tab navigation'} violations`
        })
      }

      return NextResponse.json({
        type: "strike_synced",
        strikes: currentStrikes,
        round_complete: false,
      })
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

      const substantiveCount = transcript.filter((t: any) => t.role === "candidate" && !isGibberish(t.message)).length
      const shouldComplete = substantiveCount >= MAX_EXCHANGES

      const isVoice = Boolean(
        body.is_voice ||
        body.speaking_metrics?.audio_duration ||
        body.speaking_metrics?.words_per_minute ||
        roundType === "speaking"
      )
      const perTurnThinkingBudget = isVoice ? 100 : 0
      const perTurnMaxTokens = isVoice ? 1000 : 800

      let nextQuestionText = ""
      let ack = "Thank you for detailing your approach. "
      if (isGibberish(message)) {
        ack = "I notice your response was quite brief. "
      }

      let aiMessage = ""
      let currentTurnScore = 8

      if (shouldComplete) {
        aiMessage = `Thank you for your thorough responses. This concludes the ${round.round_type?.toUpperCase() || "interview"} round.`
      } else if (customQuestions.length > 0 && flowState.current_index < customQuestions.length) {
        // Step A: Recruiter's mandatory blueprint questions first
        const nextQObj = customQuestions[flowState.current_index]
        nextQuestionText = nextQObj.text

        // Attempt LLM execution with strict prompt framing
        const sysPrompt = MASTER_SYSTEM_PROMPTS[roundType] || MASTER_SYSTEM_PROMPTS.tech
        const userPrompt = `Candidate answered: "${message}"\n\nYou MUST ask the recruiter's exact mandatory question next: "${nextQuestionText}".\nReturn JSON: { "answer_score": number 1-10, "message": "1-sentence domain acknowledgment of candidate's answer + '${nextQuestionText.replace(/"/g, "'")}'" }`

        try {
          const llmRaw = await callOnlineLLM(sysPrompt, userPrompt, {
            thinkingBudget: perTurnThinkingBudget,
            maxTokens: perTurnMaxTokens,
          })
          const parsed = extractJSON(llmRaw)
          if (parsed) {
            if (typeof parsed.answer_score === "number" && !isNaN(parsed.answer_score)) {
              currentTurnScore = Math.min(10, Math.max(1, Math.round(parsed.answer_score)))
            }
            if (parsed.message && parsed.message.includes("?")) {
              aiMessage = parsed.message
            } else {
              aiMessage = `${ack}${nextQuestionText}`
            }
          } else {
            aiMessage = `${ack}${nextQuestionText}`
          }
        } catch {
          aiMessage = `${ack}${nextQuestionText}`
        }
      } else {
        // Step B: Dynamic Adaptive AI Interview Turns (Exchanges 3 to 6)
        // Models generate sharp, progressive questions based on candidate's demonstrated responses
        const recentHistory = transcript.slice(-4).map((t: any) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.message}`).join("\n")

        const sysPrompt = MASTER_SYSTEM_PROMPTS[roundType] || MASTER_SYSTEM_PROMPTS.tech
        const userPrompt = `Interview History:\n${recentHistory}\n\nCandidate's Latest Answer: "${message}"\nRole: ${jobTitle}\nRound: ${roundType}\nExchange: ${substantiveCount} of ${MAX_EXCHANGES}\n\nEvaluate the candidate's response for depth, architectural trade-offs, and clarity. Formulate your next sharp, progressive technical follow-up question digging deeper into their answer or testing real-world edge cases.\nReturn ONLY valid JSON:\n{\n  "answer_score": integer 1-10,\n  "type": "question",\n  "message": "1-sentence intelligent acknowledgment of candidate's answer + your next progressive question"\n}`

        // Safety fallback question from profile only if LLM call fails
        const profiles = await loadJobProfiles()
        const matchedProfile = matchJobProfile(jobTitle, profiles)
        const qList = matchedProfile?.questions?.intermediate || []
        const fallbackQ = qList[substantiveCount % qList.length] || "Could you walk me through your system design trade-offs?"
        nextQuestionText = fallbackQ

        try {
          const llmRaw = await callOnlineLLM(sysPrompt, userPrompt, {
            thinkingBudget: perTurnThinkingBudget,
            maxTokens: perTurnMaxTokens,
          })
          const parsed = extractJSON(llmRaw)
          if (parsed) {
            if (typeof parsed.answer_score === "number" && !isNaN(parsed.answer_score)) {
              currentTurnScore = Math.min(10, Math.max(1, Math.round(parsed.answer_score)))
            }
            if (parsed.message && (parsed.message.includes("?") || parsed.message.length > 20)) {
              aiMessage = parsed.message
            } else {
              aiMessage = `${ack}${fallbackQ}`
            }
          } else {
            aiMessage = `${ack}${fallbackQ}`
          }
        } catch {
          aiMessage = `${ack}${fallbackQ}`
        }
      }

      if (isGibberish(message)) {
        currentTurnScore = Math.min(currentTurnScore, 3)
      }

      // Record per-question outcome
      flowState.outcomes.push({
        question_id: currentQuestion?.id || `q-${flowState.current_index}`,
        score: currentTurnScore,
        duration_seconds: body.speaking_metrics?.audio_duration || 120,
        answered_at: new Date().toISOString()
      })

      // Immediate HR Extraction
      let extractedHrData: any = null
      if (round.round_type === "hr" || roundType === "hr") {
        const msgLower = message.toLowerCase()
        if (/\b(notice|day|month|immediate)\b/.test(msgLower)) {
          extractedHrData = { notice_period: message.trim() }
        }
      }

      round.flow_state = flowState
      transcript.push({ role: "ai", message: aiMessage, timestamp: new Date().toISOString() })

      // Dynamic Hybrid Final Scorecard Generation
      let summaryResult: any = null
      if (shouldComplete) {
        // 1. Base Score = Mathematical average of all turn scores (0-100)
        const allScores = (flowState.outcomes || []).map((o: any) => o.score).filter((s: any) => typeof s === "number")
        const avgTurn = allScores.length > 0 ? (allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) : currentTurnScore
        const baseScore = Math.round(avgTurn * 10)

        // 2. Penalty Modifiers = Deductions for tab-leaving strikes (-5 pts/strike) and copy-paste flags
        const strikesCount = Number(body.strikes || 0)
        const strikePenalty = strikesCount * 5

        const candidateTexts = transcript.filter((t: any) => t.role === "candidate").map((t: any) => t.message || "")
        let copyPastePenalty = 0
        for (let i = 1; i < candidateTexts.length; i++) {
          if (candidateTexts[i].length > 40 && candidateTexts[i] === candidateTexts[i - 1]) {
            copyPastePenalty = 10
            break
          }
        }

        const finalAiScore = Math.min(100, Math.max(25, baseScore - strikePenalty - copyPastePenalty))

        // 3. AI Qualitative Synthesis with full reasoning enabled
        const transcriptText = transcript.map((t: any) => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.message}`).join("\n")
        const summarySysPrompt = `You are a Principal Engineering Hiring Committee lead compiling an executive candidate scorecard. Return ONLY valid JSON:
{
  "ai_score": ${finalAiScore},
  "ai_summary": "2-3 sentence executive assessment summarizing technical depth, problem-solving, and communication",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "concerns": ["specific concern or gap 1", "specific concern 2"]
}`
        const summaryUserPrompt = `Candidate: ${body.candidateName || "Candidate"}
Role: ${jobTitle} (${roundType} round)
Final Computed Score: ${finalAiScore}/100 (Penalties: -${strikePenalty + copyPastePenalty} pts)

Full Interview Transcript:
${transcriptText}

Synthesize your objective assessment based strictly on candidate's demonstrated responses. Return ONLY valid JSON.`

        try {
          const rawSummary = await callOnlineLLM(summarySysPrompt, summaryUserPrompt, { thinkingBudget: null, maxTokens: 1500 })
          const parsedSummary = extractJSON(rawSummary)
          if (parsedSummary && parsedSummary.ai_summary) {
            summaryResult = {
              ai_score: finalAiScore,
              ai_summary: parsedSummary.ai_summary,
              strengths: Array.isArray(parsedSummary.strengths) && parsedSummary.strengths.length > 0 ? parsedSummary.strengths : ["Technical domain knowledge", "Clear responses"],
              concerns: Array.isArray(parsedSummary.concerns) ? parsedSummary.concerns : []
            }
          }
        } catch (err) {
          console.warn("AI summary generation failed, using rule-based synthesis:", err)
        }

        if (!summaryResult) {
          const concerns: string[] = []
          if (strikePenalty > 0) concerns.push(`Candidate incurred ${strikesCount} proctoring/tab-switch warnings (-${strikePenalty} pts).`)
          if (copyPastePenalty > 0) concerns.push("Candidate responses showed repetitive patterns.")
          if (finalAiScore < 70) concerns.push("Candidate showed gaps in technical architecture depth.")

          summaryResult = {
            ai_score: finalAiScore,
            ai_summary: `Candidate completed the ${roundType?.toUpperCase() || "technical"} interview for ${jobTitle} with an overall evaluated performance of ${finalAiScore}/100 across ${allScores.length} evaluated exchanges.`,
            strengths: finalAiScore >= 75 ? ["Demonstrated solid role fundamentals", "Structured response articulation"] : ["Completed all interview stages"],
            concerns
          }
        }
      }

      return NextResponse.json({
        message: aiMessage,
        answer_score: currentTurnScore,
        round_complete: shouldComplete,
        extracted_hr_data: extractedHrData,
        summary: summaryResult,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
