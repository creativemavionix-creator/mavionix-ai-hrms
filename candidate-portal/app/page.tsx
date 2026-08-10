import { Brain, Shield, Clock, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen hero-glow bg-[#07070f] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="max-w-3xl w-full space-y-8 relative z-10 reveal-up">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-signal/10 border border-signal/20 text-signal eyebrow">
            <Sparkles className="w-3.5 h-3.5 text-signal" /> CANDIDATE ASSESSMENT ENVIRONMENT
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            HIREMIND <span className="text-gradient">AI PORTAL</span>
          </h1>
          <p className="eyebrow text-neutral-400">
            Autonomous Technical & Executive Interview System
          </p>
        </div>

        {/* Main card */}
        <div className="card-glass border border-white/[0.06] p-8 sm:p-10 rounded-2xl shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide uppercase">
              WELCOME <span className="text-gradient">CANDIDATE</span>
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed font-medium">
              This portal hosts AI-conducted interview rounds for HireMind AI candidates.
              Access requires a valid interview link sent by your recruitment team.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Brain,
                label: "AI ADAPTIVE ROUNDS",
                desc: "Real-time tailored probing based on your background",
              },
              {
                icon: Shield,
                label: "SECURE & ENCRYPTED",
                desc: "Telemetry & transcripts encrypted for evaluation",
              },
              {
                icon: Clock,
                label: "AUTO-RESUME SESSION",
                desc: "Progress saved instantly — resume anytime",
              },
            ].map(({ icon: Icon, label, desc }, idx) => (
              <div
                key={label}
                className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-xl space-y-2 hover:border-signal/30 transition-all group"
              >
                <div className="w-9 h-9 flex items-center justify-center bg-signal/10 border border-signal/20 rounded-lg group-hover:bg-signal/20 transition-all">
                  <Icon className="w-4 h-4 text-signal" />
                </div>
                <p className="eyebrow text-white font-extrabold">
                  {label}
                </p>
                <p className="text-[11px] text-neutral-400 font-medium leading-normal">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-white/[0.05] space-y-5">
            <p className="text-xs text-neutral-400 font-medium leading-relaxed">
              If you received an interview token link from your recruiter, click it to begin. If you believe you should have access but haven&apos;t received a token, click below to try demo mode.
            </p>

            {/* Demo entry button */}
            <Link
              href="/interview?token=demo"
              className="btn-primary flex items-center justify-center gap-2.5 w-full h-12 rounded-xl text-white text-xs font-display font-extrabold tracking-wider uppercase transition-transform hover:-translate-y-0.5 shadow-lg shadow-signal/20"
            >
              <Brain className="w-4 h-4 text-white" />
              <span>START DEMO INTERVIEW SESSION</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>DEMO MODE ACTIVE — NO TOKEN REQUIRED · USES LIVE EVALUATION AI</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="eyebrow text-neutral-500">
            POWERED BY HIREMIND AI v1.0.0 — MAVIONIX RECRUITMENT SYSTEM
          </p>
        </div>
      </div>
    </div>
  )
}
