"use client"

import { useState } from "react"
import { Award, Star, TrendingUp, Sparkles, User, FileText, CheckCircle2 } from "lucide-react"

interface PerformanceReview {
  id: string
  employeeName: string
  empCode: string
  role: string
  period: string
  technicalScore: number
  deliveryScore: number
  collaborationScore: number
  overallRating: number
  aiSummary: string
  status: "Completed" | "Pending Review"
}

const REVIEWS: PerformanceReview[] = [
  {
    id: "rev-101",
    employeeName: "Alexander Frey",
    empCode: "EMP-101",
    role: "Lead AI Architect",
    period: "Q2 2026 Appraisal",
    technicalScore: 5.0,
    deliveryScore: 4.8,
    collaborationScore: 4.9,
    overallRating: 4.9,
    aiSummary: "Alexander demonstrates exceptional mastery in multi-agent generative architectures. Led candidate proctoring and MediaPipe integration with zero SLA latency breaches.",
    status: "Completed",
  },
  {
    id: "rev-102",
    employeeName: "Priya Sharma",
    empCode: "EMP-104",
    role: "Sr Backend Engineer",
    period: "Q2 2026 Appraisal",
    technicalScore: 4.8,
    deliveryScore: 4.7,
    collaborationScore: 4.6,
    overallRating: 4.7,
    aiSummary: "Priya consistently delivers robust FastAPI microservice code. Excellent problem-solving skills shown in anti-cheat code similarity analysis.",
    status: "Completed",
  },
  {
    id: "rev-103",
    employeeName: "David Chen",
    empCode: "EMP-103",
    role: "Sr UI/UX Designer",
    period: "Q2 2026 Appraisal",
    technicalScore: 4.5,
    deliveryScore: 4.2,
    collaborationScore: 4.8,
    overallRating: 4.5,
    aiSummary: "David has elevated the workstation UI aesthetic with dark glassmorphism standards. Strong cross-functional teamwork with product engineering.",
    status: "Pending Review",
  },
]

export default function PerformanceView() {
  const [reviewList, setReviewList] = useState<PerformanceReview[]>(REVIEWS)
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(REVIEWS[0])

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="card-glass p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C800FF] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-signal/20">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="eyebrow text-xs font-mono uppercase tracking-widest text-[#C800FF]">MaVionix AI-HRMS Performance Suite</div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight">
              Performance & <span className="text-gradient">Appraisal Intelligence</span>
            </h1>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              KPI scorecards, 360-degree reviews, and automated AI feedback summaries
            </p>
          </div>
        </div>

        <button className="btn-primary py-2.5 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2 shadow-lg shadow-signal/20 cursor-pointer">
          <Sparkles className="w-4 h-4 text-white" />
          <span>+ Initiate Appraisal Cycle</span>
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Review Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">APPRAISAL RECORDS</h2>
          {reviewList.map((rev) => {
            const isSelected = selectedReview?.id === rev.id
            return (
              <div
                key={rev.id}
                onClick={() => setSelectedReview(rev)}
                className={`card-glass p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected ? "border-signal bg-white/10 shadow-lg shadow-signal/10" : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white font-display text-sm">{rev.employeeName}</h3>
                    <p className="text-xs text-white/50">{rev.role}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-current" /> {rev.overallRating}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/40 mt-3 pt-2 border-t border-white/5">
                  <span>{rev.period}</span>
                  <span className={`uppercase font-bold ${rev.status === "Completed" ? "text-emerald-400" : "text-amber-400"}`}>
                    {rev.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right 2 Columns: Detailed Scorecard */}
        {selectedReview && (
          <div className="lg:col-span-2 space-y-4">
            <div className="card-glass p-6 rounded-2xl border border-white/10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="eyebrow text-[10px] text-signal uppercase">{selectedReview.period}</span>
                  <h2 className="text-xl font-bold font-display text-white">{selectedReview.employeeName}</h2>
                  <p className="text-xs text-white/60">{selectedReview.role} • Code: {selectedReview.empCode}</p>
                </div>

                <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-current" />
                  <span className="text-lg font-bold font-display text-amber-300">{selectedReview.overallRating} / 5.0</span>
                </div>
              </div>

              {/* KPI Score Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px] uppercase block">Technical Depth</span>
                  <div className="text-xl font-bold text-white">{selectedReview.technicalScore} / 5.0</div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px] uppercase block">Delivery SLA</span>
                  <div className="text-xl font-bold text-white">{selectedReview.deliveryScore} / 5.0</div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-1">
                  <span className="text-white/50 text-[10px] uppercase block">Collaboration</span>
                  <div className="text-xl font-bold text-white">{selectedReview.collaborationScore} / 5.0</div>
                </div>
              </div>

              {/* AI Appraisal Summary */}
              <div className="p-5 rounded-xl bg-signal/10 border border-signal/30 space-y-2">
                <div className="flex items-center gap-2 text-signal text-xs font-bold uppercase">
                  <Sparkles className="w-4 h-4 text-signal" /> Gemini AI Appraisal Intelligence Summary
                </div>
                <p className="text-xs text-white/80 leading-relaxed font-sans">{selectedReview.aiSummary}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
