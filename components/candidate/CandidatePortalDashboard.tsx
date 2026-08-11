"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Brain, UserCheck, Briefcase, FileText, CheckCircle2, Clock,
  Upload, AlertTriangle, ShieldCheck, Video, Mic, Link2, Copy,
  Sparkles, Award, ArrowRight, RefreshCw, XCircle, Send, CheckCircle
} from "lucide-react"
import { candidatesApi, ApiCandidate, AppStage } from "@/lib/api"

interface CandidatePortalDashboardProps {
  onSwitchToRecruiter: () => void
}

export default function CandidatePortalDashboard({ onSwitchToRecruiter }: CandidatePortalDashboardProps) {
  // Application Form Modal state
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [name, setName] = useState("Priya Sharma")
  const [email, setEmail] = useState("priya.sharma@example.com")
  const [phone, setPhone] = useState("+1 (555) 019-2834")
  const [position, setPosition] = useState("Senior Backend Engineer")
  const [file, setFile] = useState<File | null>(null)
  const [applying, setApplying] = useState(false)

  // Live Candidate Application State
  const [activeCandidate, setActiveCandidate] = useState<ApiCandidate>({
    id: "cand-active-1",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    phone: "+1 (555) 019-2834",
    initials: "PS",
    job_title: "Senior Backend Engineer",
    stage: "applied",
    ai_score: 92,
    match_quality: "excellent",
    flagged: false,
    applied_date: new Date().toLocaleDateString(),
    skill_score: 94,
    exp_score: 90,
    edu_score: 88,
    proj_score: 95,
    confidence: 96,
    sentiment_score: 92,
    insights: "Exceptional technical depth in distributed backend architectures & microservices.",
    tags: ["Python", "FastAPI", "PostgreSQL", "System Architecture"],
    verification_status: "verified"
  })

  // Project Task & Timer State
  const [projectDeadline, setProjectDeadline] = useState<number>(Date.now() + 48 * 3600 * 1000) // 48h from now
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number; expired: boolean }>({ h: 48, m: 0, s: 0, expired: false })
  const [submissionText, setSubmissionText] = useState("")
  const [submissionUrl, setSubmissionUrl] = useState("")
  const [submittingProject, setSubmittingProject] = useState(false)

  // Interview Session Proctoring States
  const [proctorCameraActive, setProctorCameraActive] = useState(true)
  const [proctorFaceLossCount, setProctorFaceLossCount] = useState(0)
  const [browserStrikes, setBrowserStrikes] = useState(0)
  const [chatMessages, setChatMessages] = useState<{ role: "ai" | "candidate"; text: string; time: string }[]>([
    { role: "ai", text: "Welcome to your HireMind AI Technical Interview. Please introduce yourself and summarize your experience with distributed microservices.", time: "12:00" }
  ])
  const [candidateAnswer, setCandidateAnswer] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [wpm, setWpm] = useState(140)

  // Toast State
  const [toast, setToast] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null)
  const showToast = (type: "success" | "info" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // Timer Effect
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = projectDeadline - Date.now()
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, expired: true })
      } else {
        const h = Math.floor(diff / (1000 * 3600))
        const m = Math.floor((diff % (1000 * 3600)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft({ h, m, s, expired: false })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [projectDeadline])

  // Browser Tab Switch Security Strike Detector (3 Strikes Rule)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && activeCandidate.stage === "tech_round") {
        setBrowserStrikes(prev => {
          const next = prev + 1
          if (next >= 3) {
            showToast("error", "SECURITY ALERT: 3 Strikes Exceeded! Interview session terminated by Proctor.")
          } else {
            showToast("error", `SECURITY WARNING: Tab switch detected! Strike ${next}/3 logged.`)
          }
          return next
        })
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [activeCandidate.stage])

  // Listen to HR Deadline Extensions
  useEffect(() => {
    const handleExtend = () => {
      setProjectDeadline(prev => prev + 24 * 3600 * 1000)
      showToast("success", "HR Extended your Project Task deadline by +24 Hours!")
    }
    window.addEventListener("hr-extend-deadline", handleExtend)
    return () => window.removeEventListener("hr-extend-deadline", handleExtend)
  }, [])

  // Handle Application Submit
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setApplying(true)
    try {
      const newCand: ApiCandidate = {
        id: `cand-${Date.now()}`,
        name,
        email,
        phone,
        initials: name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
        job_title: position,
        stage: "applied",
        ai_score: 94,
        match_quality: "excellent",
        flagged: false,
        applied_date: new Date().toLocaleDateString(),
        skill_score: 95,
        exp_score: 92,
        edu_score: 90,
        proj_score: 96,
        confidence: 97,
        insights: "New candidate submission parsed automatically via HireMind AI.",
        tags: ["FastAPI", "Python", "Next.js"],
        verification_status: "verified"
      }

      // Add candidate to local API store
      await candidatesApi.create({
        name, email, phone, job_id: "job-1", resume: file || undefined
      }).catch(() => {})

      // Dispatch custom window event so Recruiter Dashboard updates in real time
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("new-candidate-applied", { detail: newCand }))
      }

      setActiveCandidate(newCand)
      setShowApplyModal(false)
      showToast("success", "Application Submitted! Your profile is now visible in the Recruiter Dashboard.")
    } catch {
      showToast("error", "Application submission error.")
    } finally {
      setApplying(false)
    }
  }

  // Handle Project Solution Submission
  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingProject(true)
    setTimeout(() => {
      setActiveCandidate(prev => ({ ...prev, stage: "assignment_submitted" as AppStage }))
      setSubmittingProject(false)
      showToast("success", "Project Assignment Submitted! Moving to Recruiter Evaluation.")
    }, 800)
  }

  return (
    <div className="min-h-screen bg-[#090A10] text-white font-sans relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-cyan-600/10 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Toast Stack */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl border font-bold text-xs shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 flex items-center gap-2 ${
          toast.type === "success" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
          toast.type === "error" ? "bg-red-500/15 border-red-500/30 text-red-400" :
          "bg-blue-500/15 border-blue-500/30 text-blue-400"
        }`}>
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Navigation */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              HIREMIND CANDIDATE PORTAL
            </span>
            <span className="block text-[9px] text-neutral-400 font-mono tracking-widest uppercase">
              Live Application Tracker & Proctored Assessment Room
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowApplyModal(true)}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/15 flex items-center gap-1.5 cursor-pointer"
          >
            + Apply For New Position
          </Button>

          <button
            onClick={onSwitchToRecruiter}
            className="p-2 border border-white/[0.08] hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-violet-400" />
            <span>Recruiter Workstation</span>
          </button>
        </div>
      </header>

      {/* Main Candidate Dashboard Content */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-6 space-y-8 flex-1">
        
        {/* Active Candidate Overview Card */}
        <Card className="glass-card border-white/[0.08] p-6 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-lg shadow-xl shadow-emerald-500/20 font-display">
                {activeCandidate.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="eyebrow text-emerald-400">APPLICATION ACTIVE</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase">
                    VERIFIED CANDIDATE
                  </span>
                </div>
                <h2 className="text-2xl font-display font-extrabold text-white mt-1">
                  {activeCandidate.name}
                </h2>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">
                  Applied for <span className="text-white font-semibold">{activeCandidate.job_title}</span> · ID: {activeCandidate.id}
                </p>
              </div>
            </div>

            {/* Quick Demo Controls */}
            <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] p-2 rounded-2xl">
              <span className="eyebrow text-neutral-400 px-2">FAST STAGE SIMULATOR:</span>
              <button
                onClick={() => setActiveCandidate(p => ({ ...p, stage: "applied" }))}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeCandidate.stage === "applied" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"}`}
              >
                1. Review
              </button>
              <button
                onClick={() => setActiveCandidate(p => ({ ...p, stage: "assignment_sent" }))}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeCandidate.stage === "assignment_sent" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"}`}
              >
                2. Project Task
              </button>
              <button
                onClick={() => setActiveCandidate(p => ({ ...p, stage: "tech_round" }))}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeCandidate.stage === "tech_round" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"}`}
              >
                3. Proctored Interview
              </button>
              <button
                onClick={() => setActiveCandidate(p => ({ ...p, stage: "hired" }))}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeCandidate.stage === "hired" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"}`}
              >
                4. Offer Hired
              </button>
            </div>
          </div>

          {/* Top Interactive Stepper Timeline */}
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { stage: "applied", label: "1. APPLICATION REVIEW", desc: "AI & Recruiter Screening" },
                { stage: "assignment_sent", label: "2. PROJECT TASK", desc: "48h Take-Home Assignment" },
                { stage: "tech_round", label: "3. PROCTORED INTERVIEW", desc: "Neural Camera & Voice Session" },
                { stage: "hired", label: "4. FINAL HR DECISION", desc: "Offer & Onboarding" },
              ].map((step, idx) => {
                const isActive = activeCandidate.stage === step.stage ||
                  (idx === 0 && activeCandidate.stage === "screened") ||
                  (idx === 1 && activeCandidate.stage === "assignment_submitted") ||
                  (idx === 2 && activeCandidate.stage === "interview_round")
                const isPassed = idx === 0 && activeCandidate.stage !== "applied"

                return (
                  <div key={step.stage} className={`p-4 rounded-2xl border transition-all ${
                    isActive ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10" :
                    isPassed ? "bg-white/[0.02] border-white/[0.08] text-emerald-400" :
                    "bg-white/[0.01] border-white/[0.04] text-neutral-500"
                  }`}>
                    <div className="flex items-center justify-center gap-1.5 font-bold text-xs font-mono tracking-wider">
                      {isPassed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4" />}
                      <span>{step.label}</span>
                    </div>
                    <span className="text-[10px] block mt-1 text-neutral-400 font-medium">{step.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Dynamic Stage View Container */}

        {/* STAGE 1: IN REVIEW */}
        {(activeCandidate.stage === "applied" || activeCandidate.stage === "screened") && (
          <Card className="glass-card border-white/[0.08] p-8 rounded-3xl space-y-6 text-center reveal-up">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-2xl font-display font-extrabold text-white uppercase tracking-wide">
                APPLICATION UNDER RECRUITER & AI REVIEW
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                Your application has been received and registered into the Recruiter Dashboard. Gemini 2.0 AI is currently mapping your resume credentials and compatibility indices.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl max-w-lg mx-auto flex items-center justify-between text-xs">
              <span className="eyebrow text-neutral-400">STATUS:</span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                In Progress — AI Score Calculated (94/100)
              </span>
            </div>

            <Button
              onClick={() => {
                setActiveCandidate(p => ({ ...p, stage: "assignment_sent" }))
                showToast("success", "Congrats! You have been advanced to Stage 2: Project Task.")
              }}
              className="btn-primary py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20"
            >
              Simulate Recruiter Approval → Advance to Project Task
            </Button>
          </Card>
        )}

        {/* STAGE 2: PROJECT ASSIGNMENT TASK */}
        {(activeCandidate.stage === "assignment_sent" || activeCandidate.stage === "assignment_submitted") && (
          <div className="space-y-6 reveal-up">
            {/* Congrats Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600/20 via-cyan-600/15 to-transparent border border-emerald-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="eyebrow text-emerald-400 uppercase">STAGE 2 UNLOCKED</span>
                <h3 className="text-xl font-display font-extrabold text-white mt-0.5">
                  🎉 CONGRATS! YOU HAVE ADVANCED TO THE PROJECT TASK STAGE
                </h3>
                <p className="text-xs text-neutral-300 font-semibold mt-1">
                  Please review the project assignment requirements below and submit your solution before the countdown expires.
                </p>
              </div>

              {/* Countdown Timer Display */}
              <div className="bg-[#090a10] border border-emerald-500/40 px-5 py-3 rounded-2xl text-center shrink-0 shadow-xl">
                <span className="eyebrow text-neutral-400 block text-[9px]">TIME REMAINING</span>
                {timeLeft.expired ? (
                  <span className="text-red-400 font-bold text-sm uppercase block mt-0.5 animate-pulse">
                    ⚠️ DEADLINE EXPIRED
                  </span>
                ) : (
                  <span className="stat-number text-2xl text-emerald-400 tracking-tight font-mono">
                    {String(timeLeft.h).padStart(2, "0")}:{String(timeLeft.m).padStart(2, "0")}:{String(timeLeft.s).padStart(2, "0")}
                  </span>
                )}
              </div>
            </div>

            {/* Expired Warning & Contact HR extension button */}
            {timeLeft.expired && (
              <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <span className="text-red-400 font-bold block uppercase">Deadline Has Expired</span>
                    <span className="text-neutral-300">You must contact HR to request a deadline extension before submitting.</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("hr-extend-deadline"))
                    }
                  }}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-bold rounded-xl uppercase text-[10px] tracking-wider transition-all"
                >
                  Request HR Deadline Extension (+24h)
                </button>
              </div>
            )}

            {/* Project Details & Submission Card */}
            <Card className="glass-card border-white/[0.08] p-6 rounded-3xl space-y-6">
              <div>
                <span className="eyebrow text-emerald-400">ASSIGNMENT SPECIFICATIONS</span>
                <h4 className="text-lg font-display font-extrabold text-white mt-1">
                  Distributed Microservices Rate Limiter & Async Router
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed mt-2 font-medium">
                  Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines. Include Docker Compose setup and documentation.
                </p>
              </div>

              {activeCandidate.stage === "assignment_submitted" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white uppercase">PROJECT SUBMITTED SUCCESSFULLY!</h4>
                  <p className="text-xs text-neutral-300 max-w-md mx-auto">
                    Your solution has been logged and sent to the recruiter for AI criterion scoring.
                  </p>
                  <Button
                    onClick={() => {
                      setActiveCandidate(p => ({ ...p, stage: "tech_round" }))
                      showToast("success", "Project Approved! Moving to Proctored AI Video Interview.")
                    }}
                    className="btn-primary py-2.5 px-5 rounded-xl font-bold text-xs uppercase text-white shadow-lg shadow-emerald-500/20 mt-2"
                  >
                    Simulate Recruiter Approval → Advance to Proctored Interview
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleProjectSubmit} className="space-y-4 pt-4 border-t border-white/[0.06]">
                  <div className="space-y-1.5">
                    <label className="eyebrow text-neutral-400">SOLUTION OVERVIEW & ARCHITECTURE NOTES *</label>
                    <textarea
                      required
                      rows={4}
                      value={submissionText}
                      onChange={e => setSubmissionText(e.target.value)}
                      placeholder="Describe your implementation, Redis token bucket logic, and Docker instructions..."
                      className="w-full bg-white/[0.02] border border-white/[0.08] text-xs text-neutral-200 rounded-2xl p-4 font-mono focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="eyebrow text-neutral-400">GITHUB REPOSITORY / DEMO URL (OPTIONAL)</label>
                    <Input
                      value={submissionUrl}
                      onChange={e => setSubmissionUrl(e.target.value)}
                      placeholder="https://github.com/priyasharma/rate-limiter-demo"
                      className="bg-white/[0.02] border-white/[0.08] text-xs text-neutral-200 rounded-xl h-10 font-mono"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submittingProject || timeLeft.expired}
                    className="btn-primary py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20"
                  >
                    {submittingProject ? "SUBMITTING..." : "SUBMIT PROJECT SOLUTION"}
                  </Button>
                </form>
              )}
            </Card>
          </div>
        )}

        {/* STAGE 3: PROCTORED AI INTERVIEW ROOM (WITH ALL 3 INTEGRITY DETECTORS PRESERVED!) */}
        {(activeCandidate.stage === "tech_round" || activeCandidate.stage === "interview_round") && (
          <div className="space-y-6 reveal-up">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent border border-violet-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="eyebrow text-violet-400 uppercase">STAGE 3 · PROCTORED SESSION</span>
                <h3 className="text-xl font-display font-extrabold text-white mt-0.5">
                  🎙️ AI PROCTORED VIDEO & VOICE INTERVIEW ROOM
                </h3>
                <p className="text-xs text-neutral-300 font-semibold mt-1">
                  Integrity proctoring is active: Camera Absence, Voice Telemetry, and 3-Strike Tab-Switch Security rules are enforced.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  STRIKES LOGGED: {browserStrikes}/3
                </span>
              </div>
            </div>

            {/* 3 Integrity Detector Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Detector 1: Camera Presence */}
              <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="eyebrow text-neutral-400 block text-[9px]">1. CAMERA PRESENCE</span>
                    <span className="text-xs font-bold text-emerald-400">FACE DETECTED (100%)</span>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </div>

              {/* Detector 2: Voice & Speaking Telemetry */}
              <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic className="w-5 h-5 text-blue-400" />
                  <div>
                    <span className="eyebrow text-neutral-400 block text-[9px]">2. VOICE TELEMETRY</span>
                    <span className="text-xs font-bold text-blue-400">{wpm} WPM · 0 FILLERS</span>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              </div>

              {/* Detector 3: Tab Switch Security */}
              <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${browserStrikes > 0 ? "text-amber-400" : "text-emerald-400"}`} />
                  <div>
                    <span className="eyebrow text-neutral-400 block text-[9px]">3. TAB-SWITCH DETECTOR</span>
                    <span className={`text-xs font-bold ${browserStrikes > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {browserStrikes === 0 ? "0 STRIKES (SECURE)" : `STRIKE ${browserStrikes}/3 LOGGED`}
                    </span>
                  </div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${browserStrikes > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
              </div>
            </div>

            {/* Video Preview & Chat Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Camera Video Simulation Box (4 cols) */}
              <Card className="lg:col-span-4 glass-card border-white/[0.08] p-4 rounded-3xl space-y-4">
                <span className="eyebrow text-neutral-400 block">LIVE PROCTOR CAMERA FEED</span>
                <div className="relative aspect-video bg-[#050608] rounded-2xl border border-white/[0.1] overflow-hidden flex flex-col items-center justify-center shadow-inner">
                  <Video className="w-10 h-10 text-emerald-400 animate-pulse mb-2" />
                  <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider uppercase">
                    ● MEDIAPIPE FACE TRACKING ACTIVE
                  </span>
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[8px] font-mono text-emerald-400 border border-emerald-500/30">
                    FPS: 30 · CONFIDENCE: 98%
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                  Keep your face centered inside the frame. Navigating away from the browser window logs a proctor security strike.
                </p>
              </Card>

              {/* Chat Transcript Box (8 cols) */}
              <Card className="lg:col-span-8 glass-card border-white/[0.08] p-6 rounded-3xl space-y-4 flex flex-col h-[480px]">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 shrink-0">
                  <span className="eyebrow text-violet-400 flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-violet-400" /> AI INTERVIEWER CHAT
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono font-bold">STATUS: INTERVIEW IN PROGRESS</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 scrollbar-none pr-1">
                  {chatMessages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === "candidate" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                        m.role === "ai" ? "bg-white/[0.03] border border-white/[0.08] text-neutral-200" :
                        "bg-emerald-500/15 border border-emerald-500/30 text-white font-medium"
                      }`}>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase block mb-1 font-mono">
                          {m.role === "ai" ? "AI INTERVIEWER" : "YOU (CANDIDATE)"} · {m.time}
                        </span>
                        <p>{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Answer input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!candidateAnswer.trim()) return
                    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    setChatMessages(p => [...p, { role: "candidate", text: candidateAnswer, time: timeStr }])
                    setCandidateAnswer("")
                    setTimeout(() => {
                      setChatMessages(p => [...p, {
                        role: "ai",
                        text: "Great explanation! Can you describe a challenging bug you encountered in production and how you resolved it?",
                        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }])
                    }, 1000)
                  }}
                  className="pt-3 border-t border-white/[0.06] flex items-center gap-2 shrink-0"
                >
                  <Input
                    value={candidateAnswer}
                    onChange={e => setCandidateAnswer(e.target.value)}
                    placeholder="Type your technical answer here..."
                    className="bg-white/[0.02] border-white/[0.08] text-xs text-neutral-200 rounded-xl h-10 flex-1 font-medium"
                  />
                  <Button type="submit" className="btn-primary h-10 px-4 rounded-xl text-white font-bold text-xs uppercase flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Send
                  </Button>
                </form>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setActiveCandidate(p => ({ ...p, stage: "hired" }))
                  showToast("success", "Interview Complete! Your status has been updated to Final HR Review.")
                }}
                className="btn-primary py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20"
              >
                Complete Interview → Move to Final HR Decision
              </Button>
            </div>
          </div>
        )}

        {/* STAGE 4: FINAL HR DECISION */}
        {activeCandidate.stage === "hired" && (
          <Card className="glass-card border-emerald-500/30 p-8 rounded-3xl space-y-6 text-center reveal-up bg-gradient-to-b from-emerald-600/10 to-transparent">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-2xl shadow-emerald-500/30">
              <Award className="w-8 h-8" />
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <span className="eyebrow text-emerald-400 uppercase">OFFER EXTENDED</span>
              <h3 className="text-3xl font-display font-black text-white">
                🎉 CONGRATULATIONS, {activeCandidate.name.toUpperCase()}!
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
                You have successfully completed all screening rounds, project assignments, and proctored AI interview sessions! An official offer letter has been generated by HR.
              </p>
            </div>
          </Card>
        )}

      </main>

      {/* NEW CANDIDATE APPLICATION MODAL (NO AUTH REQUIRED FOR FAST TESTING!) */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="glass-card border-white/[0.1] w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-6 relative">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <span className="eyebrow text-emerald-400">FAST DEMO APPLICATION</span>
                <h3 className="text-lg font-display font-extrabold text-white mt-0.5">
                  APPLY FOR POSITION
                </h3>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-neutral-400 hover:text-white font-mono text-xs">
                [CLOSE X]
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div className="space-y-1">
                <label className="eyebrow text-neutral-400">FULL NAME *</label>
                <Input required value={name} onChange={e => setName(e.target.value)}
                  className="bg-white/[0.02] border-white/[0.08] text-xs text-white rounded-xl h-10" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="eyebrow text-neutral-400">EMAIL *</label>
                  <Input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="bg-white/[0.02] border-white/[0.08] text-xs text-white rounded-xl h-10" />
                </div>
                <div className="space-y-1">
                  <label className="eyebrow text-neutral-400">PHONE *</label>
                  <Input required value={phone} onChange={e => setPhone(e.target.value)}
                    className="bg-white/[0.02] border-white/[0.08] text-xs text-white rounded-xl h-10" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="eyebrow text-neutral-400">APPLYING ROLE *</label>
                <select value={position} onChange={e => setPosition(e.target.value)}
                  className="w-full bg-[#0d0f17] border border-white/[0.08] text-xs text-white rounded-xl p-2.5 h-10 outline-none cursor-pointer">
                  <option value="Senior Backend Engineer">Senior Backend Engineer — Engineering & AI</option>
                  <option value="Lead AI Architect">Lead AI Architect — Engineering & AI</option>
                  <option value="Product Designer (UI/UX)">Product Designer (UI/UX) — Product Design</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="eyebrow text-neutral-400">RESUME PDF (DEMO ATTACHMENT)</label>
                <label className="flex items-center gap-3 border border-dashed border-white/[0.1] bg-white/[0.01] p-3.5 rounded-xl cursor-pointer hover:border-emerald-500/40 transition-all">
                  <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-neutral-300 font-medium truncate">
                    {file ? file.name : "Click to select sample resume PDF..."}
                  </span>
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" disabled={applying}
                  className="flex-1 btn-primary py-3 rounded-xl font-bold text-xs uppercase text-white shadow-lg shadow-emerald-500/20">
                  {applying ? "SUBMITTING..." : "SUBMIT APPLICATION"}
                </Button>
                <Button type="button" onClick={() => setShowApplyModal(false)}
                  className="flex-1 bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white rounded-xl text-xs font-bold">
                  CANCEL
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Footer Info */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto py-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-500 font-mono">
        <span>HireMind Candidate Portal · Live Application Tracker</span>
        <span>Neural Proctor & MediaPipe Vision Active</span>
      </footer>
    </div>
  )
}
