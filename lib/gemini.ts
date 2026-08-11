import { GoogleGenerativeAI } from "@google/generative-ai"

export function getGeminiApiKey(): string | null {
  if (typeof window !== "undefined") {
    const localKey = localStorage.getItem("hiremind_gemini_api_key")
    if (localKey && localKey.trim()) return localKey.trim()
  }
  return process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
}

export async function generateGeminiChatResponse(payload: {
  prompt: string
  systemInstruction?: string
  modelName?: string
  history?: { role: "user" | "model"; parts: string }[]
}): Promise<{ text: string; success: boolean; modelUsed: string }> {
  const apiKey = getGeminiApiKey()
  const modelName = payload.modelName || "gemini-2.0-flash"

  if (!apiKey) {
    return {
      text: "Gemini API Key is not configured yet. Please enter your Gemini API Key in Settings or set NEXT_PUBLIC_GEMINI_API_KEY.",
      success: false,
      modelUsed: "fallback_local"
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: payload.systemInstruction || "You are HireMind AI, an autonomous HR recruitment intelligence and candidate interviewing agent."
    })

    if (payload.history && payload.history.length > 0) {
      const chat = model.startChat({
        history: payload.history.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }]
        }))
      })
      const result = await chat.sendMessage(payload.prompt)
      return {
        text: result.response.text(),
        success: true,
        modelUsed: modelName
      }
    } else {
      const result = await model.generateContent(payload.prompt)
      return {
        text: result.response.text(),
        success: true,
        modelUsed: modelName
      }
    }
  } catch (err: any) {
    console.error("Gemini API Error:", err)
    return {
      text: `Gemini API Exception: ${err.message || "Failed to generate AI response"}. Falling back to default response.`,
      success: false,
      modelUsed: "fallback_local"
    }
  }
}
