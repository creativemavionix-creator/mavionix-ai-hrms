"use client"

import { useState } from "react"
import { Calendar, Plus, CheckCircle2, XCircle, Clock, FileText, User, Filter, AlertCircle, X } from "lucide-react"

interface LeaveRequest {
  id: string
  employeeName: string
  empCode: string
  leaveType: "Annual" | "Sick" | "Casual" | "Maternity/Paternity"
  startDate: string
  endDate: string
  daysCount: number
  reason: string
  status: "Pending" | "Approved" | "Rejected"
  appliedOn: string
}

const INITIAL_LEAVES: LeaveRequest[] = [
  {
    id: "lv-101",
    employeeName: "David Chen",
    empCode: "EMP-103",
    leaveType: "Annual",
    startDate: "2026-08-10",
    endDate: "2026-08-14",
    daysCount: 5,
    reason: "Personal family vacation & rest",
    status: "Approved",
    appliedOn: "2026-08-01",
  },
  {
    id: "lv-102",
    employeeName: "Sarah Jenkins",
    empCode: "EMP-102",
    leaveType: "Sick",
    startDate: "2026-08-18",
    endDate: "2026-08-19",
    daysCount: 2,
    reason: "Medical appointment & recovery",
    status: "Pending",
    appliedOn: "2026-08-09",
  },
  {
    id: "lv-103",
    employeeName: "Alexander Frey",
    empCode: "EMP-101",
    leaveType: "Casual",
    startDate: "2026-08-25",
    endDate: "2026-08-25",
    daysCount: 1,
    reason: "Personal administrative work",
    status: "Pending",
    appliedOn: "2026-08-10",
  },
]

export default function LeaveManagementView() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>(INITIAL_LEAVES)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState("All")

  // Form State
  const [newLeave, setNewLeave] = useState({
    employeeName: "Priya Sharma",
    empCode: "EMP-104",
    leaveType: "Annual" as LeaveRequest["leaveType"],
    startDate: "",
    endDate: "",
    reason: "",
  })

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLeave.startDate || !newLeave.endDate) return

    const created: LeaveRequest = {
      id: `lv-${Date.now()}`,
      employeeName: newLeave.employeeName,
      empCode: newLeave.empCode,
      leaveType: newLeave.leaveType,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      daysCount: 3,
      reason: newLeave.reason || "General leave request",
      status: "Pending",
      appliedOn: new Date().toISOString().split("T")[0],
    }

    setLeaves([created, ...leaves])
    setIsApplyModalOpen(false)
    setNewLeave({ employeeName: "Priya Sharma", empCode: "EMP-104", leaveType: "Annual", startDate: "", endDate: "", reason: "" })
  }

  const updateLeaveStatus = (id: string, status: "Approved" | "Rejected") => {
    setLeaves((prev) => prev.map((lv) => (lv.id === id ? { ...lv, status } : lv)))
  }

  const filteredLeaves = leaves.filter((lv) => filterStatus === "All" || lv.status === filterStatus)

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Workflow</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Leave Management <span className="text-gradient">& Approvals</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Multi-tier leave applications, accrual tracking, and manager approval workflows
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ Apply For Leave</span>
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-glass p-4 rounded-xl border border-white/10 space-y-1">
          <span className="eyebrow text-[10px] text-white/50 uppercase">ANNUAL LEAVE ACCRUAL</span>
          <div className="text-2xl font-bold font-display text-white">18 / 24 Days</div>
          <span className="text-[10px] text-emerald-400 block">6 Days Used</span>
        </div>

        <div className="card-glass p-4 rounded-xl border border-white/10 space-y-1">
          <span className="eyebrow text-[10px] text-white/50 uppercase">SICK LEAVE BALANCE</span>
          <div className="text-2xl font-bold font-display text-emerald-400">10 / 12 Days</div>
          <span className="text-[10px] text-white/50 block">2 Days Used</span>
        </div>

        <div className="card-glass p-4 rounded-xl border border-white/10 space-y-1">
          <span className="eyebrow text-[10px] text-white/50 uppercase">CASUAL LEAVE BALANCE</span>
          <div className="text-2xl font-bold font-display text-signal">6 / 7 Days</div>
          <span className="text-[10px] text-white/50 block">1 Day Used</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card-glass p-3 rounded-xl border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/60 uppercase">Filter Status:</span>
        </div>
        <div className="flex gap-1 text-xs">
          {["All", "Pending", "Approved", "Rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterStatus === st ? "bg-signal text-white font-bold" : "text-white/60 hover:bg-white/5"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="card-glass rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-white/60 uppercase tracking-wider text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Days</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {filteredLeaves.map((lv) => (
                <tr key={lv.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white font-display">{lv.employeeName}</div>
                    <div className="text-[10px] text-signal">{lv.empCode}</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white/90">{lv.leaveType}</td>
                  <td className="py-3.5 px-4 text-white/70">{lv.startDate} → {lv.endDate}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{lv.daysCount} Days</td>
                  <td className="py-3.5 px-4 text-white/60 text-[11px] max-w-xs truncate">{lv.reason}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        lv.status === "Approved"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : lv.status === "Pending"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {lv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    {lv.status === "Pending" && (
                      <>
                        <button
                          onClick={() => updateLeaveStatus(lv.id, "Approved")}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[11px] font-bold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateLeaveStatus(lv.id, "Rejected")}
                          className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-[11px] font-bold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 rounded-2xl border border-white/20 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-5 h-5 text-signal" /> Apply For Leave
              </h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Leave Type</label>
                <select
                  value={newLeave.leaveType}
                  onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value as any })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                >
                  <option value="Annual">Annual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Maternity/Paternity">Maternity/Paternity</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason for absence..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-white rounded-xl text-xs uppercase font-bold">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
