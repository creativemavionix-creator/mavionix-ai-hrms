"use client"

import { useState, useEffect } from "react"
import { Clock, Play, Square, CheckCircle2, MapPin, ShieldCheck, AlertCircle, Calendar, Download, Edit3, X, Save, Sliders, Cpu, CheckSquare, XCircle, ArrowUpRight } from "lucide-react"

interface AttendanceRecord {
  id: string
  employeeName: string
  empCode: string
  date: string
  shift: "General (09:00 - 18:00)" | "Morning (07:00 - 16:00)" | "Night (20:00 - 05:00)"
  clockIn: string
  clockOut: string
  totalHours: string
  overtimeHours: string
  status: "Present" | "Late" | "Half Day" | "On Leave" | "Absent"
  ipVerification: string
  biometricHardwareId?: string
  editedByManager?: boolean
  managerNotes?: string
}

interface RegularizationRequest {
  id: string
  employeeName: string
  empCode: string
  date: string
  requestType: "Missing Clock-Out" | "On-Site Client Visit" | "System Technical Issue"
  proposedClockIn: string
  proposedClockOut: string
  reason: string
  status: "Pending" | "Approved" | "Rejected"
}

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: "att-1", employeeName: "Alexander Frey", empCode: "EMP-101", date: "2026-08-10", shift: "General (09:00 - 18:00)", clockIn: "08:55 AM", clockOut: "06:02 PM", totalHours: "9h 07m", overtimeHours: "1h 07m", status: "Present", ipVerification: "Verified (192.168.1.45)", biometricHardwareId: "ZKTeco-FAC-01" },
  { id: "att-2", employeeName: "Sarah Jenkins", empCode: "EMP-102", date: "2026-08-10", shift: "General (09:00 - 18:00)", clockIn: "09:18 AM", clockOut: "06:00 PM", totalHours: "8h 42m", overtimeHours: "0h 00m", status: "Late", ipVerification: "Verified (192.168.1.88)", biometricHardwareId: "ZKTeco-FAC-02" },
  { id: "att-3", employeeName: "David Chen", empCode: "EMP-103", date: "2026-08-10", shift: "General (09:00 - 18:00)", clockIn: "--:-- --", clockOut: "--:-- --", totalHours: "0h 00m", overtimeHours: "0h 00m", status: "On Leave", ipVerification: "Approved Leave", biometricHardwareId: "N/A" },
  { id: "att-4", employeeName: "Priya Sharma", empCode: "EMP-104", date: "2026-08-10", shift: "General (09:00 - 18:00)", clockIn: "08:50 AM", clockOut: "06:15 PM", totalHours: "9h 25m", overtimeHours: "1h 25m", status: "Present", ipVerification: "Verified (192.168.1.12)", biometricHardwareId: "ZKTeco-FAC-01" },
]

const INITIAL_REGULARIZATIONS: RegularizationRequest[] = [
  {
    id: "reg-101",
    employeeName: "Sarah Jenkins",
    empCode: "EMP-102",
    date: "2026-08-08",
    requestType: "On-Site Client Visit",
    proposedClockIn: "09:00 AM",
    proposedClockOut: "06:00 PM",
    reason: "Attended client briefing at downtown office, forgot mobile clock-in",
    status: "Pending",
  },
]

export default function AttendanceView() {
  const [activeTab, setActiveTab] = useState<"logs" | "calendar" | "regularization" | "shifts">("logs")
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE)
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>(INITIAL_REGULARIZATIONS)

  // Interactive Clock-In state
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Manager Modals
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const [isRegModalOpen, setIsRegModalOpen] = useState(false)

  // Regularization Form
  const [newReg, setNewReg] = useState({
    employeeName: "Priya Sharma",
    empCode: "EMP-104",
    date: "",
    requestType: "On-Site Client Visit" as RegularizationRequest["requestType"],
    proposedClockIn: "09:00 AM",
    proposedClockOut: "06:00 PM",
    reason: "",
  })

  useEffect(() => {
    let timer: any
    if (isClockedIn) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isClockedIn])

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, "0")
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0")
    const secs = (totalSec % 60).toString().padStart(2, "0")
    return `${hrs}:${mins}:${secs}`
  }

  const handleToggleClock = () => {
    if (!isClockedIn) {
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setIsClockedIn(true)
      setClockInTime(now)
      setElapsedSeconds(0)
    } else {
      setIsClockedIn(false)
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const hrsCount = Math.floor(elapsedSeconds / 3600)
      const minsCount = Math.floor((elapsedSeconds % 3600) / 60)
      
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeName: "Current Workstation User",
        empCode: "EMP-100",
        date: new Date().toISOString().split("T")[0],
        shift: "General (09:00 - 18:00)",
        clockIn: clockInTime || "09:00 AM",
        clockOut: now,
        totalHours: `${hrsCount}h ${minsCount}m`,
        overtimeHours: hrsCount > 8 ? `${hrsCount - 8}h ${minsCount}m` : "0h 00m",
        status: hrsCount < 4 ? "Half Day" : "Present",
        ipVerification: "Verified (Workstation IP)",
        biometricHardwareId: "WEB-FAC-01",
      }
      setRecords([newRecord, ...records])
    }
  }

  const handleSaveManagerEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord) return

    setRecords((prev) =>
      prev.map((rec) =>
        rec.id === editingRecord.id
          ? {
              ...editingRecord,
              editedByManager: true,
              ipVerification: `Manager Override (${editingRecord.managerNotes || "Timecard adjustment"})`,
            }
          : rec
      )
    )
    setEditingRecord(null)
  }

  const handleApplyRegularization = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReg.date || !newReg.reason) return

    const created: RegularizationRequest = {
      id: `reg-${Date.now()}`,
      employeeName: newReg.employeeName,
      empCode: newReg.empCode,
      date: newReg.date,
      requestType: newReg.requestType,
      proposedClockIn: newReg.proposedClockIn,
      proposedClockOut: newReg.proposedClockOut,
      reason: newReg.reason,
      status: "Pending",
    }

    setRegularizations([created, ...regularizations])
    setIsRegModalOpen(false)
    setNewReg({ employeeName: "Priya Sharma", empCode: "EMP-104", date: "", requestType: "On-Site Client Visit", proposedClockIn: "09:00 AM", proposedClockOut: "06:00 PM", reason: "" })
  }

  const updateRegStatus = (id: string, status: "Approved" | "Rejected") => {
    setRegularizations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">Enterprise Attendance & Timecard Engine</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Attendance, Shift & <span className="text-gradient">Regularization Suite</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Shift scheduling, Overtime/Half-day rules, Biometric hardware sync, and Manager Timecard Regularization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRegModalOpen(true)}
            className="btn-primary py-2.5 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-white" />
            <span>+ Request Regularization</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="card-glass p-2 rounded-xl border border-white/10 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 rounded-lg font-bold uppercase transition-all ${
            activeTab === "logs" ? "bg-signal text-white shadow-lg shadow-signal/20" : "text-white/60 hover:bg-white/5"
          }`}
        >
          Daily Timecard Logs
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 rounded-lg font-bold uppercase transition-all ${
            activeTab === "calendar" ? "bg-signal text-white shadow-lg shadow-signal/20" : "text-white/60 hover:bg-white/5"
          }`}
        >
          Monthly 31-Day Grid
        </button>
        <button
          onClick={() => setActiveTab("regularization")}
          className={`px-4 py-2 rounded-lg font-bold uppercase transition-all flex items-center gap-2 ${
            activeTab === "regularization" ? "bg-signal text-white shadow-lg shadow-signal/20" : "text-white/60 hover:bg-white/5"
          }`}
        >
          Regularization Requests
          {regularizations.filter((r) => r.status === "Pending").length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-black font-bold text-[9px] flex items-center justify-center">
              {regularizations.filter((r) => r.status === "Pending").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          className={`px-4 py-2 rounded-lg font-bold uppercase transition-all ${
            activeTab === "shifts" ? "bg-signal text-white shadow-lg shadow-signal/20" : "text-white/60 hover:bg-white/5"
          }`}
        >
          Shift Rules & Grace Period
        </button>
      </div>

      {/* TAB 1: DAILY TIMECARD LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-6">
          {/* Interactive Clock-In Widget & Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Clock In / Out Widget */}
            <div className="card-glass p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-[10px] text-white/60 uppercase">INTERACTIVE SHIFT TIMER</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <MapPin className="w-3 h-3" /> GEO & IP VERIFIED
                  </span>
                </div>
                <div className="text-3xl font-display font-extrabold text-white mt-2">
                  {isClockedIn ? formatTimer(elapsedSeconds) : "00:00:00"}
                </div>
                <p className="text-xs text-white/50 mt-1">
                  {isClockedIn ? `Clocked in at ${clockInTime} • Shift: General (09:00 - 18:00)` : "Click below to clock in for your shift"}
                </p>
              </div>

              <button
                onClick={handleToggleClock}
                className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  isClockedIn
                    ? "bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                    : "btn-primary text-white shadow-lg shadow-signal/20"
                }`}
              >
                {isClockedIn ? (
                  <>
                    <Square className="w-4 h-4 text-red-300 fill-current" /> CLOCK OUT SHIFT
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-white fill-current" /> CLOCK IN SHIFT
                  </>
                )}
              </button>
            </div>

            {/* Attendance Summary Metrics */}
            <div className="md:col-span-2 card-glass p-6 rounded-2xl border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
              <div className="space-y-1">
                <span className="eyebrow text-[10px] text-white/50 uppercase">PRESENT TODAY</span>
                <div className="text-2xl font-display font-extrabold text-emerald-400">3 Staff</div>
                <span className="text-[10px] text-emerald-400/80 block">✓ On Shift</span>
              </div>

              <div className="space-y-1">
                <span className="eyebrow text-[10px] text-white/50 uppercase">LATE ARRIVALS</span>
                <div className="text-2xl font-display font-extrabold text-amber-400">1 Staff</div>
                <span className="text-[10px] text-amber-400/80 block">Grace Period 15m Exceeded</span>
              </div>

              <div className="space-y-1">
                <span className="eyebrow text-[10px] text-white/50 uppercase">OVERTIME EARNED</span>
                <div className="text-2xl font-display font-extrabold text-signal">2h 32m</div>
                <span className="text-[10px] text-white/50 block">1.5x Hourly Rate</span>
              </div>

              <div className="space-y-1">
                <span className="eyebrow text-[10px] text-white/50 uppercase">BIOMETRIC SYNC</span>
                <div className="text-2xl font-display font-extrabold text-emerald-400">ONLINE</div>
                <span className="text-[10px] text-emerald-400/80 block">ZKTeco Hardware Connected</span>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="card-glass rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">DAILY ATTENDANCE LOG — AUGUST 10, 2026</h2>
              <span className="text-[10px] text-white/40">Real-time sync</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 text-white/60 uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Total Hrs</th>
                    <th className="py-3 px-4">OT Hrs</th>
                    <th className="py-3 px-4">Biometric / IP</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Manager Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white font-display">
                        {rec.employeeName}
                        {rec.editedByManager && (
                          <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-signal/20 text-signal border border-signal/30 font-mono">
                            OVERRIDDEN BY MANAGER
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-signal font-bold">{rec.empCode}</td>
                      <td className="py-3.5 px-4 text-white/60 text-[11px]">{rec.shift}</td>
                      <td className="py-3.5 px-4 text-white/80">{rec.clockIn}</td>
                      <td className="py-3.5 px-4 text-white/80">{rec.clockOut}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{rec.totalHours}</td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">{rec.overtimeHours}</td>
                      <td className="py-3.5 px-4 text-white/50 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-signal shrink-0" />
                          <span>{rec.biometricHardwareId || "App"}</span>
                        </div>
                        <div className="text-[10px] text-white/40">{rec.ipVerification}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rec.status === "Present"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : rec.status === "Late"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : rec.status === "On Leave"
                              ? "bg-signal/20 text-signal border border-signal/30"
                              : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setEditingRecord(rec)}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 ml-auto"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-signal" /> Edit Timecard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY 31-DAY CALENDAR GRID */}
      {activeTab === "calendar" && (
        <div className="card-glass p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-white uppercase font-display">MONTHLY ATTENDANCE GRID — AUGUST 2026</h2>
              <p className="text-xs text-white/50">Visual 31-day status matrix across all staff</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">P = Present</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">L = Late</span>
              <span className="px-2 py-0.5 rounded bg-signal/20 text-signal">WO = Weekend</span>
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300">A = Absent</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-[10px]">
              <thead className="bg-black/40 text-white/60 border-b border-white/10">
                <tr>
                  <th className="py-2 px-3 text-left">Employee</th>
                  {Array.from({ length: 15 }, (_, i) => (
                    <th key={i + 1} className="py-2 px-1 border-l border-white/5">
                      Aug {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/5">
                    <td className="py-3 px-3 text-left font-bold text-white font-display whitespace-nowrap">
                      {rec.employeeName}
                    </td>
                    {Array.from({ length: 15 }, (_, i) => {
                      const dayNum = i + 1
                      const isWeekend = dayNum % 7 === 1 || dayNum % 7 === 2
                      const isLate = dayNum === 8
                      return (
                        <td key={dayNum} className="py-3 px-1 border-l border-white/5 font-bold">
                          {isWeekend ? (
                            <span className="text-white/30">WO</span>
                          ) : isLate ? (
                            <span className="text-amber-400">L</span>
                          ) : (
                            <span className="text-emerald-400">P</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REGULARIZATION REQUESTS */}
      {activeTab === "regularization" && (
        <div className="card-glass rounded-xl border border-white/10 overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-white uppercase font-display">TIMECARD REGULARIZATION REQUESTS</h2>
              <p className="text-xs text-white/50">Employee requests for missing clock-ins or client site visits</p>
            </div>
            <button
              onClick={() => setIsRegModalOpen(true)}
              className="btn-primary py-2 px-3 rounded-lg text-xs uppercase font-bold text-white"
            >
              + Submit New Request
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-black/40 text-white/60 uppercase text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Request Type</th>
                <th className="py-3 px-4">Proposed Times</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Manager Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {regularizations.map((reg) => (
                <tr key={reg.id} className="hover:bg-white/5">
                  <td className="py-3.5 px-4 font-bold text-white font-display">
                    {reg.employeeName} <span className="text-[10px] text-signal">({reg.empCode})</span>
                  </td>
                  <td className="py-3.5 px-4 text-white/70">{reg.date}</td>
                  <td className="py-3.5 px-4 font-bold text-white/90">{reg.requestType}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">
                    {reg.proposedClockIn} → {reg.proposedClockOut}
                  </td>
                  <td className="py-3.5 px-4 text-white/60 text-[11px] max-w-xs">{reg.reason}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        reg.status === "Approved"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : reg.status === "Pending"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {reg.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    {reg.status === "Pending" && (
                      <>
                        <button
                          onClick={() => updateRegStatus(reg.id, "Approved")}
                          className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded text-[11px] font-bold"
                        >
                          Approve Regularization
                        </button>
                        <button
                          onClick={() => updateRegStatus(reg.id, "Rejected")}
                          className="px-2.5 py-1 bg-red-500/20 text-red-300 rounded text-[11px] font-bold"
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
      )}

      {/* TAB 4: SHIFT RULES & GRACE PERIOD */}
      {activeTab === "shifts" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-glass p-5 rounded-2xl border border-white/10 space-y-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold">General Shift</span>
            <h3 className="text-base font-bold text-white font-display">09:00 AM — 06:00 PM</h3>
            <p className="text-xs text-white/60">Grace Period: 15 Minutes (Late flag at 09:16 AM). Half-day trigger: &lt;4.5 Hours.</p>
          </div>

          <div className="card-glass p-5 rounded-2xl border border-white/10 space-y-2">
            <span className="px-2 py-0.5 rounded bg-signal/20 text-signal text-[10px] uppercase font-bold">Morning Shift</span>
            <h3 className="text-base font-bold text-white font-display">07:00 AM — 04:00 PM</h3>
            <p className="text-xs text-white/60">Grace Period: 15 Minutes (Late flag at 07:16 AM). Overtime rate: 1.5x after 8h.</p>
          </div>

          <div className="card-glass p-5 rounded-2xl border border-white/10 space-y-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold">Night Shift</span>
            <h3 className="text-base font-bold text-white font-display">08:00 PM — 05:00 AM</h3>
            <p className="text-xs text-white/60">Night Allowance: +20% Base Differential. Biometric hardware sync enabled.</p>
          </div>
        </div>
      )}

      {/* Manager Edit Timecard Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 rounded-2xl border border-white/20 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-signal" /> Manager Timecard Override
                </h3>
                <p className="text-xs text-white/50">{editingRecord.employeeName} ({editingRecord.empCode})</p>
              </div>
              <button onClick={() => setEditingRecord(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManagerEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Clock In Time</label>
                  <input
                    type="text"
                    value={editingRecord.clockIn}
                    onChange={(e) => setEditingRecord({ ...editingRecord, clockIn: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Clock Out Time</label>
                  <input
                    type="text"
                    value={editingRecord.clockOut}
                    onChange={(e) => setEditingRecord({ ...editingRecord, clockOut: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Total Hours</label>
                  <input
                    type="text"
                    value={editingRecord.totalHours}
                    onChange={(e) => setEditingRecord({ ...editingRecord, totalHours: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Attendance Status</label>
                  <select
                    value={editingRecord.status}
                    onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value as any })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Manager Adjustment Note / Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Corrected clock-in time due to client meeting"
                  value={editingRecord.managerNotes || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, managerNotes: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-white rounded-xl text-xs uppercase font-bold flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save Timecard Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Regularization Modal */}
      {isRegModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card-glass p-6 rounded-2xl border border-white/20 max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-signal" /> Request Regularization
                </h3>
                <p className="text-xs text-white/50">Submit correction for missing clock-ins or client visits</p>
              </div>
              <button onClick={() => setIsRegModalOpen(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyRegularization} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newReg.date}
                    onChange={(e) => setNewReg({ ...newReg, date: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Request Type</label>
                  <select
                    value={newReg.requestType}
                    onChange={(e) => setNewReg({ ...newReg, requestType: e.target.value as any })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  >
                    <option value="Missing Clock-Out">Missing Clock-Out</option>
                    <option value="On-Site Client Visit">On-Site Client Visit</option>
                    <option value="System Technical Issue">System Technical Issue</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Proposed Clock-In</label>
                  <input
                    type="text"
                    value={newReg.proposedClockIn}
                    onChange={(e) => setNewReg({ ...newReg, proposedClockIn: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/60 uppercase block mb-1">Proposed Clock-Out</label>
                  <input
                    type="text"
                    value={newReg.proposedClockOut}
                    onChange={(e) => setNewReg({ ...newReg, proposedClockOut: e.target.value })}
                    className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/60 uppercase block mb-1">Reason / Justification</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why regularization is requested..."
                  value={newReg.reason}
                  onChange={(e) => setNewReg({ ...newReg, reason: e.target.value })}
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2 text-white rounded-xl text-xs uppercase font-bold">
                  Submit For Manager Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
