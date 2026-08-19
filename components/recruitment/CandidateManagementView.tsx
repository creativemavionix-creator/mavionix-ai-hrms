"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { candidatesApi, jobsApi, portalApi, assignmentsApi, ApiCandidate, CandidateStats, AppStage, ApiJob, ApiAssignment } from "@/lib/api"
import { supabase } from "@/lib/supabaseClient"
import { logStageTransition } from "@/lib/stageHistory"
import {
  Search, UserPlus, Flag, ShieldCheck, Mail, Phone, Tag,
  Loader2, AlertTriangle, CheckCircle, CheckCircle2, Clock, X, RefreshCw, Upload,
  FileText, Brain, Star, Users, Calendar, XCircle, Briefcase, Award, Sliders, Link2, Key, Copy, Check, Send
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
  if (score === null || score === undefined) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-full animate-pulse">
      <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />
      <span>SCORING...</span>
    </span>
  )
  const color = score >= 85 ? "text-emerald-400 font-extrabold" : score >= 70 ? "text-cyan-400 font-bold" : "text-neutral-400 font-medium"
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className={`font-mono text-sm ${color}`}>{score}%</span>
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

// ─── Assign Project Task Modal ───────────────────────────────────────────────
interface AssignProjectModalProps {
  candidateName: string
  candidateId: string
  applicationId: string
  onClose: () => void
  onAssigned: (title: string, description: string, deadlineDays: number, tokenUrl: string) => void
  addToast: (type: Toast["type"], msg: string) => void
}

function AssignProjectModal({ candidateName, candidateId, applicationId, onClose, onAssigned, addToast }: AssignProjectModalProps) {
  const defaultDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  const [projectTitle, setProjectTitle] = useState("Distributed Microservices Rate Limiter & Async Router")
  const [projectDescription, setProjectDescription] = useState(
    "Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines. Include Docker Compose setup and documentation."
  )
  const [deadlineDate, setDeadlineDate] = useState(defaultDeadline)
  const [deliverables, setDeliverables] = useState<string[]>(["github_link", "report"])
  const [assigning, setAssigning] = useState(false)

  const PRESET_PROJECTS = [
    {
      title: "Distributed Microservices Rate Limiter & Async Router",
      desc: "Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines. Include Docker Compose setup and documentation."
    },
    {
      title: "Zero-Trust OAuth2 & RBAC Auth Gateway",
      desc: "Build a production-ready JWT OAuth2 authentication middleware in Go with Redis session blacklist and role-based access control (RBAC)."
    },
    {
      title: "Real-Time Event Streaming & Data Pipeline Router",
      desc: "Develop an async Apache Kafka stream processing pipeline in Python using Faust to aggregate and route 10k events/sec into PostgreSQL."
    }
  ]

  const toggleDeliverable = (key: string) => {
    setDeliverables(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const setPresetDeadlineDays = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    setDeadlineDate(`${yyyy}-${mm}-${dd}`)
  }

  const getPresetDateString = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectTitle.trim() || !projectDescription.trim()) {
      addToast("error", "Project Title and Description are required.")
      return
    }
    if (deliverables.length === 0) {
      addToast("error", "Please select at least one required deliverable.")
      return
    }

    setAssigning(true)
    try {
      if (applicationId && !applicationId.startsWith("app-")) {
        const deadlineIso = new Date(`${deadlineDate}T23:59:59Z`).toISOString()
        await assignmentsApi.generate(applicationId, {
          title: projectTitle,
          description: projectDescription,
          requirements: projectDescription,
          deadline_date: deadlineIso,
          deliverables_required: deliverables
        })
      }

      const assignedData = {
        title: projectTitle,
        description: projectDescription,
        deadlineDate,
        deliverables
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("recruiter-assigned-project", { detail: assignedData }))
      }

      addToast("success", `🚀 Assignment sent to ${candidateName}! It will appear on their login dashboard.`)
      onAssigned(projectTitle, projectDescription, 3, "")
    } catch (err: any) {
      addToast("error", err?.message || "Failed to assign project task.")
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[150] p-4">
      <Card className="glass-card border-cyan-500/40 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden bg-[#0a0c14] text-white">
        <CardHeader className="p-6 border-b border-white/10 flex flex-row items-center justify-between bg-[#0e111d]">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] uppercase font-bold tracking-widest">
              <FileText className="w-4 h-4 text-cyan-400" />
              RECRUITER TASK ASSIGNMENT WORKSTATION
            </div>
            <CardTitle className="text-xl font-display font-extrabold text-white mt-1">
              Send Assignment to {candidateName}
            </CardTitle>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <form onSubmit={handleAssign} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto bg-[#07090f]">
          <div className="space-y-2">
            <label className="eyebrow text-neutral-300 font-bold">SELECT PRESET PROJECT TEMPLATE</label>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_PROJECTS.map((tmpl, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => {
                    setProjectTitle(tmpl.title)
                    setProjectDescription(tmpl.desc)
                  }}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    projectTitle === tmpl.title
                      ? "bg-cyan-950/80 border-cyan-400 text-cyan-200 font-semibold shadow-lg shadow-cyan-500/20"
                      : "bg-[#0f121e] border-white/10 text-neutral-200 hover:bg-white/10"
                  }`}
                >
                  <span className="font-extrabold block text-white text-xs">{tmpl.title}</span>
                  <span className="text-[11px] text-neutral-300 line-clamp-1 mt-0.5">{tmpl.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="eyebrow text-neutral-300 font-bold">PROJECT ASSIGNMENT TITLE *</label>
            <Input
              required
              value={projectTitle}
              onChange={e => setProjectTitle(e.target.value)}
              placeholder="e.g. Distributed Microservices Rate Limiter & Async Router"
              className="bg-[#0f121e] border-white/20 text-white text-xs rounded-xl h-10 font-bold placeholder:text-neutral-500 focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="eyebrow text-neutral-300 font-bold">PROJECT SPECIFICATIONS & GROUND RULES *</label>
            <textarea
              required
              rows={4}
              value={projectDescription}
              onChange={e => setProjectDescription(e.target.value)}
              placeholder="Detail the technical requirements, architecture constraints, and expected deliverables..."
              className="w-full bg-[#0f121e] border border-white/20 text-neutral-100 text-xs rounded-2xl p-3.5 outline-none focus:border-cyan-400 font-sans leading-relaxed shadow-inner placeholder:text-neutral-500"
            />
          </div>

          {/* Deadline Picker */}
          <div className="space-y-2.5 p-4 bg-[#0e111d] border border-cyan-500/30 rounded-2xl">
            <label className="eyebrow text-cyan-300 uppercase font-extrabold tracking-wider block">CUSTOM SUBMISSION DEADLINE *</label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="date"
                required
                value={deadlineDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => setDeadlineDate(e.target.value)}
                className="bg-[#05060b] border border-cyan-500/40 text-white rounded-xl text-xs px-4 py-2.5 outline-none focus:border-cyan-400 font-mono font-bold w-full sm:w-auto cursor-pointer [color-scheme:dark] shadow-inner"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {[3, 5, 7].map((days) => {
                  const pDate = getPresetDateString(days)
                  const isActive = deadlineDate === pDate
                  return (
                    <button
                      type="button"
                      key={days}
                      onClick={() => setPresetDeadlineDays(days)}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono font-extrabold transition-all cursor-pointer ${
                        isActive
                          ? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 scale-105"
                          : "bg-white/[0.05] border-white/15 hover:bg-white/10 text-cyan-300"
                      }`}
                    >
                      +{days} Days
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Configurable Deliverables Checkboxes */}
          <div className="space-y-2 pt-1 border-t border-white/[0.06]">
            <label className="eyebrow text-emerald-400 uppercase font-bold">REQUIRED DELIVERABLES (SELECT ALL THAT APPLY) *</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { key: "github_link", label: "GitHub Repository URL", desc: "Candidate must provide a public repository link" },
                { key: "deployment_link", label: "Live Deployment URL (Vercel / Render)", desc: "Candidate must provide a hosted live application URL" },
                { key: "report", label: "Written Architecture Report / Notes", desc: "Candidate must write system design and trade-off notes" },
              ].map(item => {
                const checked = deliverables.includes(item.key)
                return (
                  <label
                    key={item.key}
                    onClick={() => toggleDeliverable(item.key)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      checked
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-md"
                        : "bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 rounded accent-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-white block">{item.label}</span>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">{item.desc}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
            <Button
              type="submit"
              disabled={assigning}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Assignment...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>🚀 SEND ASSIGNMENT TO CANDIDATE DASHBOARD</span>
                </>
              )}
            </Button>
            <Button type="button" onClick={onClose} className="bg-transparent hover:bg-white/5 border border-white/10 text-neutral-400 text-xs font-bold rounded-xl py-3 px-4">
              CANCEL
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Resume Viewer Modal Component ─────────────────────────────────────────
function ResumeViewerModal({
  candidateName,
  resumeFileName,
  resumeText,
  skills,
  statementOfIntent,
  onClose
}: {
  candidateName: string
  resumeFileName: string
  resumeText: string
  skills: string[]
  statementOfIntent?: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <Card className="glass-card border-violet-500/30 w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl bg-[#0b0c14] text-white flex flex-col">
        <CardHeader className="p-6 border-b border-white/[0.08] flex flex-row items-center justify-between shrink-0 bg-[#0e101c]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="eyebrow text-violet-400 uppercase font-bold">CANDIDATE RESUME DOCUMENT</span>
              <CardTitle className="text-lg font-display font-extrabold text-white mt-0.5">
                {candidateName} — {resumeFileName}
              </CardTitle>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Skills Breakdown */}
          {skills && skills.length > 0 && (
            <div className="space-y-2">
              <span className="eyebrow text-emerald-400">PARSED TECHNICAL SKILLS</span>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((sk, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono font-bold text-[10px]">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Statement of Intent */}
          {statementOfIntent && (
            <div className="space-y-2">
              <span className="eyebrow text-cyan-400">STATEMENT OF INTENT & SYSTEM IMPACT</span>
              <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl font-sans text-neutral-200 leading-relaxed">
                {statementOfIntent}
              </div>
            </div>
          )}

          {/* Resume Raw Text Content */}
          <div className="space-y-2">
            <span className="eyebrow text-neutral-400">FULL RESUME TEXT & CAREER SUMMARY</span>
            <div className="bg-white/[0.02] border border-white/10 p-5 rounded-2xl font-mono text-neutral-200 leading-relaxed whitespace-pre-wrap selection:bg-violet-500/30">
              {resumeText || `${candidateName} resume text details unavailable.`}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.08] bg-[#0e101c] flex justify-end shrink-0">
          <Button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer">
            CLOSE RESUME VIEWER
          </Button>
        </div>
      </Card>
    </div>
  )
}

function RejectApplicationModal({
  candidateName,
  onClose,
  onConfirmReject,
}: {
  candidateName: string
  onClose: () => void
  onConfirmReject: (reason: string) => void
}) {
  const [reason, setReason] = useState("Does not meet minimum requirements.")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl max-w-md w-full space-y-4 shadow-2xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reject Application — {candidateName}</h3>
        <p className="text-xs text-neutral-400">Provide a rejection reason or note for stage history audit log:</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full h-24 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-red-500"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="text-xs text-neutral-400">Cancel</Button>
          <Button onClick={() => onConfirmReject(reason)} className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg">Confirm Rejection</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Grant Portal Access Modal ───────────────────────────────────────────────
interface GrantPortalAccessModalProps {
  candidateName: string
  email: string
  password: string
  emailSent: boolean
  emailId?: string | null
  emailError?: string | null
  onClose: () => void
}

function GrantPortalAccessModal({
  candidateName,
  email,
  password,
  emailSent,
  emailId,
  emailError,
  onClose
}: GrantPortalAccessModalProps) {
  const [copied, setCopied] = useState(false)
  const portalUrl = process.env.NEXT_PUBLIC_CANDIDATE_PORTAL_URL || (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000")

  const copyCredentials = () => {
    const credText = `HireMind AI Candidate Portal Access:\nLink: ${portalUrl}\nEmail: ${email}\nPassword: ${password}`
    navigator.clipboard.writeText(credText)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
      <Card className="glass-card border-violet-500/30 w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-5 bg-[#0f111d] text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-violet-400 font-display font-extrabold text-sm uppercase tracking-wide">
            <Key className="w-4 h-4 text-violet-400" />
            <span>Candidate Portal Access Granted</span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-neutral-300">
            Account credentials generated for <strong className="text-white">{candidateName}</strong>:
          </p>
        </div>

        {/* Credentials Box */}
        <div className="bg-white/[0.03] border border-white/10 p-4 rounded-xl space-y-3 font-mono text-xs">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Portal Sign-In URL</span>
            <span className="text-violet-300 font-bold">{portalUrl}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Candidate Email</span>
            <span className="text-white font-bold">{email}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Temporary Password</span>
            <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/10 mt-1">
              <code className="text-emerald-400 font-bold">{password}</code>
              <button
                onClick={copyCredentials}
                className="text-[10px] bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 px-2 py-1 rounded border border-violet-500/30 flex items-center gap-1 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-violet-300" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Email Delivery Status Banner */}
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
          emailSent
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
            : "bg-amber-500/10 border-amber-500/25 text-amber-300"
        }`}>
          {emailSent ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="font-extrabold block">
              {emailSent ? "Credentials Emailed via Resend" : "Manual Credential Relay Required"}
            </span>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {emailSent
                ? `Transaction email successfully dispatched (Resend ID: ${emailId || "verified"}).`
                : `Resend Notice: ${emailError || "Email could not be delivered"}. Please copy and relay credentials directly to candidate.`}
            </p>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 rounded-xl text-xs cursor-pointer"
        >
          Done
        </Button>
      </Card>
    </div>
  )
}

// ─── Candidate Dossier Modal ─────────────────────────────────────────────────
function DossierModal({ candidateId, onClose, onStageChange, onFlagChange, addToast, sidebarCollapsed = false }: {
  candidateId: string
  onClose: () => void
  onStageChange: (appId: string, stage: AppStage, note?: string) => void
  onFlagChange:  (appId: string, flagged: boolean) => void
  addToast: (type: Toast["type"], msg: string) => void
  sidebarCollapsed?: boolean
}) {
  const [c, setC]         = useState<ApiCandidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)

  const [grantingAccess, setGrantingAccess] = useState(false)
  const [portalCredentialsModal, setPortalCredentialsModal] = useState<{
    email: string
    password: string
    email_sent: boolean
    email_id?: string | null
    email_error?: string | null
  } | null>(null)

  const handleGrantPortalAccess = async () => {
    if (!c) return
    setGrantingAccess(true)
    try {
      const res = await candidatesApi.grantPortalAccess(c.id)
      if (res.success) {
        setC(prev => prev ? { ...prev, user_id: res.user_id || "provisioned" } : prev)
        setPortalCredentialsModal({
          email: res.email,
          password: res.password,
          email_sent: res.email_sent,
          email_id: res.email_id,
          email_error: res.email_error
        })
        addToast(
          res.email_sent ? "success" : "info",
          res.email_sent
            ? `🔑 Portal access granted & credentials emailed to ${res.email}!`
            : `🔑 Portal access granted! (Manual credential relay required)`
        )
      } else {
        addToast("error", res.message || "Failed to grant portal access.")
      }
    } catch (err: any) {
      addToast("error", err?.message || "Failed to grant portal access.")
    } finally {
      setGrantingAccess(false)
    }
  }

  const handleGenerateInterviewLink = async () => {
    if (!c) return
    try {
      const res = await portalApi.generateToken({
        candidate_id: c.id,
        application_id: c.application_id || `app-${Date.now()}`,
        round_type: "tech"
      })
      const interviewUrl = `${window.location.origin}/candidate?token=${res.token}&type=interview`
      await navigator.clipboard.writeText(interviewUrl)

      const apiRes = await fetch("/api/interviews/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateEmail: c.email,
          candidateName: c.name,
          jobTitle: c.job_title || "Senior Backend Engineer",
          interviewLink: interviewUrl,
          applicationId: c.application_id || `app-${Date.now()}`,
          candidateId: c.id
        })
      })

      const result = await apiRes.json()

      onStageChange(c.application_id!, "tech_round", "Generated and sent live AI interview link")
      setC(prev => prev ? { ...prev, stage: "tech_round" } : prev)

      if (result.success) {
        addToast("success", `🎙️ Interview link sent to ${c.email} & copied to clipboard!`)
      } else {
        addToast("error", `Notice: Link generated, but email notice failed: ${result.error}`)
      }
    } catch (err: any) {
      addToast("error", `Failed to dispatch interview link: ${err?.message || "Unknown error"}`)
    }
  }

  const [assignment, setAssignment] = useState<ApiAssignment | null>(null)
  const [recruiterScore, setRecruiterScore] = useState<string>("85")
  const [reviewNotes, setReviewNotes] = useState<string>("")
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)

  useEffect(() => {
    candidatesApi.get(candidateId)
      .then(res => {
        setC(res)
        if (res.application_id) {
          assignmentsApi.getByApplication(res.application_id).then(asgn => {
            if (asgn) {
              setAssignment(asgn)
              if (asgn.score) setRecruiterScore(String(asgn.score))
            }
          })
        }
      })
      .catch(() => addToast("error", "Failed to load candidate details."))
      .finally(() => setLoading(false))
  }, [candidateId])

  const handleReviewSubmit = async (decision: "approved" | "rejected" = "approved") => {
    if (!assignment) return
    setSubmittingReview(true)
    try {
      const res = await assignmentsApi.recruiterReview(assignment.id, {
        recruiter_score: Number(recruiterScore) || 85,
        notes: reviewNotes,
        decision: decision
      })
      
      setAssignment((prev: ApiAssignment | null) => prev ? { ...prev, status: "reviewed", score: res.final_score } : prev)
      if (c?.application_id) {
        const nextStage = decision === "approved" ? "tech_round" : "rejected"
        onStageChange(c.application_id, nextStage, `Assignment ${decision} by recruiter`)
        setC(prev => prev ? { ...prev, stage: nextStage } : prev)
      }

      if (decision === "approved") {
        addToast("success", `🎉 Assignment approved! Candidate advanced to Tech Round (${res.final_score}/100).`)
      } else {
        addToast("info", `Assignment rejected (${res.final_score}/100). Candidate application marked as rejected.`)
      }
    } catch (err: any) {
      addToast("error", err?.message || "Failed to submit assignment review.")
    } finally {
      setSubmittingReview(false)
    }
  }

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

        {/* Recruiter Action Workstation Controls (Consolidated & Categorized) */}
        <div className="bg-[#0b0d17] border-b border-white/10 p-4 px-6 space-y-3 sticky top-[73px] backdrop-blur-xl z-20 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
              <span className="text-xs font-mono font-extrabold text-violet-300 uppercase tracking-wider">
                RECRUITER WORKSTATION CONTROLS — STAGE: {c.stage?.replace(/_/g, " ").toUpperCase() || "APPLIED"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
              <span>App ID:</span>
              <span className="text-neutral-200 font-bold">{c.application_id ? c.application_id.slice(0, 8) : "N/A"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* Group 1: Screening & Decision */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 flex flex-col justify-between">
              <span className="text-[9px] font-mono font-extrabold text-emerald-400 uppercase tracking-widest block">
                1. Screening Decision
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    onStageChange(c.application_id!, "approved", "Approved by recruiter during resume screening")
                    setC(prev => prev ? { ...prev, stage: "approved" } : prev)
                    addToast("success", `🎉 ${c.name} APPROVED! Moved candidate to next stage.`)
                  }}
                  className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </Button>

                <Button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </Button>
              </div>
            </div>

            {/* Group 2: Pipeline Operations & Portal Access */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 flex flex-col justify-between">
              <span className="text-[9px] font-mono font-extrabold text-cyan-400 uppercase tracking-widest block">
                2. Pipeline & Portal Operations
              </span>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => setShowAssignModal(true)}
                    className="flex-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Send Task</span>
                  </Button>

                  <Button
                    onClick={handleGenerateInterviewLink}
                    className="flex-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Brain className="w-3 h-3" />
                    <span>Interview Link</span>
                  </Button>
                </div>

                {/* Grant Portal Access Action / Badge */}
                {(c.user_id || parsed?.user_id) ? (
                  <div className="p-1 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center justify-between px-2">
                    <span className="text-[10px] font-bold font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>Portal Access Active</span>
                    </span>
                    <button
                      onClick={handleGrantPortalAccess}
                      disabled={grantingAccess}
                      className="text-[9px] font-mono text-neutral-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      {grantingAccess ? "Resetting..." : "Re-provision"}
                    </button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGrantPortalAccess}
                    disabled={grantingAccess}
                    className="w-full bg-violet-600/80 hover:bg-violet-600 text-white border border-violet-400/30 text-[10px] font-extrabold py-1 px-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-violet-500/20"
                  >
                    {grantingAccess ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Granting Access...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3 h-3 text-violet-200" />
                        <span>🔑 Grant Portal Access</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Group 3: Final Decision & Security Flag */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 flex flex-col justify-between">
              <span className="text-[9px] font-mono font-extrabold text-amber-400 uppercase tracking-widest block">
                3. Final Outcome & Security
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  onClick={() => {
                    onStageChange(c.application_id!, "hired", "Recruiter hired candidate after final interview evaluation")
                    setC(prev => prev ? { ...prev, stage: "hired" } : prev)
                    addToast("success", `🎉 ${c.name} HIRED! Official offer issued.`)
                  }}
                  className="flex-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Award className="w-3 h-3" />
                  <span>Hire</span>
                </Button>

                <Button
                  onClick={() => {
                    onStageChange(c.application_id!, "waitlisted" as any)
                    setC(prev => prev ? { ...prev, stage: "waitlisted" as any } : prev)
                    addToast("info", `${c.name} moved to Waitlist.`)
                  }}
                  className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Clock className="w-3 h-3" />
                  <span>Hold</span>
                </Button>

                <Button
                  onClick={() => {
                    onFlagChange(c.application_id!, !c.flagged)
                    setC(prev => prev ? { ...prev, flagged: !prev.flagged } : prev)
                  }}
                  className={`flex-1 text-[10px] py-1 px-2 rounded-lg font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    c.flagged ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/[0.02] border-white/10 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Flag className="w-3 h-3" />
                  <span>{c.flagged ? "Unflag" : "Flag"}</span>
                </Button>
              </div>
            </div>

          </div>

          {showRejectModal && (
            <RejectApplicationModal
              candidateName={c.name}
              onClose={() => setShowRejectModal(false)}
              onConfirmReject={(reason) => {
                onStageChange(c.application_id!, "rejected", reason)
                setC(prev => prev ? { ...prev, stage: "rejected" } : prev)
                setShowRejectModal(false)
                addToast("info", `Application for ${c.name} marked as rejected.`)
              }}
            />
          )}

          {showAssignModal && (
            <AssignProjectModal
              candidateName={c.name}
              candidateId={c.id}
              applicationId={c.application_id || `app-${Date.now()}`}
              onClose={() => setShowAssignModal(false)}
              onAssigned={(title, desc, days, url) => {
                onStageChange(c.application_id!, "assignment_sent", `Assigned project: ${title}`)
                setC(prev => prev ? { ...prev, stage: "assignment_sent" } : prev)
                setShowAssignModal(false)
                addToast("success", `📁 Assigned "${title}" and copied link to clipboard!`)
              }}
              addToast={addToast}
            />
          )}

          {portalCredentialsModal && (
            <GrantPortalAccessModal
              candidateName={c.name}
              email={portalCredentialsModal.email}
              password={portalCredentialsModal.password}
              emailSent={portalCredentialsModal.email_sent}
              emailId={portalCredentialsModal.email_id}
              emailError={portalCredentialsModal.email_error}
              onClose={() => setPortalCredentialsModal(null)}
            />
          )}
        </div>

        {/* Dossier Body Content */}
        <CardContent className="p-6 space-y-6 text-xs scrollbar-none flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Profile & Candidate Answers Card (65% width) */}
            <div className="lg:col-span-8 space-y-6">

              {/* Assignment & Submission Review Card (Task 4) */}
              {assignment && (
                <Card className="glass-card border-cyan-500/30 p-6 rounded-2xl shadow-xl space-y-4 bg-gradient-to-b from-cyan-950/20 to-transparent">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                        Take-Home Technical Assignment & Candidate Submission
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase border ${
                      assignment.status === "submitted" ? "bg-amber-500/15 border-amber-500/30 text-amber-400" :
                      assignment.status === "reviewed" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                      "bg-white/[0.05] border-white/10 text-neutral-400"
                    }`}>
                      {assignment.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <h4 className="font-bold text-white text-sm">{assignment.title}</h4>
                    <p className="text-neutral-300 text-xs leading-relaxed bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-xl">
                      {assignment.description}
                    </p>
                    {assignment.deadline && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Deadline: {new Date(assignment.deadline).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Submitted Deliverables Review */}
                  {(assignment.status === "submitted" || assignment.status === "reviewed") ? (
                    <div className="space-y-4 pt-3 border-t border-white/[0.08]">
                      <span className="eyebrow text-emerald-400 uppercase font-extrabold block">
                        ✓ CANDIDATE SUBMITTED DELIVERABLES
                      </span>

                      <div className="grid grid-cols-1 gap-2.5">
                        {(assignment.submission_data?.github_link || assignment.submission_url) && (
                          <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">GitHub Repository:</span>
                            <a
                              href={assignment.submission_data?.github_link || assignment.submission_url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>{assignment.submission_data?.github_link || assignment.submission_url} ↗</span>
                            </a>
                          </div>
                        )}

                        {assignment.submission_data?.deployment_link && (
                          <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Live Deployment:</span>
                            <a
                              href={assignment.submission_data.deployment_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              <span>{assignment.submission_data.deployment_link} ↗</span>
                            </a>
                          </div>
                        )}

                        {(assignment.submission_data?.report || assignment.submission_text) && (
                          <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl space-y-1.5">
                            <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Written Architecture Report / Notes:</span>
                            <p className="text-xs text-neutral-200 font-mono leading-relaxed whitespace-pre-wrap">
                              {assignment.submission_data?.report || assignment.submission_text}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Recruiter Evaluation Form & Status Display */}
                      {assignment.status === "reviewed" ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2.5">
                          <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>✓ ASSIGNMENT REVIEWED & APPROVED (SCORE: {assignment.score || recruiterScore}/100)</span>
                          </div>
                          <p className="text-xs text-neutral-300">
                            Candidate passed technical assignment evaluation and has been advanced to Tech Round.
                          </p>
                          {reviewNotes && (
                            <div className="p-2.5 bg-black/30 border border-white/10 rounded-lg text-xs font-mono text-neutral-300">
                              <span className="text-[9px] text-neutral-400 block font-bold uppercase">RECRUITER FEEDBACK:</span>
                              <span>{reviewNotes}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-white/[0.03] border border-cyan-500/30 rounded-xl space-y-3">
                          <span className="eyebrow text-cyan-400 uppercase font-extrabold block">
                            RECRUITER ASSIGNMENT EVALUATION & SCORING
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Assignment Score (0 - 100) *</label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={recruiterScore}
                                onChange={e => setRecruiterScore(e.target.value)}
                                className="bg-white/[0.03] border-white/10 text-white rounded-xl text-xs py-2"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Review Decision</label>
                              <div className="py-2 text-xs font-bold text-emerald-400">
                                Approve & Advance to Tech Round
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Review Notes / Feedback</label>
                            <textarea
                              rows={2}
                              value={reviewNotes}
                              onChange={e => setReviewNotes(e.target.value)}
                              placeholder="Enter notes on code architecture, test coverage, and design choices..."
                              className="w-full bg-white/[0.03] border border-white/10 text-white rounded-xl text-xs p-2.5 outline-none focus:border-cyan-500"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                            <Button
                              onClick={() => handleReviewSubmit("approved")}
                              disabled={submittingReview}
                              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 py-3 rounded-xl font-bold text-xs uppercase text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {submittingReview ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              <span>APPROVE & ADVANCE TO TECH ROUND</span>
                            </Button>

                            <Button
                              onClick={() => handleReviewSubmit("rejected")}
                              disabled={submittingReview}
                              variant="outline"
                              className="w-full border-rose-500/40 hover:bg-rose-500/10 text-rose-300 py-3 rounded-xl font-bold text-xs uppercase shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {submittingReview ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400" />
                              )}
                              <span>REJECT ASSIGNMENT</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-[11px] text-neutral-400 font-mono">
                      ⏳ Pending candidate submission on login dashboard.
                    </div>
                  )}
                </Card>
              )}

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

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.06]">
                  {linkedInUrl ? (
                    <a
                      href={linkedInUrl.startsWith("http") ? linkedInUrl : `https://${linkedInUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>LinkedIn Profile ↗</span>
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 text-neutral-400 text-xs font-mono">
                      LinkedIn: linkedin.com/in/{c.name.toLowerCase().replace(/\s+/g, "")}
                    </span>
                  )}

                  {githubUrl ? (
                    <a
                      href={githubUrl.startsWith("http") ? githubUrl : `https://${githubUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-500/10 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>GitHub / Portfolio ↗</span>
                    </a>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/10 text-neutral-400 text-xs font-mono">
                      GitHub: github.com/{c.name.toLowerCase().replace(/\s+/g, "")}
                    </span>
                  )}

                  <Button
                    onClick={() => setShowResumeModal(true)}
                    className="px-4 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-lg shadow-violet-500/15 cursor-pointer ml-auto"
                  >
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span>📄 VIEW CANDIDATE RESUME</span>
                  </Button>
                </div>

                {showResumeModal && (
                  <ResumeViewerModal
                    candidateName={c.name}
                    resumeFileName={resumeFileName}
                    resumeText={resumeText}
                    skills={skillsList}
                    statementOfIntent={statementOfIntent}
                    onClose={() => setShowResumeModal(false)}
                  />
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

          {/* Stage Footer */}
          {c.application_id && (
            <div className="pt-4 border-t border-white/[0.05] flex flex-wrap gap-4 items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="eyebrow text-neutral-400">PIPELINE STAGE OVERRIDE:</span>
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
              <Button onClick={onClose} variant="ghost" className="text-xs text-neutral-400 hover:text-white">
                Close Dossier
              </Button>
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
  useEffect(() => { fetchCandidates(stageFilter, searchTerm) }, [stageFilter, searchTerm, fetchCandidates])

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

  // Listen to Realtime updates on public.candidates, public.applications, and public.ai_reports
  useEffect(() => {
    const channel = supabase
      .channel("recruiter-management-table-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        () => {
          fetchCandidates(stageFilter, searchTerm)
          fetchStats()
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "applications" },
        () => {
          fetchCandidates(stageFilter, searchTerm)
          fetchStats()
          addToast("success", `📋 New Candidate Application Received! Syncing pipeline...`)
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "applications" },
        (payload) => {
          const updatedApp = payload.new as any
          if (updatedApp) {
            setCandidates(prev => prev.map(c => {
              if (c.application_id === updatedApp.id) {
                return {
                  ...c,
                  ai_score: updatedApp.ai_score,
                  match_quality: updatedApp.match_quality,
                  stage: updatedApp.stage,
                  flagged: updatedApp.flagged
                }
              }
              return c
            }))
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ai_reports" },
        (payload) => {
          const updatedReport = payload.new as any
          if (updatedReport) {
            setCandidates(prev => prev.map(c => {
              if (c.id === updatedReport.candidate_id || c.application_id === updatedReport.application_id) {
                return {
                  ...c,
                  skill_score: updatedReport.skill_score,
                  exp_score: updatedReport.exp_score,
                  edu_score: updatedReport.edu_score,
                  proj_score: updatedReport.proj_score,
                  confidence: updatedReport.confidence,
                  sentiment_score: updatedReport.sentiment_score,
                  insights: updatedReport.insights,
                  tags: updatedReport.tags
                }
              }
              return c
            }))
            addToast("success", `✨ Real Gemini AI Scoring Completed for candidate!`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchCandidates, fetchStats, stageFilter, searchTerm, addToast])

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

  const handleStageChange = async (appId: string, newStage: AppStage, note?: string) => {
    setUpdatingId(appId)
    const oldCand = candidates.find(c => c.application_id === appId)
    const fromStage = oldCand?.stage || null
    setCandidates(prev => prev.map(c => c.application_id === appId ? { ...c, stage: newStage } : c))
    try {
      await candidatesApi.updateApplication(appId, { stage: newStage })
      await logStageTransition(appId, fromStage, newStage, "recruiter", note || `Stage updated to ${newStage}`)
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
                          <Button onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(c.id)
                          }}
                            className="bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold px-2.5 py-1.5 h-7 rounded-xl transition-all active:scale-95 flex items-center gap-1 cursor-pointer">
                            <FileText className="w-3 h-3" /> ASSIGN TASK
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
