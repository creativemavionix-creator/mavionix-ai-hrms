"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
  Brain, Send, Loader2, AlertTriangle, CheckCircle, CheckCircle2, Clock,
  Shield, ChevronRight, User, Bot, Mic, MicOff, Volume2, VolumeX, Video,
} from "lucide-react"
import type { CandidateSession, ChatMessage, AIResponse, RoundType, TranscriptEntry, Assignment } from "@/lib/types"
import { useVoice } from "@/lib/use-voice"
import { useIntegrityEngine } from "@/lib/integrity/hooks/useIntegrityEngine"
import CameraPreview from "@/lib/integrity/ui/CameraPreview"
import ReadinessReportCard from "@/lib/integrity/ui/ReadinessReportCard"
import InterviewHealthPanel from "@/lib/integrity/ui/InterviewHealthPanel"

// ── Pipeline Stepper ─────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: "applied", label: "APPLIED" },
  { key: "screened", label: "SCREENED" },
  { key: "shortlisted", label: "SHORTLISTED" },
  { key: "assignment", label: "ASSIGNMENT" },
  { key: "tech", label: "TECH ROUND" },
  { key: "interview", label: "INTERVIEW" },
  { key: "speaking", label: "SPEAKING ROUND" },
  { key: "hr", label: "HR ROUND" },
  { key: "offered", label: "OFFERED" },
]

function PipelineStepper({ currentRound, completedRounds }: { currentRound: RoundType; completedRounds: string[] }) {
  // Map current round type to the step that should be "active"
  const activeKey = currentRound === "tech" ? "tech" : currentRound === "interview" ? "interview" : currentRound === "speaking" ? "speaking" : "hr"

  // Pre-interview stages are always completed if we're in any round
  const preInterviewStages = ["applied", "screened", "shortlisted", "assignment"]

  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STEPS.map((step, i) => {
        const isPreInterview = preInterviewStages.includes(step.key)
        const isCompleted = isPreInterview || completedRounds.includes(step.key)
        const isActive = step.key === activeKey
        const isPending = !isCompleted && !isActive

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-5 h-5 flex items-center justify-center border text-[7px] font-bold rounded-full
                  ${isCompleted
                    ? "bg-signal border-signal text-white"
                    : isActive
                    ? "bg-signal/20 border-signal text-signal"
                    : "bg-transparent border-white/10 text-neutral-500"
                  }`}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <span
                className={`eyebrow text-[7px] whitespace-nowrap
                  ${isActive ? "text-signal font-extrabold" : "text-neutral-500"}`}
              >
                {step.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className={`w-4 h-[1px] mx-0.5 mt-[-12px]
                  ${isCompleted ? "bg-signal" : "bg-white/10"}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Chat Message Bubble ──────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isCandidate = msg.role === "candidate"

  return (
    <div className={`flex gap-3 ${isCandidate ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-10 h-10 flex items-center justify-center shrink-0 border overflow-hidden rounded-xl shadow-md
          ${isCandidate
            ? "bg-signal/10 border-signal/30"
            : "bg-black border-signal/30"
          }`}
      >
        {isCandidate ? (
          <User className="w-4 h-4 text-signal" />
        ) : (
          <img
            src="/ai_interviewer_bot_avatar.jpg"
            alt="AI Interviewer"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Message */}
      <div
        className={`max-w-[75%] p-3.5 text-xs leading-relaxed border rounded-xl shadow-sm
          ${isCandidate
            ? "bg-signal/10 border-signal/20 text-neutral-100"
            : "bg-white/[0.02] border-white/[0.06] text-neutral-200"
          }`}
      >
        <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
        <span className="eyebrow text-[8px] text-neutral-500 mt-1.5 block">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  )
}

// ── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-10 h-10 flex items-center justify-center bg-black border border-signal/30 overflow-hidden shrink-0 rounded-xl shadow-md">
        <img
          src="/ai_interviewer_bot_avatar.jpg"
          alt="AI Interviewer"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="bg-white/[0.02] border border-white/[0.06] p-3 flex gap-1 items-center rounded-xl">
        <span className="typing-dot w-1.5 h-1.5 bg-signal rounded-full animate-bounce" />
        <span className="typing-dot w-1.5 h-1.5 bg-signal rounded-full animate-bounce [animation-delay:0.2s]" />
        <span className="typing-dot w-1.5 h-1.5 bg-signal rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  )
}

function RoundCompleteCard({ summary }: { summary: AIResponse["summary"] | null }) {
  if (!summary) return null

  const scoreColor = summary.ai_score >= 80 ? "text-green-400" : summary.ai_score >= 65 ? "text-signal" : "text-red-400"
  const barColor   = summary.ai_score >= 80 ? "bg-green-500"   : summary.ai_score >= 65 ? "bg-signal"   : "bg-red-500"
  const label      = summary.ai_score >= 80 ? "STRONG" : summary.ai_score >= 65 ? "GOOD" : "NEEDS IMPROVEMENT"

  return (
    <div className="bg-[var(--hm-bg-card)] border border-[var(--hm-border)] p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <h3 className="text-2xl font-bold  text-[var(--hm-text-primary)] tracking-wider uppercase">
          ROUND COMPLETED
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Score */}
        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg text-[var(--hm-text-muted)]  uppercase tracking-wider">
              AI EVALUATION SCORE
            </span>
            <span className={`text-base  font-bold tracking-widest ${scoreColor}`}>{label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-4xl font-bold  ${scoreColor}`}>
              {summary.ai_score}/100
            </span>
            <div className="flex-1 h-2 bg-[var(--hm-bg-primary)] border border-[var(--hm-border-subtle)]">
              <div
                className={`h-full transition-all duration-1000 ${barColor}`}
                style={{ width: `${summary.ai_score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Assessment */}
        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-3">
          <span className="text-lg text-[var(--hm-text-muted)]  uppercase tracking-wider block mb-2">
            ASSESSMENT
          </span>
          <p className="text-lg text-[var(--hm-text-secondary)]  leading-relaxed">
            {summary.ai_summary || "Assessment not available."}
          </p>
        </div>

        {/* Strengths & Concerns side by side */}
        {((summary.strengths && summary.strengths.length > 0) || (summary.concerns && summary.concerns.length > 0)) && (
          <div className="grid grid-cols-2 gap-3">
            {summary.strengths && summary.strengths.length > 0 && (
              <div className="bg-[var(--hm-bg-inset)] border border-green-900/40 p-3">
                <span className="text-base text-green-500  uppercase tracking-wider block mb-2">
                  ✓ STRENGTHS
                </span>
                <ul className="space-y-1">
                  {summary.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-lg text-[var(--hm-text-secondary)]  leading-relaxed flex gap-1.5">
                      <span className="text-green-500 shrink-0">›</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.concerns && summary.concerns.length > 0 && (
              <div className="bg-[var(--hm-bg-inset)] border border-red-900/40 p-3">
                <span className="text-base text-red-400  uppercase tracking-wider block mb-2">
                  ⚠ AREAS TO IMPROVE
                </span>
                <ul className="space-y-1">
                  {summary.concerns.map((c: string, i: number) => (
                    <li key={i} className="text-lg text-[var(--hm-text-secondary)]  leading-relaxed flex gap-1.5">
                      <span className="text-red-400 shrink-0">›</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-base text-[var(--hm-text-muted)]  text-center pt-2 border-t border-[var(--hm-border-subtle)]">
        Your results have been submitted to the recruitment team. You will be contacted with next steps.
      </p>
    </div>
  )
}

// ── Main Interview Page ──────────────────────────────────────────────────────

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--hm-accent)] mx-auto" />
            <p className="text-base  text-[var(--hm-text-muted)] tracking-wider uppercase">
              LOADING INTERVIEW SESSION...
            </p>
          </div>
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  )
}

function InterviewContent() {
const searchParams = useSearchParams()
  const token = searchParams.get("token")
  // Demo mode: skip token validation entirely
  const demoMode = !token || token === "demo"

  const [state, setState] = useState<"loading" | "error" | "assignment" | "ready" | "complete" | "dashboard" | "rules" | "device_check" | "permission_prompt">("loading")
  const [rulesAgreed, setRulesAgreed] = useState(false)
  const [error, setError] = useState<string>("")
  const [session, setSession] = useState<CandidateSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [completeSummary, setCompleteSummary] = useState<AIResponse["summary"] | null>(null)
  const [roundId, setRoundId] = useState<string | null>(null)
  const [exchangeCount, setExchangeCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [completedRounds, setCompletedRounds] = useState<string[]>([])
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [assignmentText, setAssignmentText] = useState("")
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false)
  const [showEmptyWarningModal, setShowEmptyWarningModal] = useState(false)
  const [browserStrikes, setBrowserStrikes] = useState(0)
  const [showStrikeModal, setShowStrikeModal] = useState(false)
  const [microphoneFallback, setMicrophoneFallback] = useState(false)
  const [speakingCountdown, setSpeakingCountdown] = useState(60)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speakingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pendingVoiceSendRef = useRef<string | null>(null)

  // ── Interview Integrity Engine Master Hook ─────────────────────────────
  const cameraPresence = useIntegrityEngine(true, state === "ready")

  // Auto-start camera after explicit permission consent
  useEffect(() => {
    if (state === "device_check" || state === "ready") {
      cameraPresence.startCamera()
    } else if (state === "complete") {
      cameraPresence.stopCamera()
    }
  }, [state])

  // ── Voice hook ───────────────────────────────────────────────────────────

  const handleVoiceTranscript = useCallback((text: string) => {
    if (session?.roundType === "speaking") {
      setInput((prev) => {
        const space = prev ? " " : ""
        return prev + space + text
      })
    } else {
      // Store text — we'll send it via the same mechanism as typed messages
      pendingVoiceSendRef.current = text
    }
  }, [session?.roundType])

  const voice = useVoice({
    onFinalTranscript: handleVoiceTranscript,
  })

  // Process voice transcript once we have a roundId and are ready
  useEffect(() => {
    if (pendingVoiceSendRef.current && roundId && state === "ready" && !isAiTyping && session) {
      const text = pendingVoiceSendRef.current
      pendingVoiceSendRef.current = null

      // Inject into the send flow
      const candidateMsg: ChatMessage = {
        id: `msg-${messages.length}`,
        role: "candidate",
        content: text,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, candidateMsg])
      setIsAiTyping(true)
      setExchangeCount((c) => c + 1)

      // Call chat API
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          applicationId: session.applicationId,
          roundId,
          roundType: session.roundType,
          message: text,
          candidateName: session.candidateName,
          jobTitle: session.jobTitle,
        }),
      })
        .then((res) => res.json())
        .then((data: AIResponse) => {
          const aiMsg: ChatMessage = {
            id: `msg-${messages.length + 1}`,
            role: "ai",
            content: data.message,
            timestamp: new Date().toISOString(),
            answerScore: data.answer_score,
          }
          setMessages((prev) => [...prev, aiMsg])

          // Auto-speak AI response if voice is enabled
          if (voiceEnabled && voice.isSupported) {
            voice.speakText(data.message)
          }

          if (data.round_complete && data.summary) {
            setCompleteSummary(data.summary)
            setState("complete")
            if (timerRef.current) clearInterval(timerRef.current)
          }
        })
        .catch(() => {
          const aiErrorMsg: ChatMessage = {
            id: `msg-${messages.length + 1}`,
            role: "ai",
            content: "Connection lost. Please refresh to continue.",
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, aiErrorMsg])
        })
        .finally(() => {
          setIsAiTyping(false)
        })
    }
  }, [pendingVoiceSendRef.current, roundId, state, isAiTyping, session]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isAiTyping])

  // Elapsed timer
  useEffect(() => {
    if (state === "ready") {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state])

  // Speaking round countdown timer
  useEffect(() => {
    if (!session || session.roundType !== "speaking" || state !== "ready" || isAiTyping) {
      if (speakingTimerRef.current) {
        clearInterval(speakingTimerRef.current)
        speakingTimerRef.current = null
      }
      return
    }

    setSpeakingCountdown(60)

    if (speakingTimerRef.current) {
      clearInterval(speakingTimerRef.current)
    }

    speakingTimerRef.current = setInterval(() => {
      setSpeakingCountdown((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (speakingTimerRef.current) clearInterval(speakingTimerRef.current)
    }
  }, [messages.length, session?.roundType, state, isAiTyping])


  // Track browser window blur / tab changes (strikes)
  useEffect(() => {
    if (state !== "ready" || !roundId || !session) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        const nextStrikes = browserStrikes + 1
        setBrowserStrikes(nextStrikes)

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "report_strike",
              applicationId: session.applicationId,
              roundId,
              roundType: session.roundType,
              strikes: nextStrikes,
              jobTitle: session.jobTitle,
            }),
          })
          const data = await res.json()

          if (nextStrikes >= 3 || data.round_complete || data.type === "complete") {
            if (data.summary) {
              setCompleteSummary(data.summary)
            }
            setState("complete")
            if (timerRef.current) clearInterval(timerRef.current)
          } else {
            setShowStrikeModal(true)
          }
        } catch (err) {
          console.error("Failed to report strike:", err)
          if (nextStrikes >= 3) {
            setState("complete")
            if (timerRef.current) clearInterval(timerRef.current)
          } else {
            setShowStrikeModal(true)
          }
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [state, roundId, session, browserStrikes])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  // ── Validate token on mount ──────────────────────────────────────────────

  useEffect(() => {
    // Both demo and real tokens go through the same validate → start flow
    const tokenToValidate = demoMode ? "demo" : token
    if (!tokenToValidate) {
      setError("No access token provided. Please use the link sent by your recruiter.")
      setState("error")
      return
    }
    validateToken(tokenToValidate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const validateToken = async (t: string) => {
    try {
      const res = await fetch("/api/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Token validation failed")
        setState("error")
        return
      }

      const { session: sess } = await res.json()
      setSession(sess)

      // 1. If there is an active pending assignment, ALWAYS open assignment screen first!
      if (sess.assignment && sess.assignment.status !== "submitted") {
        setState("assignment")
      } else if (sess.round && sess.round.status === "in_progress") {
        // 2. Resuming an existing in-progress round
        setRoundId(sess.round.id)
        setBrowserStrikes(sess.round.browser_strike_count || 0)
        const existingMessages: ChatMessage[] = (sess.round.transcript || []).map(
          (t: TranscriptEntry, i: number) => ({
            id: `msg-${i}`,
            role: t.role,
            content: t.message,
            timestamp: t.timestamp,
            answerScore: t.answer_score,
          })
        )
        setMessages(existingMessages)
        setExchangeCount(existingMessages.filter((m) => m.role === "candidate").length)
        setState("ready")
      } else if (sess.round && sess.round.status === "completed") {
        // 3. Round already done
        setCompleteSummary({
          ai_score: sess.round.ai_score || 0,
          ai_summary: sess.round.ai_summary || "Round completed.",
          strengths: sess.round.strengths || [],
          concerns: sess.round.concerns || [],
        })
        setState("complete")
      } else {
        // 4. Default to dashboard
        setState("dashboard")
      }
    } catch (err) {
      setError("Failed to connect to the server. Please try again.")
      setState("error")
    }
  }

  // ── Start a new round ────────────────────────────────────────────────────

  const startRound = async (sess: CandidateSession) => {
    setIsAiTyping(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          applicationId: sess.applicationId,
          roundType: sess.roundType,
          candidateName: sess.candidateName,
          jobTitle: sess.jobTitle,
          jobDepartment: (sess as any).jobDepartment || "Engineering",
          jobDescription: (sess as any).jobDescription || "",
          candidateSkills: (sess as any).candidateSkills || [],
          round_blueprints: sess.round_blueprints,
          blueprint_version: sess.blueprint_version,
          session: sess,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to start round")
        setState("error")
        return
      }

      setRoundId(data.round.id)

      if (data.resumed && data.round.transcript?.length) {
        // Resuming
        const existingMessages: ChatMessage[] = data.round.transcript.map(
          (t: TranscriptEntry, i: number) => ({
            id: `msg-${i}`,
            role: t.role,
            content: t.message,
            timestamp: t.timestamp,
            answerScore: t.answer_score,
          })
        )
        setMessages(existingMessages)
        setExchangeCount(existingMessages.filter((m) => m.role === "candidate").length)
      } else {
        // New round — show first question
        const firstMsg: ChatMessage = {
          id: "msg-0",
          role: "ai",
          content: data.firstQuestion || data.round.transcript?.[0]?.message || "Let's begin the interview.",
          timestamp: new Date().toISOString(),
        }
        setMessages([firstMsg])
      }

      setState("ready")
    } catch {
      setError("Failed to start interview. Please refresh and try again.")
      setState("error")
    } finally {
      setIsAiTyping(false)
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (forcedText?: string) => {
    const textToSend = forcedText !== undefined ? forcedText : input
    if (forcedText === undefined && !textToSend.trim()) return
    if (!roundId || isAiTyping || !session) return

    const cleanMsg = textToSend.trim() || "(No response - speaking time expired)"

    const candidateMsg: ChatMessage = {
      id: `msg-${messages.length}`,
      role: "candidate",
      content: cleanMsg,
      timestamp: new Date().toISOString(),
    }

    let speakingMetrics: any = undefined
    if (session.roundType === "speaking") {
      const durationUsed = 60 - speakingCountdown
      const wordsCount = cleanMsg.split(/\s+/).filter(Boolean).length
      const wpm = durationUsed > 0 ? Math.round(wordsCount / (durationUsed / 60)) : 0
      
      const fillerPatterns = [/\buh\b/gi, /\bum\b/gi, /\blike\b/gi, /\bso\b/gi, /\byou\s+know\b/gi]
      let fillersCount = 0
      fillerPatterns.forEach(pat => {
        fillersCount += (cleanMsg.match(pat) || []).length
      })

      speakingMetrics = {
        audio_duration: durationUsed,
        words_per_minute: wpm,
        filler_words_count: fillersCount,
        microphone_fallback: microphoneFallback
      }
      
      candidateMsg.speaking_metrics = speakingMetrics
    }

    setMessages((prev) => [...prev, candidateMsg])
    setInput("")
    setIsAiTyping(true)
    setExchangeCount((c) => c + 1)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          applicationId: session.applicationId,
          roundId,
          roundType: session.roundType,
          message: candidateMsg.content,
          candidateName: session.candidateName,
          jobTitle: session.jobTitle,
          speaking_metrics: speakingMetrics,
        }),
      })

      const data: AIResponse = await res.json()

      if (!res.ok) {
        const aiErrorMsg: ChatMessage = {
          id: `msg-${messages.length + 1}`,
          role: "ai",
          content: "I apologize, but I encountered an error processing your response. Please try again.",
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiErrorMsg])
        return
      }

      const aiMsg: ChatMessage = {
        id: `msg-${messages.length + 1}`,
        role: "ai",
        content: data.message,
        timestamp: new Date().toISOString(),
        answerScore: data.answer_score,
      }
      setMessages((prev) => [...prev, aiMsg])

      // Auto-speak AI response if voice is enabled
      if (voiceEnabled && voice.isSupported) {
        voice.speakText(data.message)
      }

      if (data.round_complete && data.summary) {
        setCompleteSummary(data.summary)
        setState("complete")
        if (timerRef.current) clearInterval(timerRef.current)
      }
    } catch {
      const aiErrorMsg: ChatMessage = {
        id: `msg-${messages.length + 1}`,
        role: "ai",
        content: "Connection lost. Your progress has been saved — please refresh to continue.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiErrorMsg])
    } finally {
      setIsAiTyping(false)
    }
  }, [input, roundId, isAiTyping, session, messages.length, speakingCountdown, microphoneFallback, voiceEnabled, voice])

  // Auto-submit when countdown hits 0
  useEffect(() => {
    if (session?.roundType === "speaking" && state === "ready" && speakingCountdown === 0 && !isAiTyping) {
      sendMessage()
    }
  }, [speakingCountdown, session?.roundType, state, isAiTyping, sendMessage])

  // ── Keyboard handling ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Next round progression ───────────────────────────────────────────────

  const ROUND_ORDER: RoundType[] = ["tech", "interview", "speaking", "hr"]

  const getNextRound = (): RoundType | null => {
    if (!session) return null
    const currentIndex = ROUND_ORDER.indexOf(session.roundType)
    if (currentIndex < ROUND_ORDER.length - 1) {
      return ROUND_ORDER[currentIndex + 1]
    }
    return null
  }

  const proceedToNextRound = async () => {
    const nextRound = getNextRound()
    if (!nextRound || !session) return

    // Mark current round as completed
    setCompletedRounds((prev) => [...prev, session.roundType])

    // Reset state for new round
    const newSession: CandidateSession = {
      ...session,
      roundType: nextRound,
      stage: `${nextRound}_round` as any,
      round: null,
    }

    setSession(newSession)
    setMessages([])
    setInput("")
    setCompleteSummary(null)
    setRoundId(null)
    setExchangeCount(0)
    setElapsedSeconds(0)
    setState("loading")
    setMicrophoneFallback(false)

    // Start the new round
    await startRound(newSession)
  }

  // ── Submit assignment ──────────────────────────────────────────────────────

  const detectSubmissionType = (text: string): "github" | "url" | "code" | "markdown" | "text" => {
    const trimmed = text.trim()
    if (/https?:\/\/(www\.)?github\.com\/[^\s]+/i.test(trimmed)) return "github"
    if (/https?:\/\/[^\s]+/i.test(trimmed)) return "url"
    if (/```|#\s+|##\s+|\*\*|\[.*\]\(.*\)/.test(trimmed)) return "markdown"
    if (/def\s+\w+|function\s+\w+|const\s+\w+\s*=|class\s+\w+|import\s+/.test(trimmed)) return "code"
    return "text"
  }

  const handleAssignmentSubmit = async (forceSubmit = false) => {
    if (!session?.assignment) return
    const text = assignmentText.trim()

    // Trigger UX Warning modal if solution text < 30 chars and forceSubmit is false
    if (!forceSubmit && text.length < 30) {
      setShowEmptyWarningModal(true)
      return
    }

    setShowEmptyWarningModal(false)
    setAssignmentSubmitting(true)
    const subType = detectSubmissionType(text)

    try {
      const res = await fetch("/api/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: session.assignment.id,
          submissionText: text || "[Empty submission]",
          submissionType: subType,
        }),
      })

      if (!res.ok) {
        throw new Error("Submission failed")
      }

      // Assignment done — proceed to rules screen first
      const newSession: CandidateSession = {
        ...session,
        roundType: "tech",
        stage: "tech_round",
        assignment: { ...session.assignment, status: "submitted" },
        round: null,
      }
      setSession(newSession)
      setCompletedRounds(["assignment"])
      setState("rules")
    } catch {
      // If backend fails, still proceed to rules screen
      const newSession: CandidateSession = {
        ...session,
        roundType: "tech",
        stage: "tech_round",
        round: null,
      }
      setSession(newSession)
      setCompletedRounds(["assignment"])
      setState("rules")
    } finally {
      setAssignmentSubmitting(false)
    }
  }

  // ── Render states ────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--hm-accent)] mx-auto" />
          <p className="text-base  text-[var(--hm-text-muted)] tracking-wider uppercase">
            VALIDATING ACCESS TOKEN...
          </p>
        </div>
      </div>
    )
  }

  if (state === "dashboard" && session) {
    const isAssignmentPending = session.assignment && session.assignment.status === "pending"

    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#07070f] hero-glow relative overflow-hidden">
        <div className="max-w-3xl w-full space-y-6 relative z-10 reveal-up">
          {/* Header with HireMind Logo */}
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-signal/30"
                style={{ backgroundImage: 'linear-gradient(135deg, #C800FF 0%, #7C3AED 100%)' }}
              >
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-display font-extrabold text-white tracking-tight leading-none">
                  HIREMIND <span className="text-gradient">AI</span>
                </h1>
                <p className="eyebrow text-neutral-400 text-[9px] mt-1">CANDIDATE ASSESSMENT ENVIRONMENT</p>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="card-glass border border-white/[0.06] p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden space-y-6">
            {/* Top row */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <p className="eyebrow text-neutral-400 text-[9px]">CANDIDATE</p>
                <p className="text-base font-display font-extrabold text-white mt-0.5">{session.candidateName}</p>
              </div>
              <div className="text-right">
                <p className="eyebrow text-neutral-400 text-[9px]">TARGET ROLE</p>
                <p className="text-base font-display font-extrabold text-signal mt-0.5">{session.jobTitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Stepper showing workflow phases */}
                <div className="space-y-2">
                  <p className="eyebrow text-neutral-400 font-extrabold text-[9px]">
                    APPLICATION PIPELINE
                  </p>
                  <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl">
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[8px] font-bold">
                      <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                        ✓ APPLIED
                      </div>
                      <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                        ✓ SCREENED
                      </div>
                      <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                        ✓ SHORTLISTED
                      </div>
                      <div className="border border-signal/40 bg-signal/15 text-signal p-2 rounded-lg animate-pulse">
                        {isAssignmentPending ? "★ ASSIGNMENT" : "★ INTERVIEW"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills extracted from resume */}
                <div className="space-y-2">
                  <p className="eyebrow text-neutral-400 font-extrabold text-[9px]">
                    VERIFIED SKILLS
                  </p>
                  <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl">
                    {session.candidateSkills && session.candidateSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {session.candidateSkills.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 text-[9px] font-bold border border-signal/25 bg-signal/10 text-signal rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-400 font-medium">
                        Initial scoring adapts dynamically based on answer depth.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-signal text-[10px] font-bold eyebrow">
                    <Brain className="w-3.5 h-3.5 text-signal" /> EVALUATION PROTOCOLS
                  </div>
                  <ul className="text-[10px] text-neutral-400 space-y-1.5 list-disc pl-3.5 leading-relaxed font-medium">
                    <li>Enable microphone if using voice responses.</li>
                    <li>Consists of progressive adaptive evaluation rounds.</li>
                    <li>Evaluates depth, metrics, and technical correctness.</li>
                  </ul>
                </div>

                {/* Action button */}
                <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2.5">
                  <p className="text-[10px] text-neutral-400 font-medium">
                    Click proceed to begin your active {isAssignmentPending ? "assignment" : "interview"} stage.
                  </p>
                  <button
                    onClick={async () => {
                      if (isAssignmentPending) {
                        setState("assignment")
                      } else {
                        setState("rules")
                      }
                    }}
                    className="btn-primary flex items-center justify-center gap-2 w-full h-11 text-white text-xs font-display font-extrabold tracking-wider uppercase transition-transform hover:-translate-y-0.5 shadow-lg shadow-signal/20 rounded-xl"
                  >
                    <span>PROCEED TO {isAssignmentPending ? "ASSIGNMENT" : "INTERVIEW"}</span>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state === "assignment" && session?.assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#07070f] hero-glow relative overflow-hidden">
        <div className="max-w-3xl w-full space-y-6 relative z-10 reveal-up">
          {/* Header with HireMind Logo */}
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-signal/30"
                style={{ backgroundImage: 'linear-gradient(135deg, #C800FF 0%, #7C3AED 100%)' }}
              >
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-display font-extrabold text-white tracking-tight leading-none">
                  HIREMIND <span className="text-gradient">AI</span>
                </h1>
                <p className="eyebrow text-neutral-400 text-[9px] mt-1">TAKE-HOME ASSIGNMENT STAGE</p>
              </div>
            </div>
          </div>

          {/* Assignment card */}
          <div className="card-glass border border-white/[0.06] p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6 relative overflow-hidden">
            {/* Candidate info */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <p className="eyebrow text-neutral-400 text-[9px]">CANDIDATE</p>
                <p className="text-base font-display font-extrabold text-white mt-0.5">{session.candidateName}</p>
              </div>
              <div className="text-right">
                <p className="eyebrow text-neutral-400 text-[9px]">TARGET ROLE</p>
                <p className="text-base font-display font-extrabold text-signal mt-0.5">{session.jobTitle}</p>
              </div>
            </div>

            {/* Assignment title + description */}
            <div className="space-y-2">
              <h2 className="text-base font-display font-extrabold text-white tracking-tight uppercase">
                {session.assignment.title}
              </h2>
              <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-xl text-xs text-neutral-300 font-medium leading-relaxed whitespace-pre-wrap">
                {session.assignment.description}
              </div>
            </div>

            {/* Requirements */}
            {session.assignment.requirements && (
              <div className="space-y-2">
                <p className="eyebrow text-neutral-400 font-extrabold text-[9px]">REQUIREMENTS</p>
                <div className="bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl text-xs text-neutral-300 font-medium whitespace-pre-wrap leading-relaxed">
                  {session.assignment.requirements}
                </div>
              </div>
            )}

            {/* Submission area */}
            <div className="space-y-2">
              <p className="eyebrow text-neutral-400 font-extrabold text-[9px]">YOUR SUBMISSION</p>
              <textarea
                value={assignmentText}
                onChange={(e) => setAssignmentText(e.target.value)}
                disabled={assignmentSubmitting}
                placeholder="Write your solution here... Include your approach, implementation details, and trade-offs considered."
                rows={6}
                className="w-full bg-white/[0.02] border border-white/[0.08] focus:border-signal text-xs text-neutral-100 p-4 rounded-xl resize-none font-mono placeholder:text-neutral-500 transition-all outline-none disabled:opacity-50"
              />
            </div>

            {/* Submit button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] text-neutral-400 font-medium">
                After submitting, you&apos;ll proceed directly to the live AI evaluation round.
              </p>
              <button
                onClick={() => handleAssignmentSubmit(false)}
                disabled={assignmentSubmitting}
                className="btn-primary flex items-center justify-center gap-2 px-6 h-11 text-white text-xs font-display font-extrabold tracking-wider uppercase transition-transform hover:-translate-y-0.5 shadow-lg shadow-signal/20 rounded-xl disabled:opacity-40 shrink-0 w-full sm:w-auto"
              >
                {assignmentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                <span>{assignmentSubmitting ? "SUBMITTING..." : "SUBMIT & CONTINUE"}</span>
              </button>
            </div>
          </div>
        </div>

        {showEmptyWarningModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--hm-bg-card)] border border-amber-500/40 max-w-lg w-full p-6 space-y-4 ">
              <div className="flex items-center gap-2.5 text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-lg font-bold tracking-wider uppercase">SUBMISSION WARNING</h3>
              </div>
              <p className="text-base text-[var(--hm-text-secondary)] leading-relaxed">
                Your assignment response appears to be empty or very short ({assignmentText.trim().length} characters).
              </p>
              <p className="text-lg text-[var(--hm-text-muted)]">
                Submitting a brief or incomplete solution may impact your technical assessment score. Are you sure you want to proceed?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEmptyWarningModal(false)}
                  className="flex-1 px-4 py-2 bg-[var(--hm-bg-inset)] border border-[var(--hm-border)] text-[var(--hm-text-primary)] text-base font-bold uppercase hover:bg-[var(--hm-bg-elevated)] transition-colors"
                >
                  KEEP EDITING
                </button>
                <button
                  onClick={() => handleAssignmentSubmit(true)}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-base font-bold uppercase transition-colors"
                >
                  SUBMIT ANYWAY
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (state === "rules" && session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#07070f] hero-glow relative overflow-hidden">
        <div className="max-w-3xl w-full space-y-6 relative z-10 reveal-up">
          {/* Header with HireMind Logo */}
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-signal/30"
                style={{ backgroundImage: 'linear-gradient(135deg, #C800FF 0%, #7C3AED 100%)' }}
              >
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-display font-extrabold text-white tracking-tight leading-none">
                  HIREMIND <span className="text-gradient">AI</span>
                </h1>
                <p className="eyebrow text-neutral-400 text-[9px] mt-1">ASSESSMENT GUIDELINES & PROTOCOLS</p>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="card-glass border border-white/[0.06] p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden space-y-6">
            {/* Top row info */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <p className="eyebrow text-neutral-400 text-[9px]">CANDIDATE</p>
                <p className="text-base font-display font-extrabold text-white mt-0.5">{session.candidateName}</p>
              </div>
              <div className="text-right">
                <p className="eyebrow text-neutral-400 text-[9px]">TARGET ROLE</p>
                <p className="text-base font-display font-extrabold text-signal mt-0.5">{session.jobTitle}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-sm font-display font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
                <Shield className="w-4 h-4 text-signal" /> ASSESSMENT RULES & SECURITY PROTOCOLS
              </h2>
              <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                Review the mandatory evaluation and integrity rules prior to starting.
              </p>
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  icon: AlertTriangle,
                  title: "BROWSER FOCUS (3-STRIKE POLICY)",
                  desc: "Switching windows 3 times will immediately terminate your session.",
                  color: "text-amber-400",
                  borderColor: "border-amber-500/20",
                  bgColor: "bg-amber-500/5"
                },
                {
                  icon: Video,
                  title: "CAMERA PRESENCE & SELF-PREVIEW",
                  desc: "PIP self-preview is active. 3 face absence strikes terminate session.",
                  color: "text-emerald-400",
                  borderColor: "border-emerald-500/20",
                  bgColor: "bg-emerald-500/5"
                },
                {
                  icon: Shield,
                  title: "ANTI-PLAGIARISM MONITORS",
                  desc: "External copy-pasting is strictly prohibited and logged.",
                  color: "text-rose-400",
                  borderColor: "border-rose-500/20",
                  bgColor: "bg-rose-500/5"
                },
                {
                  icon: Mic,
                  title: "HARDWARE & MICROPHONE",
                  desc: "Required for Speaking Round. Text fallback option available.",
                  color: "text-cyan-400",
                  borderColor: "border-cyan-500/20",
                  bgColor: "bg-cyan-500/5"
                },
                {
                  icon: Clock,
                  title: "TIMED EXCHANGES",
                  desc: "Questions have strict response timers. Pausing is prohibited.",
                  color: "text-signal",
                  borderColor: "border-signal/20",
                  bgColor: "bg-signal/5"
                }
              ].map(({ icon: Icon, title, desc, color, borderColor, bgColor }, index) => (
                <div key={title} className={`p-3.5 border ${borderColor} ${bgColor} flex gap-3 items-start rounded-xl ${index === 4 ? "md:col-span-2" : ""}`}>
                  <div className="w-7 h-7 flex items-center justify-center border border-current shrink-0 mt-0.5 rounded-lg">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className={`text-xs font-display font-extrabold tracking-wider ${color}`}>
                      {title}
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-normal font-medium">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Acknowledgment Checkbox */}
            <div className="pt-3 border-t border-white/[0.06] space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-3.5 bg-white/[0.01] border border-white/[0.04] hover:border-signal/40 transition-all rounded-xl">
                <input
                  type="checkbox"
                  checked={rulesAgreed}
                  onChange={(e) => setRulesAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-transparent text-signal focus:ring-signal focus:ring-offset-0"
                />
                <span className="text-[10px]  text-[var(--hm-text-primary)] leading-normal select-none">
                  I confirm that I am taking this assessment independently. I have read, understood, and agree to abide by all anti-cheating, 3-strike tab-leaving, and integrity rules.
                </span>
              </label>

              {/* Proceed to Permission Prompt Button */}
              <button
                disabled={!rulesAgreed}
                onClick={() => {
                  setState("permission_prompt")
                }}
                className="btn-primary flex items-center justify-center gap-2 w-full py-3 text-white text-xs font-display font-extrabold tracking-wider uppercase transition-transform hover:-translate-y-0.5 shadow-lg shadow-signal/20 rounded-xl"
              >
                <Brain className="w-4 h-4 text-white" />
                PROCEED TO HARDWARE & DEVICE CHECK
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Hardware & Camera/Microphone Permission Prompt Stage ─────────────────
  if (state === "permission_prompt" && session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#07070f] hero-glow">
        <div className="max-w-3xl w-full card-glass border border-white/[0.06] shadow-2xl p-8 rounded-2xl space-y-6 text-center reveal-up">
          <div className="w-14 h-14 bg-signal/15 border border-signal/30 text-signal rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-signal/20">
            <Video className="w-7 h-7 text-signal" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-display font-extrabold text-white uppercase tracking-wider">
              CAMERA & MICROPHONE ACCESS REQUIRED
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed font-medium">
              HireMind AI requires temporary permission to access your Camera and Microphone to perform pre-interview hardware calibration, microphone testing, and anti-cheating verification.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.04] p-4 text-xs text-neutral-400 text-left space-y-2 rounded-xl">
            <p className="eyebrow text-white font-extrabold">PERMISSIONS NEEDED:</p>
            <p className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
              ✓ Camera: Live self-preview & facial presence check
            </p>
            <p className="flex items-center gap-2 text-cyan-400 font-semibold text-[11px]">
              ✓ Microphone: Live audio volume test & speaking answers
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => {
                cameraPresence.startCamera()
                setState("device_check")
              }}
              className="btn-primary w-full py-3.5 text-white text-xs font-display font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 rounded-xl shadow-lg shadow-signal/20"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              GRANT PERMISSION & TEST HARDWARE
            </button>
            <button
              onClick={() => setState("rules")}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-lg font-bold uppercase tracking-wider transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Pre-Interview Device Check Stage ────────────────────────────────────
  if (state === "device_check") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black/90">
        <ReadinessReportCard
          items={cameraPresence.readinessState.items}
          isAllPassed={cameraPresence.readinessState.isAllPassed}
          isStale={cameraPresence.readinessState.isStale}
          videoRef={cameraPresence.videoRef}
          canvasRef={cameraPresence.canvasRef}
          streamRef={cameraPresence.streamRef}
          onStartInterview={async () => {
            if (cameraPresence.readinessState.calibratedProfile) {
              cameraPresence.setCalibrationProfile(cameraPresence.readinessState.calibratedProfile)
            }
            setState("loading")
            if (session) await startRound(session)
          }}
        />
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-3xl w-full bg-[var(--hm-bg-card)] border border-[var(--hm-border)] p-10 rounded-radius-lg shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold  text-[var(--hm-text-primary)] tracking-wider uppercase">
                ACCESS DENIED
              </h2>
              <p className="text-base text-[var(--hm-text-muted)]  uppercase">
                TOKEN VALIDATION FAILED
              </p>
            </div>
          </div>
          <p className="text-lg text-[var(--hm-text-secondary)]  leading-relaxed">
            {error}
          </p>
          <div className="pt-3 border-t border-[var(--hm-border-subtle)]">
            <p className="text-base text-[var(--hm-text-muted)] ">
              Contact your recruiter if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Ready / Complete state (chat interface) ──────────────────────────────

  const roundLabel = session?.roundType === "tech"
    ? "TECHNICAL ROUND"
    : session?.roundType === "hr"
    ? "HR ROUND"
    : "BEHAVIORAL INTERVIEW"

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-[var(--hm-border)] bg-[var(--hm-bg-card)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold  text-[var(--hm-accent)] tracking-[0.2em]">
            HIREMIND AI
          </h1>
          <ChevronRight className="w-3 h-3 text-[var(--hm-text-muted)]" />
          <span className="text-base  text-[var(--hm-text-secondary)] tracking-wider uppercase">
            {roundLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <PipelineStepper
            currentRound={session?.roundType || "tech"}
            completedRounds={completedRounds}
          />
          <div className="flex items-center gap-2 text-base  text-[var(--hm-text-muted)]">
            <Clock className="w-3 h-3" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </header>

      {/* ── Live Interview Health Panel HUD Bar ────────────────────────────── */}
      <InterviewHealthPanel
        cameraHealthy={cameraPresence.cameraResult?.healthy ?? true}
        faceHealthy={cameraPresence.cameraResult?.payload.faceDetected ?? true}
        lightingStatus={cameraPresence.guidance.lightingStatus}
        micHealthy={cameraPresence.micResult?.healthy ?? true}
        netHealthy={cameraPresence.netResult?.healthy ?? true}
        guidanceHint={cameraPresence.guidance.hint}
      />

      {/* ── Live Picture-in-Picture WebCam Self-Preview Widget (Bottom Right) ── */}
      {cameraPresence.isCameraActive && (
        <CameraPreview
          videoRef={cameraPresence.videoRef}
          canvasRef={cameraPresence.canvasRef}
          streamRef={cameraPresence.streamRef}
          faceDetected={cameraPresence.cameraResult?.payload.faceDetected ?? true}
          confidence={cameraPresence.cameraResult?.confidence ?? 0.95}
          landmarks={cameraPresence.cameraResult?.payload.landmarksCount ?? 468}
          hint={cameraPresence.guidance.hint}
        />
      )}

      {/* 3s-15s Soft Yellow Banner */}
      {cameraPresence.engineState === "WARNING" && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-400 px-6 py-2 text-lg  flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>WE CAN&apos;T SEE YOU IN CAMERA FRAME. PLEASE RETURN TO YOUR SEAT TO AVOID CAMERA STRIKES.</span>
          </div>
          <span className="font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 border border-amber-500/40">
            STRIKE IN: {cameraPresence.countdownSeconds}s
          </span>
        </div>
      )}

      {/* 15s+ Red Camera Strike Overlay Modal */}
      {(cameraPresence.engineState === "STRIKE" || cameraPresence.engineState === "LOCKOUT") && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="bg-[var(--hm-bg-card)] border border-red-500/60 p-8 max-w-2xl w-full text-center space-y-6  rounded-radius-lg shadow-2xl">
            <div className="w-12 h-12 bg-red-500/15 border border-red-500/40 text-red-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-red-400 tracking-wider uppercase">
              CAMERA WARNING: FACE OUT OF FRAME (STRIKE {cameraPresence.cameraStrikes}/3)
            </h3>
            <p className="text-xs text-[var(--hm-text-secondary)] leading-relaxed">
              You have been out of camera frame or obscuring facial keypoints (eyes/nose) for longer than 5 seconds. Please re-center your face directly in front of the camera.
            </p>
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
              3 CAMERA STRIKES WILL TERMINATE YOUR ASSESSMENT.
            </p>
            <div className="pt-4 flex flex-col gap-3">
              {cameraPresence.cameraStrikes < 3 ? (
                <button
                  onClick={() => {
                    cameraPresence.acknowledgeCameraWarning()
                  }}
                  className="btn-primary px-6 py-2.5 text-white text-xs font-display font-extrabold uppercase tracking-wider rounded-xl transition-transform hover:-translate-y-0.5 shadow-lg shadow-signal/20"
                >
                  Acknowledge & Resume Interview
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] text-red-400 font-bold">
                    ASSESSMENT LOCKED. 3 CAMERA STRIKES EXCEEDED.
                  </p>
                  <button
                    onClick={() => {
                      cameraPresence.resetStrikes()
                    }}
                    className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs  font-bold uppercase tracking-wider rounded-radius-md transition-colors"
                  >
                    Reset Strikes & Resume (Dev Bypass)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session info bar */}
      <div className="h-10 border-b border-[var(--hm-border-subtle)] bg-[var(--hm-bg-inset)] flex items-center justify-between px-6">
        <div className="flex items-center gap-4 text-[9px]  text-[var(--hm-text-muted)] tracking-wider uppercase">
          <span>
            CANDIDATE: <span className="text-[var(--hm-text-primary)]">{session?.candidateName}</span>
          </span>
          <span>|</span>
          <span>
            ROLE: <span className="text-[var(--hm-text-primary)]">{session?.jobTitle}</span>
          </span>
          <span>|</span>
          <span>
            STAGE: <span className="text-[var(--hm-accent)]">{roundLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[9px]  text-[var(--hm-text-muted)]">
          {/* Camera Status Badge */}
          <div className="flex items-center gap-1 text-green-400">
            <span className={`w-2 h-2 rounded-full ${cameraPresence.cameraResult?.payload?.faceDetected ? "bg-green-400" : "bg-amber-400 animate-ping"}`} />
            <span>CAMERA: {cameraPresence.cameraResult?.payload?.faceDetected ? "IN FRAME" : "OUT OF FRAME"} ({cameraPresence.cameraStrikes}/3)</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1 text-green-500">
            <Shield className="w-3 h-3 text-green-500" />
            <span className="text-green-500 uppercase">SESSION ACTIVE</span>
          </div>
          <span className="mx-1">•</span>
          <span>Q{exchangeCount}/3</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto chat-scroll p-6 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {isAiTyping && <TypingIndicator />}
        {state === "complete" && browserStrikes >= 3 && (
          <div className="bg-red-500/10 border border-red-500/30 p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="text-lg font-bold  uppercase tracking-wider">
                INTERVIEW TERMINATED
              </h3>
            </div>
            <p className="text-lg text-[var(--hm-text-secondary)]  leading-relaxed max-w-lg mx-auto">
              This session was automatically terminated because you navigated away from the interview window three times (3/3 strikes). The recruitment team has been notified.
            </p>
          </div>
        )}
        {state === "complete" && browserStrikes < 3 && <RoundCompleteCard summary={completeSummary} />}
        <div ref={chatEndRef} />
      </div>

      {/* Voice/AI caption bar */}
      {(voice.isListening || voice.isSpeaking || voice.interimTranscript) && (
        <div className="border-t border-[var(--hm-border-subtle)] bg-[var(--hm-bg-inset)] px-6 py-2">
          {voice.isListening && voice.interimTranscript && (
            <div className="flex items-center gap-2 text-base  text-[var(--hm-text-secondary)]">
              <Mic className="w-3 h-3 text-[var(--hm-accent)] animate-pulse" />
              <span className="opacity-70 italic">{voice.interimTranscript}</span>
            </div>
          )}
          {voice.isListening && !voice.interimTranscript && (
            <div className="flex items-center gap-2 text-base  text-[var(--hm-text-muted)]">
              <Mic className="w-3 h-3 text-[var(--hm-accent)] animate-pulse" />
              <span>LISTENING...</span>
            </div>
          )}
          {voice.isSpeaking && voice.spokenCaption && (
            <div className="flex items-start gap-2 text-base  text-[var(--hm-text-secondary)]">
              <Volume2 className="w-3 h-3 text-[var(--hm-accent)] shrink-0 mt-0.5" />
              <span className="line-clamp-2">{voice.spokenCaption}</span>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[var(--hm-border)] bg-[var(--hm-bg-card)] p-4 shrink-0">
        {state === "complete" ? (
          (() => {
            const nextRound = session ? (() => {
              const order: RoundType[] = ["tech", "interview", "speaking", "hr"]
              const idx = order.indexOf(session.roundType)
              return idx < order.length - 1 ? order[idx + 1] : null
            })() : null
            const nextLabel = nextRound === "interview" ? "BEHAVIORAL INTERVIEW" : nextRound === "speaking" ? "SPEAKING ROUND" : nextRound === "hr" ? "HR ROUND" : null

            return nextRound ? (
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-base  text-[var(--hm-text-muted)] tracking-wider uppercase">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ROUND COMPLETE
                </div>
                <button
                  onClick={proceedToNextRound}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 text-white text-xs font-display font-extrabold tracking-wider uppercase transition-transform hover:-translate-y-0.5 shadow-lg shadow-signal/20 rounded-xl"
                >
                  PROCEED TO {nextLabel}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 text-base  text-[var(--hm-text-muted)] tracking-wider uppercase">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ALL INTERVIEW ROUNDS COMPLETE — RESULTS SUBMITTED
              </div>
            )
          })()
        ) : session?.roundType === "speaking" && !microphoneFallback ? (
          <div className="space-y-4">
            {/* Countdown timer & status indicator */}
            <div className="flex items-center justify-between bg-[var(--hm-bg-inset)]/60 border border-[var(--hm-border-subtle)] p-3 rounded-radius-md">
              <div className="flex items-center gap-3">
                {/* Circular countdown timer using SVG */}
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="var(--hm-border-subtle)" strokeWidth="2.5" fill="transparent" />
                    <circle cx="20" cy="20" r="16" stroke="var(--hm-accent)" strokeWidth="2.5" fill="transparent"
                      strokeDasharray={2 * Math.PI * 16}
                      strokeDashoffset={2 * Math.PI * 16 - (speakingCountdown / 60) * (2 * Math.PI * 16)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute text-lg  font-bold text-[var(--hm-text-primary)]">{speakingCountdown}s</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold  text-[var(--hm-text-primary)] tracking-wide uppercase">
                    {voice.isListening ? "Listening..." : "Microphone Active"}
                  </h4>
                  <p className="text-base text-[var(--hm-text-muted)]  uppercase">
                    Answer will auto-submit when timer expires
                  </p>
                </div>
              </div>

              {/* Hardware issue fallback button */}
              <button
                onClick={() => {
                  setMicrophoneFallback(true)
                  if (voice.isListening) voice.stopListening()
                }}
                className="px-3 py-1.5 border border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-base  tracking-wider uppercase transition-colors"
              >
                Report Microphone Issue
              </button>
            </div>

            {/* Error alerts */}
            {!voice.isSupported && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 text-base  flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>SPEECH RECOGNITION NOT SUPPORTED BY BROWSER. REVERTING TO KEYBOARD INPUT.</span>
              </div>
            )}

            {/* Transcription display preview */}
            <div className="space-y-1.5">
              <span className="text-base font-bold  text-[var(--hm-text-muted)] uppercase tracking-wider">Transcribed Answer Preview:</span>
              <div className="w-full bg-[var(--hm-bg-inset)] border border-[var(--hm-border)] text-base  text-[var(--hm-text-primary)] p-3 min-h-[70px] max-h-[140px] overflow-y-auto rounded-radius-md leading-relaxed">
                {input ? (
                  input
                ) : voice.interimTranscript ? (
                  <span className="text-[var(--hm-text-secondary)] italic">{voice.interimTranscript}</span>
                ) : (
                  <span className="text-[var(--hm-text-muted)] italic">Speak into your microphone to transcribe your answer (min 10 characters)...</span>
                )}
              </div>
            </div>

            {/* Submit controls */}
            <div className="flex justify-between items-center gap-3">
              {/* Mic toggle */}
              <button
                onClick={voice.isListening ? voice.stopListening : voice.startListening}
                disabled={isAiTyping || state !== "ready"}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 border  text-lg tracking-wider uppercase transition-colors rounded-radius-md
                  ${voice.isListening
                    ? "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
                    : "bg-[var(--hm-bg-elevated)] border-[var(--hm-border)] text-[var(--hm-text-secondary)] hover:text-[var(--hm-accent)] hover:border-[var(--hm-accent)]/30"
                  }`}
              >
                {voice.isListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" /> Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" /> Start Recording
                  </>
                )}
              </button>

              {/* Submit button (with Empty protection) */}
              <button
                onClick={() => sendMessage()}
                disabled={input.trim().length < 10 || isAiTyping || state !== "ready"}
                className="flex-1 py-2 flex items-center justify-center gap-1.5 bg-[var(--hm-accent)] text-white hover:bg-[var(--hm-accent-hover)] disabled:bg-[var(--hm-bg-elevated)] disabled:border-[var(--hm-border)] disabled:text-[var(--hm-text-muted)] disabled:cursor-not-allowed border border-transparent  text-lg tracking-wider uppercase transition-colors rounded-radius-md"
              >
                {isAiTyping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Submit Response
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {session?.roundType === "speaking" && (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 text-amber-500 p-2 text-base  rounded-radius-md">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>KEYBOARD FALLBACK ACTIVE. SPEAKING ROUND TIME LIMIT: {speakingCountdown}s</span>
                </div>
                <span className="font-bold">{speakingCountdown}s</span>
              </div>
            )}
            <div className="flex gap-3 items-end">
              {/* Mic button */}
              {voice.isSupported && (
                <button
                  onClick={voice.isListening ? voice.stopListening : voice.startListening}
                  disabled={isAiTyping || voice.isSpeaking || state !== "ready"}
                  title={voice.isListening ? "Stop listening" : "Start voice input"}
                  className={`h-[50px] w-[50px] rounded-radius-md flex items-center justify-center border transition-colors
                    ${voice.isListening
                      ? "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
                      : "bg-[var(--hm-bg-elevated)] border-[var(--hm-border)] text-[var(--hm-text-muted)] hover:text-[var(--hm-accent)] hover:border-[var(--hm-accent)]/30"
                    }
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              {/* Text input */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isAiTyping || voice.isListening || state !== "ready"}
                  placeholder={
                    voice.isListening ? "LISTENING... SPEAK NOW" :
                    isAiTyping ? "WAITING FOR AI RESPONSE..." :
                    voice.isSpeaking ? "AI IS SPEAKING..." :
                    "TYPE YOUR RESPONSE... (ENTER TO SEND, SHIFT+ENTER FOR NEW LINE)"
                  }
                  className="w-full bg-[var(--hm-bg-inset)] border border-[var(--hm-border)] text-lg 
                    text-[var(--hm-text-primary)] p-3.5 pr-14 resize-none min-h-[50px] max-h-[120px] rounded-radius-md
                    placeholder:text-[var(--hm-text-muted)] placeholder:text-base placeholder:uppercase placeholder:tracking-wider
                    focus:outline-none focus:border-[var(--hm-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={1}
                />
              </div>

              {/* Send button */}
              <button
                onClick={() => sendMessage()}
                disabled={(!input.trim() && session?.roundType !== "speaking") || isAiTyping || voice.isListening || state !== "ready" || (session?.roundType === "speaking" && input.trim().length < 10)}
                className="h-[50px] w-[50px] rounded-radius-md flex items-center justify-center bg-[var(--hm-accent)] text-white
                  border border-[var(--hm-accent)] hover:bg-[var(--hm-accent-hover)]
                  disabled:bg-[var(--hm-bg-elevated)] disabled:border-[var(--hm-border)] disabled:text-[var(--hm-text-muted)]
                  disabled:cursor-not-allowed transition-colors"
              >
                {isAiTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>

              {/* Voice toggle */}
              {voice.isSupported && (
                <button
                  onClick={() => {
                    setVoiceEnabled(!voiceEnabled)
                    if (voiceEnabled && voice.isSpeaking) voice.stopSpeaking()
                  }}
                  title={voiceEnabled ? "Mute AI voice" : "Enable AI voice"}
                  className={`h-[50px] w-[50px] rounded-radius-md flex items-center justify-center border transition-colors
                    ${voiceEnabled
                      ? "bg-[var(--hm-bg-elevated)] border-[var(--hm-border)] text-[var(--hm-accent)]"
                      : "bg-[var(--hm-bg-elevated)] border-[var(--hm-border)] text-[var(--hm-text-muted)]"
                    }`}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab Leave Strike Warning Modal */}
      {showStrikeModal && browserStrikes < 3 && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="max-w-3xl w-full bg-[var(--hm-bg-card)] border-2 border-amber-500/80 p-10 rounded-radius-lg space-y-6 shadow-2xl shadow-amber-500/10">
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold  text-amber-500 tracking-wider uppercase">
                  TAB NAVIGATION WARNING
                </h2>
                <p className="text-lg text-[var(--hm-text-muted)]  uppercase">
                  FOCUS LOST DETECTED
                </p>
              </div>
            </div>
            <p className="text-lg text-[var(--hm-text-secondary)]  leading-relaxed">
              You navigated away from the interview tab. Navigating away or minimizing the browser window during the interview is strictly prohibited.
            </p>
            <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-3 text-center">
              <span className="text-base  font-bold text-amber-500">
                STRIKE {browserStrikes} OF 3
              </span>
            </div>
            <p className="text-base text-[var(--hm-text-muted)]  leading-normal italic">
              Note: Reaching Strike 3 will automatically terminate this interview session and log a disqualification warning for the hiring team.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowStrikeModal(false)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black text-lg  font-bold tracking-wider uppercase transition-colors"
              >
                I Understand & Return to Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
