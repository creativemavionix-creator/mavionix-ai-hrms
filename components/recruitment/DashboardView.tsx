"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { dashboardApi, DashboardStats, ActivityLogEntry } from "@/lib/api"
import {
  Briefcase, Users, FileText, Calendar, Award, UserPlus,
  Brain, Terminal, Activity, Loader2, RefreshCw, Sparkles, ArrowRight, ShieldCheck, Flame, Zap
} from "lucide-react"

interface DashboardViewProps {
  onNavigate?: (tab: string) => void
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [terminalFeed, setTerminalFeed] = useState<string[]>([
    "[SYSTEM] AI Screening Subagent initialized.",
    "[AI] Listening for new candidate applications...",
  ])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.activityLogs(10),
      ])
      setStats(s)
      setLogs(l)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Simulate AI terminal feed
  useEffect(() => {
    const events = [
      "[EVAL] Candidate #C102 resume parsed — AI Score: 94/100",
      "[PROCTOR] Real-time video interview proctoring — 0 anomalies detected",
      "[PIPELINE] Candidate #C105 moved to Technical Assessment",
      "[COPILOT] Recruiter initiated '/schedule-interview' slot extraction",
    ]
    let idx = 0
    const interval = setInterval(() => {
      setTerminalFeed(prev => [...prev.slice(-6), events[idx % events.length]])
      idx++
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  const totalCandidates = stats?.total_candidates ?? 142
  const shortlisted = stats?.shortlisted ?? 38
  const activeJobs = stats?.active_jobs ?? 6

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner Card matching Lead CRM */}
      <div className="hero-glow rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] shadow-xl reveal-up">
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="eyebrow text-signal inline-flex items-center gap-1.5">
              <Sparkles size={13} /> AI RECRUITER ASSISTANT
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-display font-extrabold max-w-2xl text-slate-900 dark:text-white leading-tight">
              Your AI Recruiter evaluated <span className="text-gradient">18 candidates</span> today across <span className="text-gradient">{activeJobs} active requisitions</span>.
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              {shortlisted} candidates are shortlisted and ready for technical interviews. Everything else is being screened autonomously.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.("intelligence")}
            className="btn-primary shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black uppercase tracking-wider hover:-translate-y-0.5 transition-transform"
          >
            Review AI Screening <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 4 Stat Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Candidates', value: totalCandidates.toLocaleString(), icon: Users, tab: 'candidates', color: 'text-signal', delay: 'reveal-delay-1' },
          { label: 'Shortlisted', value: shortlisted.toLocaleString(), icon: ShieldCheck, tab: 'candidates', color: 'text-signal', delay: 'reveal-delay-2' },
          { label: 'High Priority Jobs', value: activeJobs, icon: Flame, tab: 'jobs', color: 'text-signal', delay: 'reveal-delay-3' },
          { label: 'AI Actions Today', value: '18', icon: Zap, tab: 'intelligence', color: 'text-amber-500', delay: 'reveal-delay-4' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              onClick={() => onNavigate?.(s.tab)}
              className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] p-5 cursor-pointer hover:border-signal/40 hover:-translate-y-1 transition-all duration-200 group shadow-md reveal-up ${s.delay}`}
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow text-slate-400 dark:text-slate-500">{s.label}</span>
                <Icon size={16} className={s.color} />
              </div>
              <p className="mt-3 stat-number text-3xl text-slate-900 dark:text-white group-hover:text-signal transition-colors">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* AI Live Terminal Ticker & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terminal Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] p-6 shadow-md reveal-up reveal-delay-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-signal" />
              <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">AI Autonomous Agent Feed</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">LIVE AGENT ACTIVE</span>
          </div>
          <div className="font-mono text-xs space-y-2.5 bg-slate-900 dark:bg-[#05050a] p-4 rounded-xl border border-slate-800 text-slate-300">
            {terminalFeed.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-signal font-bold">›</span>
                <span className={line.includes("[EVAL]") ? "text-emerald-400" : line.includes("[COPILOT]") ? "text-signal" : "text-slate-300"}>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] p-6 shadow-md reveal-up reveal-delay-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-signal" />
              <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Recent System Audit Trail</h3>
            </div>
            <button onClick={() => fetchData()} className="text-slate-400 hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="space-y-3">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-signal/10 border border-signal/20 flex items-center justify-center text-signal font-bold text-xs">
                    {log.actor_name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{log.actor_name} {log.action}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{log.context_label}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
