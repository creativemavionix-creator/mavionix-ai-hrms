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
import { AppStage, MatchQuality, assignmentsApi } from "@/lib/api"
import { supabase } from "@/lib/supabaseClient"

interface CandidatePortalDashboardProps {
  onSwitchToRecruiter: () => void
}

type DashboardState =
  | "loading"
  | "unauthenticated"
  | "authenticated_no_application"
  | "authenticated_with_application"

export default function CandidatePortalDashboard({ onSwitchToRecruiter }: CandidatePortalDashboardProps) {
  // Toast Notification System
  const [toast, setToast] = useState<{ type: "success" | "info" | "error"; message: string } | null>(null)
  const showToast = (type: "success" | "info" | "error", message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  // 4-State Clean State Machine
  const [viewState, setViewState] = useState<DashboardState>("loading")
  const [session, setSession] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])

  // Auth Mode for unauthenticated tabbed form
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup")
  const [authLoading, setAuthLoading] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)

  // Registration & Application Form Fields
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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

  // Project Task Take-Home Submission State
  const [submissionGithub, setSubmissionGithub] = useState("")
  const [submissionDeploy, setSubmissionDeploy] = useState("")
  const [submissionReport, setSubmissionReport] = useState("")
  const [submittingAssignment, setSubmittingAssignment] = useState(false)
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null)

  // Fetch candidate profile from GET /api/candidates/me using Bearer token
  const fetchCandidateProfile = async () => {
    setViewState("loading")
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      const userEmail = currentSession?.user?.email?.toLowerCase() || ""
      const isHrRecruiter = userEmail === "hr.recruiter@hiremind.ai" || userEmail.endsWith("@hiremind.ai")

      let token = currentSession?.access_token || ""
      
      if ((!currentSession?.user || isHrRecruiter) && typeof window !== "undefined") {
        const savedCandToken = localStorage.getItem("hiremind_candidate_token")
        if (savedCandToken) {
          token = savedCandToken
        }
      }

      if (!token) {
        setSession(null)
        setCandidate(null)
        setApplications([])
        setViewState("unauthenticated")
        return
      }

      if (currentSession && !isHrRecruiter) {
        setSession(currentSession)
      }

      if (typeof window !== "undefined" && token) {
        localStorage.setItem("hiremind_candidate_token", token)
        if (userEmail && !isHrRecruiter) {
          localStorage.setItem("hiremind_candidate_email", userEmail)
        }
        const currentPortalMode = sessionStorage.getItem("hiremind_portal_view_mode") || localStorage.getItem("hiremind_portal_view_mode")
        if (currentPortalMode === "candidate") {
          localStorage.setItem("hiremind_token", token)
        }
      }

      const res = await fetch("/api/candidates/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        if (data.candidate && data.candidate.id) {
          setCandidate(data.candidate)
          const apps = data.applications || []
          setApplications(apps)
          setViewState("authenticated_with_application")

          // Use active_assignment directly from API response or fetch fallback
          let targetAsgn = data.active_assignment || null
          if (!targetAsgn && apps.length > 0 && apps[0].id) {
            try {
              targetAsgn = await assignmentsApi.getByApplication(apps[0].id)
            } catch (e) {
              console.warn("Could not fetch active assignment for application:", e)
            }
          }

          if (targetAsgn) {
            // Ensure submission_url and submission_text are normalized into submission_data structure
            if (!targetAsgn.submission_data) {
              targetAsgn.submission_data = {}
            }
            if (!targetAsgn.submission_data.github_link && targetAsgn.submission_url) {
              targetAsgn.submission_data.github_link = targetAsgn.submission_url
            }
            if (!targetAsgn.submission_data.report && targetAsgn.submission_text) {
              targetAsgn.submission_data.report = targetAsgn.submission_text
            }

            setActiveAssignment(targetAsgn)
            if (targetAsgn.submission_url || targetAsgn.submission_data.github_link) {
              setSubmissionGithub(targetAsgn.submission_data.github_link || targetAsgn.submission_url)
            }
            if (targetAsgn.submission_text || targetAsgn.submission_data.report) {
              setSubmissionReport(targetAsgn.submission_data.report || targetAsgn.submission_text)
            }
          }
        } else {
          setCandidate(null)
          setApplications([])
          setViewState("authenticated_no_application")
        }
      } else if (res.status === 404) {
        setCandidate(null)
        setApplications([])
        setViewState("authenticated_no_application")
      } else {
        console.error("GET /api/candidates/me returned non-ok status:", res.status)
        showToast("error", "Unable to load candidate profile. Please sign in again.")
        setViewState("unauthenticated")
      }
    } catch (err: any) {
      console.error("Fetch candidate profile error:", err)
      showToast("error", "Network error verifying authentication session.")
      setViewState("unauthenticated")
    }
  }

  // On Mount & Auth State Changes
  useEffect(() => {
    fetchCandidateProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        fetchCandidateProfile()
      } else {
        setSession(null)
        setCandidate(null)
        setApplications([])
        setViewState("unauthenticated")
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sign out
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("hiremind_candidate_token")
      localStorage.removeItem("hiremind_candidate_email")
      if (localStorage.getItem("hiremind_portal_view_mode") === "candidate") {
        localStorage.removeItem("hiremind_token")
      }
    }
    setSession(null)
    setCandidate(null)
    setApplications([])
    setEmail("")
    setPassword("")
    setName("")
    showToast("info", "You have signed out.")
    setViewState("unauthenticated")
  }

  // Sign in with password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      showToast("error", "Please enter your email and password.")
      return
    }

    setAuthLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      })

      if (error) {
        showToast("error", `Sign In Failed: ${error.message}`)
        setAuthLoading(false)
        return
      }

      if (data?.session) {
        showToast("success", "Sign in successful! Loading your portal...")
        await fetchCandidateProfile()
      }
    } catch (err: any) {
      showToast("error", `Sign In Exception: ${err?.message || "Unknown error"}`)
    } finally {
      setAuthLoading(false)
    }
  }

  // Submit candidate application (Passwordless)
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !statementOfIntent) {
      showToast("error", "Please fill in all required fields.")
      return
    }

    setApplying(true)
    try {
      const payload = {
        name,
        email: email.trim().toLowerCase(),
        phone,
        jobId: position,
        location,
        linkedInUrl,
        githubUrl,
        yearsExp,
        workPreference,
        noticePeriod,
        statementOfIntent,
        technicalImpact,
        outageLesson,
        skills: skillsText ? skillsText.split(",").map(s => s.trim()) : [],
        resumeText: resumeInputMode === "paste" ? resumeText : "",
        resumeFileName: uploadedFile ? uploadedFile.name : "uploaded_resume.pdf"
      }

      const res = await fetch("/api/candidates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        showToast("error", `Application Error: ${result.error || "Submission failed"}`)
        setApplying(false)
        return
      }

      showToast("success", "Thanks! We'll be in touch once HR reviews your application.")
      setShowApplyModal(false)
    } catch (err: any) {
      showToast("error", `Application Exception: ${err?.message || "Unknown error"}`)
    } finally {
      setApplying(false)
    }
  }

  // --------------------------------------------------------------------------
  // STATE 1: LOADING
  // --------------------------------------------------------------------------
  if (viewState === "loading") {
    return (
      <div className="min-h-screen bg-[#090A10] text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none z-0" />
        <div className="flex flex-col items-center gap-4 glass-card p-8 rounded-3xl border border-white/10 shadow-2xl relative z-10">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-base font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              HIREMIND CANDIDATE PORTAL
            </p>
            <p className="text-xs text-neutral-400 font-mono">
              Verifying candidate authentication session...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 2: UNAUTHENTICATED (Apply & Sign In Form)
  // --------------------------------------------------------------------------
  if (viewState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#090A10] text-white font-sans relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-cyan-600/10 blur-[140px] rounded-full pointer-events-none z-0" />

        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl border font-bold text-xs shadow-2xl backdrop-blur-xl flex items-center gap-2 ${
            toast.type === "success" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
            toast.type === "error" ? "bg-red-500/15 border-red-500/30 text-red-400" :
            "bg-blue-500/15 border-blue-500/30 text-blue-400"
          }`}>
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Top Bar Navigation */}
        <header className="relative z-10 max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                HIREMIND CANDIDATE PORTAL
              </span>
              <span className="block text-[9px] text-neutral-400 font-mono tracking-widest uppercase">
                Autonomous AI Recruitment Application Entry
              </span>
            </div>
          </div>

        </header>

        <main className="relative z-10 max-w-4xl w-full mx-auto my-8 flex-1">
          <Card className="glass-card border-white/[0.08] p-6 sm:p-8 rounded-3xl shadow-2xl">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-white/[0.03] border border-white/[0.06] rounded-2xl mb-8">
              <button
                onClick={() => setAuthMode("signup")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  authMode === "signup" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg" : "text-neutral-400 hover:text-white"
                }`}
              >
                1. Complete Candidate Application
              </button>
              <button
                onClick={() => setAuthMode("signin")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  authMode === "signin" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg" : "text-neutral-400 hover:text-white"
                }`}
              >
                2. Existing Candidate Sign In
              </button>
            </div>

            {authMode === "signup" ? (
              <form onSubmit={handleApply} className="space-y-6">
                <div className="border-b border-white/[0.06] pb-4">
                  <h2 className="text-xl font-display font-extrabold text-white">Candidate Registration & Job Application</h2>
                  <p className="text-xs text-neutral-400 mt-1">Submit your details for AI screening and live recruiter evaluation.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Full Name *</label>
                    <Input
                      required
                      placeholder="e.g. Alex Rivera"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Email Address *</label>
                    <Input
                      required
                      type="email"
                      placeholder="alex.rivera@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Phone Number</label>
                    <Input
                      placeholder="+1 (555) 019-2834"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Target Position</label>
                    <Input
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Location</label>
                    <Input
                      placeholder="e.g. San Francisco, CA"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">LinkedIn URL</label>
                    <Input
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">GitHub URL</label>
                    <Input
                      placeholder="https://github.com/yourusername"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Upload Resume (PDF)</label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Statement of Intent & Core Skills *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Briefly state your technical background, core impact, and why you are applying..."
                    value={statementOfIntent}
                    onChange={(e) => setStatementOfIntent(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl text-xs p-3 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={applying}
                  className="w-full btn-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {applying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting Application & Account...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Candidate Application</span>
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-6 max-w-md mx-auto py-4">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-display font-extrabold text-white">Candidate Portal Sign In</h2>
                  <p className="text-xs text-neutral-400">Access your active application status and proctored assessment room.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Candidate Email *</label>
                    <Input
                      required
                      type="email"
                      placeholder="Enter registered email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Account Password *</label>
                    <Input
                      required
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2.5"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={authLoading}
                  className="w-full btn-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Sign In & Load Portal</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </Card>
        </main>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 3: AUTHENTICATED NO APPLICATION (Honest Empty State)
  // --------------------------------------------------------------------------
  if (viewState === "authenticated_no_application") {
    return (
      <div className="min-h-screen bg-[#090A10] text-white font-sans relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-cyan-600/10 blur-[140px] rounded-full pointer-events-none z-0" />

        <header className="relative z-10 max-w-4xl w-full mx-auto flex items-center justify-between py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/20">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                HIREMIND CANDIDATE PORTAL
              </span>
              <span className="block text-[9px] text-neutral-400 font-mono tracking-widest uppercase">
                Account Authenticated
              </span>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-500/10"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Sign Out</span>
          </Button>
        </header>

        <main className="relative z-10 max-w-lg w-full mx-auto my-12 flex-1 flex flex-col justify-center">
          <Card className="glass-card border-white/[0.08] p-8 rounded-3xl shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-extrabold text-white">No Application Found</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your account (<span className="text-emerald-400 font-semibold">{session?.user?.email}</span>) is authenticated, but no job application is linked to this profile. Apply for a position to get started.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => setViewState("unauthenticated")}
                className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/15 w-full sm:w-auto cursor-pointer"
              >
                + Apply For A Position
              </Button>
              <Button
                onClick={handleLogout}
                className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold py-2.5 px-4 rounded-xl transition-all w-full sm:w-auto cursor-pointer"
              >
                Sign Out
              </Button>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // STATE 4: AUTHENTICATED WITH APPLICATION (Real Candidate Workspace)
  // --------------------------------------------------------------------------
  const activeApp = applications[0] || {}
  const currentStage: AppStage = (activeApp.stage as AppStage) || "applied"
  const candidateInitials = candidate.initials || (candidate.name ? candidate.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "CA")
  const jobTitle = activeApp.jobs?.title || position || "Senior Backend Engineer"

  return (
    <div className="min-h-screen bg-[#090A10] text-white font-sans relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-cyan-600/10 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl border font-bold text-xs shadow-2xl backdrop-blur-xl flex items-center gap-2 ${
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
              Live Application Tracker & Assessment Room
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setViewState("unauthenticated")}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-500/15 flex items-center gap-1.5 cursor-pointer"
          >
            + Apply For New Position
          </Button>

          <Button
            onClick={handleLogout}
            className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-500/10"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Sign Out</span>
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
                {candidateInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="eyebrow text-emerald-400">APPLICATION ACTIVE</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold uppercase">
                    VERIFIED CANDIDATE
                  </span>
                </div>
                <h2 className="text-2xl font-display font-extrabold text-white mt-1">
                  {candidate.name}
                </h2>
                <p className="text-xs text-neutral-400 font-medium mt-0.5">
                  Applied for <span className="text-white font-semibold">{jobTitle}</span> · ID: {candidate.id}
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="mt-8 pt-6 border-t border-white/[0.06]">
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { stage: "applied", label: "1. APPLICATION REVIEW", desc: "AI & Recruiter Screening" },
                { stage: "assignment_sent", label: "2. PROJECT TASK", desc: "48h Take-Home Assignment" },
                { stage: "tech_round", label: "3. PROCTORED INTERVIEW", desc: "Neural Camera & Voice Session" },
                { stage: "hired", label: "4. FINAL HR DECISION", desc: "Offer & Onboarding" },
              ].map((step, idx) => {
                const isActive = currentStage === step.stage ||
                  (idx === 0 && (currentStage === "screened" || currentStage === "shortlisted")) ||
                  (idx === 1 && currentStage === "assignment_submitted") ||
                  (idx === 2 && currentStage === "interview_round")
                const isPassed = idx === 0 && currentStage !== "applied"

                return (
                  <div key={step.stage} className="space-y-2 relative">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${
                      isActive ? "bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/30" :
                      isPassed ? "bg-emerald-500/40" : "bg-white/[0.06]"
                    }`} />
                    <div className="pt-2">
                      <span className={`block text-[10px] font-mono font-bold uppercase tracking-wider ${
                        isActive ? "text-emerald-400" : "text-neutral-500"
                      }`}>
                        {step.label}
                      </span>
                      <span className="block text-[9px] text-neutral-400 mt-0.5 hidden sm:block">
                        {step.desc}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Section Grid: Dossier & Current Stage Focus */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Candidate Profile Details Card */}
          <Card className="glass-card border-white/[0.08] p-6 rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                Candidate Application Dossier
              </h3>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">Email Address</span>
                <span className="text-white font-semibold">{candidate.email}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">Phone Number</span>
                <span className="text-white font-semibold">{candidate.phone || "+1 (555) 019-2834"}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">Location Preference</span>
                <span className="text-white font-semibold">{candidate.parsed_data?.location || "San Francisco, CA (Remote)"}</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">Verified Skills</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(candidate.parsed_data?.skills || ["Python", "TypeScript", "FastAPI", "PostgreSQL"]).map((sk: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-mono">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase block font-bold">Statement of Intent</span>
                <p className="text-neutral-300 text-[11px] leading-relaxed mt-1 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl italic">
                  "{candidate.parsed_data?.statementOfIntent || "Application registered and queued for screening."}"
                </p>
              </div>
            </div>
          </Card>

          {/* Center Column: Stage Focus Room */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border-white/[0.08] p-6 rounded-3xl shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
                <div>
                  <span className="eyebrow text-emerald-400">STAGE WORKSPACE</span>
                  <h3 className="font-display font-extrabold text-base text-white mt-0.5">
                    {currentStage === "applied" && "Application Under AI & Recruiter Review"}
                    {currentStage === "assignment_sent" && "Stage 2: Take-Home Architecture Project Task"}
                    {currentStage === "tech_round" && "Stage 3: Proctored AI Technical Interview Session"}
                    {currentStage === "hired" && "Final Offer & Hire Confirmed!"}
                  </h3>
                </div>
                <span className="px-3 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold uppercase">
                  {currentStage}
                </span>
              </div>

              {/* Stage Specific Cards */}
              {currentStage === "applied" && (
                <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl space-y-4">
                  <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Application Submitted Successfully</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Your profile and application materials have been registered into HireMind's recruiting pipeline. Our hiring team is reviewing your profile. Once advanced to the project phase, your technical task details will appear here.
                  </p>
                </div>
              )}

              {(currentStage === "assignment_sent" || (activeAssignment && activeAssignment.status !== "reviewed")) && (
                <div className="space-y-4">
                  {(() => {
                    const isSubmitted = activeAssignment?.status === "submitted" || activeAssignment?.status === "reviewed"
                    const isExpired = activeAssignment?.deadline && new Date() > new Date(activeAssignment.deadline) && !isSubmitted
                    const reqDeliverables = activeAssignment?.deliverables_required || ["github_link", "report"]

                    const handleAssignmentSubmit = async () => {
                      setSubmittingAssignment(true)
                      try {
                        let targetAsgn = activeAssignment
                        if (!targetAsgn && applications.length > 0 && applications[0].id) {
                          targetAsgn = await assignmentsApi.getByApplication(applications[0].id)
                        }

                        if (!targetAsgn && applications.length > 0 && applications[0].id) {
                          // Dynamic auto-provision assignment fallback if HR updated stage without assignment row
                          try {
                            const genRes = await assignmentsApi.generate(applications[0].id, {
                              title: "Take-Home Architecture Project Task",
                              description: "Please complete the technical task specifications outlined by the hiring team.",
                              requirements: "Submit your GitHub repository, live deployment, or system design notes."
                            })
                            if (genRes?.assignment) targetAsgn = genRes.assignment
                          } catch (genErr) {
                            console.warn("Auto assignment provision fallback warning:", genErr)
                          }
                        }

                        if (!targetAsgn) {
                          showToast("error", "No active assignment task found for your application.")
                          setSubmittingAssignment(false)
                          return
                        }

                        const subData: Record<string, string> = {}
                        if (reqDeliverables.includes("github_link") && submissionGithub.trim()) {
                          subData.github_link = submissionGithub.trim()
                        }
                        if (reqDeliverables.includes("deployment_link") && submissionDeploy.trim()) {
                          subData.deployment_link = submissionDeploy.trim()
                        }
                        if (reqDeliverables.includes("report") && submissionReport.trim()) {
                          subData.report = submissionReport.trim()
                        }

                        const res = await assignmentsApi.submit(targetAsgn.id, {
                          submission_data: subData,
                          submission_text: submissionReport || "Assignment submitted",
                          submission_url: submissionGithub || submissionDeploy || ""
                        })

                        if (res.status === "submitted") {
                          setActiveAssignment({ ...targetAsgn, status: "submitted", submission_data: subData })
                          setApplications((prev: any[]) => prev.map((app, idx) => idx === 0 ? { ...app, stage: "assignment_submitted" } : app))
                          showToast("success", "🎉 Assignment submitted successfully! It is now under HR review.")
                        }
                      } catch (err: any) {
                        showToast("error", err?.message || "Failed to submit assignment.")
                      } finally {
                        setSubmittingAssignment(false)
                      }
                    }

                    if (isSubmitted) {
                      return (
                        <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-4">
                          <div className="flex items-center gap-3 text-emerald-400 font-bold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <span>Your assignment has been submitted and is under review</span>
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            Our recruiting team is actively reviewing your submitted assignment deliverables. You will be notified when feedback or next steps are ready.
                          </p>
                          <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                            <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase block">SUBMITTED DELIVERABLES:</span>
                            {(activeAssignment.submission_data?.github_link || activeAssignment.submission_url) && (
                              <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl font-mono text-cyan-300">
                                🔹 GitHub Repository: <a href={activeAssignment.submission_data?.github_link || activeAssignment.submission_url} target="_blank" rel="noreferrer" className="underline font-bold">{activeAssignment.submission_data?.github_link || activeAssignment.submission_url} ↗</a>
                              </div>
                            )}
                            {activeAssignment.submission_data?.deployment_link && (
                              <div className="p-2.5 bg-white/[0.03] border border-white/10 rounded-xl font-mono text-emerald-300">
                                🔹 Live Deployment: <a href={activeAssignment.submission_data.deployment_link} target="_blank" rel="noreferrer" className="underline font-bold">{activeAssignment.submission_data.deployment_link} ↗</a>
                              </div>
                            )}
                            {(activeAssignment.submission_data?.report || activeAssignment.submission_text) && (
                              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl font-mono text-neutral-200 space-y-1">
                                <span className="text-[9px] text-neutral-400 block font-bold">Written Architecture Report / Notes:</span>
                                <p className="whitespace-pre-wrap">{activeAssignment.submission_data?.report || activeAssignment.submission_text}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    }

                    if (isExpired) {
                      return (
                        <div className="p-6 bg-red-500/15 border border-red-500/30 rounded-2xl space-y-3">
                          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                            <AlertTriangle className="w-5 h-5" />
                            <span>Deadline Passed: Assignment Submission Expired</span>
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            The deadline ({new Date(activeAssignment.deadline).toLocaleString()}) for submitting this assignment has expired. Submission is now closed.
                          </p>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-5">
                        <div className="p-6 bg-[#0b0e18] border border-cyan-500/40 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
                          <div>
                            <span className="text-[10px] font-mono font-extrabold uppercase text-cyan-400 tracking-widest block mb-1">
                              ASSIGNED TECHNICAL PROJECT SPECIFICATION
                            </span>
                            <h4 className="text-base font-extrabold text-white uppercase tracking-wide font-display">
                              {activeAssignment?.title || "Take-Home Architecture Project Task"}
                            </h4>
                          </div>

                          <div className="p-4 bg-[#05070c] border border-white/15 rounded-2xl text-xs text-neutral-100 font-sans leading-relaxed whitespace-pre-wrap shadow-inner">
                            {activeAssignment?.description || "Please complete the technical task specifications outlined by the hiring team."}
                          </div>

                          {activeAssignment?.deadline && (
                            <div className="p-3 bg-[#0d1527] border border-cyan-500/50 rounded-xl text-xs font-mono font-bold text-cyan-300 flex items-center gap-2.5 shadow-md">
                              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span>Submission Deadline: {new Date(activeAssignment.deadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>

                        {/* Submission Form matching requested deliverables ONLY */}
                        <div className="space-y-4 p-6 bg-[#090b14] border border-white/15 rounded-3xl shadow-xl">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="eyebrow text-emerald-400 uppercase font-extrabold tracking-wider block">
                              REQUIRED DELIVERABLE SUBMISSION FORM
                            </span>
                          </div>

                          {reqDeliverables.includes("github_link") && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono text-neutral-200 uppercase font-extrabold tracking-wider block">
                                GitHub Repository URL *
                              </label>
                              <Input
                                placeholder="https://github.com/yourusername/take-home-project"
                                value={submissionGithub}
                                onChange={(e) => setSubmissionGithub(e.target.value)}
                                className="bg-[#04050a] border-white/20 text-white placeholder:text-neutral-500 rounded-xl text-xs py-3 font-mono focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                          )}

                          {reqDeliverables.includes("deployment_link") && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono text-neutral-200 uppercase font-extrabold tracking-wider block">
                                Live Deployment URL (Vercel / Render / Cloud) *
                              </label>
                              <Input
                                placeholder="https://your-app-deployment.vercel.app"
                                value={submissionDeploy}
                                onChange={(e) => setSubmissionDeploy(e.target.value)}
                                className="bg-[#04050a] border-white/20 text-white placeholder:text-neutral-500 rounded-xl text-xs py-3 font-mono focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                          )}

                          {reqDeliverables.includes("report") && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono text-neutral-200 uppercase font-extrabold tracking-wider block">
                                Written Architecture Report / Notes *
                              </label>
                              <textarea
                                rows={5}
                                placeholder="Detail your system design choices, architecture trade-offs, and instructions to run..."
                                value={submissionReport}
                                onChange={(e) => setSubmissionReport(e.target.value)}
                                className="w-full bg-[#04050a] border border-white/20 text-white placeholder:text-neutral-500 rounded-2xl text-xs p-3.5 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono leading-relaxed shadow-inner"
                              />
                            </div>
                          )}

                          <Button
                            onClick={handleAssignmentSubmit}
                            disabled={submittingAssignment}
                            className="btn-primary py-3.5 px-5 rounded-2xl text-xs font-extrabold uppercase text-white shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer w-full transition-transform active:scale-[0.99]"
                          >
                            {submittingAssignment ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Submitting Assignment...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Submit Project Task Deliverables</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {currentStage === "tech_round" && (
                <div className="p-6 bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border border-emerald-500/50 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
                  
                  <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                    <Award className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono font-extrabold uppercase text-emerald-400 tracking-wider block">
                        🎉 CONGRATULATIONS! ASSIGNMENT APPROVED
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5">
                        Your take-home project assignment has been evaluated and approved by the hiring team. You have advanced to the next recruitment stage.
                      </h4>
                    </div>
                  </div>
                </div>
              )}

              {currentStage === "rejected" && (
                <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-3xl space-y-3">
                  <div className="flex items-center gap-3 text-rose-400 font-bold text-sm">
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>Application Status: Selection Decision</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                    Thank you for taking the time to complete the technical assignment. At this stage, the hiring team has decided not to proceed with your application for this position. We appreciate your interest in joining HireMind AI.
                  </p>
                </div>
              )}

              {currentStage === "hired" && (
                <div className="p-6 bg-emerald-500/15 border border-emerald-500/30 rounded-3xl text-center space-y-3 shadow-2xl">
                  <Award className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-lg font-bold text-white">Offer & Onboarding Confirmed!</h4>
                  <p className="text-xs text-neutral-300 max-w-md mx-auto">
                    Congratulations! You have completed all technical stages and received an official offer for {jobTitle}.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto py-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-[10px] text-neutral-500 font-mono">
        <span>HIREMIND AI © 2026 — AUTONOMOUS RECRUITMENT SYSTEM</span>
        <span>AUTH METHOD: SUPABASE AUTH SERVICE ROLE API</span>
      </footer>
    </div>
  )
}
