import { GoogleGenerativeAI } from "@google/generative-ai"

export async function generateGeminiChatResponse(payload: {
  prompt: string
  systemInstruction?: string
  modelName?: string
  history?: { role: "user" | "model"; parts: string }[]
}): Promise<{ text: string; success: boolean; modelUsed: string }> {
  const userApiKey = typeof window !== "undefined" ? localStorage.getItem("hiremind_gemini_api_key") || "" : ""
  const token = typeof window !== "undefined"
    ? localStorage.getItem("hiremind_recruiter_token") || localStorage.getItem("hiremind_token") || localStorage.getItem("hiremind_candidate_token") || "demo-token"
    : "demo-token"

  // 1. Primary: Server-side API endpoint with full model fallback
  try {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(userApiKey ? { "x-gemini-api-key": userApiKey } : {})
      },
      body: JSON.stringify({
        prompt: payload.prompt,
        systemInstruction: payload.systemInstruction || "You are HireMind AI, an autonomous HR recruitment intelligence and candidate interviewing agent.",
        modelName: payload.modelName,
        history: payload.history,
      })
    })

    if (res.ok) {
      const data = await res.json()
      if (data.text && !data.text.includes("Gemini API Key is not configured")) {
        return data
      }
    }
  } catch (err) {
    console.warn("Gemini API Server Call Error, falling back to direct client execution:", err)
  }

  // 2. Direct client-side fallback if NEXT_PUBLIC_GEMINI_API_KEY is available
  const rawClientKey = userApiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  const clientKey = rawClientKey.replace(/^["']|["']$/g, "").trim()

  if (clientKey && !clientKey.includes("YOUR_")) {
    try {
      const genAI = new GoogleGenerativeAI(clientKey)
      const models = [
        payload.modelName,
        "gemini-flash-lite-latest",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.5-flash"
      ].filter(Boolean) as string[]

      for (const m of models) {
        try {
          const model = genAI.getGenerativeModel({
            model: m,
            systemInstruction: payload.systemInstruction
          })

          if (Array.isArray(payload.history) && payload.history.length > 0) {
            const formattedHistory = payload.history.map((h: any) => ({
              role: h.role === "model" ? "model" : "user",
              parts: [{ text: typeof h.parts === "string" ? h.parts : String(h.parts) }]
            }))
            const chat = model.startChat({ history: formattedHistory })
            const result = await chat.sendMessage(payload.prompt)
            const text = result.response.text()
            if (text) return { text, success: true, modelUsed: m }
          } else {
            const result = await model.generateContent(payload.prompt)
            const text = result.response.text()
            if (text) return { text, success: true, modelUsed: m }
          }
        } catch {
          // try next model
        }
      }
    } catch (clientErr) {
      console.warn("Client Gemini direct generation error:", clientErr)
    }
  }

  return {
    text: "Gemini AI response synthesized locally. Configure GEMINI_API_KEY in server environment for live execution.",
    success: false,
    modelUsed: "fallback_local"
  }
}
