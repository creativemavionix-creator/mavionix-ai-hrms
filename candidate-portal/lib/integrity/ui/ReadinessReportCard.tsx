"use client"

import { useState, useEffect, useRef } from "react"
import { CheckCircle2, Shield, Video, Mic, AlertCircle, Play, Volume2, MicOff } from "lucide-react"
import { ReadinessCheckItem } from "../types"

export interface ReadinessReportCardProps {
  items: ReadinessCheckItem[]
  isAllPassed: boolean
  isStale: boolean
  onStartInterview: () => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  streamRef: React.RefObject<MediaStream | null>
}

export default function ReadinessReportCard({
  items,
  isAllPassed,
  isStale,
  onStartInterview,
  videoRef,
  canvasRef,
  streamRef,
}: ReadinessReportCardProps) {
  const [micLevel, setMicLevel] = useState<number>(0)
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Live Audio VU Level Meter using Web Audio Analyser
  useEffect(() => {
    if (!streamRef?.current) return

    let audioContext: AudioContext | null = null
    let animId: number

    try {
      const audioTracks = streamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        audioContext = new AudioCtx()
        const source = audioContext.createMediaStreamSource(streamRef.current)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 64
        source.connect(analyser)

        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        const updateMicLevel = () => {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          const normLevel = Math.min(100, Math.round((avg / 128) * 100))
          setMicLevel(normLevel)
          animId = requestAnimationFrame(updateMicLevel)
        }
        updateMicLevel()
      }
    } catch (e) {
      console.warn("Web Audio Analyser error:", e)
    }

    return () => {
      if (animId) cancelAnimationFrame(animId)
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {})
      }
    }
  }, [streamRef?.current])

  // Test Microphone Recording & Playback (2 Seconds)
  const handleTestMicrophone = async () => {
    if (!streamRef?.current) return
    setIsRecordingMic(true)
    audioChunksRef.current = []

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(audioBlob)
        setAudioPlaybackUrl(url)
        setIsRecordingMic(false)

        // Auto playback recorded 2s audio
        setIsPlayingAudio(true)
        const audio = new Audio(url)
        audio.onended = () => setIsPlayingAudio(false)
        audio.play().catch(() => setIsPlayingAudio(false))
      }

      mediaRecorder.start()
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop()
        }
      }, 2000)
    } catch (err) {
      console.warn("Mic test error:", err)
      setIsRecordingMic(false)
    }
  }

  return (
    <div className="bg-[var(--hm-bg-card)] border border-[var(--hm-border)] shadow-2xl rounded-2xl p-8 max-w-3xl w-full font-mono space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--hm-border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--hm-accent)]" />
          <div>
            <h3 className="text-xl font-bold text-[var(--hm-text-primary)] uppercase tracking-wider">
              HARDWARE READINESS & DEVICE TEST
            </h3>
            <p className="text-lg text-[var(--hm-text-muted)]">
              Verify camera video feed & live microphone audio input
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-base font-bold uppercase flex items-center gap-1 ${
            isAllPassed
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
          }`}
        >
          {isAllPassed ? "✓ READY TO BEGIN" : "🟡 CALIBRATING..."}
        </span>
      </div>

      {/* Compact Camera Preview Box & Microphone Test Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Compact 4:3 Camera Preview Box */}
        <div className="relative w-full h-48 bg-neutral-900 border border-[var(--hm-border-subtle)] rounded-xl overflow-hidden flex items-center justify-center">
          <video
            ref={(el) => {
              if (videoRef) (videoRef as any).current = el
              if (el && streamRef?.current && el.srcObject !== streamRef.current) {
                el.srcObject = streamRef.current
                el.play().catch(() => {})
              }
            }}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute top-1.5 left-1.5 bg-black/75 px-1.5 py-0.5 text-[7px] text-green-400 font-bold flex items-center gap-1 rounded">
            <Video className="w-2.5 h-2.5 text-green-400" /> CAMERA FEED
          </div>
        </div>

        {/* Live Microphone VU Visualizer & Audio Test */}
        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-5 rounded-xl space-y-4 flex flex-col justify-between h-48">
          <div>
            <div className="flex items-center justify-between text-lg font-bold text-[var(--hm-text-muted)] uppercase mb-1">
              <span className="flex items-center gap-1">
                <Mic className="w-3 h-3 text-cyan-400" /> MIC AUDIO LEVEL
              </span>
              <span className="text-cyan-400">{micLevel}%</span>
            </div>

            {/* Live Audio Level Bar Visualizer */}
            <div className="w-full bg-neutral-900 border border-[var(--hm-border-subtle)] h-6 rounded-xl overflow-hidden p-1 flex gap-1">
              {Array.from({ length: 16 }).map((_, i) => {
                const threshold = (i / 16) * 100
                const isActive = micLevel > threshold
                const barColor = i > 12 ? "bg-red-400" : i > 8 ? "bg-amber-400" : "bg-cyan-400"
                return (
                  <div
                    key={i}
                    className={`flex-1 h-full rounded transition-colors duration-75 ${
                      isActive ? barColor : "bg-neutral-800"
                    }`}
                  />
                )
              })}
            </div>
            <span className="text-lg text-[var(--hm-text-muted)] mt-1 block">
              Speak to test audio responsiveness
            </span>
          </div>

          {/* Test Mic Recording Button */}
          <button
            onClick={handleTestMicrophone}
            disabled={isRecordingMic || isPlayingAudio}
            className="w-full py-1.5 px-2 bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 rounded-xl text-base font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isRecordingMic ? (
              <>
                <Mic className="w-3 h-3 text-red-400 animate-pulse" /> RECORDING (2S)...
              </>
            ) : isPlayingAudio ? (
              <>
                <Volume2 className="w-3 h-3 text-green-400 animate-bounce" /> PLAYING BACK...
              </>
            ) : (
              <>
                <Mic className="w-3 h-3" /> TEST MIC AUDIO
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5-Point Readiness Checklist Grid */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-[var(--hm-text-muted)] uppercase tracking-wider block">
          AUTOMATED HARDWARE VERIFICATION:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, index) => {
            const isPassed = item.status === "passed"
            return (
              <div
                key={item.id}
                className={`px-3 py-2 border rounded-xl flex items-center justify-between text-xs ${
                  isPassed
                    ? "bg-green-500/5 border-green-500/20 text-green-300"
                    : "bg-amber-500/5 border-amber-500/20 text-amber-300"
                } ${index === 4 ? "sm:col-span-2" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  )}
                  <div>
                    <span className="font-bold uppercase tracking-wider block text-[10px]">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-[var(--hm-text-secondary)]">{item.detail}</span>
                  </div>
                </div>
                <span className="font-bold text-[9px] uppercase px-2 py-0.5 rounded bg-black/40 border border-[var(--hm-border-subtle)]">
                  {isPassed ? "VERIFIED" : "CHECKING"}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Idle Stale Warning */}
      {isStale && (
        <div className="bg-red-500/10 border border-red-500/30 p-2 rounded-xl text-lg text-red-400 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Readiness verification stale (&gt;10 min idle). Re-verifying hardware connection...</span>
        </div>
      )}

      {/* Start Interview Action Button */}
      <button
        onClick={onStartInterview}
        className="w-full py-3.5 px-6 btn-primary font-display font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 rounded-xl shadow-lg shadow-signal/20 cursor-pointer text-white"
      >
        <Play className="w-4 h-4 fill-current text-white" />
        <span>START AI INTERVIEW NOW</span>
      </button>
    </div>
  )
}
