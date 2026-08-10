code = """"use client"

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
  const shortlisted = stats?.shortlisted_candidates ?? 38
  const activeJobs = stats?.active_jobs ?? 6

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner Card matching Lead CRM */}
      <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] shadow-xl">
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-purple-600 dark:text-purple-300">
              <Sparkles size={13} /> AI RECRUITER ASSISTANT
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black max-w-2xl text-slate-900 dark:text-white leading-tight">
              Your AI Recruiter evaluated 18 candidate applications today across {activeJobs} active requisitions.
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              {shortlisted} candidates are shortlisted and ready for technical interviews. Everything else is being screened autonomously.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.("intelligence")}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 shadow-lg shadow-purple-500/25 hover:from-violet-500 hover:to-pink-500 hover:-translate-y-0.5 transition-all"
          >
            Review AI Screening <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 4 Stat Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Candidates', value: totalCandidates.toLocaleString(), icon: Users, tab: 'candidates', color: 'text-violet-500' },
          { label: 'Shortlisted', value: shortlisted.toLocaleString(), icon: ShieldCheck, tab: 'candidates', color: 'text-purple-500' },
          { label: 'High Priority Jobs', value: activeJobs, icon: Flame, tab: 'jobs', color: 'text-pink-500' },
          { label: 'AI Actions Today', value: '18', icon: Zap, tab: 'intelligence', color: 'text-amber-500' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              onClick={() => onNavigate?.(s.tab)}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] p-5 cursor-pointer hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-200 group shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{s.label}</span>
                <Icon size={16} className={s.color} />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white group-hover:text-purple-400 transition-colors">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* AI Live Terminal Ticker & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terminal Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">AI Autonomous Agent Feed</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">LIVE AGENT ACTIVE</span>
          </div>
          <div className="font-mono text-xs space-y-2.5 bg-slate-900 dark:bg-[#05050a] p-4 rounded-xl border border-slate-800 text-slate-300">
            {terminalFeed.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">›</span>
                <span className={line.includes("[EVAL]") ? "text-emerald-400" : line.includes("[COPILOT]") ? "text-pink-400" : "text-slate-300"}>{line}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Log Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c14] p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Recent System Audit Trail</h3>
            </div>
            <button onClick={() => fetchData()} className="text-slate-400 hover:text-white transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="space-y-3">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
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
"""

with open(r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\components\business\hiremind\DashboardView.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully updated DashboardView.tsx to match Lead CRM!")
