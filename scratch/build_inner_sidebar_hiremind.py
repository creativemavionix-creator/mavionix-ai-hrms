code = """"use client"

import React, { useState } from "react"
import {
  BarChart3, Users, Briefcase, Brain, Calendar, AreaChart, MessageSquare, Settings, ArrowLeft, BrainCircuit
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

type TabId = "dashboard" | "candidates" | "jobs" | "intelligence" | "interviews" | "analytics" | "communications" | "settings"

export default function HireMindWorkspace({ onBack }: HireMindWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard")

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
        return <DashboardView onNavigate={(tab) => setActiveTab(tab as TabId)} />
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
        return <DashboardView onNavigate={(tab) => setActiveTab(tab as TabId)} />
    }
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#07070f] text-slate-900 dark:text-white flex overflow-hidden">
      {/* Inner Sub-Sidebar for HireMind AI */}
      <aside className="hidden lg:sticky lg:top-0 lg:z-0 lg:flex h-screen w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b14] flex-col">
        {onBack && (
          <div className="px-5 pt-4 pb-0">
            <button
              onClick={onBack}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-400 dark:text-slate-400 hover:text-white dark:hover:text-white bg-slate-100 dark:bg-slate-900/60 hover:bg-violet-600 dark:hover:bg-violet-600 hover:border-transparent transition-all border border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft size={12} className="text-violet-500 group-hover:text-white transition-colors" />
              <span>Back to Business Suite</span>
            </button>
          </div>
        )}

        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20"
              style={{ backgroundImage: 'linear-gradient(135deg, #C800FF 0%, #7C3AED 100%)' }}
            >
              <BrainCircuit size={18} />
            </div>
            <div>
              <p className="text-sm font-black leading-tight">HireMind AI</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">MaVionix Business Suite</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800/90 text-violet-600 dark:text-violet-300 font-extrabold shadow-sm border border-slate-200 dark:border-slate-700/60"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-900/50"
                }`}
              >
                <Icon size={16} className={isActive ? "text-violet-500" : "text-slate-400"} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main View Workspace Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto p-6 sm:p-8 relative">
        {renderContent()}

        {/* Docked AI Recruiter Copilot Assistant */}
        <RecruiterCopilotWidget
          activeTab={activeTab}
          onOpenCandidateDossier={() => setActiveTab("candidates")}
        />
      </main>
    </div>
  )
}
"""

with open(r"c:\Users\Pramod\hr-dashboard 2 (1)\mavionix-integrated\components\business\hiremind\HireMindWorkspace.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully created HireMind Workspace with inner sub-sidebar!")
