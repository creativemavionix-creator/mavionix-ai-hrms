"use client"

import React from "react"
import { Brain, AlertTriangle, HelpCircle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

// 1. AI Provenance Chip: Small indicator marking AI output
export interface AiProvenanceChipProps {
  className?: string
  label?: string
}

export function AiProvenanceChip({ className, label = "AI EVAL" }: AiProvenanceChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold font-mono tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase shrink-0",
        className
      )}
    >
      <Brain className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}

// 2. AI Confidence Card: Score with custom circular indicator
export interface AiConfidenceCardProps {
  score: number
  label: string
  detail?: string
  className?: string
}

export function AiConfidenceCard({ score, label, detail, className }: AiConfidenceCardProps) {
  const percentage = Math.min(100, Math.max(0, score))
  const strokeDashoffset = 100 - percentage

  return (
    <div className={cn("glass-card p-5 rounded-2xl flex items-center justify-between gap-4", className)}>
      <div className="space-y-1.5 text-left">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{label}</span>
          <AiProvenanceChip label="AI SCORE" />
        </div>
        <p className="text-2xl font-bold text-white font-mono">{percentage}%</p>
        {detail && <p className="text-[10px] text-neutral-500 font-mono">{detail}</p>}
      </div>

      {/* Mini Circular SVG Gauge */}
      <div className="relative w-14 h-14 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-white/[0.04] stroke-current"
            strokeWidth="3.5"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="text-purple-500 stroke-current transition-all duration-500"
            strokeDasharray={`${percentage}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white">
          {percentage}%
        </div>
      </div>
    </div>
  )
}

// 3. AI Risk Warning Banner
export interface AiRiskWarningProps {
  title: string
  message: string
  className?: string
}

export function AiRiskWarning({ title, message, className }: AiRiskWarningProps) {
  return (
    <div
      className={cn(
        "bg-amber-500/5 border border-amber-500/20 text-amber-400 p-4 rounded-xl flex items-start gap-3 text-left font-mono",
        className
      )}
    >
      <div className="w-7 h-7 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="text-[10px] font-bold tracking-widest uppercase">{title}</h4>
          <AiProvenanceChip label="RISK CHECK" />
        </div>
        <p className="text-[10px] text-neutral-400 leading-normal">{message}</p>
      </div>
    </div>
  )
}

// 4. AI Summary Panel: Featured card styling with gradient top border
export interface AiSummaryPanelProps {
  title: string
  bullets: string[]
  className?: string
}

export function AiSummaryPanel({ title, bullets, className }: AiSummaryPanelProps) {
  return (
    <div className={cn("featured-card p-6 space-y-4 text-left", className)}>
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          {title}
        </h4>
        <AiProvenanceChip label="AI INSIGHT" />
      </div>
      <ul className="text-[11px] text-neutral-300 font-mono space-y-2 list-disc pl-4 leading-relaxed">
        {bullets.map((b, idx) => (
          <li key={idx} className="marker:text-purple-400">
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

// 5. AI Thinking Waves Animation
export interface AiThinkingStateProps {
  className?: string
  status?: string
}

export function AiThinkingState({ className, status = "AI IS PROCESSING ANSWER" }: AiThinkingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2.5 p-6 glass-card rounded-2xl", className)}>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-6 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-8 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        <span className="w-1.5 h-6 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "450ms" }} />
        <span className="w-1.5 h-4 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "600ms" }} />
      </div>
      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono animate-pulse">
        {status}
      </p>
    </div>
  )
}
