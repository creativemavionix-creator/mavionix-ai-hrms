"use client"

import { Shield, Activity, Video, Mic, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { IntegrityScoreResult } from "../engine/risk_scorer"

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
    <div className="bg-[var(--hm-bg-card)] border border-[var(--hm-border)] p-6 rounded-2xl shadow-xl space-y-5 font-mono text-base">
      {/* Top Title & 0-100 Score Badge */}
      <div className="flex items-center justify-between border-b border-[var(--hm-border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--hm-accent)]" />
          <h4 className="font-bold text-[var(--hm-text-primary)] uppercase tracking-wider text-base">
            INTERVIEW INTEGRITY ENGINE
          </h4>
        </div>
        <div className={`px-3 py-1 border text-lg uppercase flex items-center gap-2 ${result.badgeColor}`}>
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span>INTEGRITY SCORE: {result.score} / 100 ({result.ratingBand.replace("_", " ")})</span>
        </div>
      </div>

      {/* 4 Domain Gauges */}
      <div className="grid grid-cols-4 gap-2 text-center text-lg">
        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <Video className="w-3 h-3 text-green-400" /> CAMERA
          </div>
          <div className="text-lg font-bold text-green-400">{result.cameraHealthPct}%</div>
          <span className="text-base text-[var(--hm-text-muted)] block">Max Absence: {result.longestAbsenceSec}s</span>
        </div>

        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <AlertTriangle className="w-3 h-3 text-green-400" /> FOCUS
          </div>
          <div className="text-lg font-bold text-green-400">{result.browserFocusPct}%</div>
          <span className="text-base text-[var(--hm-text-muted)] block">Browser Tabs</span>
        </div>

        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <Mic className="w-3 h-3 text-green-400" /> MICROPHONE
          </div>
          <div className="text-lg font-bold text-green-400">{result.microphoneHealthPct}%</div>
          <span className="text-base text-[var(--hm-text-muted)] block">Audio Health</span>
        </div>

        <div className="bg-[var(--hm-bg-inset)] border border-[var(--hm-border-subtle)] p-3 rounded-xl space-y-1">
          <div className="flex items-center justify-center gap-1 text-[var(--hm-text-primary)] font-bold">
            <CheckCircle className="w-3 h-3 text-green-400" /> NETWORK
          </div>
          <div className="text-lg font-bold text-green-400">{result.networkHealthPct}%</div>
          <span className="text-base text-[var(--hm-text-muted)] block">Connectivity</span>
        </div>
      </div>

      {/* Deductions Summary */}
      {result.deductionsSummary.length > 0 && (
        <div className="pt-2 border-t border-[var(--hm-border-subtle)] text-lg space-y-1">
          <span className="text-[var(--hm-text-muted)] font-bold uppercase tracking-wider block">SCORE DEDUCTIONS:</span>
          {result.deductionsSummary.map((d, i) => (
            <div key={i} className="text-amber-400 font-mono text-base flex items-center gap-1.5">
              <span>•</span> {d}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
