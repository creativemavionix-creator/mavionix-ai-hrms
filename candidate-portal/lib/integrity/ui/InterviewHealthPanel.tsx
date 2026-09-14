"use client"

import { Video, UserCheck, Sun, Mic, Wifi, AlertTriangle, Users } from "lucide-react"

export interface InterviewHealthPanelProps {
  cameraHealthy: boolean
  faceHealthy: boolean
  lightingStatus: "optimal" | "low" | "covered"
  micHealthy: boolean
  netHealthy: boolean
  guidanceHint: string
  isMultipleFaces?: boolean
  absenceReason?: string
}

export default function InterviewHealthPanel({
  cameraHealthy,
  faceHealthy,
  lightingStatus,
  micHealthy,
  netHealthy,
  guidanceHint,
  isMultipleFaces = false,
  absenceReason = "none",
}: InterviewHealthPanelProps) {
  // Face badge content
  let faceBadge = {
    color: "text-emerald-400",
    text: "1 FACE VERIFIED",
    icon: UserCheck,
  }

  if (isMultipleFaces || absenceReason === "multiple_faces") {
    faceBadge = {
      color: "text-red-400 animate-pulse font-extrabold",
      text: "MULTIPLE FACES",
      icon: Users,
    }
  } else if (!faceHealthy) {
    if (absenceReason === "looking_away") {
      faceBadge = {
        color: "text-amber-400 font-bold",
        text: "LOOKING AWAY",
        icon: AlertTriangle,
      }
    } else if (absenceReason === "head_turned") {
      faceBadge = {
        color: "text-amber-400 font-bold",
        text: "HEAD TURNED",
        icon: AlertTriangle,
      }
    } else if (absenceReason === "face_covered") {
      faceBadge = {
        color: "text-amber-400 font-bold",
        text: "FACE COVERED",
        icon: AlertTriangle,
      }
    } else {
      faceBadge = {
        color: "text-red-400 font-bold",
        text: "FACE MISSING",
        icon: UserCheck,
      }
    }
  }

  const FaceIcon = faceBadge.icon

  return (
    <div className="bg-neutral-950/80 backdrop-blur-md border-b border-white/[0.08] px-6 py-2 flex items-center justify-between font-mono text-[9px]">
      {/* 5 Health Status Badges */}
      <div className="flex items-center gap-4 text-neutral-400">
        <span className="font-extrabold uppercase tracking-wider text-neutral-200">
          PROCTOR TELEMETRY:
        </span>

        {/* Camera */}
        <span className={`flex items-center gap-1 font-bold ${cameraHealthy ? "text-emerald-400" : "text-red-400"}`}>
          <Video className="w-3 h-3" /> {cameraHealthy ? "🟢 CAMERA" : "🔴 CAMERA"}
        </span>

        {/* Face Status */}
        <span className={`flex items-center gap-1 font-bold ${faceBadge.color}`}>
          <FaceIcon className="w-3 h-3" /> {faceBadge.text}
        </span>

        {/* Lighting */}
        <span
          className={`flex items-center gap-1 font-bold ${
            lightingStatus === "optimal"
              ? "text-emerald-400"
              : lightingStatus === "low"
              ? "text-amber-400"
              : "text-red-400"
          }`}
        >
          <Sun className="w-3 h-3" />{" "}
          {lightingStatus === "optimal" ? "🟢 LIGHTING" : lightingStatus === "low" ? "🟡 LOW LIGHT" : "🔴 DARK"}
        </span>

        {/* Mic */}
        <span className={`flex items-center gap-1 font-bold ${micHealthy ? "text-emerald-400" : "text-red-400"}`}>
          <Mic className="w-3 h-3" /> {micHealthy ? "🟢 AUDIO" : "🔴 MIC DISCONNECTED"}
        </span>

        {/* Net */}
        <span className={`flex items-center gap-1 font-bold ${netHealthy ? "text-emerald-400" : "text-red-400"}`}>
          <Wifi className="w-3 h-3" /> {netHealthy ? "🟢 NETWORK" : "🔴 OFFLINE"}
        </span>
      </div>

      {/* Guidance Hint Banner */}
      <div className="flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="truncate max-w-sm">{guidanceHint}</span>
      </div>
    </div>
  )
}
