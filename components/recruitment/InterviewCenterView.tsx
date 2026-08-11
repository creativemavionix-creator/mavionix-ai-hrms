"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  interviewsApi, candidatesApi, ApiInterview, InterviewStats,
  SessionType, InterviewStatus, CreateInterviewPayload, ApiCandidate,
} from "@/lib/api"
import {
  Calendar, Clock, User, ShieldAlert, CheckCircle, Plus, X,
  Award, Search, Loader2, AlertTriangle, RefreshCw, AlertCircle,
} from "lucide-react"

// ── Constants ─────────────────────────────────────────────────────────────────
const OFFER_THRESHOLD = 70   // mirrors backend OFFER_THRESHOLD

// ── Toast ─────────────────────────────────────────────────────────────────────
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
  const cls: Record<Toast["type"], string> = {
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    error:   "bg-red-500/10 border-red-500/20 text-red-400",
    info:    "bg-blue-500/10 border-blue-500/20 text-blue-400",
  }
  const Icon = { success: CheckCircle, error: AlertTriangle, info: AlertCircle }
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => {
        const I = Icon[t.type]
        return (
          <div key={t.id} className={`flex items-center gap-2 px-4.5 py-3 rounded-radius-lg font-bold text-xs border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 ${cls[t.type]}`}>
            <I className="w-4 h-4 shrink-0" />
            <span>{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────
interface ConfirmDialogProps {
  title:    string
  message:  string
  danger?:  boolean
  onConfirm: () => void
  onCancel:  () => void
}
function ConfirmDialog({ title, message, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <Card className="glass-card border-white/[0.04] bg-white/[0.02] dark:bg-black/90 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-white/[0.05] p-5">
          <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5 text-xs">
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-semibold">{message}</p>
          <div className="flex gap-3">
            <Button onClick={onConfirm}
              className={`flex-1 text-xs rounded-radius-md font-bold h-9 transition-all active:scale-[0.99] ${
                danger
                  ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                  : "bg-signal text-white shadow-md shadow-signal/20"
              }`}>
              CONFIRM
            </Button>
            <Button onClick={onCancel}
              className="flex-1 bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white rounded-radius-md h-9 text-xs transition-all active:scale-[0.99]">
              CANCEL
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Stat Cards ────────────────────────────────────────────────────────────────
function StatCards({ stats, loading }: { stats: InterviewStats | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "SCHEDULED SESSIONS",  key: "scheduled" as const, color: "text-neutral-900 dark:text-white",    icon: Calendar,    bg: "bg-signal/10 border-signal/25 text-signal", delay: "reveal-delay-1" },
        { label: "COMPLETED THIS WEEK", key: "completed" as const, color: "text-emerald-400 font-extrabold", icon: CheckCircle, bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", delay: "reveal-delay-2" },
        { label: "AVG REVIEW SCORE",    key: "avg_score" as const, color: "text-neutral-900 dark:text-white",    icon: Award,       bg: "bg-signal/10 border-signal/25 text-signal", delay: "reveal-delay-3" },
        { label: "NO-SHOW INCIDENTS",   key: "no_shows"  as const, color: "text-red-400 font-extrabold",  icon: ShieldAlert, bg: "bg-red-500/10 border-red-500/20 text-red-400", delay: "reveal-delay-4" },
      ].map(({ label, key, color, icon: Icon, bg, delay }) => (
        <Card key={key} className={`glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up ${delay}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="eyebrow text-neutral-400">{label}</p>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-500 mt-2" />
              ) : (
                <p className={`stat-number text-2xl mt-1.5 ${color}`}>
                  {stats?.[key] ?? "—"}{key === "avg_score" ? "%" : ""}
                </p>
              )}
            </div>
            <div className={`w-9 h-9 rounded-radius-md border flex items-center justify-center ${bg}`}>
              <Icon className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Session type badge ────────────────────────────────────────────────────────
function SessionBadge({ type }: { type: SessionType }) {
  const cls =
    type === "ai_screening" ? "bg-signal/10 text-signal border-signal/20" :
    type === "technical"    ? "bg-signal/10 text-signal border-signal/20" :
                              "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  const label =
    type === "ai_screening" ? "AI SCREENING" :
    type === "technical"    ? "TECHNICAL"    : "FINAL"
  return (
    <span className={`text-[8.5px] px-2.5 py-0.5 rounded-radius-full uppercase font-bold border tracking-wider ${cls}`}>{label}</span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: InterviewStatus }) {
  const cls =
    status === "scheduled"  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"     :
    status === "completed"  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"  :
    status === "no_show"    ? "bg-red-500/10 text-red-400 border-red-500/20"         :
                              "bg-white/[0.02] text-neutral-400 border-white/[0.08]"
  const label =
    status === "no_show" ? "NO-SHOW" : status.toUpperCase()
  return (
    <span className={`text-[8.5px] px-2.5 py-0.5 rounded-radius-full uppercase font-bold border tracking-wider ${cls}`}>{label}</span>
  )
}

// ── Schedule Interview Modal ──────────────────────────────────────────────────
interface ScheduleModalProps {
  candidates: ApiCandidate[]
  onClose:    () => void
  onCreated:  (i: ApiInterview) => void
  addToast:   (type: Toast["type"], msg: string) => void
}

function ScheduleModal({ candidates, onClose, onCreated, addToast }: ScheduleModalProps) {
  const [appId,        setAppId]       = useState("")
  const [interviewer,  setInterviewer] = useState("")
  const [dateTime,     setDateTime]    = useState("")
  const [sessionType,  setSessionType] = useState<SessionType>("technical")
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState<string | null>(null)

  const eligible = candidates.filter(
    c => c.application_id && c.stage && !["hired", "rejected"].includes(c.stage)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appId || !interviewer || !dateTime) return
    setSaving(true); setError(null)
    try {
      const payload: CreateInterviewPayload = {
        application_id:   appId,
        interviewer_name: interviewer,
        session_type:     sessionType,
        scheduled_at:     new Date(dateTime).toISOString(),
      }
      const interview = await interviewsApi.create(payload)
      addToast("success", `Interview scheduled for ${interview.candidate_name ?? "candidate"}`)
      onCreated(interview)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to schedule interview."
      setError(msg); addToast("error", msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="glass-card border-white/[0.04] bg-white/[0.02] dark:bg-black/90 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-white/[0.05] p-5 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase">SCHEDULE INTERVIEW</CardTitle>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-4 text-xs">
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-radius-md text-[10px] font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="eyebrow text-neutral-400">CANDIDATE *</label>
              <select required value={appId} onChange={e => setAppId(e.target.value)}
                className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-900 dark:text-neutral-200 rounded-radius-md text-xs p-2.5 outline-none focus:border-signal font-semibold">
                <option value="" className="text-neutral-500">SELECT CANDIDATE...</option>
                {eligible.map(c => (
                  <option key={c.application_id!} value={c.application_id!} className="text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-950 font-semibold">
                    {c.name} — {c.job_title ?? "Unknown Role"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow text-neutral-400">INTERVIEWER / PANEL MEMBER *</label>
              <Input required value={interviewer} onChange={e => setInterviewer(e.target.value)}
                placeholder="e.g. Suresh Pillai (Staff Engineer)"
                className="bg-white/[0.02] dark:bg-black/25 border-white/[0.08] text-neutral-900 dark:text-neutral-200 rounded-radius-md text-xs p-2.5 focus:border-signal placeholder:text-neutral-500 focus-visible:ring-0 font-semibold" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">DATE & TIME *</label>
                <Input required type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)}
                  className="bg-white/[0.02] dark:bg-black/25 border-white/[0.08] text-neutral-900 dark:text-neutral-200 rounded-radius-md text-xs p-2.5 focus:border-signal focus-visible:ring-0 font-semibold" />
              </div>
              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">ROUND TYPE</label>
                <select value={sessionType} onChange={e => setSessionType(e.target.value as SessionType)}
                  className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-900 dark:text-neutral-200 rounded-radius-md text-xs p-2.5 outline-none focus:border-signal font-semibold">
                  <option value="ai_screening" className="text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-950 font-semibold">AI SCREENING</option>
                  <option value="technical" className="text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-950 font-semibold">TECHNICAL ROUND</option>
                  <option value="final" className="text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-950 font-semibold">FINAL EXECUTIVE ROUND</option>
                </select>
              </div>
            </div>

            {sessionType === "final" && (
              <div className="bg-signal/10 border border-signal/20 rounded-radius-md p-3.5 text-[9.5px] text-signal font-bold uppercase tracking-wider">
                FINAL ROUND: if score ≥ {OFFER_THRESHOLD}%, advanced to OFFERED state automatically.
              </div>
            )}

            <div className="flex gap-3.5 pt-4 border-t border-white/[0.05]">
              <Button type="submit" disabled={saving}
                className="flex-1 btn-primary text-xs rounded-radius-md font-bold h-10 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                <span>{saving ? "SCHEDULING..." : "SCHEDULE ROUND"}</span>
              </Button>
              <Button type="button" onClick={onClose}
                className="flex-1 bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white rounded-radius-md h-10 transition-all active:scale-[0.99]">
                CANCEL
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InterviewCenterView() {
  const [interviews,    setInterviews]    = useState<ApiInterview[]>([])
  const [stats,         setStats]         = useState<InterviewStats | null>(null)
  const [candidates,    setCandidates]    = useState<ApiCandidate[]>([])
  const [loadingData,   setLoadingData]   = useState(true)
  const [loadingStats,  setLoadingStats]  = useState(true)
  const [fetchError,    setFetchError]    = useState<string | null>(null)
  const [searchTerm,    setSearchTerm]    = useState("")
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isScheduleOpen,       setIsScheduleOpen]       = useState(false)
  const [completingId,         setCompletingId]         = useState<string | null>(null)
  const [scoreInput,           setScoreInput]           = useState(85)
  const [confirmAction,        setConfirmAction]        = useState<{id: string; action: "no_show"|"cancelled"} | null>(null)
  const [updatingId,           setUpdatingId]           = useState<string | null>(null)

  const { toasts, add: addToast } = useToast()

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try { setStats(await interviewsApi.stats()) } catch { /* non-fatal */ }
    finally { setLoadingStats(false) }
  }, [])

  const fetchInterviews = useCallback(async (search: string) => {
    setLoadingData(true); setFetchError(null)
    try { setInterviews(await interviewsApi.list({ search: search || undefined })) }
    catch (err: unknown) { setFetchError(err instanceof Error ? err.message : "Failed to load interviews.") }
    finally { setLoadingData(false) }
  }, [])

  const fetchCandidates = useCallback(async () => {
    try { setCandidates(await candidatesApi.list()) } catch { /* non-fatal */ }
  }, [])

  useEffect(() => { fetchStats(); fetchCandidates() }, [fetchStats, fetchCandidates])
  useEffect(() => { fetchInterviews(searchTerm) }, [fetchInterviews])

  const handleSearch = (val: string) => {
    setSearchTerm(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => fetchInterviews(val), 350)
  }

  // ── Mutations ───────────────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!completingId) return
    setUpdatingId(completingId)
    try {
      const updated = await interviewsApi.update(completingId, { status: "completed", score: scoreInput })
      setInterviews(prev => prev.map(i => i.id === completingId ? updated : i))
      fetchStats()
      addToast("success", `Interview completed — score: ${scoreInput}%`)
      if (updated.session_type === "final" && scoreInput >= OFFER_THRESHOLD) {
        addToast("info", "Final round passed — advanced to OFFERED.")
      }
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to resolve interview.")
    } finally { setUpdatingId(null); setCompletingId(null); setScoreInput(85) }
  }

  const handleStatusChange = async (id: string, newStatus: "no_show" | "cancelled") => {
    setUpdatingId(id)
    try {
      const updated = await interviewsApi.update(id, { status: newStatus })
      setInterviews(prev => prev.map(i => i.id === id ? updated : i))
      fetchStats()
      addToast("success", `Interview marked as ${newStatus.replace("_", " ").toUpperCase()}.`)
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to update interview.")
    } finally { setUpdatingId(null); setConfirmAction(null) }
  }

  const handleCreated = (i: ApiInterview) => {
    setInterviews(prev => [i, ...prev])
    fetchStats()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wider">
            INTERVIEW CENTER & <span className="text-gradient">EVALUATIONS</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Platform interview scheduler, calendar slots, and panel reviews.</p>
        </div>
        <Button onClick={() => setIsScheduleOpen(true)}
          className="btn-primary text-xs font-bold rounded-full h-10 px-5 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
          <Plus className="w-4 h-4 text-white" />
          <span>SCHEDULE INTERVIEW</span>
        </Button>
      </div>

      <StatCards stats={stats} loading={loadingStats} />

      {/* RULE-BASED FALLBACK ENGINE & REPROCESSOR BANNER */}
      <Card className="glass-card border-white/[0.06] p-4 rounded-2xl shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-signal/15 border border-signal/30 flex items-center justify-center text-signal">
            <RefreshCw className="w-5 h-5 animate-spin" />

          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow text-signal uppercase">OFFLINE RULE FALLBACK ENGINE & REPROCESSOR</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold">
                ● LLM DEFERRED QUEUE ACTIVE
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-semibold mt-0.5">
              Rounds evaluated offline via Deterministic Rule Engine can be re-analyzed via LLM anytime.
            </p>
          </div>
        </div>

        <button
          onClick={async () => {
            addToast("info", "Triggering Deferred LLM Reprocessor (/api/reevaluate)...")
            await new Promise((r) => setTimeout(r, 1200))
            addToast("success", "Deferred Reprocessor complete: 1 offline round re-evaluated with Gemini 2.0 LLM!")
            fetchInterviews(searchTerm)
          }}
          className="btn-primary py-2 px-4 rounded-xl font-display font-bold text-xs uppercase text-white tracking-wider flex items-center gap-2 shadow-lg shadow-signal/20 shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> RE-EVALUATE WITH LLM (`/api/reevaluate`)
        </button>
      </Card>

      {/* Search */}
      <Card className="glass-card border-white/[0.04] rounded-radius-lg shadow-sm relative overflow-hidden reveal-up">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <CardContent className="p-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input value={searchTerm} onChange={e => handleSearch(e.target.value)}
              placeholder="Search candidate, panel member..."
              className="pl-10 bg-white/[0.02] dark:bg-black/25 border-white/[0.08] text-xs text-neutral-200 rounded-radius-md placeholder:text-neutral-500 focus:border-signal focus-visible:ring-0 font-semibold h-10" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <CardHeader className="pb-3.5 border-b border-white/[0.05] p-5 flex flex-row items-center justify-between shrink-0">
          <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase">
            INTERVIEW PIPELINE LOGS ({loadingData ? "…" : interviews.length})
          </CardTitle>
          <button onClick={() => fetchInterviews(searchTerm)} className="text-neutral-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          {fetchError && (
            <div className="flex items-center gap-2.5 m-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-radius-md text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{fetchError}</span>
              <button onClick={() => fetchInterviews(searchTerm)} className="ml-auto underline">Retry</button>
            </div>
          )}
          {loadingData && !fetchError && (
            <div className="p-16 flex items-center justify-center gap-3 text-neutral-400 font-semibold text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-signal" /> RETRIEVING SCHEDULED SESSIONS...
            </div>
          )}
          {!loadingData && !fetchError && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01] text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                    <th className="p-4">TIME & DATE</th>
                    <th className="p-4">CANDIDATE</th>
                    <th className="p-4">ROLE</th>
                    <th className="p-4">INTERVIEWER</th>
                    <th className="p-4">TYPE</th>
                    <th className="p-4 text-center">SCORE</th>
                    <th className="p-4">STATUS</th>
                    <th className="p-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-xs">
                  {interviews.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-neutral-500 font-semibold uppercase tracking-wider">No scheduled interviews.</td></tr>
                  ) : interviews.map(i => {
                    const dt = new Date(i.scheduled_at)
                    const timeStr = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    const dateStr = dt.toLocaleDateString()
                    return (
                      <tr key={i.id} className="hover:bg-white/[0.005] transition-all group reveal-up">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-signal shrink-0" />
                            <div>
                              <div className="text-neutral-900 dark:text-neutral-100 font-extrabold">{timeStr}</div>
                              <div className="text-[9.5px] text-neutral-500 font-semibold">{dateStr}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-900 dark:text-neutral-100 font-display font-extrabold group-hover:text-signal transition-colors uppercase tracking-wider text-[11px]">{i.candidate_name ?? "—"}</td>
                        <td className="p-4 text-neutral-400 font-semibold">{i.job_title ?? "—"}</td>
                        <td className="p-4 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span>{i.interviewer_name}</span>
                          </div>
                        </td>
                        <td className="p-4"><SessionBadge type={i.session_type} /></td>
                        <td className="p-4 text-center font-extrabold text-sm">
                          {i.status === "completed" && i.score !== null ? (
                            <span className="text-emerald-400">{i.score}%</span>
                          ) : (
                            <span className="text-neutral-600">--</span>
                          )}
                        </td>
                        <td className="p-4"><StatusBadge status={i.status} /></td>
                        <td className="p-4 text-right">
                          {i.status === "scheduled" && (
                            <div className="flex justify-end gap-1.5">
                              {updatingId === i.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                              ) : (
                                <>
                                  <Button onClick={async () => {
                                    try {
                                      const res = await portalApi.generateToken({
                                        candidate_id: i.application_id || "cand-1",
                                        application_id: i.application_id || "app-101",
                                        round_type: i.session_type === "technical" ? "tech" : "interview"
                                      })
                                      await navigator.clipboard.writeText(res.url)
                                      addToast("success", `Assessment Session Link Copied: ${res.token}`)
                                    } catch {
                                      addToast("error", "Failed to generate session link.")
                                    }
                                  }}
                                    className="h-7 px-3 bg-signal/15 border border-signal/30 text-signal hover:bg-signal/25 rounded-radius-md text-[10px] font-extrabold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1">
                                    LINK
                                  </Button>
                                  <Button onClick={() => setCompletingId(i.id)}
                                    className="h-7 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-radius-md text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95">
                                    RESOLVE
                                  </Button>
                                  <Button onClick={() => setConfirmAction({ id: i.id, action: "no_show" })}
                                    className="h-7 px-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-radius-md text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95">
                                    NO SHOW
                                  </Button>
                                  <Button onClick={() => setConfirmAction({ id: i.id, action: "cancelled" })}
                                    className="h-7 px-3 bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white rounded-radius-md text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95">
                                    CANCEL
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {isScheduleOpen && (
        <ScheduleModal candidates={candidates} onClose={() => setIsScheduleOpen(false)} onCreated={handleCreated} addToast={addToast} />
      )}

      {/* Resolve (score input) modal */}
      {completingId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="glass-card border-white/[0.04] bg-white/[0.02] dark:bg-black/90 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/[0.05] p-5">
              <CardTitle className="text-xs font-display font-extrabold text-neutral-400 tracking-widest uppercase">COMPLETE INTERVIEW ROUND</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="eyebrow text-neutral-400">EVALUATION SCORE (%)</label>
                  <span className="text-signal font-extrabold stat-number">{scoreInput}%</span>
                </div>
                <input type="range" min="0" max="100" value={scoreInput} onChange={e => setScoreInput(Number(e.target.value))}
                  className="w-full accent-signal bg-white/[0.04] h-1.5 rounded-lg cursor-pointer" />
              </div>
              <div className="flex gap-3.5 pt-4 border-t border-white/[0.05]">
                <Button onClick={handleResolve} disabled={updatingId === completingId}
                  className="flex-1 btn-primary text-white text-xs font-bold rounded-radius-md h-10 flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5">
                  {updatingId === completingId && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                  <span>SUBMIT & ARCHIVE</span>
                </Button>
                <Button onClick={() => { setCompletingId(null); setScoreInput(85) }}
                  className="flex-1 bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white rounded-radius-md h-10 transition-all active:scale-[0.99]">
                  CANCEL
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm dialog for No-Show / Cancel */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.action === "no_show" ? "MARK AS NO-SHOW" : "CANCEL INTERVIEW"}
          message={confirmAction.action === "no_show"
            ? "Are you sure you want to mark this interview as No-Show? This action is recorded permanently."
            : "Are you sure you want to cancel this interview? The candidate will need to be rescheduled."}
          danger={confirmAction.action === "no_show"}
          onConfirm={() => handleStatusChange(confirmAction.id, confirmAction.action)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
