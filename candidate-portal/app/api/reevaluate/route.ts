import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/reevaluate
 *
 * Recalculates offline rule-evaluated interview rounds using the LLM API
 * once API connectivity is restored.
 */

const globalStore = globalThis as any
const demoRounds: Map<string, any> = globalStore.__demoRounds || new Map()

const geminiKey = process.env.GEMINI_API_KEY || ""
const deepseekKey = process.env.DEEPSEEK_API_KEY || ""

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!geminiKey) throw new Error("No Gemini key")
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }] }]
    })
  })
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  if (!text.trim()) throw new Error("Empty response")
  return text
}

async function callDeepSeek(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!deepseekKey) throw new Error("No DeepSeek key")
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 400,
    }),
  })
  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    return await callGemini(systemPrompt, userPrompt)
  } catch {
    return await callDeepSeek(systemPrompt, userPrompt)
  }
}

function extractJSON(raw: string): any {
  const cleaned = raw.replace(/```(?:json)?/g, "").replace(/```/g, "").trim()
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (match) { try { return JSON.parse(match[0]) } catch { /* fall through */ } }
  return {}
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { roundId, applicationId } = body

    const roundsToProcess: any[] = []

    for (const [, round] of demoRounds) {
      if (roundId && round.id !== roundId) continue
      if (applicationId && round.application_id !== applicationId) continue
      if (round.status === "completed" && round.needs_recalculation) {
        roundsToProcess.push(round)
      }
    }

    if (roundsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No offline rounds currently pending recalculation.",
        reevaluated_count: 0,
      })
    }

    const reevaluated: any[] = []

    for (const round of roundsToProcess) {
      const transcriptText = (round.transcript || [])
        .map((t: any) => `${t.role === "ai" ? "Interviewer" : "Candidate"}: ${t.message}`)
        .join("\n")

      const summaryPrompt = `You are a senior hiring manager writing a final evaluation report for a candidate who completed a ${round.round_type} round.

Full Transcript:
${transcriptText}

Compact Rule Metrics Collected Offline:
${JSON.stringify(round.compact_offline_data || {})}

Return ONLY valid JSON:
{
  "ai_score": integer 0-100,
  "ai_summary": "3-4 sentence comprehensive evaluation of candidate technical depth, communication, and readiness",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "concerns": ["concern if any"]
}`

      try {
        const raw = await callAI("You are an expert technical interviewer and evaluator. Return only valid JSON.", summaryPrompt)
        const parsed = extractJSON(raw)

        if (parsed.ai_summary && parsed.ai_summary.length > 15) {
          round.ai_score = parsed.ai_score ?? round.ai_score
          round.ai_summary = parsed.ai_summary
          round.strengths = parsed.strengths || round.strengths
          round.concerns = parsed.concerns || round.concerns
          round.needs_recalculation = false
          round.eval_mode = "llm_reevaluated"
          round.reevaluated_at = new Date().toISOString()
          reevaluated.push({
            id: round.id,
            ai_score: round.ai_score,
            ai_summary: round.ai_summary,
            strengths: round.strengths,
            concerns: round.concerns,
            eval_mode: round.eval_mode,
          })
        }
      } catch (err: any) {
        console.error(`Re-evaluation failed for round ${round.id}:`, err?.message || err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully re-evaluated ${reevaluated.length} offline round(s) with AI!`,
      reevaluated_count: reevaluated.length,
      rounds: reevaluated,
    })
  } catch (err: any) {
    console.error("Re-evaluation endpoint error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
