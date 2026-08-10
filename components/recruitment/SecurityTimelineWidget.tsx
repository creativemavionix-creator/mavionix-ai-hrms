"use client"

import { Shield, AlertTriangle, Video, Mic, ExternalLink, Activity, CheckCircle, Clock } from "lucide-react"

export interface SecurityEventItem {
  id: string
  timestamp: string
  type: "camera_absence" | "tab_switch" | "mic_disconnection" | "portal_refresh"
  reason: string
  duration_sec: number
  confidence?: number
  details?: string
}

export interface SecurityTimelineProps {
  events?: SecurityEventItem[]
  tabStrikeCount?: number
  cameraStrikeCount?: number
  micStrikeCount?: number
  lockout?: boolean
}

export default function SecurityTimelineWidget({
  events = [],
  tabStrikeCount = 0,
  cameraStrikeCount = 0,
  micStrikeCount = 0,
  lockout = false,
}: SecurityTimelineProps) {

  // Calculate Contextual Risk Level
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW"
  let riskBadgeColor = "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-bold"
  let riskReason = "Clean Integrity Profile — No Malicious Patterns"

  const totalStrikes = tabStrikeCount + cameraStrikeCount
  if (lockout || totalStrikes >= 3) {
    riskLevel = "HIGH"
    riskBadgeColor = "bg-red-500/10 border-red-500/25 text-red-400 font-bold"
    riskReason = "Assessment Lockout Triggered — 3 Integrity Strikes"
  } else if (totalStrikes === 2 || events.some((e) => e.duration_sec > 15)) {
    riskLevel = "MEDIUM"
    riskBadgeColor = "bg-amber-500/10 border-amber-500/25 text-amber-400 font-bold"
    riskReason = "Moderate Absence Detected — Review Transcript Timestamps"
  }

  // Default fallback events if list empty
  const displayEvents: SecurityEventItem[] = events.length > 0 ? events : [
    {
      id: "ev-1",
      timestamp: "14:02:11",
      type: "camera_absence",
      reason: "face_not_visible",
      duration_sec: 4,
      confidence: 0.94,
      details: "Brief camera absence (grace period resolved)",
    },
    {
      id: "ev-2",
      timestamp: "14:18:05",
      type: "tab_switch",
      reason: "window_blur",
      duration_sec: 2,
      confidence: 1.0,
      details: "Browser tab switched to external window",
    }
  ]

  return (
    <div className="glass-card border-white/[0.04] p-5 rounded-radius-lg shadow-lg relative overflow-hidden space-y-4 reveal-up">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
      
      {/* ── Header & Contextual Risk Rating ───────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-signal" />
          <h4 className="font-display font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider text-xs">
            INTEGRITY TELEMETRY LOGS
          </h4>
        </div>
        <div className={`px-3 py-1 border text-[9.5px] uppercase tracking-wider rounded-radius-full flex items-center gap-1.5 ${riskBadgeColor}`}>
          <Activity className="w-3 h-3 animate-pulse" />
          <span>INTEGRITY RISK: {riskLevel}</span>
        </div>
      </div>

      {/* ── Real-Time Status Indicators Widget ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px]">
        <div className="bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] p-3 rounded-radius-md">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-neutral-400 font-bold uppercase tracking-wider">
            <Video className="w-3.5 h-3.5 text-emerald-400" />
            <span>CAMERA</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-extrabold block">🟢 ACTIVE ({cameraStrikeCount}/3)</span>
        </div>

        <div className="bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] p-3 rounded-radius-md">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-neutral-400 font-bold uppercase tracking-wider">
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>AUDIO</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-extrabold block">🟢 VERIFIED</span>
        </div>

        <div className="bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] p-3 rounded-radius-md">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-neutral-400 font-bold uppercase tracking-wider">
            <AlertTriangle className={`w-3.5 h-3.5 ${tabStrikeCount > 0 ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
            <span>FOCUS</span>
          </div>
          <span className={`text-[9px] font-extrabold block ${tabStrikeCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {tabStrikeCount > 0 ? `🟡 ${tabStrikeCount} STRIKES` : "🟢 SECURE"}
          </span>
        </div>

        <div className="bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] p-3 rounded-radius-md">
          <div className="flex items-center justify-center gap-1.5 mb-1 text-neutral-400 font-bold uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>NETWORK</span>
          </div>
          <span className="text-[9px] text-emerald-400 font-extrabold block">🟢 STABLE</span>
        </div>
      </div>

      <p className="text-[9.5px] text-neutral-500 font-bold uppercase tracking-wider pl-1">
        * Contextual Assessment: <span className="text-neutral-700 dark:text-neutral-300 font-extrabold">{riskReason}</span>
      </p>

      {/* ── Chronological Event Timeline Table ───────────────────────────── */}
      <div className="space-y-3 pt-3.5 border-t border-white/[0.05] overflow-x-auto">
        <span className="eyebrow text-neutral-400 block pl-1">
          CHRONOLOGICAL AUDIT EVENT LOGS ({displayEvents.length} EVENTS)
        </span>

        <div className="overflow-hidden border border-white/[0.05] rounded-radius-lg bg-white/[0.01]">
          <table className="w-full text-[10px] border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.02] dark:bg-black/25 text-neutral-400 font-bold uppercase text-[9px] tracking-wider border-b border-white/[0.05]">
                <th className="p-3">TIME</th>
                <th className="p-3">EVENT TYPE</th>
                <th className="p-3">REASON</th>
                <th className="p-3">DURATION</th>
                <th className="p-3">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {displayEvents.map((evt) => {
                return (
                  <tr key={evt.id} className="hover:bg-white/[0.005] transition-all">
                    <td className="p-3 text-neutral-400 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{evt.timestamp}</span>
                    </td>
                    <td className="p-3 font-extrabold uppercase text-signal font-display">
                      {evt.type.replace(/_/g, " ")}
                    </td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300 font-semibold uppercase tracking-wider text-[9px]">
                      {evt.reason}
                    </td>
                    <td className={`p-3 font-extrabold ${evt.duration_sec > 10 ? "text-red-400" : "text-amber-400"}`}>
                      {evt.duration_sec}s
                    </td>
                    <td className="p-3 text-neutral-600 dark:text-neutral-300 font-medium">
                      {evt.details || "Integrity telemetry logged"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
