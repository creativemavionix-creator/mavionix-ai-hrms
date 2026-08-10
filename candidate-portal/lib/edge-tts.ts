/**
 * Minimal Edge TTS implementation using the ws package.
 * Includes the Sec-MS-GEC DRM token that Microsoft now requires.
 * No API key needed — uses the same service as Edge browser's "Read Aloud".
 */

import { createHash, randomUUID } from "crypto"
import WebSocket from "ws"

// ── DRM Token Generation (required since ~2024) ──────────────────────────────

const CHROMIUM_FULL_VERSION = "143.0.3650.75"
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"
const WINDOWS_FILE_TIME_EPOCH = 11644473600n

function generateSecMsGecToken(): string {
  const ticks =
    BigInt(Math.floor(Date.now() / 1000 + Number(WINDOWS_FILE_TIME_EPOCH))) *
    10000000n
  const roundedTicks = ticks - (ticks % 3000000000n)
  const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`
  return createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase()
}

// ── WebSocket URL ────────────────────────────────────────────────────────────

function getWsUrl(): string {
  const token = generateSecMsGecToken()
  return `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${token}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`
}

// ── SSML Builder ─────────────────────────────────────────────────────────────

function buildSSML(text: string, voice: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
<voice name='${voice}'>
<prosody pitch='+0Hz' rate='+0%' volume='+0%'>${escaped}</prosody>
</voice>
</speak>`
}

// ── Synthesize ───────────────────────────────────────────────────────────────

export async function synthesize(
  text: string,
  voice: string = "en-US-AriaNeural"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const requestId = randomUUID().replace(/-/g, "")

    const ws = new WebSocket(getWsUrl(), {
      host: "speech.platform.bing.com",
      origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0 Safari/537.36 Edg/${CHROMIUM_FULL_VERSION.split(".")[0]}.0.0.0`,
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    const audioChunks: Buffer[] = []
    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        ws.close()
        reject(new Error("Edge TTS timeout (20s)"))
      }
    }, 20000)

    ws.on("open", () => {
      // Send speech config
      const speechConfig = JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: {
                sentenceBoundaryEnabled: "false",
                wordBoundaryEnabled: "false",
              },
              outputFormat: "audio-24khz-48kbitrate-mono-mp3",
            },
          },
        },
      })

      ws.send(
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${speechConfig}`
      )

      // Send SSML synthesis request
      const ssml = buildSSML(text, voice)
      ws.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n${ssml}`
      )
    })

    ws.on("message", (data: Buffer | string, isBinary: boolean) => {
      if (!isBinary) {
        const msg = typeof data === "string" ? data : data.toString("utf8")
        if (msg.includes("turn.end")) {
          settled = true
          clearTimeout(timeout)
          ws.close()
          resolve(Buffer.concat(audioChunks))
        }
        return
      }

      // Binary frame — extract audio after the header
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any)
      const separator = "Path:audio\r\n"
      const sepIndex = buf.indexOf(separator)
      if (sepIndex !== -1) {
        audioChunks.push(buf.subarray(sepIndex + separator.length))
      }
    })

    ws.on("error", (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(err)
      }
    })

    ws.on("close", () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks))
        } else {
          reject(new Error("WebSocket closed without producing audio"))
        }
      }
    })
  })
}
