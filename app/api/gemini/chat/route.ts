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
    const modelName = body.modelName || "gemini-3.5-flash"
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
    const candidateModels = Array.from(new Set([
      modelName,
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemma-4-26b-a4b-it",
      "gemini-flash-lite-latest",
      "gemini-flash-latest"
    ]))

    let responseText = ""
    let resolvedModel = modelName
    let lastError: any = null

    for (const curModel of candidateModels) {
      try {
        const isGemma = curModel.startsWith("gemma")
        const modelConfig = isGemma
          ? { model: curModel }
          : { model: curModel, systemInstruction }

        const model = genAI.getGenerativeModel(modelConfig)

        // Prepend system instruction for Gemma models as they don't accept systemInstruction config
        const effectivePrompt = isGemma && systemInstruction
          ? `System Context: ${systemInstruction}\n\nRecruiter Query: ${prompt}`
          : prompt

        // Apply a per-model timeout to avoid hanging when Google servers experience queue delays
        const result = await Promise.race([
          (async () => {
            if (Array.isArray(history) && history.length > 0 && !isGemma) {
              const formattedHistory = history.map((h: any) => ({
                role: h.role === "model" ? "model" : "user",
                parts: [{ text: typeof h.parts === "string" ? h.parts : (Array.isArray(h.parts) ? h.parts[0]?.text || String(h.parts) : String(h.parts)) }]
              }))
              const chat = model.startChat({ history: formattedHistory })
              return await chat.sendMessage(effectivePrompt)
            } else {
              return await model.generateContent(effectivePrompt)
            }
          })(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Model ${curModel} timed out`)), isGemma ? 30000 : 15000)
          )
        ])

        const candidate = result.response.candidates?.[0]
        const nonThoughtParts = candidate?.content?.parts?.filter((p: any) => !p.thought && p.text)
        if (nonThoughtParts && nonThoughtParts.length > 0) {
          responseText = nonThoughtParts.map((p: any) => p.text).join("").trim()
        } else {
          responseText = result.response.text()?.trim() || ""
        }

        if (responseText) {
          resolvedModel = curModel
          break
        }
      } catch (err: any) {
        lastError = err
        console.warn(`Model ${curModel} failed (${err.status || err.message}), attempting fallback...`)
      }
    }

    if (!responseText && lastError) {
      throw lastError
    }

    return NextResponse.json({
      text: responseText,
      success: true,
      modelUsed: resolvedModel
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
