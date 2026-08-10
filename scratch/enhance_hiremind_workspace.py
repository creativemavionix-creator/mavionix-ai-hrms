code = """"use client"

import React, { useState } from "react"
import {
  BarChart3, Users, Briefcase, Brain, Calendar, AreaChart, MessageSquare, Settings, ArrowLeft, Sparkles
} from "lucide-react"

import DashboardView from "./DashboardView"
import JobManagementView from "./JobManagementView"
import CandidateManagementView from "./CandidateManagementView"
import AiIntelligenceView from "./AiIntelligenceView"
import InterviewCenterView from "./InterviewCenterView"
import AnalyticsView from "./AnalyticsView"
import CommunicationView from "./CommunicationView"
import SettingsView from "./SettingsView"
import RecruiterCopilotWidget from "./RecruiterCopilotWidget"

interface HireMindWorkspaceProps {
  onBack?: () => void
}

export default function HireMindWorkspace({ onBack }: HireMindWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard")

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "candidates", label: "Candidates", icon: Users },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "intelligence", label: "AI Screening", icon: Brain },
    { id: "interviews", label: "Interviews", icon: Calendar },
    { id: "analytics", label: "Analytics", icon: AreaChart },
    { id: "communications", label: "Outbox", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />
      case "jobs":
        return <JobManagementView />
      case "candidates":
        return <CandidateManagementView />
      case "intelligence":
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
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />
    }
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-100px)] flex flex-col relative pb-12 overflow-hidden">
      {/* Background Ambient Glow FX */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-pink-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/[0.08] pb-5 relative z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.1] text-neutral-400 hover:text-white rounded-xl transition-all shadow-md group"
              title="Back to Business Suite"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-pink-400 uppercase tracking-widest bg-violet-500/10 border border-violet-500/25 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-violet-400" />
                MAVIONIX RECRUITMENT SUITE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-violet-200 tracking-tight mt-1 flex items-center gap-2">
              HireMind AI Platform
            </h1>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-black/40 backdrop-blur-xl p-1.5 border border-white/[0.08] rounded-2xl shadow-xl">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider whitespace-nowrap ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-violet-500/25 border border-white/20"
                    : "text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.05]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-neutral-400"}`} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative z-10">
        {renderContent()}
      </div>

      {/* Docked AI Recruiter Copilot Assistant */}
      <RecruiterCopilotWidget
        activeTab={activeTab}
        onOpenCandidateDossier={() => setActiveTab("candidates")}
      />
    </div>
  )
}
"""

with open(r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\components\business\hiremind\HireMindWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Enhanced HireMindWorkspace.tsx successfully!")
