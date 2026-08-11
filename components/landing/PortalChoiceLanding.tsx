"use client"

import React from "react"
import {
  Brain, Briefcase, UserCheck, Sparkles, ArrowRight, ShieldCheck,
  Zap, Award, CheckCircle2, Star, Flame, Clock, RefreshCw
} from "lucide-react"

interface PortalChoiceLandingProps {
  onSelectRole: (role: "recruiter" | "candidate") => void
}

export default function PortalChoiceLanding({ onSelectRole }: PortalChoiceLandingProps) {
  return (
    <div className="min-h-screen bg-[var(--hm-bg-primary)] text-white relative overflow-hidden font-sans flex flex-col justify-between p-4 sm:p-8">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/15 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[30%] left-[35%] w-[35%] h-[35%] bg-fuchsia-600/10 blur-[130px] rounded-full pointer-events-none z-0" />

      {/* Header Bar */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 border border-white/20">
            <Brain className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg tracking-wider bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
              HIREMIND AI
            </span>
            <span className="block text-[9px] text-neutral-400 font-mono tracking-widest uppercase">
              Autonomous Talent Intelligence Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            LIVE SYSTEM v2.5 ACTIVE
          </span>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-auto py-8 space-y-10 text-center">
        {/* Eyebrow & Hero Title */}
        <div className="space-y-4 max-w-3xl mx-auto reveal-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-neutral-300 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>Next-Gen AI Autonomous Recruitment Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-white leading-tight">
            Welcome to <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">HireMind AI</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-400 font-normal leading-relaxed max-w-2xl mx-auto">
            Choose your portal to enter the autonomous hiring ecosystem. Whether you are looking to acquire top AI talent or track your dream career application in real time.
          </p>
        </div>

        {/* Two Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          
          {/* Card 1: RECRUITER PORTAL */}
          <div 
            onClick={() => onSelectRole("recruiter")}
            className="group glass-card border border-white/[0.08] hover:border-violet-500/50 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 shadow-2xl cursor-pointer flex flex-col justify-between space-y-8 bg-gradient-to-b from-white/[0.02] to-transparent"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-0.5 shadow-xl shadow-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-full h-full bg-[#0d0f17] rounded-[14px] flex items-center justify-center text-violet-400 group-hover:text-white transition-colors">
                    <Briefcase className="w-7 h-7" />
                  </div>
                </div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                  ENTERPRISE SUITE
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-display font-extrabold text-white tracking-wide group-hover:text-violet-300 transition-colors flex items-center gap-2">
                  I WANT TO HIRE
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed mt-2">
                  Access the AI Recruiter Workstation. Manage job requisitions, evaluate candidate dossiers, inspect live proctoring telemetry, and trigger automated offer recommendations.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Automated AI Candidate Screening & Scoring</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Neural Proctoring & Cheating Detection Rules</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Recruiter AI Copilot & Real-Time Sync</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-bold text-violet-400 group-hover:text-white transition-colors border-t border-white/[0.05]">
              <span className="uppercase tracking-wider">Launch Recruiter Workstation</span>
              <div className="w-8 h-8 rounded-full bg-violet-500/20 group-hover:bg-violet-600 flex items-center justify-center text-white transition-all group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: CANDIDATE PORTAL */}
          <div 
            onClick={() => onSelectRole("candidate")}
            className="group glass-card border border-white/[0.08] hover:border-emerald-500/50 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 shadow-2xl cursor-pointer flex flex-col justify-between space-y-8 bg-gradient-to-b from-white/[0.02] to-transparent"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-0.5 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                  <div className="w-full h-full bg-[#0d0f17] rounded-[14px] flex items-center justify-center text-emerald-400 group-hover:text-white transition-colors">
                    <UserCheck className="w-7 h-7" />
                  </div>
                </div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  JOB SEEKER PORTAL
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-display font-extrabold text-white tracking-wide group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                  I WANT TO BE HIRED
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed mt-2">
                  Submit your application, track your live review timeline, submit project assignment tasks, request HR deadline extensions, and complete AI proctored interview rounds.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant Application Submission & Resume Parsing</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Live Stage Timeline & Project Assignment Timer</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Interactive Proctored AI Video Interview Room</span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-white transition-colors border-t border-white/[0.05]">
              <span className="uppercase tracking-wider">Launch Candidate Portal</span>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 group-hover:bg-emerald-600 flex items-center justify-center text-white transition-all group-hover:translate-x-1">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto py-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 font-mono gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>HireMind AI Workstation · Encrypted & Autonomous</span>
        </div>
        <div>
          <span>Powered by Gemini 2.0 & MediaPipe Vision Proctor</span>
        </div>
      </footer>
    </div>
  )
}
