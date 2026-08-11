import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const prompt = body.prompt || "Hello Gemini"
    const systemInstruction = body.systemInstruction || "You are HireMind AI assistant."
    const userApiKey = req.headers.get("x-gemini-api-key")

    // Priority: 1. User Header, 2. Server Environment Variable (GEMINI_API_KEY - hidden from browser)
    const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        text: "Gemini API Key is not configured. Please enter your API Key in Settings or set GEMINI_API_KEY in server environment.",
        success: false,
        modelUsed: "fallback_local"
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction
    })

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    return NextResponse.json({
      text: responseText,
      success: true,
      modelUsed: "gemini-2.0-flash"
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
