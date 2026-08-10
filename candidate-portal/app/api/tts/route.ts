import { NextRequest, NextResponse } from "next/server"
import { synthesize } from "@/lib/edge-tts"

/**
 * POST /api/tts
 * Converts text to speech using Microsoft Edge's free neural TTS voices.
 * No API key required — uses the same service as Edge's "Read Aloud".
 *
 * Body: { text: string, voice?: string }
 * Returns: audio/mpeg binary
 *
 * Available voices: en-US-AriaNeural, en-US-GuyNeural, en-US-JennyNeural,
 *   en-US-ChristopherNeural, en-GB-SoniaNeural, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, voice = "en-US-AriaNeural" } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    // Truncate very long text to avoid timeout
    const input = text.slice(0, 5000)

    const audioBuffer = await synthesize(input, voice)

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: "No audio generated" }, { status: 500 })
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-cache",
      },
    })
  } catch (err) {
    console.error("Edge TTS error:", err)
    return NextResponse.json(
      { error: "TTS generation failed", detail: String(err) },
      { status: 500 }
    )
  }
}
