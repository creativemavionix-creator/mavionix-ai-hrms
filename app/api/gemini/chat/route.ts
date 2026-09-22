import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { requireRecruiter } from "@/lib/requireRecruiter"

export async function POST(req: Request) {
  const auth = await requireRecruiter(req)
  if (!auth.authorized) {
    return auth.response!
  }

  try {
    const body = await req.json()
    const prompt = body.prompt || "Hello Gemini"
    const systemInstruction = body.systemInstruction || "You are HireMind AI assistant."
    const requestedModel = body.modelName || "gemini-3.5-flash"
    const history = body.history || []
    const userApiKey = req.headers.get("x-gemini-api-key")

    // Priority: 1. User Header, 2. Server Environment Variable (GEMINI_API_KEY - hidden from browser)
    const apiKey = userApiKey || process.env.GEMINI_API_KEY

    if (!apiKey || apiKey.includes("YOUR_")) {
      return NextResponse.json({
        text: "Gemini API Key is not configured. Please enter your API Key in Settings or set GEMINI_API_KEY in server environment.",
        success: false,
        modelUsed: "fallback_local"
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelsToTry = [requestedModel]
    if (!modelsToTry.includes("gemini-3.5-flash")) modelsToTry.push("gemini-3.5-flash")
    if (!modelsToTry.includes("gemini-flash-latest")) modelsToTry.push("gemini-flash-latest")

    let responseText = ""
    let successfulModel = requestedModel
    let lastError: any = null

    for (const modelToUse of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelToUse,
          systemInstruction
        })

        if (Array.isArray(history) && history.length > 0) {
          const formattedHistory = history.map((h: any) => ({
            role: h.role === "model" ? "model" : "user",
            parts: [{ text: typeof h.parts === "string" ? h.parts : (Array.isArray(h.parts) ? h.parts[0]?.text || String(h.parts) : String(h.parts)) }]
          }))
          const chat = model.startChat({ history: formattedHistory })
          const result = await chat.sendMessage(prompt)
          responseText = result.response.text()
        } else {
          const result = await model.generateContent(prompt)
          responseText = result.response.text()
        }

        successfulModel = modelToUse
        break
      } catch (err: any) {
        lastError = err
        console.warn(`Gemini model ${modelToUse} failed:`, err?.message || err)
      }
    }

    if (!responseText && lastError) {
      throw lastError
    }

    return NextResponse.json({
      text: responseText,
      success: true,
      modelUsed: successfulModel
    })
  } catch (err: any) {
    console.error("Server Gemini API Route Error:", err)
    return NextResponse.json({
      text: `Gemini API Exception: ${err.message || "Failed to generate AI response"}`,
      success: false,
      modelUsed: "fallback_local"
    }, { status: 500 })
  }
}
