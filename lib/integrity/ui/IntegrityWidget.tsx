"use client"

import { Shield, Activity, Video, Mic, AlertTriangle, CheckCircle } from "lucide-react"

export interface IntegrityScoreResult {
  score: number
  ratingBand: "EXCELLENT" | "GOOD" | "MODERATE" | "HIGH_RISK"
  badgeColor: string
  cameraHealthPct: number
  browserFocusPct: number
  microphoneHealthPct: number
  networkHealthPct: number
  longestAbsenceSec: number
  totalEventsCount: number
  deductionsSummary: string[]
}

export interface IntegrityWidgetProps {
  scoreResult?: IntegrityScoreResult
}

export default function IntegrityWidget({ scoreResult }: IntegrityWidgetProps) {
  const result: IntegrityScoreResult = scoreResult || {
    score: 88,
    ratingBand: "GOOD",
    badgeColor: "bg-blue-500/15 border-blue-500/30 text-blue-400 font-bold",
    cameraHealthPct: 97,
    browserFocusPct: 100,
    microphoneHealthPct: 99,
    networkHealthPct: 100,
    longestAbsenceSec: 18,
    totalEventsCount: 2,
    deductionsSummary: ["-5 pts: Minor camera absence (18s)"],
  }

  return (
    <div className="bg-[var(--hm-bg-card)] border border-[var(--hm-border)] p-4 space-y-4 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[var(--hm-border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#ff6b1a]" />
          <h4 className="font-bold text-[var(--hm-text-primary)] uppercase tracking-wider text-xs">
            INTERVIEW INTEGRITY ENGINE
          </h4>
        </div>
        <div className={`px-3 py-1 border text-[10px] uppercase flex items-center gap-2 ${result.badgeColor}`}>
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>INTEGRITY SCORE: {result.score} / 100 ({result.ratingBand.replace("_", " ")})</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-2.5 space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <Video className="w-3 h-3 text-green-400" /> CAMERA
          </div>
          <div className="text-sm font-bold text-green-400">{result.cameraHealthPct}%</div>
          <span className="text-[8px] text-[var(--hm-text-muted)] block">Max Absence: {result.longestAbsenceSec}s</span>
        </div>

        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-2.5 space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <AlertTriangle className="w-3 h-3 text-green-400" /> FOCUS
          </div>
          <div className="text-sm font-bold text-green-400">{result.browserFocusPct}%</div>
          <span className="text-[8px] text-[var(--hm-text-muted)] block">Browser Tabs</span>
        </div>

        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-2.5 space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <Mic className="w-3 h-3 text-green-400" /> MICROPHONE
          </div>
          <div className="text-sm font-bold text-green-400">{result.microphoneHealthPct}%</div>
          <span className="text-[8px] text-[var(--hm-text-muted)] block">Audio Health</span>
        </div>

        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-2.5 space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <CheckCircle className="w-3 h-3 text-green-400" /> NETWORK
          </div>
          <div className="text-sm font-bold text-green-400">{result.networkHealthPct}%</div>
          <span className="text-[8px] text-[var(--hm-text-muted)] block">Connectivity</span>
        </div>
      </div>

      {result.deductionsSummary.length > 0 && (
        <div className="pt-2 border-t border-[var(--hm-border-subtle)] text-[10px] space-y-1">
          <span className="text-[var(--hm-text-muted)] font-bold uppercase tracking-wider block">SCORE DEDUCTIONS:</span>
          {result.deductionsSummary.map((d, i) => (
            <div key={i} className="text-amber-400 font-mono text-[9px] flex items-center gap-1.5">
              <span>•</span> {d}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
