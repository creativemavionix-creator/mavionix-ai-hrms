"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Bell, Cpu, Layers, CheckCircle, Loader2, AlertTriangle, Monitor, Sun, Moon } from "lucide-react"
import {
  settingsApi, ApiAIWeights, ApiNotificationPrefs, ApiIntegrations, ApiShortlistThreshold,
} from "@/lib/api"
import { useTheme, ThemeMode } from "@/lib/theme"

// ── Toast ──────────────────────────────────────────────────────────────────────
interface Toast { id: number; type: "success" | "error"; message: string }
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])
  return { toasts, add }
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4.5 py-3 rounded-radius-lg font-bold text-xs border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300
          ${t.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
          {t.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

// ── Roles (static display) ────────────────────────────────────────────────────
const ROLES = [
  { title: "Super Admin",  access: "Full system config, API overrides, financial requisitions, audit logs" },
  { title: "HR Manager",   access: "Manage jobs, candidate review pipeline, schedule interviews, view analytics" },
  { title: "Recruiter",    access: "Add candidates, view matched profiles, draft outbox messaging" },
  { title: "Interviewer",  access: "Access assigned candidate agendas, submit evaluation scores, write reviews" },
  { title: "Candidate",    access: "View application tracker state, schedule final review time slot" },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsView() {
  const { toasts, add: addToast } = useToast()

  // ── AI Weights ─────────────────────────────────────────────────────────────
  const [weights,         setWeights]         = useState<ApiAIWeights>({ skills: 40, experience: 30, education: 15, projects: 15 })
  const [savingWeights,   setSavingWeights]   = useState(false)
  const weightsDebounce   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifs,          setNotifs]          = useState<ApiNotificationPrefs>({ email: true, slack: true, push: false, ai_flag: true })
  const [savingNotifs,    setSavingNotifs]    = useState(false)

  // ── Integrations ───────────────────────────────────────────────────────────
  const [integrations,    setIntegrations]    = useState<ApiIntegrations>({ linkedin: true, naukri: true, indeed: false, slack: true, email: true })
  const [savingIntegrations, setSavingIntegrations] = useState(false)

  // ── Shortlist Threshold ────────────────────────────────────────────────────
  const [shortlistThreshold, setShortlistThreshold] = useState(75)
  const [borderlineFloor, setBorderlineFloor] = useState(60)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const thresholdDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Loading state ──────────────────────────────────────────────────────────
  const [loadingInit,     setLoadingInit]     = useState(true)

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      settingsApi.getWeights(),
      settingsApi.getNotifications(),
      settingsApi.getIntegrations(),
      settingsApi.getThreshold(),
    ])
      .then(([w, n, i, t]) => {
        setWeights(w); setNotifs(n); setIntegrations(i)
        setShortlistThreshold(t.value); setBorderlineFloor(t.borderline_floor)
      })
      .catch(() => { /* silently fall back to defaults */ })
      .finally(() => setLoadingInit(false))
  }, [])

  // ── AI Weights — debounced auto-save ───────────────────────────────────────
  const handleWeightChange = (key: keyof ApiAIWeights, val: number) => {
    const updated = { ...weights, [key]: val }
    setWeights(updated)
    if (weightsDebounce.current) clearTimeout(weightsDebounce.current)
    weightsDebounce.current = setTimeout(() => saveWeights(updated), 800)
  }

  const saveWeights = async (w: ApiAIWeights) => {
    setSavingWeights(true)
    try {
      await settingsApi.updateWeights(w)
      addToast("success", "Scoring weights saved and applied.")
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to save weights.")
    } finally { setSavingWeights(false) }
  }

  // ── Threshold — debounced auto-save ────────────────────────────────────────
  const handleThresholdChange = (key: "value" | "borderline_floor", val: number) => {
    if (key === "value") setShortlistThreshold(val)
    else setBorderlineFloor(val)

    if (thresholdDebounce.current) clearTimeout(thresholdDebounce.current)
    thresholdDebounce.current = setTimeout(() => {
      const payload = {
        value: key === "value" ? val : shortlistThreshold,
        borderline_floor: key === "borderline_floor" ? val : borderlineFloor,
      }
      saveThreshold(payload)
    }, 800)
  }

  const saveThreshold = async (t: ApiShortlistThreshold) => {
    setSavingThreshold(true)
    try {
      await settingsApi.updateThreshold(t)
      addToast("success", "Shortlist threshold updated.")
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Failed to save threshold.")
    } finally { setSavingThreshold(false) }
  }

  // ── Notifications — save on toggle ─────────────────────────────────────────
  const handleNotifChange = async (key: keyof ApiNotificationPrefs, val: boolean) => {
    const updated = { ...notifs, [key]: val }
    setNotifs(updated)
    setSavingNotifs(true)
    try {
      await settingsApi.updateNotifications(updated)
      addToast("success", "Notification preferences saved.")
    } catch (err: unknown) {
      setNotifs(notifs)   // rollback
      addToast("error", err instanceof Error ? err.message : "Failed to save notifications.")
    } finally { setSavingNotifs(false) }
  }

  // ── Integrations — save on toggle ──────────────────────────────────────────
  const handleIntegrationChange = async (key: keyof ApiIntegrations, val: boolean) => {
    const updated = { ...integrations, [key]: val }
    setIntegrations(updated)
    setSavingIntegrations(true)
    try {
      await settingsApi.updateIntegrations(updated)
      addToast("success", `${key.charAt(0).toUpperCase() + key.slice(1)} integration ${val ? "enabled" : "disabled"}.`)
    } catch (err: unknown) {
      setIntegrations(integrations)   // rollback
      addToast("error", err instanceof Error ? err.message : "Failed to save integrations.")
    } finally { setSavingIntegrations(false) }
  }

  // ── Gemini API Key ─────────────────────────────────────────────────────────
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hiremind_gemini_api_key") || ""
      setGeminiApiKey(stored)
    }
  }, [])

  const saveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault()
    setSavingKey(true)
    if (typeof window !== "undefined") {
      localStorage.setItem("hiremind_gemini_api_key", geminiApiKey.trim())
    }
    setTimeout(() => {
      setSavingKey(false)
      addToast("success", geminiApiKey.trim() ? "Gemini 2.0 Flash API Key Saved Successfully!" : "Gemini API Key cleared.")
    }, 400)
  }

  const { mode: themeMode, setMode: setThemeMode } = useTheme()

  if (loadingInit) return (
    <div className="p-20 flex items-center justify-center gap-3 text-neutral-400 font-semibold text-xs h-64">
      <Loader2 className="w-4 h-4 animate-spin text-signal" /> RETRIEVING SYSTEM PREFERENCES...
    </div>
  )

  return (
    <div className="space-y-6 pb-10">
      <ToastStack toasts={toasts} />

      <div>
        <h1 className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wider">
          SYSTEM & <span className="text-gradient">ALGORITHM SETTINGS</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">Configure role permission parameters, neural algorithms, Gemini API keys, and service integrations.</p>
      </div>

      {/* GEMINI 2.0 FLASH AI CONFIGURATION CARD */}
      <Card className="glass-card border-violet-500/30 rounded-radius-lg shadow-xl relative overflow-hidden reveal-up bg-gradient-to-r from-violet-600/10 via-transparent to-transparent">
        <CardHeader className="pb-3 border-b border-white/[0.05]">
          <CardTitle className="text-xs font-bold text-white tracking-widest uppercase flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" />
              <span>GEMINI 2.0 FLASH API KEY CONFIGURATION</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
              geminiApiKey.trim() ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}>
              {geminiApiKey.trim() ? "🟢 GEMINI LIVE CONNECTED" : "🟡 DEMO SIMULATOR MODE"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <p className="text-neutral-300 text-[11px] leading-relaxed font-medium">
            Enter your Google Gemini API Key below to enable live autonomous AI evaluations, resume match scoring, candidate screening, and Recruiter Copilot responses.
          </p>
          <form onSubmit={saveGeminiKey} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/[0.02] dark:bg-black/40 border border-white/[0.1] rounded-radius-md px-4 py-2.5 text-xs text-white font-mono focus:border-violet-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-[10px] font-mono text-neutral-400 hover:text-white uppercase font-bold"
              >
                {showKey ? "HIDE" : "SHOW"}
              </button>
            </div>
            <button
              type="submit"
              disabled={savingKey}
              className="btn-primary py-2.5 px-5 rounded-radius-md font-bold text-xs uppercase tracking-wider text-white shadow-lg shadow-violet-500/20 shrink-0 cursor-pointer"
            >
              {savingKey ? "SAVING..." : "SAVE GEMINI KEY"}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Theme Toggle */}
      <Card className="glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-neutral-900 dark:text-white font-extrabold uppercase text-[10px] tracking-wider font-display">INTERFACE THEME APPEARANCE</span>
            <p className="text-neutral-400 text-[10px] font-semibold">Select look and feel for the recruitment terminal module.</p>
          </div>
          <div className="flex bg-white/[0.02] dark:bg-black/40 border border-white/[0.05] p-1 rounded-radius-md">
            {([
              { id: "light" as ThemeMode, icon: Sun,     label: "LIGHT" },
              { id: "dark" as ThemeMode,  icon: Moon,    label: "DARK" },
              { id: "system" as ThemeMode,icon: Monitor, label: "SYSTEM" },
            ]).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setThemeMode(id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold rounded-radius-md transition-all ${
                  themeMode === id
                    ? "bg-signal text-white shadow-md shadow-signal/20"
                    : "text-neutral-400 hover:text-white"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AI Scoring Weights */}
        <Card className="lg:col-span-6 glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up reveal-delay-1">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-signal" />
              AI MATCH-WEIGHT SCORING ALGORITHM
              {savingWeights && <Loader2 className="w-3.5 h-3.5 animate-spin text-signal ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5 text-xs">
            <p className="text-neutral-400 leading-relaxed text-[11px] font-semibold">
              Adjust weights for AI resume scoring. Changes auto-save and are applied to all new candidate submissions immediately.
            </p>
            <div className="space-y-4">
              {([
                { key: "skills" as const,     label: "TECHNICAL SKILLS" },
                { key: "experience" as const, label: "PROFESSIONAL EXPERIENCE" },
                { key: "education" as const,  label: "ACADEMIC BACKGROUND" },
                { key: "projects" as const,   label: "PROJECT PORTFOLIO / DESIGN WORK" },
              ]).map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-700 dark:text-neutral-200 font-extrabold uppercase text-[10px] tracking-wider">{label}</span>
                    <span className="text-signal font-bold">{weights[key]}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={weights[key]}
                    onChange={e => handleWeightChange(key, Number(e.target.value))}
                    className="w-full accent-signal bg-white/[0.04] h-1.5 rounded-radius-md cursor-pointer" />
                </div>
              ))}
            </div>
            {(() => {
              const totalWeight = (weights.skills || 0) + (weights.experience || 0) + (weights.education || 0) + (weights.projects || 0)
              return (
                <div className="pt-3.5 border-t border-white/[0.05] bg-white/[0.01] p-3.5 rounded-radius-lg text-[10px] flex items-center justify-between text-neutral-400 font-bold tracking-wider">
                  <span>ACCUMULATIVE CALIBRATION:</span>
                  <span className={`font-extrabold ${totalWeight === 100 ? "text-emerald-400" : "text-signal"}`}>
                    {totalWeight}% {totalWeight === 100 ? "(STABLE)" : "(NORMALISED)"}
                  </span>
                </div>
              )
            })()}

            {/* AI Shortlisting Threshold */}
            <div className="pt-4 border-t border-white/[0.05] space-y-4">
              <p className="text-neutral-400 text-[11px] leading-relaxed font-semibold">
                Candidates scoring above the threshold are auto-shortlisted. Below the borderline floor, they are auto-rejected.
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-700 dark:text-neutral-200 font-extrabold uppercase text-[10px] tracking-wider">SHORTLIST THRESHOLD</span>
                  <span className="text-emerald-400 font-bold">{shortlistThreshold}%</span>
                </div>
                <input type="range" min="50" max="100" value={shortlistThreshold}
                  onChange={e => handleThresholdChange("value", Number(e.target.value))}
                  className="w-full accent-emerald-500 bg-white/[0.04] h-1.5 rounded-radius-md cursor-pointer" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-700 dark:text-neutral-200 font-extrabold uppercase text-[10px] tracking-wider">BORDERLINE FLOOR (AUTO-REJECT BELOW)</span>
                  <span className="text-red-400 font-bold">{borderlineFloor}%</span>
                </div>
                <input type="range" min="20" max={shortlistThreshold - 1} value={borderlineFloor}
                  onChange={e => handleThresholdChange("borderline_floor", Number(e.target.value))}
                  className="w-full accent-red-400 bg-white/[0.04] h-1.5 rounded-radius-md cursor-pointer" />
              </div>
              <div className="bg-white/[0.01] dark:bg-black/20 border border-white/[0.04] rounded-radius-lg p-4 text-[9.5px] text-neutral-400 space-y-1.5 font-bold uppercase tracking-wider">
                <div>≥ {shortlistThreshold} → <span className="text-emerald-400 font-extrabold">AUTO-SHORTLIST</span></div>
                <div>{borderlineFloor}–{shortlistThreshold - 1} → <span className="text-amber-400 font-extrabold">FLAGGED FOR HR REVIEW</span></div>
                <div>&lt; {borderlineFloor} → <span className="text-red-400 font-extrabold">AUTO-REJECT + QUEUE REJECTION EMAIL</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles (read-only) */}
        <Card className="lg:col-span-6 glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up reveal-delay-2">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-signal" />
              USER ROLES & PERMISSIONS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-[11px] font-semibold">
            {ROLES.map(role => (
              <div key={role.title} className="p-4 bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] rounded-radius-lg">
                <div className="text-neutral-900 dark:text-neutral-200 font-extrabold text-xs uppercase tracking-wider font-display">{role.title}</div>
                <div className="text-neutral-400 mt-1.5 leading-relaxed font-semibold">{role.access}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification prefs */}
        <Card className="glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up reveal-delay-3">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
              <Bell className="w-4 h-4 text-signal" />
              ALERT & NOTIFICATION PREFERENCES
              {savingNotifs && <Loader2 className="w-3.5 h-3.5 animate-spin text-signal ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5 text-xs">
            {([
              { key: "email" as const,   label: "EMAIL DIGEST REPORTS",        desc: "Receive summary of candidates matched daily." },
              { key: "slack" as const,   label: "SLACK BOT BROADCAST",          desc: "Ping HR channel when a candidate reaches interview stage." },
              { key: "push" as const,    label: "BROWSER PUSH NOTIFICATION",    desc: "Notify instantly on interview completing updates." },
              { key: "ai_flag" as const, label: "AI DISCREPANCY WARNINGS",      desc: "Flag profiles that trigger anomalous education or skills matches." },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div className="space-y-1 max-w-[80%]">
                  <span className="text-neutral-900 dark:text-neutral-200 font-extrabold uppercase text-[10px] tracking-wider">{label}</span>
                  <p className="text-neutral-400 text-[10px] leading-tight font-semibold">{desc}</p>
                </div>
                <input type="checkbox" checked={notifs[key]}
                  onChange={e => handleNotifChange(key, e.target.checked)}
                  className="w-4 h-4 accent-signal bg-neutral-950 rounded-radius-md cursor-pointer mt-0.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up reveal-delay-4">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-signal" />
              SOURCE & SERVICE INTEGRATIONS
              {savingIntegrations && <Loader2 className="w-3.5 h-3.5 animate-spin text-signal ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5 text-xs">
            {([
              { key: "linkedin" as const, label: "LINKEDIN TALENT HUB",   desc: "Auto-sync jobs and capture incoming applications." },
              { key: "naukri" as const,   label: "NAUKRI CAREER CONSOLE",  desc: "Import candidate resumes directly into parser queues." },
              { key: "indeed" as const,   label: "INDEED WORKSPACE API",   desc: "Exchanging active job requisition updates." },
              { key: "slack" as const,    label: "SLACK COMMUNICATIONS",   desc: "Integrate team notification alerts for HR managers." },
              { key: "email" as const,    label: "SMTP SERVICE ENGINE",    desc: "Send automated emails, follow-ups, and calendar alerts." },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <div className="space-y-1 max-w-[80%]">
                  <span className="text-neutral-900 dark:text-neutral-200 font-extrabold uppercase text-[10px] tracking-wider">{label}</span>
                  <p className="text-neutral-400 text-[10px] leading-tight font-semibold">{desc}</p>
                </div>
                <button type="button" onClick={() => handleIntegrationChange(key, !integrations[key])}
                  className={`text-[9px] font-extrabold px-3 py-1 border rounded-radius-full transition-all uppercase tracking-wider ${
                    integrations[key]
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-white/[0.01] border-white/[0.08] text-neutral-400 hover:text-white"
                  }`}>
                  {integrations[key] ? "ACTIVE" : "STANDBY"}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
