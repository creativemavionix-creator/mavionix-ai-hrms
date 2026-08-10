"use client"

import { useState } from "react"
import { ClipboardCheck, CheckSquare, Square, UserCheck, Shield, Laptop, FileText, Calendar, Plus, ChevronRight, Award } from "lucide-react"

interface OnboardingTask {
  id: string
  title: string
  category: "Identity & Tax" | "IT Provisioning" | "Compliance & NDA" | "Orientation"
  dueDate: string
  completed: boolean
}

interface NewHireOnboarding {
  id: string
  employeeName: string
  role: string
  startDate: string
  progressPct: number
  tasks: OnboardingTask[]
}

const INITIAL_ONBOARDING_DATA: NewHireOnboarding[] = [
  {
    id: "onb-1",
    employeeName: "Priya Sharma",
    role: "Senior Backend Engineer",
    startDate: "2026-08-15",
    progressPct: 75,
    tasks: [
      { id: "t1", title: "Submit Identity & Tax Documentation (W-4 / W-9)", category: "Identity & Tax", dueDate: "2026-08-12", completed: true },
      { id: "t2", title: "Sign Employment NDA & Code of Conduct Contract", category: "Compliance & NDA", dueDate: "2026-08-13", completed: true },
      { id: "t3", title: "IT Asset Provisioning: MacBook Pro & Security Key", category: "IT Provisioning", dueDate: "2026-08-14", completed: true },
      { id: "t4", title: "Engineering Architecture & Team Welcome Sync", category: "Orientation", dueDate: "2026-08-16", completed: false },
    ],
  },
  {
    id: "onb-2",
    employeeName: "Marcus Vance",
    role: "AI Product Designer",
    startDate: "2026-08-20",
    progressPct: 25,
    tasks: [
      { id: "t5", title: "Submit Identity & Tax Documentation", category: "Identity & Tax", dueDate: "2026-08-18", completed: true },
      { id: "t6", title: "Sign Employment NDA Contract", category: "Compliance & NDA", dueDate: "2026-08-19", completed: false },
      { id: "t7", title: "IT Asset Provisioning: Workstation Setup", category: "IT Provisioning", dueDate: "2026-08-20", completed: false },
      { id: "t8", title: "Product Design Orientation Call", category: "Orientation", dueDate: "2026-08-21", completed: false },
    ],
  },
]

export default function OnboardingView() {
  const [hires, setHires] = useState<NewHireOnboarding[]>(INITIAL_ONBOARDING_DATA)
  const [selectedHireId, setSelectedHireId] = useState<string>("onb-1")

  const selectedHire = hires.find((h) => h.id === selectedHireId) || hires[0]

  const toggleTask = (hireId: string, taskId: string) => {
    setHires((prev) =>
      prev.map((hire) => {
        if (hire.id !== hireId) return hire
        const updatedTasks = hire.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
        const completedCount = updatedTasks.filter((t) => t.completed).length
        const newPct = Math.round((completedCount / updatedTasks.length) * 100)
        return { ...hire, tasks: updatedTasks, progressPct: newPct }
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Onboarding</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              New Hire <span className="text-gradient">Onboarding & Task Checklists</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Automated document collection, IT asset provisioning, and orientation workflows
            </p>
          </div>
        </div>

        <button className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer">
          <Plus className="w-4 h-4 text-white" />
          <span>+ Add New Hire Checklist</span>
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: New Hires List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold font-mono text-white/60 uppercase tracking-wider">ACTIVE NEW HIRES</h2>
          {hires.map((hire) => {
            const isSelected = hire.id === selectedHireId
            return (
              <div
                key={hire.id}
                onClick={() => setSelectedHireId(hire.id)}
                className={`card-glass p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected ? "border-signal bg-white/10 shadow-lg shadow-signal/10" : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white font-display text-sm">{hire.employeeName}</h3>
                    <p className="text-xs text-white/50 font-mono">{hire.role}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-signal">{hire.progressPct}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/40 h-2 rounded-full mt-3 overflow-hidden p-0.5 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#C800FF] to-[#7C3AED] rounded-full transition-all duration-300"
                    style={{ width: `${hire.progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40 mt-1.5">
                  <span>Start: {hire.startDate}</span>
                  <span>{hire.tasks.filter((t) => t.completed).length} / {hire.tasks.length} Completed</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right 2 Columns: Onboarding Task Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-glass p-6 rounded-2xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-4 gap-2">
              <div>
                <div className="eyebrow text-[10px] font-mono text-signal uppercase">ACTIVE CHECKLIST</div>
                <h2 className="text-xl font-bold font-display text-white">{selectedHire.employeeName}</h2>
                <p className="text-xs text-white/60 font-mono">{selectedHire.role} • Start Date: {selectedHire.startDate}</p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-signal/15 border border-signal/30 text-signal font-mono font-bold text-xs">
                {selectedHire.progressPct}% OVERALL PROGRESS
              </div>
            </div>

            {/* Checklist Task Rows */}
            <div className="space-y-3 font-mono">
              {selectedHire.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(selectedHire.id, task.id)}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    task.completed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-black/40 border-white/10 text-white hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {task.completed ? <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" /> : <Square className="w-5 h-5 text-white/40 shrink-0" />}
                    <div>
                      <span className={`text-xs font-bold block ${task.completed ? "line-through text-white/60" : "text-white"}`}>
                        {task.title}
                      </span>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider">{task.category} • Due: {task.dueDate}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${task.completed ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"}`}>
                    {task.completed ? "DONE" : "PENDING"}
                  </span>
                </div>
              ))}
            </div>

            {/* IT & Compliance Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-signal text-xs font-bold uppercase">
                  <Laptop className="w-4 h-4" /> IT Provisioning Status
                </div>
                <p className="text-[11px] text-white/60">MacBook Pro M3 Max (Serial #MX-8891) assigned & key issued.</p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                  <Shield className="w-4 h-4" /> Compliance & E-Sign
                </div>
                <p className="text-[11px] text-white/60">Employment NDA Contract executed with cryptographic signature.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
