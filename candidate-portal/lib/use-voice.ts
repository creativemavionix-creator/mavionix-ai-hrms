"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ── Types ────────────────────────────────────────────────────────────────────

interface UseVoiceOptions {
  onFinalTranscript: (text: string) => void
  lang?: string
  voice?: string // Edge TTS voice name, e.g. "en-US-AriaNeural", "en-US-GuyNeural"
}

interface UseVoiceReturn {
  isSupported: boolean
  isListening: boolean
  isSpeaking: boolean
  isLoadingAudio: boolean
  interimTranscript: string
  spokenCaption: string
  startListening: () => void
  stopListening: () => void
  speakText: (text: string) => void
  stopSpeaking: () => void
}

// ── Pick a browser voice for fallback ────────────────────────────────────────

function pickBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  const preferred = voices.filter(
    (v) =>
      v.lang.startsWith(lang.slice(0, 2)) &&
      (v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Samantha") || v.name.includes("Daniel"))
  )
  if (preferred.length > 0) return preferred[0]

  const langMatch = voices.filter((v) => v.lang.startsWith(lang.slice(0, 2)))
  if (langMatch.length > 0) return langMatch[0]

  return voices[0]
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVoice({
  onFinalTranscript,
  lang = "en-US",
  voice = "en-US-AriaNeural",
}: UseVoiceOptions): UseVoiceReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState("")
  const [spokenCaption, setSpokenCaption] = useState("")

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const browserVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // ── Check support on mount ─────────────────────────────────────────────

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
  }, [])

  // ── Load browser voices for fallback ───────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      browserVoiceRef.current = pickBestVoice(voices, lang)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [lang])

  // ── Start listening (STT via Web Speech API) ───────────────────────────

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    // Stop any ongoing audio playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsLoadingAudio(false)
    setSpokenCaption("")

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setInterimTranscript("")
    }

    recognition.onresult = (event: any) => {
      let interim = ""
      let final = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      if (final) {
        setInterimTranscript("")
        onFinalTranscript(final.trim())
      } else {
        setInterimTranscript(interim)
      }
    }

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error)
      }
      setIsListening(false)
      setInterimTranscript("")
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript("")
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [lang, onFinalTranscript])

  // ── Stop listening ─────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    setInterimTranscript("")
  }, [])

  // ── Speak text via Edge TTS (with browser fallback) ────────────────────

  const speakText = useCallback(
    async (text: string) => {
      setSpokenCaption(text)
      setIsLoadingAudio(true)

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice }),
        })

        if (!response.ok) {
          throw new Error(`TTS API returned ${response.status}`)
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        // Revoke previous URL if any
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
        }
        audioUrlRef.current = audioUrl

        // Play via Audio element
        const audio = new Audio(audioUrl)
        audioRef.current = audio

        audio.onplay = () => {
          setIsLoadingAudio(false)
          setIsSpeaking(true)
        }

        audio.onended = () => {
          setIsSpeaking(false)
          setSpokenCaption("")
          URL.revokeObjectURL(audioUrl)
          audioUrlRef.current = null
          audioRef.current = null
        }

        audio.onerror = () => {
          console.warn("Audio playback failed, falling back to browser TTS")
          setIsLoadingAudio(false)
          fallbackSpeak(text)
        }

        await audio.play()
      } catch (err) {
        console.warn("Edge TTS failed, falling back to browser speechSynthesis:", err)
        setIsLoadingAudio(false)
        fallbackSpeak(text)
      }
    },
    [voice]
  )

  // ── Browser TTS fallback ───────────────────────────────────────────────

  const fallbackSpeak = useCallback(
    (text: string) => {
      if (!window.speechSynthesis) {
        setIsSpeaking(false)
        setSpokenCaption("")
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 1.0
      utterance.pitch = 1.0

      if (browserVoiceRef.current) {
        utterance.voice = browserVoiceRef.current
      }

      setSpokenCaption(text)
      setIsSpeaking(true)

      utterance.onend = () => {
        setIsSpeaking(false)
        setSpokenCaption("")
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        setSpokenCaption("")
      }

      window.speechSynthesis.speak(utterance)
    },
    [lang]
  )

  // ── Stop speaking ─────────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    window.speechSynthesis?.cancel()

    setIsSpeaking(false)
    setIsLoadingAudio(false)
    setSpokenCaption("")
  }, [])

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      window.speechSynthesis?.cancel()
    }
  }, [])

  return {
    isSupported,
    isListening,
    isSpeaking,
    isLoadingAudio,
    interimTranscript,
    spokenCaption,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  }
}
