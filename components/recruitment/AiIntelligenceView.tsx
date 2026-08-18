"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  aiReportsApi, ApiAIReport, AIReportStats, AIReportFilter, VerificationStatus,
} from "@/lib/api"
import {
  Brain, Star, CheckCircle, HelpCircle, AlertTriangle, Cpu,
  Activity, MessageSquare, Shield, Loader2, RefreshCw, X,
} from "lucide-react"
import { AiThinkingState, AiSummaryPanel } from "@/components/ui/AiComponents"

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: number; type: "success" | "error"; message: string }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])
  return { toasts, add }
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4.5 py-3 rounded-2xl font-bold text-xs border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300
          ${t.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {t.type === "success"
            ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            : <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

// ── Verification icon ─────────────────────────────────────────────────────────
function VerifIcon({ status }: { status: VerificationStatus }) {
  if (status === "verified")
    return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
  if (status === "revoked")
    return <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
  if (status === "unverified")
    return <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
  return <HelpCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
}
function StatCards({ stats, loading }: { stats: AIReportStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-white/[0.02] border border-white/[0.08] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="glass-panel border-white/[0.08] p-4">
        <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">TOTAL AI DOSSIERS</div>
        <div className="text-2xl font-bold text-white mt-1">{stats.total_reports}</div>
      </Card>
      <Card className="glass-panel border-white/[0.08] p-4">
        <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">FLAGGED ANOMALIES</div>
        <div className="text-2xl font-bold text-amber-400 mt-1">{stats.flagged_count}</div>
      </Card>
      <Card className="glass-panel border-white/[0.08] p-4">
        <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">ACTIVE INGESTION SOURCES</div>
        <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.active_sources}</div>
      </Card>
    </div>
  )
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({
  skill, exp, edu, proj,
}: { skill: number | null; exp: number | null; edu: number | null; proj: number | null }) {
  const s = skill ?? 0; const e = exp ?? 0; const d = edu ?? 0; const p = proj ?? 0
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
        <span>CAPABILITY METRICS</span>
        <span>SKILL: {s} | EXP: {e} | EDU: {d} | PROJ: {p}</span>
      </div>
      <div className="w-full bg-white/[0.02] dark:bg-black/20 border border-white/[0.04] rounded-full h-2.5 overflow-hidden flex">
        <div className="bg-emerald-500 h-full border-r border-white/[0.05]"   style={{ width: `${s / 4}%` }} />
        <div className="bg-signal h-full border-r border-white/[0.05]"       style={{ width: `${e / 4}%` }} />
        <div className="bg-signal/80 h-full border-r border-white/[0.05]"    style={{ width: `${d / 4}%` }} />
        <div className="bg-amber-400 h-full"                             style={{ width: `${p / 4}%` }} />
      </div>
      <div className="flex flex-wrap gap-3 text-[8.5px] text-neutral-500 font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />SKILLS 35%</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-signal" />EXP 25%</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-signal/80" />EDU 15%</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />PROJ 10%</span>
      </div>
    </div>
  )
}

// ── Report Card ───────────────────────────────────────────────────────────────
interface ReportCardProps {
  report:        ApiAIReport
  onVerify:      (id: string) => void
  onRevoke:      (id: string) => void
  onFlag:        (id: string) => void
  onDismissFlag: (id: string) => void
  updating:      boolean
}

function ReportCard({ report: r, onVerify, onRevoke, onFlag, onDismissFlag, updating }: ReportCardProps) {
  const isVerified = r.verification_status === "verified"
  const isRevoked  = r.verification_status === "revoked"
  const matchLabel = (r.match_ranking ?? "unknown").toUpperCase()

  const matchColor =
    matchLabel === "EXCELLENT" ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" :
    matchLabel === "STRONG"    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" :
    matchLabel === "GOOD"      ? "text-signal border-signal/20 bg-signal/10" :
    matchLabel === "FAIR"      ? "text-amber-400 border-amber-500/20 bg-amber-500/10" :
                                 "text-red-400 border-red-500/20 bg-red-500/10"

  return (
    <Card className={`card-glass border-white/[0.04] hover:border-signal/30 transition-all rounded-radius-lg relative overflow-hidden reveal-up
      ${r.flagged ? "border-l-4 border-l-red-500" : ""}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
      <CardHeader className="p-5 pb-3.5 border-b border-white/[0.05]">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="eyebrow text-neutral-400 truncate">
              ID: {r.id.slice(0, 8).toUpperCase()} · {(r.job_title ?? "UNKNOWN ROLE").toUpperCase()}
            </div>
            <CardTitle className="text-sm font-display font-extrabold text-neutral-900 dark:text-white mt-1 tracking-wide uppercase">
              {r.candidate_name ?? "—"}
            </CardTitle>
            {r.candidate_email && (
              <div className="text-[10px] text-neutral-500 font-semibold mt-0.5">{r.candidate_email}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 text-[9px] font-bold">
            <span className="bg-signal/10 text-signal border border-signal/20 px-2.5 py-0.5 rounded-radius-full uppercase tracking-wider">
              {r.ai_score ?? "—"}/100 MATCH
            </span>
            {r.confidence !== null && (
              <span className="bg-white/[0.02] text-neutral-400 border border-white/[0.08] px-2.5 py-0.5 rounded-radius-full uppercase tracking-wider">
                {r.confidence}% CONFIDENCE
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4 text-xs leading-relaxed">
        {/* Meta row */}
        <div className="grid grid-cols-3 gap-3 bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-radius-md">
          <div>
            <span className="eyebrow text-neutral-400 block">VERIFICATION</span>
            <div className="flex items-center gap-1.5 mt-1 text-neutral-700 dark:text-neutral-200 text-[9.5px] uppercase font-bold tracking-wider">
              <VerifIcon status={r.verification_status} />
              <span>{r.verification_status}</span>
            </div>
          </div>
          <div>
            <span className="eyebrow text-neutral-400 block">SENTIMENT</span>
            <div className="flex items-center gap-1.5 mt-1 text-neutral-700 dark:text-neutral-200 text-[9.5px] font-bold tracking-wider">
              <MessageSquare className="w-3.5 h-3.5 text-signal" />
              <span>{r.sentiment_score !== null ? `${r.sentiment_score}% POS` : "—"}</span>
            </div>
          </div>
          <div>
            <span className="eyebrow text-neutral-400 block">MATCH RANK</span>
            <div className="flex items-center gap-1.5 mt-1 text-[9.5px] font-bold tracking-wider">
              <Star className="w-3.5 h-3.5 text-signal shrink-0" />
              <span className={`px-2 py-0.5 rounded-radius-full border text-[8px] font-bold ${matchColor}`}>{matchLabel}</span>
            </div>
          </div>
        </div>

        {/* Score bars */}
        <ScoreBar
          skill={r.skill_score} exp={r.exp_score}
          edu={r.edu_score}     proj={r.proj_score}
        />

        {/* AI Insights */}
        <div className="bg-white/[0.01] dark:bg-black/25 p-3.5 rounded-radius-md border border-white/[0.04] space-y-1">
          <span className="eyebrow text-neutral-400 block">AI SCREENING INSIGHTS:</span>
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed font-semibold">
            {r.insights ?? "No insights generated yet."}
          </p>
        </div>

        {/* Tags */}
        {(r.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {(r.tags ?? []).map(tag => (
              <span key={tag}
                className="bg-white/[0.01] border border-white/[0.08] text-[8.5px] px-2.5 py-0.5 text-neutral-400 rounded-radius-full font-bold uppercase tracking-wider">
                #{tag.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-white/[0.05]">
          {updating ? (
            <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-signal" /> UPDATING ACTIONS...
            </div>
          ) : (
            <>
              {/* Verify / Revoke */}
              {isVerified ? (
                <Button onClick={() => onRevoke(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white">
                  REVOKE VERIFICATION
                </Button>
              ) : (
                <Button onClick={() => onVerify(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  VERIFY CREDENTIALS
                </Button>
              )}

              {/* Flag / Dismiss */}
              {r.flagged ? (
                <Button onClick={() => onDismissFlag(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white">
                  DISMISS FLAG
                </Button>
              ) : (
                <Button onClick={() => onFlag(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                  FLAG ANOMALY
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AiIntelligenceView() {
  const [reports,       setReports]       = useState<ApiAIReport[]>([])
  const [stats,         setStats]         = useState<AIReportStats | null>(null)
  const [loadingReports,setLoadingReports]= useState(true)
  const [loadingStats,  setLoadingStats]  = useState(true)
  const [fetchError,    setFetchError]    = useState<string | null>(null)
  const [activeFilter,  setActiveFilter]  = useState<AIReportFilter>("all")
  const [updatingId,    setUpdatingId]    = useState<string | null>(null)

  const { toasts, add: addToast } = useToast()

  // ── fetchers ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try { setStats(await aiReportsApi.stats()) }
    catch { /* non-fatal */ }
    finally { setLoadingStats(false) }
  }, [])

  const fetchReports = useCallback(async (filter: AIReportFilter) => {
    setLoadingReports(true); setFetchError(null)
    try { setReports(await aiReportsApi.list(filter)) }
    catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load AI reports.")
    }
    finally { setLoadingReports(false) }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchReports(activeFilter) }, [activeFilter, fetchReports])

  // ── mutation helpers ──────────────────────────────────────────────────────
  const patchReport = async (
    id: string,
    payload: { verification_status?: VerificationStatus; flagged?: boolean },
    successMsg: string,
  ) => {
    setUpdatingId(id)
    // Optimistic update
    setReports(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r))
    try {
      const updated = await aiReportsApi.update(id, payload)
      setReports(prev => prev.map(r => r.id === id ? updated : r))
      fetchStats()
      addToast("success", successMsg)
    } catch (err: unknown) {
      // Rollback
      fetchReports(activeFilter)
      addToast("error", err instanceof Error ? err.message : "Update failed.")
    } finally { setUpdatingId(null) }
  }

  const handleVerify      = (id: string) => patchReport(id, { verification_status: "verified" },  "Credentials verified.")
  const handleRevoke      = (id: string) => patchReport(id, { verification_status: "revoked"  },  "Verification revoked.")
  const handleFlag        = (id: string) => patchReport(id, { flagged: true  },                    "Anomaly flagged.")
  const handleDismissFlag = (id: string) => patchReport(id, { flagged: false },                    "Flag dismissed.")

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wider">
            AI INTELLIGENCE <span className="text-gradient">REPORTS & VERIFICATION</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Automated match quality scoring, credential verification, and pattern analysis.</p>
        </div>
        <button onClick={() => fetchReports(activeFilter)}
          className="p-2 border border-white/[0.08] hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl transition-all h-10 w-10 flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 ${loadingReports ? "animate-spin" : ""}`} />
        </button>
      </div>

      <StatCards stats={stats} loading={loadingStats} />


      {/* Summary insights panel */}
      {!loadingStats && stats && (
        <AiSummaryPanel
          title="AI Model Telemetry & Matching Metrics"
          bullets={[
            `Analyzed a total of ${stats.total_reports} AI screening report dossiers.`,
            `Flagged ${stats.flagged_count} candidate compliance or integrity anomalies.`,
            `Integrating from ${stats.active_sources} live data ingestion endpoints.`,
            "Platform classification confidence threshold is active at 75% baseline value."
          ]}
          className="w-full"
        />
      )}

      {/* Filter tabs */}
      <div className="flex bg-white/[0.02] dark:bg-black/40 border border-white/[0.05] p-1 rounded-radius-md w-full md:w-96">
        {([
          { id: "all",      label: "ALL REPORTS"   },
          { id: "flagged",  label: "FLAGGED ONLY"  },
          { id: "verified", label: "VERIFIED ONLY" },
        ] as { id: AIReportFilter; label: string }[]).map(tab => (
          <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
            className={`flex-1 px-4 py-2 text-[10px] font-bold rounded-radius-full transition-all uppercase ${
              activeFilter === tab.id
                ? "bg-signal text-white shadow-md shadow-signal/20"
                : "text-neutral-400 hover:text-white"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {fetchError && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{fetchError}</span>
          <button onClick={() => fetchReports(activeFilter)} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loadingReports && !fetchError && (
        <AiThinkingState status="COMPUTING CLASSIFICATIONS & MODEL MATCHES..." />
      )}

      {/* Empty state */}
      {!loadingReports && !fetchError && reports.length === 0 && (
        <div className="p-16 text-center text-neutral-400 text-xs border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
          <Brain className="w-10 h-10 mx-auto mb-4 text-signal animate-pulse" />
          <p className="font-display font-extrabold uppercase tracking-wider">No AI Reports Found</p>
          <p className="mt-1 font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">Reports generate automatically on candidate resume uploads.</p>
        </div>
      )}

      {/* Report cards grid */}
      {!loadingReports && !fetchError && reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              onVerify={handleVerify}
              onRevoke={handleRevoke}
              onFlag={handleFlag}
              onDismissFlag={handleDismissFlag}
              updating={updatingId === r.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
