"use client"
// Vercel deployment sync timestamp: 2026-08-11-1741

import { useState, useEffect } from "react"
import {
  initialJobs,
  initialCandidates,
  initialInterviews,
  initialChannels,
  initialActivityLogs,
  Job,
  Candidate,
  Interview,
  Channel,
  AIWeights,
  ActivityLog,
} from "@/lib/sampleData"
import {
  ChevronRight,
  BarChart3,
  Users,
  Bell,
  RefreshCw,
  Briefcase,
  Brain,
  MessageSquare,
  Calendar,
  AreaChart,
  Settings,
  Sun,
  Moon,
} from "lucide-react"

// Import core recruitment views
import DashboardView from "@/components/recruitment/DashboardView"
import JobManagementView from "@/components/recruitment/JobManagementView"
import CandidateManagementView from "@/components/recruitment/CandidateManagementView"
import AiIntelligenceView from "@/components/recruitment/AiIntelligenceView"
import InterviewCenterView from "@/components/recruitment/InterviewCenterView"
import AnalyticsView from "@/components/recruitment/AnalyticsView"
import CommunicationView from "@/components/recruitment/CommunicationView"
import SettingsView from "@/components/recruitment/SettingsView"
import PortalChoiceLanding from "@/components/landing/PortalChoiceLanding"
import CandidatePortalDashboard from "@/components/candidate/CandidatePortalDashboard"
import RecruiterCopilotWidget from "@/components/recruitment/RecruiterCopilotWidget"
import { useTheme } from "@/lib/theme"
import { supabase } from "@/lib/supabaseClient"

export default function RecruitmentDashboard() {
  const [mounted, setMounted] = useState(false)
  const [portalViewMode, setPortalViewMode] = useState<"landing" | "recruiter" | "candidate">("landing")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("dashboard")
  const themeObj = useTheme()
  const theme = themeObj?.resolved || "dark"
  const setTheme = themeObj?.setMode || (() => {})

  useEffect(() => {
    setMounted(true)
  }, [])

  // Supabase Realtime Channel Sync for Candidates & Applications
  useEffect(() => {
    if (!mounted) return

    const channel = supabase
      .channel("recruiter-realtime-sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "candidates" },
        (payload) => {
          const newCand = payload.new
          const alertMsg = `🚀 New Candidate Arrived: ${newCand?.name || "Applicant"} registered.`
          setNotifications((prev) => [alertMsg, ...prev])
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "applications" },
        (payload) => {
          const alertMsg = `📋 New Application Submitted! Candidate queued for AI screening.`
          setNotifications((prev) => [alertMsg, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mounted])

  // App States
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates)
  const [interviews, setInterviews] = useState<Interview[]>(initialInterviews)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialActivityLogs)
  const [channels, setChannels] = useState<Channel[]>(initialChannels)

  // Notifications bell alerts state
  const [notifications, setNotifications] = useState<string[]>([
    "Priya Sharma scheduled for Technical Interview at 17:30 UTC",
    "ML Engineer candidate Aisha Patel has a 96% AI match score",
    "Vikram Rao (COBOL Application) was flagged for low skills correlation",
  ])
  const [showNotifications, setShowNotifications] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("07/08/2026 16:48:58")

  // Uptime state
  const [uptime, setUptime] = useState({ h: 156, m: 42, s: 18 })

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime((prev) => {
        let newS = prev.s + 1
        let newM = prev.m
        let newH = prev.h
        if (newS >= 60) {
          newS = 0
          newM += 1
        }
        if (newM >= 60) {
          newM = 0
          newH += 1
        }
        return { h: newH, m: newM, s: newS }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatUptime = () => {
    const pad = (num: number) => String(num).padStart(2, "0")
    return `${pad(uptime.h)}:${pad(uptime.m)}:${pad(uptime.s)}`
  }

  // Trigger Refresh
  const handleRefresh = () => {
    const date = new Date()
    const formatted = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(
      2
    )}/${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
      2
    )}:${String(date.getSeconds()).padStart(2, "0")}`
    setLastUpdate(formatted)

    const log: ActivityLog = {
      id: `LOG-0${Date.now()}`,
      time: new Date().toISOString().substring(0, 19),
      candidateName: "System Manager",
      action: "triggered complete recruiter database synchronization",
      role: "all pipeline nodes",
      type: "info",
    }
    setActivityLogs((prev) => [log, ...prev])
  }

  // Calculate global status counts
  const activeJobsCount = jobs.filter((j) => j.status === "active").length
  const inProgressAppsCount = candidates.filter((c) => c.stage !== "Hired" && c.stage !== "Rejected").length

  // Nav configuration (Core HireMind AI)
  const navItems = [
    { id: "dashboard", icon: BarChart3, label: "DASHBOARD" },
    { id: "jobs", icon: Briefcase, label: "JOB MANAGEMENT" },
    { id: "candidates", icon: Users, label: "CANDIDATES" },
    { id: "ai", icon: Brain, label: "AI INTELLIGENCE" },
    { id: "interviews", icon: Calendar, label: "INTERVIEW CENTER" },
    { id: "analytics", icon: AreaChart, label: "ANALYTICS" },
    { id: "communications", icon: MessageSquare, label: "COMMUNICATIONS" },
    { id: "settings", icon: Settings, label: "SETTINGS" },
  ]

  const getBreadcrumbLabel = () => {
    const item = navItems.find((n) => n.id === activeTab)
    return item ? item.label : "DASHBOARD"
  }

  // Component Router
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />
      case "jobs":
        return <JobManagementView />
      case "candidates":
        return <CandidateManagementView sidebarCollapsed={sidebarCollapsed} />
      case "ai":
        return <AiIntelligenceView />
      case "interviews":
        return <InterviewCenterView />
      case "analytics":
        return <AnalyticsView />
      case "communications":
        return <CommunicationView />
      case "settings":
        return <SettingsView />
      default:
        return <DashboardView onNavigate={setActiveTab} />
    }
  }

  if (!mounted) return null

  return (
    <>
      {/* GLOBAL FLOATING PORTAL SWITCHER */}
      <div className="fixed top-3 right-4 z-50 flex items-center gap-2 bg-[#0d0f17]/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={() => setPortalViewMode("landing")}
          className={`px-3 py-1 rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase transition-all ${
            portalViewMode === "landing" ? "bg-violet-600 text-white shadow-md shadow-violet-500/25" : "text-neutral-400 hover:text-white"
          }`}
        >
          🏠 Landing
        </button>
        <button
          onClick={() => setPortalViewMode("recruiter")}
          className={`px-3 py-1 rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase transition-all ${
            portalViewMode === "recruiter" ? "bg-violet-600 text-white shadow-md shadow-violet-500/25" : "text-neutral-400 hover:text-white"
          }`}
        >
          💼 Recruiter
        </button>
        <button
          onClick={() => setPortalViewMode("candidate")}
          className={`px-3 py-1 rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase transition-all ${
            portalViewMode === "candidate" ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25" : "text-neutral-400 hover:text-white"
          }`}
        >
          🚀 Candidate
        </button>
      </div>

      {portalViewMode === "landing" && (
        <PortalChoiceLanding onSelectRole={(role) => setPortalViewMode(role)} />
      )}

      {portalViewMode === "candidate" && (
        <CandidatePortalDashboard onSwitchToRecruiter={() => setPortalViewMode("recruiter")} />
      )}

      {portalViewMode === "recruiter" && (
        <div className="flex h-screen overflow-hidden bg-[var(--hm-bg-primary)] text-[var(--hm-text-primary)] relative font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 blur-[130px] rounded-full pointer-events-none dark:opacity-75 opacity-30 z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-indigo-600/8 blur-[130px] rounded-full pointer-events-none dark:opacity-75 opacity-30 z-0" />
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-fuchsia-600/5 blur-[120px] rounded-full pointer-events-none dark:opacity-75 opacity-20 z-0" />

      {/* Floating Sidebar Container */}
      <div
        className={`my-4 ml-4 mb-4 ${
          sidebarCollapsed ? "w-20" : "w-68"
        } glass-panel rounded-2xl flex flex-col justify-between transition-all duration-300 z-50 shrink-0 shadow-2xl relative overflow-hidden`}
      >
        <div className="absolute inset-0 border border-white/[0.04] rounded-2xl pointer-events-none" />

        <div className="p-5 flex flex-col h-full overflow-hidden relative z-10">
          {/* Logo header */}
          <div className="flex items-center justify-between mb-8 px-1">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-sm font-extrabold tracking-widest bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  HIREMIND AI
                </h1>
                <p className="text-[8px] text-neutral-500 font-medium tracking-widest uppercase mt-0.5">
                  Recruitment Intelligence
                </p>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Brain className="w-4 h-4 text-white" />
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all ml-auto"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5 overflow-y-auto flex-1 scrollbar-none pr-0.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-left rounded-xl transition-all duration-200 ease-out relative group overflow-hidden ${
                    isActive
                      ? "text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.25)] border border-violet-500/30"
                      : "text-neutral-400 hover:text-neutral-200 border border-transparent"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 to-indigo-600/90" />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.04] transition-all duration-200 ease-out" />
                  )}

                  <item.icon className={`w-4 h-4 shrink-0 relative z-10 transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`} />
                  {!sidebarCollapsed && (
                    <span className="text-xs tracking-wide relative z-10 transition-colors duration-200">
                      {item.label}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-white rounded-r-full z-20" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* System status box */}
          {!sidebarCollapsed && (
            <div className="mt-4 p-3 bg-white/[0.01] dark:bg-black/25 border border-white/[0.05] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0"></span>
                <span>SYSTEM ONLINE</span>
              </div>
              <div className="text-[10px] text-neutral-400 space-y-1">
                <div className="flex justify-between"><span>Uptime:</span> <span className="font-mono text-neutral-300">{formatUptime()}</span></div>
                <div className="flex justify-between"><span>Active Jobs:</span> <span className="font-semibold text-neutral-300">{activeJobsCount}</span></div>
                <div className="flex justify-between"><span>In Progress:</span> <span className="font-semibold text-neutral-300">{inProgressAppsCount}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top bar toolbar */}
        <div className="h-20 border-b border-white/[0.05] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="text-neutral-500 font-medium tracking-wider uppercase">RECRUITMENT</span>
            <span className="text-neutral-600">/</span>
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-bold tracking-wider uppercase">
              {getBreadcrumbLabel()}
            </span>
          </div>

          <div onClick={() => setActiveTab("candidates")} className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.06] rounded-radius-full text-neutral-400 cursor-pointer w-64 max-w-sm transition-all duration-200">
            <span className="text-[10px] tracking-wide font-bold uppercase font-sans">Search Command...</span>
            <kbd className="ml-auto text-[8px] bg-white/10 px-1.5 py-0.5 rounded text-neutral-300 font-mono">Ctrl+K</kbd>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setPortalViewMode("candidate")}
              className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 rounded-full text-[9px] font-extrabold tracking-wider uppercase transition-all shrink-0 shadow-md shadow-emerald-500/10 cursor-pointer"
            >
              Candidate Portal View
            </button>

            <button
              onClick={() => setPortalViewMode("landing")}
              className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/10 text-neutral-300 rounded-full text-[9px] font-bold tracking-wider uppercase transition-all shrink-0 cursor-pointer"
            >
              Landing Page
            </button>

            <button
              onClick={() => setActiveTab("candidates")}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3] text-white rounded-full text-[9px] font-bold tracking-wider uppercase transition-all duration-200 shrink-0 shadow-md shadow-violet-500/10"
            >
              + Add Candidate
            </button>

            <button
              onClick={handleRefresh}
              title="Refresh Sync"
              className="p-2 border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-neutral-100 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="p-2 border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-neutral-100 transition-all active:scale-95"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.06] rounded-xl text-neutral-400 hover:text-neutral-100 transition-all relative active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-gradient-to-tr from-violet-500 to-indigo-500 rounded-full border-2 border-[var(--hm-bg-primary)] animate-pulse"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass-panel rounded-2xl p-4 space-y-3 z-50 text-xs leading-relaxed shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5">
                    <span className="font-bold text-neutral-300 tracking-wider">NOTICES ({notifications.length})</span>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-violet-400 hover:text-violet-300 font-semibold uppercase text-[10px]"
                    >
                      CLEAR
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                    {notifications.length === 0 ? (
                      <p className="text-neutral-500 text-center py-4">NO NEW ALERT ENQUEUE ENTRIES.</p>
                    ) : (
                      notifications.map((n, idx) => (
                        <div key={idx} className="p-2.5 bg-white/[0.01] dark:bg-black/20 border border-white/[0.03] text-neutral-300 rounded-xl">
                          {n}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Component viewport */}
        <div className="flex-1 overflow-auto bg-transparent relative z-10 px-8 py-6">
          {renderContent()}
        </div>
      </div>

      {/* Recruiter AI Copilot Assistant */}
      <RecruiterCopilotWidget
        activeTab={activeTab}
        onOpenCandidateDossier={() => {
          setActiveTab("candidates")
        }}
      />
    </div>
  )}
  </>
  )
}
