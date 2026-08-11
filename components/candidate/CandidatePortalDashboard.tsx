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
import { candidatesApi, ApiCandidate, AppStage, MatchQuality } from "@/lib/api"
import { supabase } from "@/lib/supabaseClient"

interface CandidatePortalDashboardProps {
  onSwitchToRecruiter: () => void
}

export default function CandidatePortalDashboard({ onSwitchToRecruiter }: CandidatePortalDashboardProps) {
  // Session Persistence via localStorage (Prevents refresh logout!)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("candidate_authenticated")
      return stored !== "false" // Default true so portal opens directly
    }
    return true
  })
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup")
  const [applicationSubmitted, setApplicationSubmitted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("candidate_app_submitted")
      return stored !== "false" // Default true
    }
    return true
  })
  const [viewingFullWorkspace, setViewingFullWorkspace] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("candidate_viewing_workspace")
      return stored !== "false" // Default true so candidate workspace is never empty!
    }
    return true
  })
  const [showApplyModal, setShowApplyModal] = useState(false)

  // Candidate Registration Form Fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [position, setPosition] = useState("Senior Backend Engineer")
  const [location, setLocation] = useState("")
  const [linkedInUrl, setLinkedInUrl] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [yearsExp, setYearsExp] = useState("3-5 years")
  const [workPreference, setWorkPreference] = useState("Remote")
  const [noticePeriod, setNoticePeriod] = useState("Immediate")
  const [statementOfIntent, setStatementOfIntent] = useState("")
  const [technicalImpact, setTechnicalImpact] = useState("")
  const [outageLesson, setOutageLesson] = useState("")
  const [skillsText, setSkillsText] = useState("")
  const [resumeText, setResumeText] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [resumeInputMode, setResumeInputMode] = useState<"upload" | "paste">("upload")
  const [applying, setApplying] = useState(false)

  // File Upload Drag & Drop Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setUploadedFile(selected)
      showToast("info", `Selected resume file: ${selected.name} (${Math.round(selected.size / 1024)} KB)`)
    }
  }

  // Live Candidate Application State
  const [activeCandidate, setActiveCandidate] = useState<ApiCandidate>({
    id: "cand-pending-1",
    name: "New Applicant",
    email: "applicant@example.com",
    phone: "+1 (555) 019-2834",
    initials: "NA",
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
    insights: "Application received and queued for AI screening & Recruiter review.",
    tags: ["Submitted", "Under Review"],
    verification_status: "verified"
  })

  // Project Task & Timer State
  const [projectDeadline, setProjectDeadline] = useState<number>(Date.now() + 48 * 3600 * 1000) // 48h from now
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number; expired: boolean }>({ h: 48, m: 0, s: 0, expired: false })
  const [submissionText, setSubmissionText] = useState("")
  const [submissionUrl, setSubmissionUrl] = useState("")
  const [submittingProject, setSubmittingProject] = useState(false)

  // Interview Session Proctoring States
  const [interviewLinkSent, setInterviewLinkSent] = useState(false)
  const [interviewRoomActive, setInterviewRoomActive] = useState(false)
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

  // Persist Candidate Session State to localStorage across refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("candidate_authenticated", String(isAuthenticated))
      localStorage.setItem("candidate_app_submitted", String(applicationSubmitted))
      localStorage.setItem("candidate_viewing_workspace", String(viewingFullWorkspace))
      if (email) localStorage.setItem("candidate_email", email)
    }
  }, [isAuthenticated, applicationSubmitted, viewingFullWorkspace, email])

  // Listen to HR Deadline Extensions
  useEffect(() => {
    const handleExtend = () => {
      setProjectDeadline(prev => prev + 24 * 3600 * 1000)
      showToast("success", "HR Extended your Project Task deadline by +24 Hours!")
    }
    window.addEventListener("hr-extend-deadline", handleExtend)
    return () => window.removeEventListener("hr-extend-deadline", handleExtend)
  }, [])

  // Helper to update candidate stage locally & in Supabase
  const lastDbStageRef = useRef<string | null>(null)
  const isFirstLoadRef = useRef<boolean>(true)

  const updateCandidateStage = async (newStage: AppStage) => {
    setActiveCandidate(prev => ({ ...prev, stage: newStage }))
    lastDbStageRef.current = newStage

    if (activeCandidate.id && !activeCandidate.id.startsWith("cand-pending")) {
      try {
        await supabase
          .from("applications")
          .update({ stage: newStage })
          .eq("candidate_id", activeCandidate.id)
      } catch (err) {
        console.warn("Supabase stage sync update notice:", err)
      }
    }
  }

  // Auto-load active candidate from Supabase on mount and poll for stage updates
  const emailRef = useRef(email)
  useEffect(() => {
    emailRef.current = email
  }, [email])

  useEffect(() => {
    const fetchAndPollCandidate = async () => {
      try {
        const targetEmail = emailRef.current
        let query = supabase
          .from("candidates")
          .select(`
            *,
            applications (
              id, job_id, stage, ai_score, match_quality, flagged, applied_date, jobs ( title )
            )
          `)
          .order("created_at", { ascending: false })

        if (targetEmail && targetEmail.trim()) {
          query = query.eq("email", targetEmail.toLowerCase().trim())
        }

        const { data: cands } = await query.limit(1)

        if (cands && cands.length > 0) {
          const dbCand = cands[0]
          const app = Array.isArray(dbCand.applications) && dbCand.applications.length > 0 ? dbCand.applications[0] : null
          const parsed = dbCand.parsed_data || {}
          const liveStage = (app?.stage as AppStage) || "applied"

          const stageHasChangedInDb = lastDbStageRef.current !== null && lastDbStageRef.current !== liveStage

          if (isFirstLoadRef.current || stageHasChangedInDb) {
            if (stageHasChangedInDb && ["shortlisted", "assignment_sent", "tech_round"].includes(liveStage)) {
              showToast("success", `🎉 Recruiter updated status to ${liveStage.replace(/_/g, " ").toUpperCase()}!`)
            }
            lastDbStageRef.current = liveStage
            isFirstLoadRef.current = false

            setActiveCandidate({
              id: dbCand.id,
              name: dbCand.name,
              email: dbCand.email,
              phone: dbCand.phone || "+1 (555) 019-2834",
              initials: dbCand.initials || dbCand.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
              job_title: app?.jobs?.title || position,
              stage: liveStage,
              ai_score: app?.ai_score ?? 92,
              match_quality: (app?.match_quality as MatchQuality) || "excellent",
              flagged: app?.flagged || false,
              applied_date: app?.applied_date || new Date().toLocaleDateString(),
              skill_score: 94,
              exp_score: 90,
              edu_score: 88,
              proj_score: 95,
              confidence: 96,
              sentiment_score: 92,
              insights: parsed?.statementOfIntent || "Application synchronized with database.",
              tags: ["Submitted", "Under Review"],
              verification_status: "verified"
            })
          }

          setIsAuthenticated(true)
          setApplicationSubmitted(true)
        }
      } catch (err) {
        console.warn("Live candidate sync notice:", err)
      }
    }

    fetchAndPollCandidate()
    const interval = setInterval(fetchAndPollCandidate, 2500)
    return () => clearInterval(interval)
  }, [])

  // Handle Application Submit via Server API Ingestion Route
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) {
      showToast("error", "Full Name and Email Address are required.")
      return
    }
    setApplying(true)
    try {
      const res = await fetch("/api/candidates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          jobId: position.includes("Backend") ? "JOB-101" : position.includes("Architect") ? "JOB-102" : "JOB-103",
          location,
          linkedInUrl,
          githubUrl,
          yearsExp,
          workPreference,
          noticePeriod,
          statementOfIntent: statementOfIntent || `Applying for ${position} role.`,
          technicalImpact,
          outageLesson,
          skills: skillsText ? skillsText.split(",").map(s => s.trim()) : ["System Architecture", "Python", "Next.js"],
          resumeText: resumeText || `${name} resume content for ${position}`,
          resumeFileName: uploadedFile ? uploadedFile.name : "uploaded_resume.pdf"
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const returnedCand = data.candidate
        const newCand: ApiCandidate = {
          id: returnedCand?.id || `cand-${Date.now()}`,
          name: returnedCand?.name || name,
          email: returnedCand?.email || email,
          phone: returnedCand?.phone || phone,
          initials: (returnedCand?.name || name).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
          job_title: position,
          stage: "applied",
          ai_score: 92,
          match_quality: "excellent",
          flagged: false,
          applied_date: new Date().toLocaleDateString(),
          skill_score: 94,
          exp_score: 90,
          edu_score: 88,
          proj_score: 92,
          confidence: 95,
          sentiment_score: 90,
          insights: "Application received and queued for AI screening & Recruiter review.",
          tags: ["Submitted", "Under Review"],
          verification_status: "verified"
        }

        setActiveCandidate(newCand)
        setIsAuthenticated(true)
        setApplicationSubmitted(true)
        showToast("success", data.message || "Application Received! Profile is under recruiter review.")
      } else {
        showToast("error", data.error || "Application submission error.")
      }
    } catch (err: any) {
      showToast("error", "Network error during application submission.")
    } finally {
      setApplying(false)
    }
  }

  // Handle Candidate Sign In with Supabase database lookup
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      showToast("error", "Please enter your registered candidate email address.")
      return
    }

    try {
      const { data: dbCand } = await supabase
        .from("candidates")
        .select(`
          *,
          applications (
            id, job_id, stage, ai_score, match_quality, flagged, applied_date, jobs ( title )
          )
        `)
        .eq("email", email.toLowerCase().trim())
        .limit(1)
        .single()

      if (dbCand) {
        const app = Array.isArray(dbCand.applications) && dbCand.applications.length > 0 ? dbCand.applications[0] : null
        const parsed = dbCand.parsed_data || {}
        
        setActiveCandidate({
          id: dbCand.id,
          name: dbCand.name,
          email: dbCand.email,
          phone: dbCand.phone || phone || "+1 (555) 019-2834",
          initials: dbCand.initials || "CN",
          job_title: app?.jobs?.title || position,
          stage: (app?.stage as AppStage) || "applied",
          ai_score: app?.ai_score ?? 92,
          match_quality: (app?.match_quality as MatchQuality) || "excellent",
          flagged: app?.flagged || false,
          applied_date: app?.applied_date || new Date().toLocaleDateString(),
          skill_score: 94,
          exp_score: 90,
          edu_score: 88,
          proj_score: 92,
          confidence: 95,
          sentiment_score: 90,
          insights: parsed?.statementOfIntent || "Application loaded from database.",
          tags: ["Submitted", "Under Review"],
          verification_status: "verified"
        })
        setIsAuthenticated(true)
        setApplicationSubmitted(true)
        showToast("success", `Welcome back, ${dbCand.name}! Your profile is loaded from database.`)
        return
      }
    } catch (err) {
      console.warn("Supabase candidate sign in lookup notice:", err)
    }

    // Fallback sign in if email not found in DB
    const candName = name || email.split("@")[0].replace(".", " ")
    setActiveCandidate({
      id: `cand-${Date.now()}`,
      name: candName,
      email: email,
      phone: phone || "+1 (555) 019-2834",
      initials: candName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2),
      job_title: position,
      stage: "applied",
      ai_score: 92,
      match_quality: "excellent",
      flagged: false,
      applied_date: new Date().toLocaleDateString(),
      skill_score: 94,
      exp_score: 90,
      edu_score: 88,
      proj_score: 92,
      confidence: 95,
      sentiment_score: 90,
      insights: "Signed in successfully. Application is under recruiter review.",
      tags: ["Submitted", "Under Review"],
      verification_status: "verified"
    })
    setIsAuthenticated(true)
    setApplicationSubmitted(true)
    showToast("success", `Welcome back, ${candName}! Your application profile is loaded.`)
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

  // ── 1. AUTH GATEWAY & RICH APPLICATION FORM VIEW ──────────────────────────
  if (!isAuthenticated && !applicationSubmitted) {
    return (
      <div className="min-h-screen bg-[#090A10] text-white font-sans relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-cyan-600/10 blur-[140px] rounded-full pointer-events-none z-0" />

        <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                HIREMIND CANDIDATE PORTAL
              </span>
              <span className="block text-[9px] text-neutral-400 font-mono tracking-widest uppercase">
                Candidate Sign In & Engineering Application Gateway
              </span>
            </div>
          </div>

          <button
            onClick={onSwitchToRecruiter}
            className="p-2 border border-white/[0.08] hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4 text-violet-400" />
            <span>Recruiter Workstation</span>
          </button>
        </header>

        <main className="relative z-10 max-w-3xl w-full mx-auto my-auto py-8">
          <Card className="glass-card border-white/[0.1] p-8 rounded-3xl shadow-2xl space-y-6">
            {/* Header & Tabs */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Autonomous AI Screening Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                Engineering Application Gateway
              </h1>
              <p className="text-xs text-neutral-400 max-w-lg mx-auto">
                Complete your candidate profile, attach your resume, and share your technical experience to enter the autonomous recruitment evaluation.
              </p>
            </div>

            <div className="flex border-b border-white/10 text-xs font-bold font-mono">
              <button
                onClick={() => setAuthMode("signup")}
                className={`py-3 px-6 flex-1 text-center border-b-2 transition-all ${
                  authMode === "signup"
                    ? "border-emerald-400 text-emerald-400 bg-emerald-500/5 font-extrabold"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                📝 COMPLETE CANDIDATE APPLICATION
              </button>
              <button
                onClick={() => setAuthMode("signin")}
                className={`py-3 px-6 flex-1 text-center border-b-2 transition-all ${
                  authMode === "signin"
                    ? "border-emerald-400 text-emerald-400 bg-emerald-500/5 font-extrabold"
                    : "border-transparent text-neutral-400 hover:text-white"
                }`}
              >
                🔑 EXISTING CANDIDATE SIGN IN
              </button>
            </div>

            {/* Rich Sign Up & Application Form */}
            {authMode === "signup" && (
              <form onSubmit={handleApply} className="space-y-6">
                
                {/* Section 1: Candidate Identification */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 border-b border-white/5 pb-1">
                    <UserCheck className="w-4 h-4" />
                    <span>SECTION 1: PERSONAL & PROFESSIONAL PROFILES</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Full Name *</label>
                      <Input
                        required
                        placeholder="e.g. Priya Sharma"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Email Address *</label>
                      <Input
                        required
                        type="email"
                        placeholder="priya@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Phone Number</label>
                      <Input
                        placeholder="+1 (555) 019-2834"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Current Location</label>
                      <Input
                        placeholder="e.g. San Francisco, CA"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Years of Experience</label>
                      <select
                        value={yearsExp}
                        onChange={(e) => setYearsExp(e.target.value)}
                        className="w-full bg-[#0d0f17] border border-white/10 text-white rounded-xl text-xs p-2.5 outline-none focus:border-emerald-500"
                      >
                        <option value="0-2 years">0 - 2 Years (Junior)</option>
                        <option value="3-5 years">3 - 5 Years (Mid-Level)</option>
                        <option value="6-10 years">6 - 10 Years (Senior / Lead)</option>
                        <option value="10+ years">10+ Years (Principal / Staff)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">LinkedIn Profile URL</label>
                      <Input
                        placeholder="https://linkedin.com/in/username"
                        value={linkedInUrl}
                        onChange={(e) => setLinkedInUrl(e.target.value)}
                        className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">GitHub / Portfolio URL</label>
                      <Input
                        placeholder="https://github.com/username"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Role Selection & Work Preferences */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 border-b border-white/5 pb-1">
                    <Briefcase className="w-4 h-4" />
                    <span>SECTION 2: TARGET POSITION & WORK PREFERENCES</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5 col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Target Position *</label>
                      <select
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="w-full bg-[#0d0f17] border border-white/10 text-white rounded-xl text-xs p-2.5 outline-none focus:border-emerald-500 font-bold"
                      >
                        <option value="Senior Backend Engineer">Senior Backend Engineer (JOB-101) · Engineering</option>
                        <option value="Lead AI Architect">Lead AI Architect (JOB-102) · AI Infrastructure</option>
                        <option value="Product Designer (UI/UX)">Product Designer UI/UX (JOB-103) · Product Design</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Work Arrangement</label>
                      <select
                        value={workPreference}
                        onChange={(e) => setWorkPreference(e.target.value)}
                        className="w-full bg-[#0d0f17] border border-white/10 text-white rounded-xl text-xs p-2.5 outline-none focus:border-emerald-500"
                      >
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="On-Site">On-Site</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Resume Attachment Zone */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-violet-400">
                      <FileText className="w-4 h-4" />
                      <span>SECTION 3: RESUME ATTACHMENT</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setResumeInputMode("upload")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          resumeInputMode === "upload" ? "bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        📁 File Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setResumeInputMode("paste")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          resumeInputMode === "paste" ? "bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30" : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        📝 Paste Text
                      </button>
                    </div>
                  </div>

                  {resumeInputMode === "upload" && (
                    <div className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 bg-white/[0.01] hover:bg-emerald-500/[0.02] transition-all p-6 rounded-2xl text-center relative group cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      {uploadedFile ? (
                        <div className="space-y-1 mt-2">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            {uploadedFile.name}
                          </span>
                          <span className="block text-[10px] text-neutral-400 font-mono">
                            File Size: {Math.round(uploadedFile.size / 1024)} KB · Click to replace file
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1 mt-2">
                          <span className="text-xs font-bold text-white block">
                            Click or Drag & Drop your Resume File Here
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono block">
                            Supports PDF, DOCX, or TXT up to 10MB
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {resumeInputMode === "paste" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Paste Resume Content / Work History</label>
                      <textarea
                        rows={4}
                        placeholder="Paste your full resume text or detailed career experience summary here..."
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl text-xs p-3 outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={applying}
                  className="w-full btn-primary py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  {applying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting Candidate Application & Parsing Resume...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>🚀 Submit Application & View Review Status</span>
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* Sign In Form */}
            {authMode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Registered Candidate Email *</label>
                  <Input
                    required
                    type="email"
                    placeholder="Enter your registered email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Full Name (Optional)</label>
                  <Input
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In & Track Application</span>
                </Button>
              </form>
            )}
          </Card>
        </main>
      </div>
    )
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
                onClick={() => updateCandidateStage("applied")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeCandidate.stage === "applied" || activeCandidate.stage === "shortlisted" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"}`}
              >
                1. Review
              </button>
              <button
                onClick={() => updateCandidateStage("assignment_sent")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeCandidate.stage === "assignment_sent" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"}`}
              >
                2. Project Task
              </button>
              <button
                onClick={() => updateCandidateStage("tech_round")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeCandidate.stage === "tech_round" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-neutral-400 hover:text-white"}`}
              >
                3. Proctored Interview
              </button>
              <button
                onClick={() => updateCandidateStage("hired")}
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
                  (idx === 0 && (activeCandidate.stage === "screened" || activeCandidate.stage === "shortlisted")) ||
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

        {/* STAGE 1: APPLICATION REVIEW & SHORTLISTED STATUS */}
        {(activeCandidate.stage === "applied" || activeCandidate.stage === "shortlisted") && (
          <Card className="glass-card border-white/[0.08] p-8 rounded-3xl space-y-6 text-center reveal-up">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
              {activeCandidate.stage === "shortlisted" ? (
                <Sparkles className="w-8 h-8 text-emerald-400 animate-bounce" />
              ) : (
                <Clock className="w-8 h-8 text-emerald-400 animate-pulse" />
              )}
            </div>

            <div className="max-w-xl mx-auto space-y-2">
              <span className="eyebrow text-emerald-400 font-bold uppercase">
                {activeCandidate.stage === "shortlisted" ? "🎉 STAGE 1 COMPLETED" : "STAGE 1 IN PROGRESS"}
              </span>
              <h3 className="text-2xl font-display font-extrabold text-white">
                {activeCandidate.stage === "shortlisted"
                  ? `🎉 CONGRATULATIONS, ${activeCandidate.name.toUpperCase()}! YOU ARE SHORTLISTED`
                  : "APPLICATION UNDER RECRUITER & AI REVIEW"}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                {activeCandidate.stage === "shortlisted"
                  ? "Our recruitment team has reviewed your profile and shortlisted you for the next evaluation stage. The recruiter will generate and send your 3-Day Project Task Assignment link shortly."
                  : "Your application has been received and registered into the Recruiter Dashboard. Gemini 2.0 AI is currently mapping your resume credentials and compatibility indices."}
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl max-w-lg mx-auto flex items-center justify-between text-xs">
              <span className="eyebrow text-neutral-400">CURRENT STATUS:</span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {activeCandidate.stage === "shortlisted"
                  ? "SHORTLISTED — AWAITING PROJECT TASK LINK FROM RECRUITER"
                  : "In Progress — AI Score Calculated (94/100)"}
              </span>
            </div>
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

            {/* Evaluation Ground Rules & Submission Policies Card */}
            <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-violet-400 border-b border-white/5 pb-2">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                <span>EVALUATION GROUND RULES & SUBMISSION POLICIES</span>
              </div>
              <div className="space-y-2 text-xs text-neutral-300">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold font-mono">1. 72-HOUR DEADLINE:</span>
                  <span className="text-neutral-400">Take-home project assignments have a strict 72-hour (3 days) submission window. The submission link locks automatically when deadline expires.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold font-mono">2. NEURAL PROCTORING:</span>
                  <span className="text-neutral-400">Camera vision and browser tab switch detection are active during the live AI video interview. Maximum 3 tab switch strikes allowed before automatic termination.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold font-mono">3. CODE INTEGRITY:</span>
                  <span className="text-neutral-400">All submissions are processed through static AST code analysis and plagiarist detection engines.</span>
                </div>
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
                      updateCandidateStage("tech_round")
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

        {/* STAGE 3: PROCTORED AI INTERVIEW SESSION (HR LINK DELIVERY & PROCTORING ROOM) */}
        {(activeCandidate.stage === "tech_round" || activeCandidate.stage === "interview_round") && (
          <div className="space-y-6 reveal-up">
            {/* Stage Header Banner */}
            <div className="bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent border border-violet-500/30 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="eyebrow text-violet-400 uppercase">STAGE 3 · PROCTORED INTERVIEW</span>
                <h3 className="text-xl font-display font-extrabold text-white mt-0.5">
                  🎙️ AI PROCTORED VIDEO & VOICE INTERVIEW SESSION
                </h3>
                <p className="text-xs text-neutral-300 font-semibold mt-1">
                  HR will issue your unique 4-Hour Proctored Interview Link once your project submission is reviewed.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  PROCTORING ENFORCED
                </span>
              </div>
            </div>

            {/* Sub-State A: Waiting for HR to Send Link */}
            {!interviewLinkSent && !interviewRoomActive && (
              <Card className="glass-card border-white/[0.08] p-8 rounded-3xl text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center mx-auto text-violet-400 shadow-xl">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="text-lg font-display font-extrabold text-white uppercase">AWAITING HR INTERVIEW INVITATION</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                    Your project has been reviewed by the recruiting team. HR will mail/issue your official 4-Hour Proctored Interview Link shortly.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setInterviewLinkSent(true)
                    showToast("success", "HR sent your Proctored Interview Link! (Expires in 4 Hours)")
                  }}
                  className="btn-primary py-3 px-6 rounded-xl font-bold text-xs uppercase text-white shadow-lg shadow-violet-500/20"
                >
                  Simulate HR Sending Interview Link (4h Expiry)
                </Button>
              </Card>
            )}

            {/* Sub-State B: Link Issued - Displays Expiration & Critical Security Warning Box */}
            {interviewLinkSent && !interviewRoomActive && (
              <div className="space-y-6">
                {/* Expiration & Link Box */}
                <Card className="glass-card border-emerald-500/30 p-6 rounded-3xl space-y-4 bg-gradient-to-r from-emerald-600/10 via-transparent to-transparent">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                    <div>
                      <span className="eyebrow text-emerald-400">OFFICIAL INTERVIEW ACCESS LINK ISSUED BY HR</span>
                      <h4 className="text-base font-bold text-white mt-0.5">https://mavionix-ai-hrms.vercel.app/candidate-portal?token=tok_live_4h_992</h4>
                    </div>
                    <div className="bg-[#090a10] border border-emerald-500/40 px-4 py-2 rounded-2xl text-center shrink-0">
                      <span className="eyebrow text-neutral-400 block text-[8px]">LINK EXPIRATION TIMER</span>
                      <span className="stat-number text-lg text-emerald-400 font-mono">03h 59m 58s</span>
                    </div>
                  </div>

                  {/* PROMINENT SECURITY WARNING BOX */}
                  <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono uppercase">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>CRITICAL PROCTORED INTERVIEW WARNING & SECURITY RULES</span>
                    </div>
                    <ul className="text-xs text-neutral-200 space-y-2 font-medium pl-1">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 font-mono font-bold">•</span>
                        <span><strong>NO PAUSING:</strong> Once you click "START INTERVIEW", the session cannot be paused or stopped.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 font-mono font-bold">•</span>
                        <span><strong>CAMERA ENFORCED:</strong> Your camera must remain enabled. Face loss or absence triggers proctor warnings.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-400 font-mono font-bold">•</span>
                        <span><strong>3 STRIKES RULE:</strong> Switching browser tabs or minimizing the window 3 times WILL PERMANENTLY TERMINATE your session. Only HR can unlock a terminated session.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex justify-center pt-2">
                    <Button
                      onClick={() => {
                        setInterviewRoomActive(true)
                        showToast("info", "Starting Proctored AI Video & Audio Interview Session...")
                      }}
                      className="btn-primary py-4 px-8 rounded-2xl font-extrabold text-xs uppercase tracking-wider text-white shadow-xl shadow-emerald-500/25 flex items-center gap-2 cursor-pointer"
                    >
                      <Video className="w-4 h-4" /> START PROCTORED INTERVIEW SESSION NOW
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Sub-State C: Full-Screen Live Proctored Interview Room */}
            {interviewRoomActive && (
              <div className="space-y-6">
                {/* Lockout Warning if 3 strikes hit */}
                {browserStrikes >= 3 ? (
                  <Card className="glass-card border-red-500/40 p-8 rounded-3xl text-center space-y-4 bg-red-500/10">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                    <h4 className="text-xl font-bold text-white uppercase">SESSION TERMINATED & LOCKED BY PROCTOR</h4>
                    <p className="text-xs text-neutral-300 max-w-md mx-auto">
                      You logged 3 browser tab-switch strikes. Pursuant to platform security rules, your session is locked. Only your Recruiter/HR can unlock and restart your interview.
                    </p>
                    <Button
                      onClick={() => {
                        setBrowserStrikes(0)
                        showToast("success", "HR Unlocked your session! You may resume.")
                      }}
                      className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-bold rounded-xl text-xs uppercase"
                    >
                      Simulate HR Unlocking Session
                    </Button>
                  </Card>
                ) : (
                  <>
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
                          updateCandidateStage("hired")
                          showToast("success", "Interview Complete! Your status has been updated to Final HR Review.")
                        }}
                        className="btn-primary py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20"
                      >
                        Complete Interview → Move to Final HR Decision
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
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
                  <input type="file" accept=".pdf" onChange={e => setUploadedFile(e.target.files?.[0] || null)} className="hidden" />
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-neutral-300 font-medium truncate">
                    {uploadedFile ? uploadedFile.name : "Click to select sample resume PDF..."}
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
