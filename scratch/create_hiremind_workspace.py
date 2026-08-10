code = """"use client"

import React, { useState } from "react"
import {
  BarChart3, Users, Briefcase, Brain, Calendar, AreaChart, MessageSquare, Settings, ArrowLeft
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
        return <DashboardView />
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
        return <DashboardView />
    }
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-100px)] flex flex-col relative pb-12">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-neutral-400 hover:text-white rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-violet-400 uppercase tracking-widest bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
                MAVIONIX HRMS & RECRUITING
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-wider mt-1 flex items-center gap-2">
              HireMind AI Platform
            </h1>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-white/[0.01] dark:bg-black/30 p-1.5 border border-white/[0.06] rounded-2xl">
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 uppercase tracking-wider ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1">
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

print("Successfully created HireMindWorkspace.tsx!")
