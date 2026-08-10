"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { jobsApi, ApiJob, JobStats } from "@/lib/api"
import { QuestionCardEditor, RoundBlueprintUI } from "./QuestionCardEditor"
import {
  Search, MapPin, Plus, AlertCircle, CheckCircle, Clock,
  Loader2, AlertTriangle, X, RefreshCw, Sliders
} from "lucide-react"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type JobStatus   = ApiJob["status"]
type JobPriority = ApiJob["priority"]

// â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Toast { id: number; type: "success" | "error"; message: string }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])
  return { toasts, add }
}

// â”€â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCards({ stats, loading }: { stats: JobStats | null; loading: boolean }) {
  const val = (n: number | undefined) =>
    loading ? (
      <div className="w-12 h-8 bg-white/5 rounded-xl animate-pulse mt-2" />
    ) : (
      <p className="stat-number text-3xl mt-2">{n ?? "â€“"}</p>
    )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="glass-card border-white/[0.04] hover:border-signal/40 hover:-translate-y-0.5 rounded-2xl shadow-lg relative overflow-hidden reveal-up reveal-delay-1">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="eyebrow text-neutral-400">ACTIVE REQUISITIONS</p>
            <div>{val(stats?.active_roles)}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card border-white/[0.04] hover:border-signal/40 hover:-translate-y-0.5 rounded-2xl shadow-lg relative overflow-hidden reveal-up reveal-delay-2">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="eyebrow text-neutral-400">HIGH PRIORITY ROLES</p>
            <div className="text-red-500">{val(stats?.high_priority)}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/[0.04] hover:border-signal/40 hover:-translate-y-0.5 rounded-2xl shadow-lg relative overflow-hidden reveal-up reveal-delay-3">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="eyebrow text-neutral-400">DRAFT REQUISITIONS</p>
            <div className="text-amber-500">{val(stats?.draft_roles)}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// â”€â”€â”€ Status / Priority helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatusDot({ status }: { status: JobStatus }) {
  const cls =
    status === "active"  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
    status === "onhold"  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
    status === "draft"   ? "bg-neutral-500/10 text-neutral-400 border-neutral-500/20" :
                           "bg-red-500/10 text-red-400 border-red-500/20"
  
  return (
    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${cls} inline-flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "active" ? "bg-emerald-400" :
        status === "onhold" ? "bg-amber-400" :
        status === "draft" ? "bg-neutral-400" :
        "bg-red-400"
      }`} />
      {status}
    </span>
  )
}

// Styled Priority Pill Badge
function PriorityBadge({ priority }: { priority: JobPriority }) {
  const cls =
    priority === "high"   ? "bg-red-500/10 text-red-400 border border-red-500/20" :
    priority === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-neutral-500/10 text-[var(--hm-text-muted)] border border-[var(--hm-border)]"
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-sm uppercase font-bold ${cls}`}>
      {priority}
    </span>
  )
}

// â”€â”€â”€ Post New Job Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface PostJobModalProps {
  onClose: () => void
  onCreated: (job: ApiJob) => void
  addToast: (type: Toast["type"], msg: string) => void
}

function PostJobModal({ onClose, onCreated, addToast }: PostJobModalProps) {
  const [title,    setTitle]    = useState("")
  const [dept,     setDept]     = useState("")
  const [location, setLocation] = useState("")
  const [priority, setPriority] = useState<JobPriority>("medium")
  const [jobStatus, setJobStatus] = useState<JobStatus>("active")
  const [desc,     setDesc]     = useState("")
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const job = await jobsApi.create({ title, department: dept, location, status: jobStatus, priority, description: desc || undefined })
      addToast("success", `Job "${job.title}" posted — ${job.job_code}`)
      onCreated(job)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create job."
      setError(msg)
      addToast("error", msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <Card className="glass-panel border-white/[0.06] w-full max-w-md shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-white/[0.05] p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase">POST NEW JOB REQUISITION</CardTitle>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-5 text-xs">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="eyebrow text-neutral-400">JOB TITLE *</label>
              <Input required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Product Designer"
                className="bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-neutral-200 rounded-xl text-xs px-4 py-3 h-10 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all placeholder:text-neutral-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="eyebrow text-neutral-400">DEPARTMENT *</label>
                <Input required value={dept} onChange={e => setDept(e.target.value)}
                  placeholder="e.g. Product Design"
                  className="bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-neutral-200 rounded-xl text-xs px-4 py-3 h-10 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all placeholder:text-neutral-500" />
              </div>
              <div className="space-y-2">
                <label className="eyebrow text-neutral-400">LOCATION *</label>
                <Input required value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. London / Remote"
                  className="bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-neutral-200 rounded-xl text-xs px-4 py-3 h-10 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all placeholder:text-neutral-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="eyebrow text-neutral-400">PRIORITY</label>
                <select value={priority} onChange={e => setPriority(e.target.value as JobPriority)}
                  className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-300 rounded-xl text-xs px-3 py-2.5 h-10 focus:border-signal focus:ring-1 focus:ring-signal/50 transition-all outline-none cursor-pointer">
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="eyebrow text-neutral-400">INITIAL STATUS</label>
                <select value={jobStatus} onChange={e => setJobStatus(e.target.value as JobStatus)}
                  className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-300 rounded-xl text-xs px-3 py-2.5 h-10 focus:border-signal focus:ring-1 focus:ring-signal/50 transition-all outline-none cursor-pointer">
                  <option value="active">ACTIVE</option>
                  <option value="draft">DRAFT</option>
                  <option value="onhold">ON HOLD</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="eyebrow text-neutral-400">DESCRIPTION (OPTIONAL)</label>
              <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Provide role description and candidate expectations..."
                className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-200 rounded-xl text-xs p-3 focus:border-signal focus:ring-1 focus:ring-signal/50 transition-all outline-none resize-none placeholder:text-neutral-500" />
            </div>

            <div className="flex gap-4 pt-4 border-t border-white/[0.05]">
              <Button type="submit" disabled={saving}
                className="flex-1 btn-primary text-white text-xs font-semibold rounded-xl py-3 h-10 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                {saving ? "POSTING..." : "POST ROLE"}
              </Button>
              <Button type="button" onClick={onClose}
                className="flex-1 bg-transparent hover:bg-white/5 border border-white/[0.08] text-neutral-300 text-xs font-medium rounded-xl py-3 h-10 transition-all active:scale-[0.99]">
                CANCEL
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

// ————————————————————————————————————————————————————————————————————————————————
function JobDetailModal({ job, onClose, onStatusChange, onJobUpdated, addToast }: {
  job: ApiJob
  onClose: () => void
  onStatusChange: (id: string, status: JobStatus) => void
  onJobUpdated: (updatedJob: ApiJob) => void
  addToast: (type: Toast["type"], msg: string) => void
}) {
  const [blueprints, setBlueprints] = useState<Record<string, RoundBlueprintUI>>(() => {
    const defaults: Record<string, RoundBlueprintUI> = {
      tech: { enabled: true, time_limit_minutes: 30, passing_score: 70, evaluation_focus: [], topic_weights: [{ topic: "System Architecture", weight: 10 }], custom_questions: [] },
      interview: { enabled: true, time_limit_minutes: 25, passing_score: 70, evaluation_focus: [], topic_weights: [{ topic: "STAR Method", weight: 10 }], custom_questions: [] },
      speaking: { enabled: true, time_limit_minutes: 15, passing_score: 70, evaluation_focus: ["clarity", "fluency"], topic_weights: [], custom_questions: [] },
      hr: { enabled: true, time_limit_minutes: 15, passing_score: 70, evaluation_focus: [], topic_weights: [], custom_questions: [] },
      assignment: { enabled: true, time_limit_minutes: 1440, passing_score: 70, evaluation_focus: [], topic_weights: [], custom_questions: [] },
    }
    if (job.round_blueprints && typeof job.round_blueprints === "object") {
      return { ...defaults, ...job.round_blueprints }
    }
    return defaults
  })
  const [activeRoundTab, setActiveRoundTab] = useState<"tech" | "interview" | "speaking" | "hr" | "assignment">("tech")
  const [savingBlueprint, setSavingBlueprint] = useState(false)

  const handleSaveBlueprints = async () => {
    setSavingBlueprint(true)
    try {
      const updatedJob = await jobsApi.update(job.id, { round_blueprints: blueprints })
      addToast("success", `Custom Interview Blueprint updated for "${job.title}"!`)
      onJobUpdated(updatedJob)
      onClose()
    } catch (err: any) {
      addToast("error", err?.message || "Failed to update blueprint.")
    } finally {
      setSavingBlueprint(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <Card className="glass-panel border-white/[0.06] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-white/[0.05] p-6 flex flex-row items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="eyebrow text-signal">{job.job_code}</span>
              <span className="text-[9px] bg-signal/10 text-signal border border-signal/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Blueprint v{job.blueprint_version || 1}
              </span>
            </div>
            <CardTitle className="text-sm font-display font-extrabold text-neutral-900 dark:text-white tracking-wide mt-1.5">{job.title}</CardTitle>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </CardHeader>
        <CardContent className="p-6 space-y-6 text-xs overflow-y-auto flex-1 scrollbar-none">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/[0.01] dark:bg-black/20 p-4 border border-white/[0.04] rounded-2xl">
            {[
              { label: "DEPARTMENT",   value: job.department },
              { label: "LOCATION",     value: job.location },
              { label: "POSTED DATE",  value: job.posted_date },
              { label: "APPLICANTS",   value: `${job.applicant_count} candidates` },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="eyebrow text-neutral-400">{label}</span>
                <p className="text-neutral-900 dark:text-neutral-200 font-bold mt-1 text-xs">{value}</p>
              </div>
            ))}
          </div>

          {/* Round Blueprint Configurator Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-display font-extrabold text-signal tracking-wider uppercase">
                  CUSTOM INTERVIEW BLUEPRINT & QUESTION LINES
                </h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Configure mandatory question sequences, difficulty, follow-up budgets, and topic weights for each round.
                </p>
              </div>
            </div>

            {/* Round Selectors */}
            <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3 overflow-x-auto scrollbar-none">
              {[
                { id: "tech", label: "TECHNICAL ROUND" },
                { id: "interview", label: "BEHAVIORAL (STAR)" },
                { id: "speaking", label: "SPEAKING ROUND" },
                { id: "hr", label: "HR & COMPENSATION" },
                { id: "assignment", label: "TAKE-HOME ASSIGNMENT" },
              ].map(r => {
                const isActive = activeRoundTab === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRoundTab(r.id as any)}
                    className={`px-3 py-2 text-[10px] font-bold rounded-xl transition-all uppercase whitespace-nowrap border ${
                      isActive
                        ? "bg-signal text-white border-transparent shadow-md shadow-signal/10"
                        : "bg-white/[0.01] hover:bg-white/[0.04] border-white/[0.05] text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>

            {/* Question Card Editor Component */}
            <QuestionCardEditor
              roundType={activeRoundTab}
              blueprint={blueprints[activeRoundTab] || { enabled: true, time_limit_minutes: 30, passing_score: 70, evaluation_focus: [], topic_weights: [], custom_questions: [] }}
              onChange={(updated) => {
                setBlueprints({ ...blueprints, [activeRoundTab]: updated })
              }}
            />
          </div>

          <div className="pt-5 border-t border-white/[0.05] flex justify-end gap-3 shrink-0">
            <Button
              type="button"
              disabled={savingBlueprint}
              onClick={handleSaveBlueprints}
              className="btn-primary text-white text-xs rounded-radius-md px-5 py-2.5 h-10 flex items-center gap-2 transition-transform hover:-translate-y-0.5 shadow-lg shadow-signal/10"
            >
              {savingBlueprint && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
              {savingBlueprint ? "SAVING BLUEPRINT..." : "SAVE CUSTOM BLUEPRINT"}
            </Button>
            <Button onClick={onClose}
              className="bg-transparent hover:bg-white/5 border border-white/[0.08] text-neutral-300 text-xs font-semibold rounded-xl px-5 py-2.5 h-10 transition-all active:scale-[0.99]">
              CLOSE PREVIEW
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// â”€â”€â”€ Toast Renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-2 text-xs font-semibold ${
            t.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}>
          {t.type === "success"
            ? <CheckCircle className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function JobManagementView() {
  // â”€â”€ data state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [jobs,        setJobs]        = useState<ApiJob[]>([])
  const [stats,       setStats]       = useState<JobStats | null>(null)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingStats,setLoadingStats]= useState(true)
  const [fetchError,  setFetchError]  = useState<string | null>(null)

  // â”€â”€ filter state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm,   setSearchTerm]   = useState("")
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // â”€â”€ ui state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedJob,   setSelectedJob]   = useState<ApiJob | null>(null)
  const [isModalOpen,   setIsModalOpen]   = useState(false)
  const [updatingId,    setUpdatingId]    = useState<string | null>(null)

  const { toasts, add: addToast } = useToast()

  // â”€â”€ fetch stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const s = await jobsApi.stats()
      setStats(s)
    } catch {
      // stats failure is non-fatal â€” jobs table still shows
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // â”€â”€ fetch jobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchJobs = useCallback(async (status: string, search: string) => {
    setLoadingJobs(true)
    setFetchError(null)
    try {
      const data = await jobsApi.list({
        status: status === "all" ? undefined : status,
        search: search || undefined,
      })
      setJobs(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load jobs."
      setFetchError(msg)
    } finally {
      setLoadingJobs(false)
    }
  }, [])

  // â”€â”€ initial load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchJobs(statusFilter, searchTerm) }, [statusFilter, fetchJobs])

  useEffect(() => {
    if (selectedJob) {
      window.dispatchEvent(new CustomEvent("job-selected", {
        detail: { id: selectedJob.id, title: selectedJob.title }
      }))
    }
  }, [selectedJob])

  const handleSearchChange = (val: string) => {
    setSearchTerm(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      fetchJobs(statusFilter, val)
    }, 400)
  }

  const handleStatusFilter = (st: string) => {
    setStatusFilter(st)
    fetchJobs(st, searchTerm)
  }

  const handleStatusChange = async (id: string, status: JobStatus) => {
    setUpdatingId(id)
    try {
      await jobsApi.update(id, { status })
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j))
    } catch {
      // ignore
    } finally {
      setUpdatingId(null)
    }
  }

  const handleJobCreated = (newJob: ApiJob) => {
    setJobs(prev => [newJob, ...prev])
    fetchStats()
    setIsModalOpen(false)
    addToast("success", `Job "${newJob.title}" posted.`)
  }

  const handleJobUpdated = (updatedJob: ApiJob) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j))
    setSelectedJob(updatedJob)
    fetchStats()
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wider">
            JOB REQUISITIONS & <span className="text-gradient">BLUEPRINTS</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Post, monitor, and configure pipeline questions for active roles.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}
          className="btn-primary text-xs font-black flex items-center gap-2 rounded-full px-5 py-2.5 h-10 transition-transform hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> POST NEW JOB
        </Button>
      </div>

      {/* Stat cards */}
      <StatCards stats={stats} loading={loadingStats} />

      {/* Search + filter bar */}
      <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg reveal-up">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input value={searchTerm} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search by title, department, location..."
              className="pl-10 bg-white/[0.02] dark:bg-black/20 border-white/[0.08] text-xs text-neutral-200 rounded-xl placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:border-signal transition-all h-10" />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="eyebrow text-neutral-400 shrink-0">STATUS:</span>
            <div className="flex bg-white/[0.02] dark:bg-black/25 border border-white/[0.06] p-1 rounded-full overflow-hidden">
              {["all", "active", "onhold", "draft", "closed"].map(s => (
                <button key={s} onClick={() => handleStatusFilter(s)}
                  className={`px-3.5 py-1 text-[9px] font-bold rounded-full transition-all uppercase ${
                    statusFilter === s 
                      ? "bg-signal text-white shadow-md shadow-signal/20" 
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}>{s}</button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg overflow-hidden">
        <CardHeader className="p-6 pb-3 border-b border-white/[0.05] flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase">
            ACTIVE REQUISITIONS ({loadingJobs ? "â€¦" : jobs.length})
          </CardTitle>
          <button onClick={() => fetchJobs(statusFilter, searchTerm)}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingJobs ? "animate-spin" : ""}`} />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Fetch error banner */}
          {fetchError && (
            <div className="flex items-center gap-2.5 m-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
              <button onClick={() => fetchJobs(statusFilter, searchTerm)}
                className="ml-auto underline hover:text-red-300">Retry</button>
            </div>
          )}

          {/* Loading skeleton */}
          {loadingJobs && !fetchError && (
            <div className="p-12 flex items-center justify-center gap-3 text-neutral-400 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-signal" /> LOADING JOB REQUISITIONS...
            </div>
          )}

          {/* Table */}
          {!loadingJobs && !fetchError && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01] dark:bg-black/10 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-5 pl-6">JOB ID</th>
                    <th className="p-5">TITLE</th>
                    <th className="p-5">DEPARTMENT</th>
                    <th className="p-5">STATUS</th>
                    <th className="p-5">LOCATION</th>
                    <th className="p-5">POSTED DATE</th>
                    <th className="p-5 text-center">APPLICANTS</th>
                    <th className="p-5">PRIORITY</th>
                    <th className="p-5 text-right pr-6">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-xs">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-neutral-500 font-medium">
                        NO JOB REQUISITIONS FOUND.
                      </td>
                    </tr>
                  ) : jobs.map(job => (
                    <tr key={job.id}
                      className="hover:bg-white/[0.02] dark:hover:bg-white/[0.01] transition-all group cursor-pointer reveal-up"
                      onClick={() => setSelectedJob(job)}>
                      <td className="p-5 pl-6 text-signal font-bold font-mono first:rounded-l-2xl">{job.job_code}</td>
                      <td className="p-5 text-neutral-900 dark:text-white font-display font-extrabold group-hover:text-signal transition-colors">{job.title}</td>
                      <td className="p-5 text-neutral-500 dark:text-neutral-300 font-medium">{job.department}</td>
                      <td className="p-5"><StatusDot status={job.status} /></td>
                      <td className="p-5 text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-500" />{job.location}
                        </div>
                      </td>
                      <td className="p-5 text-neutral-400">{job.posted_date}</td>
                      <td className="p-5 text-center stat-number text-slate-900 dark:text-white">{job.applicant_count}</td>
                      <td className="p-5"><PriorityBadge priority={job.priority} /></td>
                      <td className="p-5 text-right pr-6 last:rounded-r-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedJob(job)}
                            className="btn-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-transform hover:-translate-y-0.5 flex items-center gap-1.5 shadow-sm"
                          >
                            <Sliders className="w-3 h-3 text-white" /> Config Questions
                          </button>
                          
                          {updatingId === job.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                          ) : (
                            <select value={job.status}
                              onChange={e => handleStatusChange(job.id, e.target.value as JobStatus)}
                              className="bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-[10px] text-neutral-400 p-1.5 px-2 rounded-xl cursor-pointer hover:border-signal/40 hover:text-neutral-200 transition-all outline-none">
                              <option value="active">Active</option>
                              <option value="onhold">On Hold</option>
                              <option value="draft">Draft</option>
                              <option value="closed">Closed</option>
                            </select>
                          )}
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
      {isModalOpen && (
        <PostJobModal
          onClose={() => setIsModalOpen(false)}
          onCreated={handleJobCreated}
          addToast={addToast}
        />
      )}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onStatusChange={handleStatusChange}
          onJobUpdated={handleJobUpdated}
          addToast={addToast}
        />
      )}
    </div>
  )
}
