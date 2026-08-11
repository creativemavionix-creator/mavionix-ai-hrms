export async function generateGeminiChatResponse(payload: {
  prompt: string
  systemInstruction?: string
  modelName?: string
  history?: { role: "user" | "model"; parts: string }[]
}): Promise<{ text: string; success: boolean; modelUsed: string }> {
  try {
    const userApiKey = typeof window !== "undefined" ? localStorage.getItem("hiremind_gemini_api_key") || "" : ""

    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userApiKey ? { "x-gemini-api-key": userApiKey } : {})
      },
      body: JSON.stringify({
        prompt: payload.prompt,
        systemInstruction: payload.systemInstruction || "You are HireMind AI, an autonomous HR recruitment intelligence and candidate interviewing agent."
      })
    })

    if (res.ok) {
      const data = await res.json()
      return data
    }
  } catch (err) {
    console.error("Gemini API Client Call Error:", err)
  }

  return {
    text: "Gemini AI response synthesized locally. Configure GEMINI_API_KEY in server environment for live execution.",
    success: false,
    modelUsed: "fallback_local"
  }
}
