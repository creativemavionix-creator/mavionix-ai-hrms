"use client"

import { useState } from "react"
import { Video, Shield, Users, Eye, AlertCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react"

export interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  streamRef: React.RefObject<MediaStream | null>
  faceDetected: boolean
  confidence: number
  landmarks: number
  hint: string
  faceCount?: number
  isLookingAway?: boolean
  isHeadTurnedSideways?: boolean
  isMultipleFaces?: boolean
  isFaceCovered?: boolean
  absenceReason?: "none" | "no_face" | "looking_away" | "head_turned" | "multiple_faces" | "face_covered" | "low_lighting"
}

export default function CameraPreview({
  videoRef,
  canvasRef,
  streamRef,
  faceDetected,
  confidence,
  hint,
  faceCount = 1,
  isLookingAway = false,
  isHeadTurnedSideways = false,
  isMultipleFaces = false,
  isFaceCovered = false,
  absenceReason = "none",
}: CameraPreviewProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  // Determine badge status & appearance
  let statusBadge = {
    text: "AI ACTIVE",
    bg: "bg-emerald-500/20 border-emerald-500/30 text-emerald-400",
    icon: Shield,
    glow: "ring-1 ring-emerald-500/40",
  }

  if (isMultipleFaces || faceCount > 1) {
    statusBadge = {
      text: `MULTIPLE FACES (${faceCount})`,
      bg: "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse",
      icon: Users,
      glow: "ring-1 ring-red-500/50",
    }
  } else if (isLookingAway || absenceReason === "looking_away") {
    statusBadge = {
      text: "LOOKING AWAY",
      bg: "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse",
      icon: Eye,
      glow: "ring-1 ring-amber-500/40",
    }
  } else if (isHeadTurnedSideways || absenceReason === "head_turned") {
    statusBadge = {
      text: "HEAD TURNED",
      bg: "bg-amber-500/20 border-amber-500/40 text-amber-300",
      icon: AlertCircle,
      glow: "ring-1 ring-amber-500/40",
    }
  } else if (isFaceCovered || absenceReason === "face_covered") {
    statusBadge = {
      text: "FACE COVERED",
      bg: "bg-amber-500/20 border-amber-500/40 text-amber-300",
      icon: AlertCircle,
      glow: "ring-1 ring-amber-500/40",
    }
  } else if (!faceDetected || absenceReason === "no_face") {
    statusBadge = {
      text: "NO FACE",
      bg: "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse",
      icon: AlertCircle,
      glow: "ring-1 ring-red-500/50",
    }
  } else if (absenceReason === "low_lighting") {
    statusBadge = {
      text: "LOW LIGHT",
      bg: "bg-amber-500/20 border-amber-500/40 text-amber-300",
      icon: AlertCircle,
      glow: "ring-1 ring-amber-500/40",
    }
  }

  const StatusIcon = statusBadge.icon

  return (
    <div
      style={{
        position: "fixed",
        bottom: "84px",
        right: "24px",
        zIndex: 99999,
      }}
      className={`transition-all duration-300 ease-out select-none font-mono ${
        isMinimized ? "w-56" : "w-64"
      } bg-neutral-950/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden`}
    >
      {/* ── Top Header Bar ── */}
      <div className="bg-white/[0.04] border-b border-white/10 px-2.5 py-1.5 flex items-center justify-between text-[9px]">
        <div className="flex items-center gap-1.5 text-neutral-300 font-bold uppercase tracking-wider">
          <Video className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>PROCTOR HUD</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          <span
            className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border flex items-center gap-1 ${statusBadge.bg} ${statusBadge.glow}`}
          >
            <StatusIcon className="w-2.5 h-2.5 shrink-0" />
            <span>{statusBadge.text}</span>
          </span>

          {/* Minimize / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsMinimized((v) => !v)}
            className="p-0.5 text-neutral-400 hover:text-white transition-colors"
            title={isMinimized ? "Expand preview" : "Minimize preview"}
          >
            {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* ── Video Feed Area ── */}
      {!isMinimized && (
        <>
          <div className="relative aspect-[4/3] bg-neutral-900 overflow-hidden flex items-center justify-center">
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
              onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Futuristic Corner Reticle HUD Overlay */}
            <div className="absolute inset-2 pointer-events-none transition-opacity duration-300">
              {faceDetected && !isMultipleFaces ? (
                <div className="relative w-full h-full border border-emerald-500/20 rounded-lg">
                  {/* Top-Left Bracket */}
                  <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                  {/* Top-Right Bracket */}
                  <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                  {/* Bottom-Left Bracket */}
                  <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                  {/* Bottom-Right Bracket */}
                  <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-emerald-400" />

                  {/* Subtle Center Crosshair */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 opacity-40">
                    <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-emerald-400 -translate-x-1/2" />
                    <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-emerald-400 -translate-y-1/2" />
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full border border-dashed border-red-500/40 rounded-lg animate-pulse">
                  {/* Red Alert Corner Markers */}
                  <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-red-500" />
                  <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-red-500" />
                  <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-red-500" />
                  <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-red-500" />
                </div>
              )}
            </div>

            {/* Bottom Confidence Tag */}
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[8px] text-neutral-300 font-bold">
              {faceDetected ? `${Math.round(confidence * 100)}% CONF` : "0% CONF"}
            </div>
          </div>

          {/* ── Bottom Micro-Guidance Ticker ── */}
          <div className="bg-neutral-900/90 border-t border-white/5 px-2.5 py-1 flex items-center gap-1.5 text-[8.5px] text-neutral-300">
            <Sparkles className="w-2.5 h-2.5 text-signal shrink-0" />
            <span className="truncate" title={hint}>
              {hint || "Optimal framing & lighting"}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
