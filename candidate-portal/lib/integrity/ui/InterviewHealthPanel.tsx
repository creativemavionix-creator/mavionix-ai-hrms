"use client"

import { Video, UserCheck, Sun, Mic, Wifi, AlertTriangle } from "lucide-react"

export interface InterviewHealthPanelProps {
  cameraHealthy: boolean
  faceHealthy: boolean
  lightingStatus: "optimal" | "low" | "covered"
  micHealthy: boolean
  netHealthy: boolean
  guidanceHint: string
}

export default function InterviewHealthPanel({
  cameraHealthy,
  faceHealthy,
  lightingStatus,
  micHealthy,
  netHealthy,
  guidanceHint,
}: InterviewHealthPanelProps) {
  return (
    <div className="bg-[var(--hm-bg-inset)] border-b border-[var(--hm-border-subtle)] px-6 py-2 flex items-center justify-between font-mono text-[9px]">
      {/* 5 Health Status Badges */}
      <div className="flex items-center gap-4 text-[var(--hm-text-muted)]">
        <span className="font-bold uppercase tracking-wider text-[var(--hm-text-primary)]">
          INTERVIEW HEALTH:
        </span>

        {/* Camera */}
        <span className={`flex items-center gap-1 font-bold ${cameraHealthy ? "text-green-400" : "text-red-400"}`}>
          <Video className="w-3 h-3" /> {cameraHealthy ? "🟢 CAMERA" : "🔴 CAMERA"}
        </span>

        {/* Face */}
        <span className={`flex items-center gap-1 font-bold ${faceHealthy ? "text-green-400" : "text-amber-400"}`}>
          <UserCheck className="w-3 h-3" /> {faceHealthy ? "🟢 FACE" : "🟡 FACE MISSING"}
        </span>

        {/* Lighting */}
        <span
          className={`flex items-center gap-1 font-bold ${
            lightingStatus === "optimal"
              ? "text-green-400"
              : lightingStatus === "low"
              ? "text-amber-400"
              : "text-red-400"
          }`}
        >
          <Sun className="w-3 h-3" />{" "}
          {lightingStatus === "optimal" ? "🟢 LIGHTING" : lightingStatus === "low" ? "🟡 LOW LIGHT" : "🔴 DARK"}
        </span>

        {/* Mic */}
        <span className={`flex items-center gap-1 font-bold ${micHealthy ? "text-green-400" : "text-red-400"}`}>
          <Mic className="w-3 h-3" /> {micHealthy ? "🟢 MIC" : "🔴 MIC DISCONNECTED"}
        </span>

        {/* Net */}
        <span className={`flex items-center gap-1 font-bold ${netHealthy ? "text-green-400" : "text-red-400"}`}>
          <Wifi className="w-3 h-3" /> {netHealthy ? "🟢 NETWORK" : "🔴 OFFLINE"}
        </span>
      </div>

      {/* Guidance Hint Banner */}
      <div className="flex items-center gap-1.5 text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
        <span className="truncate max-w-xs">{guidanceHint}</span>
      </div>
    </div>
  )
}
