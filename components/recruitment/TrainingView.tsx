"use client"

import { useState } from "react"
import { GraduationCap, Award, BookOpen, CheckCircle2, Play, Plus, Sparkles } from "lucide-react"

interface Course {
  id: string
  title: string
  category: "AI & Engineering" | "Security & Compliance" | "Leadership & Mgmt"
  enrolledStaffCount: number
  duration: string
  completionPct: number
}

const COURSES: Course[] = [
  {
    id: "crs-1",
    title: "Generative AI Systems & Multi-Agent Architecture",
    category: "AI & Engineering",
    enrolledStaffCount: 8,
    duration: "12 Hours",
    completionPct: 85,
  },
  {
    id: "crs-2",
    title: "MediaPipe Vision Proctoring & Hardware Integrity",
    category: "Security & Compliance",
    enrolledStaffCount: 5,
    duration: "6 Hours",
    completionPct: 100,
  },
  {
    id: "crs-3",
    title: "Executive People Leadership & Performance Coaching",
    category: "Leadership & Mgmt",
    enrolledStaffCount: 4,
    duration: "8 Hours",
    completionPct: 40,
  },
]

export default function TrainingView() {
  const [courseList, setCourseList] = useState<Course[]>(COURSES)

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Learning Matrix</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Training Catalog <span className="text-gradient">& Skill Matrix</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Employee skill gap analytics, interactive course enrollment, and verifiable digital badges
            </p>
          </div>
        </div>

        <button className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer">
          <Plus className="w-4 h-4 text-white" />
          <span>+ Assign New Course</span>
        </button>
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courseList.map((course) => (
          <div key={course.id} className="card-glass p-6 rounded-2xl border border-white/10 space-y-4 flex flex-col justify-between hover:border-white/20 transition-all">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded bg-signal/20 text-signal border border-signal/30 text-[10px] uppercase font-bold">
                {course.category}
              </span>
              <h3 className="text-base font-bold font-display text-white leading-snug">{course.title}</h3>
              <p className="text-xs text-white/50">Duration: {course.duration} • Enrolled: {course.enrolledStaffCount} Staff</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Completion Progress</span>
                <span className="font-bold text-emerald-400">{course.completionPct}%</span>
              </div>

              <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#C800FF] to-[#7C3AED] rounded-full transition-all duration-300"
                  style={{ width: `${course.completionPct}%` }}
                />
              </div>

              <button
                onClick={() => alert(`Launching course ${course.title}...`)}
                className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors mt-3"
              >
                <Play className="w-3.5 h-3.5 fill-current text-signal" /> Launch Training Module
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
