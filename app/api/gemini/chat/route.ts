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
    const requestedModel = body.modelName
    const history = body.history || []
    const userApiKey = req.headers.get("x-gemini-api-key")

    // Priority: 1. User Header, 2. Server Environment Variable (GEMINI_API_KEY / NEXT_PUBLIC_GEMINI_API_KEY)
    let rawApiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
    const apiKey = rawApiKey.replace(/^["']|["']$/g, "").trim()

    if (!apiKey || apiKey.includes("YOUR_")) {
      return NextResponse.json({
        text: "Gemini API Key is not configured. Please enter your API Key in Settings or set GEMINI_API_KEY in server environment.",
        success: false,
        modelUsed: "fallback_local"
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const priorityModels = [
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.5-flash",
      "gemini-2.5-flash"
    ]
    const modelsToTry: string[] = []
    if (requestedModel && !modelsToTry.includes(requestedModel)) {
      modelsToTry.push(requestedModel)
    }
    for (const m of priorityModels) {
      if (!modelsToTry.includes(m)) {
        modelsToTry.push(m)
      }
    }

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
