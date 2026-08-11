"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { candidatesApi, jobsApi, portalApi, ApiCandidate, CandidateStats, AppStage, ApiJob } from "@/lib/api"
import {
  Search, UserPlus, Flag, ShieldCheck, Mail, Phone, Tag,
  Loader2, AlertTriangle, CheckCircle, CheckCircle2, Clock, X, RefreshCw, Upload,
  FileText, Brain, Star, Users, Calendar, XCircle, Briefcase, Award, Sliders, Link2,
} from "lucide-react"
import PipelineView from "./PipelineView"
import IntegrityWidget from "@/lib/integrity/ui/IntegrityWidget"
import SecurityTimeline from "@/lib/integrity/ui/SecurityTimeline"
import { AiConfidenceCard, AiRiskWarning, AiProvenanceChip, AiSummaryPanel } from "@/components/ui/AiComponents"

// ─── Types ─────────────────────────────────────────────────────────────────
type MatchQuality = "excellent" | "strong" | "good" | "fair" | "low"

// ─── Toast ─────────────────────────────────────────────────────────────────
interface Toast { id: number; type: "success" | "error" | "info"; message: string }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000)
  }, [])
  return { toasts, add }
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-sm font-mono text-xs border shadow-lg
          ${t.type === "success" ? "bg-green-500/10 border-green-500/25 text-green-400"
          : t.type === "info" ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
          : "bg-red-500/10 border-red-500/25 text-red-400"}`}>
          {t.type === "success" ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          : t.type === "info" ? <Clock className="w-3.5 h-3.5 shrink-0" />
          : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  applied:                "bg-[var(--hm-bg-elevated)] text-[var(--hm-text-muted)] border-neutral-700",
  screened:               "bg-signal/10 text-signal border-signal/20",
  shortlisted:            "bg-blue-500/10 text-blue-400 border-blue-500/20",
  assignment_sent:        "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  assignment_submitted:   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  assignment_reviewed:    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  tech_round:             "bg-[var(--hm-accent)]/10 text-[var(--hm-accent)] border-[var(--hm-accent)]/20",
  tech_round_completed:   "bg-[var(--hm-accent)]/10 text-[var(--hm-accent)] border-[var(--hm-accent)]/20",
  interview_round:        "bg-[var(--hm-accent)]/10 text-[var(--hm-accent)] border-[var(--hm-accent)]/20",
  interview_round_completed: "bg-[var(--hm-accent)]/10 text-[var(--hm-accent)] border-[var(--hm-accent)]/20",
  hr_round:               "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  hr_round_completed:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  interview:              "bg-[var(--hm-accent)]/10 text-[var(--hm-accent)] border-[var(--hm-accent)]/20", // legacy
  offered:                "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hired:                  "bg-green-500/10 text-green-400 border-green-500/20",
  rejected:               "bg-red-500/10 text-red-400 border-red-500/20",
  waitlisted:             "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
}

const MATCH_COLORS: Record<string, string> = {
  excellent: "bg-green-500/10 text-green-400 border border-green-500/25",
  strong:    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
  good:      "bg-[var(--hm-accent)]/10 text-[var(--hm-accent)] border border-[var(--hm-accent)]/25",
  fair:      "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  low:       "bg-red-500/10 text-red-400 border border-red-500/25",
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-neutral-600 text-xs">—</span>
  const color = score >= 85 ? "text-green-500" : score >= 70 ? "text-[var(--hm-accent)]" : "text-[var(--hm-text-muted)]"
  return (
    <span>
      <span className={`font-bold text-sm ${color}`}>{score}</span>
      <span className="text-[10px] text-[var(--hm-text-muted)]">/100</span>
    </span>
  )
}

// ─── Stat Cards ─────────────────────────────────────────────────────────────
function StatCards({ stats, loading }: { stats: CandidateStats | null; loading: boolean }) {
  const items = [
    { label: "TOTAL CANDIDATES", key: "total",        color: "text-signal", bg: "bg-signal/10 border-signal/20", icon: Users, delay: "reveal-delay-1" },
    { label: "AI SHORTLISTED",   key: "shortlisted",  color: "text-signal", bg: "bg-signal/10 border-signal/20", icon: FileText, delay: "reveal-delay-2" },
    { label: "IN INTERVIEW",     key: "in_interview", color: "text-signal", bg: "bg-signal/10 border-signal/20", icon: Calendar, delay: "reveal-delay-3" },
    { label: "REJECTED PIPELINE", key: "rejected",     color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20",       icon: XCircle, delay: "reveal-delay-4" },
  ] as const

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map(({ label, key, color, bg, icon: Icon, delay }) => (
        <Card key={key} className={`glass-card border-white/[0.04] hover:border-signal/40 hover:-translate-y-0.5 rounded-2xl shadow-lg relative overflow-hidden reveal-up ${delay}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="eyebrow text-neutral-400">{label}</p>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-500 mt-2" />
              ) : (
                <p className={`stat-number text-3xl mt-2 ${color}`}>{stats?.[key] ?? "–"}</p>
              )}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${bg} ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Add Candidate Modal ─────────────────────────────────────────────────────
interface AddCandidateModalProps {
  jobs: ApiJob[]
  onClose: () => void
  onCreated: (c: ApiCandidate) => void
  addToast: (type: Toast["type"], msg: string) => void
}

function AddCandidateModal({ jobs, onClose, onCreated, addToast }: AddCandidateModalProps) {
  const [name,    setName]    = useState("")
  const [email,   setEmail]   = useState("")
  const [phone,   setPhone]   = useState("")
  const [jobId,   setJobId]   = useState("")
  const [file,    setFile]    = useState<File | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [parseStep, setParseStep] = useState<string | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.type !== "application/pdf") {
      setError("Only PDF resumes are supported.")
      return
    }
    if (f && f.size > 10 * 1024 * 1024) {
      setError("Resume file size exceeds the 10 MB limit.")
      return
    }
    setError(null)
    setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError("Please attach a PDF resume."); return }
    if (!jobId) { setError("Please select an applying position."); return }

    setSaving(true); setError(null)
    try {
      setParseStep("Uploading resume to storage...")
      await new Promise(r => setTimeout(r, 300)) // let UI update
      setParseStep("Running Gemini AI parse & score…")
      const candidate = await candidatesApi.create({ name, email, phone, job_id: jobId, resume: file })
      addToast("success", `${candidate.name} added — AI score: ${candidate.ai_score ?? "pending"}`)
      onCreated(candidate)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add candidate."
      setError(msg)
      addToast("error", msg)
    } finally {
      setSaving(false)
      setParseStep(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <Card className="glass-panel border-white/[0.06] w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <CardHeader className="border-b border-white/[0.05] p-6 flex flex-row items-center justify-between sticky top-0 bg-[var(--hm-bg-card)] backdrop-blur-md z-10 shrink-0">
          <CardTitle className="text-sm font-extrabold text-neutral-900 dark:text-white tracking-wider uppercase">ADD NEW CANDIDATE</CardTitle>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-none">
          <CardContent className="p-6 space-y-5 text-xs">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {parseStep && (
              <div className="flex items-center gap-2.5 bg-signal/10 border border-signal/20 text-signal p-3.5 rounded-xl font-semibold">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-signal" />
                <span>{parseStep}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">FULL NAME *</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Meera Nair"
                  className="bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-xs text-neutral-200 rounded-xl placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">EMAIL ADDRESS *</label>
                <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. meera@domain.com"
                  className="bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-xs text-neutral-200 rounded-xl placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all h-10" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">PHONE</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 99999 88888"
                  className="bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-xs text-neutral-200 rounded-xl placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all h-10" />
              </div>
              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">APPLYING POSITION *</label>
                <select required value={jobId} onChange={e => setJobId(e.target.value)}
                  className="w-full bg-white/[0.02] dark:bg-black/20 border border-white/[0.08] text-xs text-neutral-200 rounded-xl p-2.5 h-10 focus:border-signal transition-all outline-none cursor-pointer">
                  <option value="" className="bg-neutral-900 text-neutral-400">SELECT POSITION...</option>
                  {jobs.filter(j => j.status === "active" || j.status === "onhold").map(j => (
                    <option key={j.id} value={j.id} className="bg-neutral-900 text-neutral-200">{j.title} — {j.department}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow text-neutral-400">RESUME (PDF) *</label>
              <label className={`flex items-center gap-3 w-full border border-dashed rounded-2xl p-4 cursor-pointer transition-all
                ${file ? "border-signal/40 bg-signal/5" : "border-white/[0.08] bg-white/[0.01] dark:bg-black/10 hover:border-white/20"}`}>
                <input type="file" accept=".pdf,application/pdf" onChange={handleFile} className="hidden" />
                {file ? (
                  <>
                    <FileText className="w-5 h-5 text-signal shrink-0" />
                    <span className="text-signal font-semibold truncate">{file.name}</span>
                    <span className="text-neutral-400 ml-auto shrink-0 font-medium">{(file.size / 1024).toFixed(0)} KB</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-neutral-400 shrink-0" />
                    <span className="text-neutral-400 font-medium">Click to upload or drag PDF resume (max 10 MB)</span>
                  </>
                )}
              </label>
            </div>

            <div className="bg-white/[0.01] dark:bg-black/20 border border-white/[0.04] rounded-2xl p-4 space-y-1.5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 text-signal text-[10px] font-bold uppercase tracking-wider font-display">
                <Brain className="w-4 h-4" /> AI ANALYSIS ON SUBMISSION
              </div>
              <p className="text-neutral-400 text-[10px] leading-relaxed">
                Gemini will scan the resume to map credentials, score compatibility indices, extract core skillset attributes, and compute placement match metrics automatically.
              </p>
            </div>

            <div className="flex gap-3.5 pt-4 border-t border-white/[0.05] shrink-0">
              <Button type="submit" disabled={saving}
                className="flex-1 btn-primary text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 h-10 transition-transform hover:-translate-y-0.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                {saving ? "PROCESSING..." : "ADD & ANALYZE"}
              </Button>
              <Button type="button" onClick={onClose}
                className="flex-1 bg-transparent hover:bg-white/5 border border-white/[0.08] text-neutral-300 text-xs font-semibold rounded-xl h-10 transition-all active:scale-[0.99]">
                CANCEL
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

// ─── Candidate Dossier Modal ─────────────────────────────────────────────────
function DossierModal({ candidateId, onClose, onStageChange, onFlagChange, addToast, sidebarCollapsed = false }: {
  candidateId: string
  onClose: () => void
  onStageChange: (appId: string, stage: AppStage) => void
  onFlagChange:  (appId: string, flagged: boolean) => void
  addToast: (type: Toast["type"], msg: string) => void
  sidebarCollapsed?: boolean
}) {
  const [c, setC]         = useState<ApiCandidate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    candidatesApi.get(candidateId)
      .then(setC)
      .catch(() => addToast("error", "Failed to load candidate details."))
      .finally(() => setLoading(false))
  }, [candidateId])

  if (loading) return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--hm-accent)]" />
    </div>
  )
  if (!c) return null

  const score = c.ai_score
  const mq    = c.match_quality

  const metricBars = [
    { label: "Technical Skills (35%)",   val: c.skill_score },
    { label: "Experience Match (25%)",   val: c.exp_score },
    { label: "Education Relevance (15%)", val: c.edu_score },
    { label: "Projects Scope (10%)",     val: c.proj_score },
  ]

  const parsed = c.parsed_data ? (c.parsed_data as any) : null
  const summaryText = parsed?.summary ?? c.insights ?? "No parsed summary details available."
  const location = parsed?.location || "Remote Candidate"
  const yearsExp = parsed?.yearsExp || "3-5 years"
  const workPreference = parsed?.workPreference || "Remote"
  const noticePeriod = parsed?.noticePeriod || "Immediate"
  const linkedInUrl = parsed?.linkedInUrl || null
  const githubUrl = parsed?.githubUrl || null
  const statementOfIntent = parsed?.statementOfIntent || c.insights || ""
  const technicalImpact = parsed?.technicalImpact || ""
  const outageLesson = parsed?.outageLesson || ""
  const resumeFileName = parsed?.resumeFileName || "uploaded_resume.pdf"
  const resumeText = parsed?.resumeText || parsed?.summary || summaryText
  const skillsList = parsed?.skills || c.tags || []
  const experienceList = parsed?.experience ?? []
  const educationList = parsed?.education ?? []
  const projectsList = parsed?.projects ?? []

  return (
    <div className={`fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 transition-all duration-300 ${
      sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
    }`}>
      <Card className="glass-card border-white/[0.08] w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl relative flex flex-col translate-y-2 animate-in slide-in-from-bottom-2 duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        
        {/* Dossier Header */}
        <CardHeader className="border-b border-white/[0.05] p-6 flex flex-row items-center justify-between pb-4 sticky top-0 bg-[var(--hm-bg-card)] backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-signal/10 border border-signal/20 flex items-center justify-center text-signal font-extrabold text-sm shrink-0 font-display">
              {c.initials}
            </div>
            <div>
              <span className="eyebrow text-signal block">{c.id.slice(0,8).toUpperCase()} CANDIDATE DOSSIER</span>
              <CardTitle className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wide mt-0.5 flex items-center gap-2">
                {c.name}
                {c.verification_status === "verified" && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">VERIFIED</span>
                )}
                {c.flagged && (
                  <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">FLAGGED</span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400 font-medium">
                <span className="font-bold text-white">{c.job_title ?? "—"}</span>
                <span>•</span>
                <span className="capitalize text-emerald-400 font-mono font-bold">{c.stage ? c.stage.replace(/_/g, " ") : "Applied"}</span>
                <span>•</span>
                <span>{c.email}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors duration-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        {/* Recruiter Screening & Pass-Ahead Decision Bar */}
        <div className="bg-emerald-500/[0.04] border-b border-emerald-500/20 p-4 px-6 flex flex-wrap items-center justify-between gap-4 sticky top-[73px] bg-[#0c0e17] backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 block uppercase">
                RECRUITER DECISION WORKSTATION — STAGE: {c.stage?.replace(/_/g, " ").toUpperCase() || "APPLIED"}
              </span>
              <span className="text-[10px] text-neutral-400 block">
                Review candidate's resume, system architecture answers, and match score below to pass ahead or reject.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                onStageChange(c.application_id!, "shortlisted")
                setC(prev => prev ? { ...prev, stage: "shortlisted" } : prev)
                addToast("success", `${c.name} passed to Shortlisted stage!`)
              }}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>✅ PASS TO SHORTLIST</span>
            </Button>

            <Button
              onClick={async () => {
                try {
                  const res = await portalApi.generateToken({
                    candidate_id: c.id,
                    application_id: c.application_id || `app-${Date.now()}`,
                    round_type: "project"
                  })
                  const projectUrl = `${window.location.origin}/candidate?token=${res.token}&type=project`
                  await navigator.clipboard.writeText(projectUrl)
                  onStageChange(c.application_id!, "assignment_sent")
                  setC(prev => prev ? { ...prev, stage: "assignment_sent" } : prev)
                  addToast("success", `📁 3-Day Project Task Link Copied to Clipboard! (${res.token})`)
                } catch {
                  addToast("error", "Failed to generate project task link.")
                }
              }}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📁 SEND 3-DAY PROJECT TASK LINK</span>
            </Button>

            <Button
              onClick={async () => {
                try {
                  const res = await portalApi.generateToken({
                    candidate_id: c.id,
                    application_id: c.application_id || `app-${Date.now()}`,
                    round_type: "tech"
                  })
                  const interviewUrl = `${window.location.origin}/candidate?token=${res.token}&type=interview`
                  await navigator.clipboard.writeText(interviewUrl)
                  onStageChange(c.application_id!, "tech_round")
                  setC(prev => prev ? { ...prev, stage: "tech_round" } : prev)
                  addToast("success", `🎙️ Proctored AI Interview Link Copied to Clipboard! (${res.token})`)
                } catch {
                  addToast("error", "Failed to generate interview link.")
                }
              }}
              className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/10"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>🎙️ SEND LIVE AI INTERVIEW LINK</span>
            </Button>

            <Button
              onClick={() => {
                onStageChange(c.application_id!, "waitlisted" as any)
                setC(prev => prev ? { ...prev, stage: "waitlisted" as any } : prev)
                addToast("info", `${c.name} moved to Waitlist.`)
              }}
              className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⏳ HOLD</span>
            </Button>

            <Button
              onClick={() => {
                onStageChange(c.application_id!, "rejected")
                setC(prev => prev ? { ...prev, stage: "rejected" } : prev)
                addToast("error", `${c.name} rejected.`)
              }}
              className="bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-[11px] font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>❌ REJECT</span>
            </Button>
          </div>
        </div>

        {/* Dossier Body Content */}
        <CardContent className="p-6 space-y-6 text-xs scrollbar-none flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Profile & Candidate Answers Card (65% width) */}
            <div className="lg:col-span-8 space-y-6">
              <Card className="glass-card border-white/[0.06] p-6 rounded-2xl shadow-lg space-y-6 relative overflow-hidden reveal-up">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                
                {/* Candidate Overview Stats & Profile Links */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">LOCATION</span>
                    <span className="text-xs font-bold text-white">{location}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">EXPERIENCE</span>
                    <span className="text-xs font-bold text-emerald-400">{yearsExp}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">WORK MODE</span>
                    <span className="text-xs font-bold text-cyan-400">{workPreference}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase font-bold block">AVAILABILITY</span>
                    <span className="text-xs font-bold text-indigo-400">{noticePeriod}</span>
                  </div>
                </div>

                {(linkedInUrl || githubUrl) && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {linkedInUrl && (
                      <a href={linkedInUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 text-xs font-bold flex items-center gap-1.5 transition-all">
                        <Link2 className="w-3.5 h-3.5" /> LinkedIn Profile
                      </a>
                    )}
                    {githubUrl && (
                      <a href={githubUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 text-xs font-bold flex items-center gap-1.5 transition-all">
                        <Link2 className="w-3.5 h-3.5" /> GitHub / Portfolio
                      </a>
                    )}
                  </div>
                )}

                {/* Section 1: Thoughtful Engineering & System Architecture Answers */}
                {(technicalImpact || outageLesson || statementOfIntent) && (
                  <div className="space-y-4 pt-4 border-t border-white/[0.05]">
                    <h3 className="text-xs font-display font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" /> Candidate System Architecture & Problem-Solving Answers
                    </h3>

                    {technicalImpact && (
                      <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">
                          1. Complex System Architecture & Trade-Offs:
                        </span>
                        <p className="text-neutral-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {technicalImpact}
                        </p>
                      </div>
                    )}

                    {outageLesson && (
                      <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">
                          2. Production Outage, Root Cause & System Guardrails:
                        </span>
                        <p className="text-neutral-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {outageLesson}
                        </p>
                      </div>
                    )}

                    {statementOfIntent && (
                      <div className="bg-white/[0.02] border border-white/10 p-4 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">
                          3. Core Motivation & Role Alignment:
                        </span>
                        <p className="text-neutral-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                          {statementOfIntent}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Section 2: Resume Attachment & Text Viewer */}
                <div className="space-y-3 pt-4 border-t border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-display font-extrabold text-signal uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Candidate Resume Attachment
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      📄 {resumeFileName}
                    </span>
                  </div>

                  <div className="bg-[#0b0d14] border border-white/10 rounded-xl p-4 text-[11px] text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto shadow-inner">
                    {resumeText || "No resume text content attached."}
                  </div>
                </div>

                {/* Section 3: Technical Skills Matrix */}
                <div className="space-y-2.5 pt-4 border-t border-white/[0.05]">
                  <h3 className="text-xs font-display font-extrabold text-signal uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Technical Skillset Matrix
                  </h3>
                  {skillsList.length === 0 ? (
                    <p className="text-neutral-500 italic">No structured skills tags parsed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pl-0.5">
                      {skillsList.map((tag: string) => (
                        <span key={tag} className="bg-emerald-500/10 text-emerald-300 px-3 py-1 text-[10px] rounded-full border border-emerald-500/20 font-semibold tracking-wide">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 4: Work History Timeline (if available) */}
                {experienceList.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-white/[0.05]">
                    <h3 className="text-xs font-display font-extrabold text-signal uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> Work Experience Timeline
                    </h3>
                    <div className="relative pl-4 border-l border-white/[0.06] space-y-4 ml-1">
                      {experienceList.map((exp: any, idx: number) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-signal border border-[var(--hm-bg-card)]" />
                          <div>
                            <h4 className="text-xs font-display font-extrabold text-neutral-200 flex items-center gap-1.5">
                              {exp.title}
                              <span className="text-[10px] text-neutral-500 font-semibold">at {exp.company}</span>
                            </h4>
                            <span className="eyebrow text-signal block mt-0.5">{exp.duration}</span>
                            {exp.summary && (
                              <p className="text-neutral-400 leading-relaxed text-[11px] mt-1 whitespace-pre-wrap">{exp.summary}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 5: Projects Portfolio (if available) */}
                {projectsList.length > 0 && (
                  <div className="space-y-3.5 pt-4 border-t border-white/[0.05]">
                    <h3 className="text-xs font-display font-extrabold text-signal uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Projects Portfolio
                    </h3>
                    <div className="space-y-3 pl-0.5">
                      {projectsList.map((proj: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] rounded-xl space-y-1.5">
                          <h4 className="text-xs font-display font-extrabold text-neutral-200">{proj.name}</h4>
                          {proj.description && <p className="text-[10px] text-neutral-400 leading-relaxed">{proj.description}</p>}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {proj.technologies.map((tech: string) => (
                                <span key={tech} className="bg-white/[0.02] text-neutral-400 text-[8px] px-2 py-0.5 rounded border border-white/[0.04]">{tech}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: AI Analytics & Evaluation Dashboard Card (35% width) */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="card-glass border-white/[0.06] p-6 rounded-2xl shadow-lg space-y-6 relative overflow-hidden reveal-up reveal-delay-1">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                
                {/* Radial Match circle & Recommendation */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow text-neutral-400">Match Diagnostics</span>
                    {/* Future Backend Hook: Ready to surface scoring_method (e.g. mock vs real ai) */}
                    <AiProvenanceChip
                      provenance={c.ai_score ? "AI EVALUATED" : "PRELIMINARY"}
                      confidence={c.ai_score ?? 85}
                    />
                  </div>
                  <AiConfidenceCard
                    score={c.ai_score ?? 0}
                    label="AI MATCH QUALITY"
                    detail={mq ? `${mq.toUpperCase()} CORRELATION` : "STRONG CORRELATION"}
                    className="w-full"
                  />
                  {c.flagged && (
                    <AiRiskWarning
                      title="Anomaly Detected"
                      message="Candidate has triggered integrity rules (suspicious browser tab switches or camera detection loss events during the automated screening session)."
                      className="w-full"
                    />
                  )}
                  <AiSummaryPanel
                    title="AI Match Assessment"
                    bullets={[
                      `Technical rating index: ${c.skill_score ?? 0}/100.`,
                      `Work history score: ${c.exp_score ?? 0}/100.`,
                      `Credentials check: ${c.edu_score ?? 0}/100.`,
                      c.insights || "Strong engineering profile matching core requirements."
                    ]}
                    className="w-full mt-4"
                  />
                </div>

                {/* Capability Metrics list */}
                <div className="pt-4 border-t border-white/[0.05] space-y-3.5">
                  <span className="eyebrow text-neutral-400 block">Core Skills Analysis</span>
                  <div className="space-y-3.5">
                    {metricBars.map(({ label, val }) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-neutral-400 font-medium">{label}</span>
                          <span className="text-neutral-200 font-extrabold">{val ?? "—"}/100</span>
                        </div>
                        <div className="w-full bg-white/[0.02] dark:bg-black/20 h-1.5 rounded-full overflow-hidden border border-white/[0.03]">
                          <div className="bg-signal h-full rounded-full" style={{ width: `${val ?? 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scorecards & Verification Grid */}
                <div className="pt-4 border-t border-white/[0.05] space-y-3">
                  <span className="eyebrow text-neutral-400 block">System Diagnostics</span>
                  <div className="space-y-2.5">
                    
                    {/* Verification */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-500 font-semibold">VERIFICATION</span>
                      <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-extrabold uppercase tracking-wider ${
                        c.verification_status === "verified" 
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                          : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      }`}>{c.verification_status ?? "PENDING"}</span>
                    </div>

                    {/* Flag status */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-500 font-semibold">SECURITY STATUS</span>
                      <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-extrabold uppercase tracking-wider ${
                        c.flagged 
                          ? "text-red-400 bg-red-500/10 border-red-500/20" 
                          : "text-neutral-400 bg-white/[0.02] border-white/[0.06]"
                      }`}>{c.flagged ? "ANOMALY FLAGGED" : "CLEAR"}</span>
                    </div>

                    {/* Sentiment index */}
                    {c.sentiment_score !== null && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 font-semibold">COMMUNICATION</span>
                        <span className="text-emerald-400 font-extrabold text-[10px]">{c.sentiment_score}% Positive</span>
                      </div>
                    )}

                    {/* AI Confidence */}
                    {c.confidence !== null && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-500 font-semibold">AI CONFIDENCE</span>
                        <span className="text-neutral-300 font-bold text-[10px]">{c.confidence}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Overall Rec Badge */}
                <div className="pt-4 border-t border-white/[0.05] space-y-2">
                  <span className="eyebrow text-neutral-400 block">HR recommendation</span>
                  <div className="text-neutral-200 font-extrabold text-xs uppercase flex items-center gap-2 bg-white/[0.02] p-2.5 border border-white/[0.05] rounded-xl">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      score && score >= 85 ? "bg-emerald-500 animate-pulse" : score && score >= 70 ? "bg-signal" : "bg-neutral-500"
                    }`} />
                    <span>
                      {score && score >= 85 ? "RECOMMENDED SHORTLIST" : score && score >= 70 ? "PROCEED TO TECHNICAL" : "EVALUATE FURTHER"}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

          </div>

          {/* Full-width Stepper & Pipelines Section */}
          {c.application_id && (
            <Card className="glass-card border-white/[0.06] p-6 rounded-2xl shadow-lg relative overflow-hidden reveal-up">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <span className="eyebrow text-neutral-400 block mb-3.5">INTERVIEW PROGRESS TIMELINE</span>
              <PipelineView applicationId={c.application_id} />
            </Card>
          )}

          {/* Full-width Integrity Shield Section */}
          {c.application_id && (
            <Card className="glass-card border-white/[0.06] p-6 rounded-2xl shadow-lg relative overflow-hidden reveal-up">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <span className="eyebrow text-neutral-400 block mb-4">INTEGRITY & SECURITY SYSTEM LOGS</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <span className="eyebrow text-neutral-500 block">INTEGRITY SHIELD ENGINE</span>
                  <IntegrityWidget />
                </div>
                <div className="space-y-4">
                  <span className="eyebrow text-neutral-500 block">SECURITY SYSTEM LOGS</span>
                  <SecurityTimeline />
                </div>
              </div>
            </Card>
          )}

          {/* Original Resume viewer text container */}
          {c.resume_url && (
            <Card className="glass-card border-white/[0.06] p-6 rounded-2xl shadow-lg relative overflow-hidden reveal-up">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <h3 className="text-xs font-display font-extrabold text-neutral-400 tracking-widest uppercase mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-signal" /> RESUME ATTACHMENT TEXT
                </span>
                <a href={c.resume_url} target="_blank" rel="noopener noreferrer" className="text-signal hover:text-signal-hover font-bold text-[10px] tracking-wide uppercase transition-colors">
                  OPEN ORIGINAL PDF
                </a>
              </h3>
              <div className="bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] rounded-xl p-4 text-[11px] text-neutral-400 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                {summaryText}
              </div>
            </Card>
          )}
          {/* Stage + flag actions footer */}
          {c.application_id && (
            <div className="pt-6 border-t border-white/[0.05] flex flex-wrap gap-4 items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="eyebrow text-neutral-400">STAGE:</span>
                <select value={c.stage ?? "applied"}
                  onChange={e => { onStageChange(c.application_id!, e.target.value as AppStage); setC(prev => prev ? { ...prev, stage: e.target.value as AppStage } : prev) }}
                  className="bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-[10px] text-neutral-400 p-2 px-3 rounded-xl cursor-pointer hover:border-signal/40 hover:text-neutral-200 transition-all outline-none uppercase font-bold">
                  {[
                    "applied", "screened", "shortlisted",
                    "assignment_sent", "assignment_submitted", "assignment_reviewed",
                    "tech_round", "tech_round_completed",
                    "interview_round", "interview_round_completed",
                    "hr_round", "hr_round_completed",
                    "offered", "hired", "rejected", "waitlisted",
                  ].map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button onClick={async () => {
                  try {
                    const res = await portalApi.generateToken({
                      candidate_id: c.id,
                      application_id: c.application_id!,
                      round_type: "tech"
                    })
                    await navigator.clipboard.writeText(res.url)
                    addToast("success", `Candidate Assessment Link Generated & Copied to Clipboard! (${res.token})`)
                  } catch {
                    addToast("error", "Failed to generate assessment link.")
                  }
                }}
                  className="h-9 px-4 bg-signal/15 border border-signal/30 text-signal hover:bg-signal/25 rounded-xl text-[10px] font-extrabold transition-all active:scale-[0.99] flex items-center gap-1.5 shadow-lg shadow-signal/10">
                  <Link2 className="w-3.5 h-3.5" /> GENERATE ASSESSMENT LINK
                </Button>
                <Button onClick={() => { onFlagChange(c.application_id!, !c.flagged); setC(prev => prev ? { ...prev, flagged: !prev.flagged } : prev) }}
                  className={`h-9 px-4 text-[10px] rounded-xl font-bold flex items-center gap-1.5 transition-all border active:scale-[0.99] ${
                    c.flagged 
                      ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" 
                      : "bg-transparent border-white/[0.08] text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                  }`}>
                  <Flag className="w-3.5 h-3.5" />{c.flagged ? "UNFLAG ANOMALY" : "FLAG ANOMALY"}
                </Button>
                <Button onClick={() => { onStageChange(c.application_id!, "rejected"); onClose() }}
                  className="h-9 px-4 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-[10px] font-bold transition-all active:scale-[0.99]">REJECT</Button>
                <Button onClick={() => { onStageChange(c.application_id!, "waitlisted" as any); onClose() }}
                  className="h-9 px-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 rounded-xl text-[10px] font-bold transition-all active:scale-[0.99]">WAITLIST</Button>
                <Button onClick={() => { onStageChange(c.application_id!, "hired"); onClose() }}
                  className="h-9 px-4 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl text-[10px] font-bold transition-all active:scale-[0.99]">HIRE</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function CandidateManagementView({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  const [candidates,     setCandidates]     = useState<ApiCandidate[]>([])
  const [stats,          setStats]          = useState<CandidateStats | null>(null)
  const [jobs,           setJobs]           = useState<ApiJob[]>([])
  const [loadingCands,   setLoadingCands]   = useState(true)
  const [loadingStats,   setLoadingStats]   = useState(true)
  const [fetchError,     setFetchError]     = useState<string | null>(null)

  const [stageFilter,    setStageFilter]    = useState("all")
  const [searchTerm,     setSearchTerm]     = useState("")
  const searchDebounce   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [isAddOpen,      setIsAddOpen]      = useState(false)
  const [updatingId,     setUpdatingId]     = useState<string | null>(null)

  const { toasts, add: addToast } = useToast()

  // ── fetchers ────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try { setStats(await candidatesApi.stats()) } catch { /* non-fatal */ }
    finally { setLoadingStats(false) }
  }, [])

  const fetchCandidates = useCallback(async (stage: string, search: string) => {
    setLoadingCands(true); setFetchError(null)
    try {
      setCandidates(await candidatesApi.list({
        stage:  stage  !== "all" ? stage  : undefined,
        search: search || undefined,
      }))
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load candidates.")
    } finally { setLoadingCands(false) }
  }, [])

  const fetchJobs = useCallback(async () => {
    try { setJobs(await jobsApi.list()) } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { fetchStats(); fetchJobs() }, [fetchStats, fetchJobs])
  useEffect(() => { fetchCandidates(stageFilter, searchTerm) }, [stageFilter, fetchCandidates])

  // Listen to live candidate applications from portal
  useEffect(() => {
    const handleNewApp = (e: any) => {
      const newCand: ApiCandidate = e.detail
      setCandidates(prev => [newCand, ...prev])
      setStats(prev => prev ? { ...prev, total: prev.total + 1 } : prev)
      addToast("success", `New Candidate Application Received: ${newCand.name} (${newCand.job_title})`)
    }
    window.addEventListener("new-candidate-applied", handleNewApp)
    return () => window.removeEventListener("new-candidate-applied", handleNewApp)
  }, [addToast])

  useEffect(() => {
    if (selectedId) {
      const c = candidates.find(cand => cand.id === selectedId)
      if (c) {
        window.dispatchEvent(new CustomEvent("candidate-selected", {
          detail: { id: c.id, name: c.name }
        }))
      }
    }
  }, [selectedId, candidates])

  useEffect(() => {
    const handleRefresh = () => {
      fetchCandidates(stageFilter, searchTerm)
      fetchStats()
    }
    window.addEventListener("refresh-data", handleRefresh)
    return () => window.removeEventListener("refresh-data", handleRefresh)
  }, [fetchCandidates, fetchStats, stageFilter, searchTerm])

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setSearchTerm(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => fetchCandidates(stageFilter, val), 350)
  }

  const handleStageFilter = (s: string) => setStageFilter(s)

  const handleStageChange = async (appId: string, newStage: AppStage) => {
    setUpdatingId(appId)
    setCandidates(prev => prev.map(c => c.application_id === appId ? { ...c, stage: newStage } : c))
    try {
      await candidatesApi.updateApplication(appId, { stage: newStage })
      fetchStats()
      addToast("success", `Stage updated to ${newStage.toUpperCase()}`)
    } catch (err: unknown) {
      fetchCandidates(stageFilter, searchTerm)
      addToast("error", err instanceof Error ? err.message : "Failed to update stage.")
    } finally { setUpdatingId(null) }
  }

  const handleFlagChange = async (appId: string, flagged: boolean) => {
    setCandidates(prev => prev.map(c => c.application_id === appId ? { ...c, flagged } : c))
    try {
      await candidatesApi.updateApplication(appId, { flagged })
      addToast("success", flagged ? "Candidate flagged." : "Flag removed.")
    } catch (err: unknown) {
      fetchCandidates(stageFilter, searchTerm)
      addToast("error", err instanceof Error ? err.message : "Failed to toggle flag.")
    }
  }

  const handleCreated = (c: ApiCandidate) => {
    setCandidates(prev => [c, ...prev])
    fetchStats()
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wider">
            CANDIDATE <span className="text-gradient">PIPELINE & DOSSIERS</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Track applicant pipeline, verification reports, and AI scores.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}
          className="btn-primary text-xs font-black flex items-center gap-2 rounded-full px-5 py-2.5 h-10 transition-transform hover:-translate-y-0.5">
          <UserPlus className="w-4 h-4" /> ADD CANDIDATE
        </Button>
      </div>

      <StatCards stats={stats} loading={loadingStats} />

      {/* Filters */}
      <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg reveal-up">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="relative w-full lg:w-[480px] shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input value={searchTerm} onChange={e => handleSearch(e.target.value)}
              placeholder="Search candidates, email or skills..."
              className="pl-10 bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-xs text-neutral-200 rounded-xl placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all h-10" />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto scrollbar-none pb-1 lg:pb-0">
            <span className="eyebrow text-neutral-400 shrink-0">STAGE:</span>
            <div className="flex bg-white/[0.02] dark:bg-black/25 border border-white/[0.06] p-1 rounded-full overflow-hidden shrink-0">
              {["all","applied","screened","shortlisted","tech_round","interview_round","hr_round","offered","hired","waitlisted","rejected"].map(s => (
                <button key={s} onClick={() => handleStageFilter(s)}
                  className={`px-3.5 py-1 text-[9px] font-bold rounded-full transition-all uppercase whitespace-nowrap ${
                    stageFilter === s 
                      ? "bg-signal text-white shadow-md shadow-signal/20" 
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}>{s.replace(/_/g, " ")}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="p-6 pb-3 border-b border-white/[0.05] flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase">
            CANDIDATE APPLICATIONS ({loadingCands ? "…" : candidates.length})
          </CardTitle>
          <button onClick={() => fetchCandidates(stageFilter, searchTerm)}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCands ? "animate-spin" : ""}`} />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {fetchError && (
            <div className="flex items-center gap-2.5 m-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
              <button onClick={() => fetchCandidates(stageFilter, searchTerm)} className="ml-auto underline">Retry</button>
            </div>
          )}
          {loadingCands && !fetchError && (
            <div className="p-12 flex items-center justify-center gap-3 text-neutral-400 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-signal" /> LOADING CANDIDATES...
            </div>
          )}
          {!loadingCands && !fetchError && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01] dark:bg-black/10 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-5 pl-6 w-12 text-center">FLAG</th>
                    <th className="p-5">CANDIDATE</th>
                    <th className="p-5">APPLIED ROLE</th>
                    <th className="p-5 text-center">AI SCORE</th>
                    <th className="p-5 text-center">MATCH</th>
                    <th className="p-5">STAGE</th>
                    <th className="p-5">APPLIED DATE</th>
                    <th className="p-5 text-right pr-6">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-xs">
                  {candidates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-neutral-500 font-medium">
                        NO APPLICANTS MATCHING CRITERIA FOUND.
                      </td>
                    </tr>
                  ) : candidates.map(c => (
                    <tr key={c.id} className="hover:bg-[var(--hm-bg-elevated)] hover:translate-y-[-1.5px] hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out group cursor-pointer reveal-up"
                      onClick={() => setSelectedId(c.id)}>
                      {/* Flag */}
                      <td className="py-6 px-5 pl-6 text-center first:rounded-l-2xl" onClick={e => { e.stopPropagation(); if (c.application_id) handleFlagChange(c.application_id, !c.flagged); }}>
                        <Flag className={`w-3.5 h-3.5 mx-auto cursor-pointer transition-colors ${c.flagged ? "text-red-500 fill-red-500" : "text-neutral-700 hover:text-neutral-400"}`} />
                      </td>
                      {/* Name */}
                      <td className="py-6 px-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-signal/10 border border-signal/20 flex items-center justify-center text-signal font-extrabold text-[12px] shrink-0 font-display">
                            {c.initials}
                          </div>
                          <div>
                            <div className="text-neutral-900 dark:text-white font-extrabold text-sm group-hover:text-signal transition-colors flex items-center gap-1.5 font-display">
                              {c.name}
                              {c.verification_status === "verified" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-medium mt-0.5">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-5 text-neutral-500 dark:text-neutral-300 font-extrabold text-xs">{c.job_title ?? "—"}</td>
                      <td className="py-6 px-5 text-center"><ScoreBadge score={c.ai_score} /></td>
                      <td className="py-6 px-5 text-center">
                        {c.match_quality ? (
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${MATCH_COLORS[c.match_quality] ?? ""}`}>
                            {c.match_quality}
                          </span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="py-6 px-5">
                        {c.stage ? (
                          <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${STAGE_COLORS[c.stage] ?? ""}`}>
                            {c.stage.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="py-6 px-5 text-neutral-400">{c.applied_date ?? "—"}</td>
                      {/* Actions */}
                      <td className="py-6 px-5 text-right pr-6 last:rounded-r-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          {updatingId === c.application_id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                          ) : c.application_id ? (
                            <select value={c.stage ?? "applied"}
                              onChange={e => handleStageChange(c.application_id!, e.target.value as AppStage)}
                              className="bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-[10px] text-neutral-400 p-1.5 px-2 rounded-xl cursor-pointer hover:border-signal/40 hover:text-neutral-200 transition-all outline-none uppercase font-bold">
                              {[
                                "applied", "screened", "shortlisted",
                                "assignment_sent", "assignment_submitted", "assignment_reviewed",
                                "tech_round", "tech_round_completed",
                                "interview_round", "interview_round_completed",
                                "hr_round", "hr_round_completed",
                                "offered", "hired", "rejected", "waitlisted",
                              ].map(s => (
                                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                              ))}
                            </select>
                          ) : null}
                          <Button onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const res = await portalApi.generateToken({
                                candidate_id: c.id,
                                application_id: c.application_id || "app-101",
                                round_type: "tech"
                              })
                              await navigator.clipboard.writeText(res.url)
                              addToast("success", `Assessment Link Copied: ${res.token}`)
                            } catch {
                              addToast("error", "Failed to generate link.")
                            }
                          }}
                            className="bg-signal/15 hover:bg-signal/25 border border-signal/30 text-signal text-[10px] font-extrabold px-2.5 py-1.5 h-7 rounded-xl transition-all active:scale-95 flex items-center gap-1">
                            <Link2 className="w-3 h-3" /> LINK
                          </Button>
                          <Button onClick={() => setSelectedId(c.id)}
                            className="bg-transparent hover:bg-white/5 border border-white/[0.08] text-neutral-300 text-[10px] font-bold px-3 py-1.5 h-7 rounded-xl transition-all active:scale-95">
                            VIEW DOSSIER
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {isAddOpen && (
        <AddCandidateModal
          jobs={jobs}
          onClose={() => setIsAddOpen(false)}
          onCreated={handleCreated}
          addToast={addToast}
        />
      )}
      {selectedId && (
        <DossierModal
          candidateId={selectedId}
          onClose={() => setSelectedId(null)}
          onStageChange={handleStageChange}
          onFlagChange={handleFlagChange}
          addToast={addToast}
          sidebarCollapsed={sidebarCollapsed}
        />
      )}
    </div>
  )
}
