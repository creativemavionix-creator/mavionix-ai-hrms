"use client"

import { useState, useEffect } from "react"
import { Clock, Play, Square, CheckCircle2, MapPin, ShieldCheck, AlertCircle, Calendar, Download } from "lucide-react"

interface AttendanceRecord {
  id: string
  employeeName: string
  empCode: string
  date: string
  clockIn: string
  clockOut: string
  totalHours: string
  status: "Present" | "Late" | "On Leave" | "Absent"
  ipVerification: string
}

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: "att-1", employeeName: "Alexander Frey", empCode: "EMP-101", date: "2026-08-10", clockIn: "08:55 AM", clockOut: "06:02 PM", totalHours: "9h 07m", status: "Present", ipVerification: "Verified (192.168.1.45)" },
  { id: "att-2", employeeName: "Sarah Jenkins", empCode: "EMP-102", date: "2026-08-10", clockIn: "09:08 AM", clockOut: "06:00 PM", totalHours: "8h 52m", status: "Late", ipVerification: "Verified (192.168.1.88)" },
  { id: "att-3", employeeName: "David Chen", empCode: "EMP-103", date: "2026-08-10", clockIn: "--:-- --", clockOut: "--:-- --", totalHours: "0h 00m", status: "On Leave", ipVerification: "Approved Leave" },
  { id: "att-4", employeeName: "Priya Sharma", empCode: "EMP-104", date: "2026-08-10", clockIn: "08:50 AM", clockOut: "06:15 PM", totalHours: "9h 25m", status: "Present", ipVerification: "Verified (192.168.1.12)" },
]

export default function AttendanceView() {
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

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
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeName: "Current Workstation User",
        empCode: "EMP-100",
        date: new Date().toISOString().split("T")[0],
        clockIn: clockInTime || "09:00 AM",
        clockOut: now,
        totalHours: `${Math.floor(elapsedSeconds / 3600)}h ${Math.floor((elapsedSeconds % 3600) / 60)}m`,
        status: "Present",
        ipVerification: "Verified (Workstation IP)",
      }
      setRecords([newRecord, ...records])
    }
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
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Timecard Engine</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Attendance & <span className="text-gradient">Time Log Tracking</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Daily clock-in/out logging, IP geo-verification, and monthly attendance summaries
            </p>
          </div>
        </div>

        <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-white/15">
          <Download className="w-4 h-4" /> Export Timecards (CSV)
        </button>
      </div>

      {/* Interactive Clock-In Widget & Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clock In / Out Widget */}
        <div className="card-glass p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[10px] text-white/60 uppercase">INTERACTIVE TIMECARD</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <MapPin className="w-3 h-3" /> GEO-VERIFIED IP
              </span>
            </div>
            <div className="text-3xl font-display font-extrabold text-white mt-2">
              {isClockedIn ? formatTimer(elapsedSeconds) : "00:00:00"}
            </div>
            <p className="text-xs text-white/50 mt-1">
              {isClockedIn ? `Clocked in at ${clockInTime}` : "Click below to clock in for your shift"}
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
                <Square className="w-4 h-4 text-red-300 fill-current" /> CLOCK OUT NOW
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-white fill-current" /> CLOCK IN SHIFT
              </>
            )}
          </button>
        </div>

        {/* Attendance Summary Metrics */}
        <div className="md:col-span-2 card-glass p-6 rounded-2xl border border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
          <div className="space-y-1">
            <span className="eyebrow text-[10px] text-white/50 uppercase">PRESENT TODAY</span>
            <div className="text-2xl font-display font-extrabold text-emerald-400">3 Staff</div>
            <span className="text-[10px] text-emerald-400/80 block">✓ On Shift</span>
          </div>

          <div className="space-y-1">
            <span className="eyebrow text-[10px] text-white/50 uppercase">LATE ARRIVALS</span>
            <div className="text-2xl font-display font-extrabold text-amber-400">1 Staff</div>
            <span className="text-[10px] text-amber-400/80 block">Clocked in &gt;09:00 AM</span>
          </div>

          <div className="space-y-1">
            <span className="eyebrow text-[10px] text-white/50 uppercase">ON APPROVED LEAVE</span>
            <div className="text-2xl font-display font-extrabold text-signal">1 Staff</div>
            <span className="text-[10px] text-white/50 block">Leave Approved</span>
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
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Total Hours</th>
                <th className="py-3 px-4">Geo/IP Status</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white font-display">{rec.employeeName}</td>
                  <td className="py-3.5 px-4 text-signal font-bold">{rec.empCode}</td>
                  <td className="py-3.5 px-4 text-white/80">{rec.clockIn}</td>
                  <td className="py-3.5 px-4 text-white/80">{rec.clockOut}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{rec.totalHours}</td>
                  <td className="py-3.5 px-4 text-white/50 text-[11px] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {rec.ipVerification}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rec.status === "Present"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : rec.status === "Late"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-signal/20 text-signal border border-signal/30"
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
