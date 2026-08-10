import os

def process_file(filepath, replacements):
    if os.path.exists(filepath):
        print(f"Processing: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        for target, replacement in replacements:
            content = content.replace(target, replacement)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Saved: {filepath}")
    else:
        print(f"Error: {filepath} not found!")

replacements = [
    # 1. Add imports at the top
    ("""import IntegrityWidget from "@/lib/integrity/ui/IntegrityWidget"
import SecurityTimeline from "@/lib/integrity/ui/SecurityTimeline\"""",
     """import IntegrityWidget from "@/lib/integrity/ui/IntegrityWidget"
import SecurityTimeline from "@/lib/integrity/ui/SecurityTimeline"
import { AiConfidenceCard, AiRiskWarning, AiProvenanceChip } from "@/components/ui/AiComponents\""""),

    # 2. Replace the custom circular matching gauge in dossier details
    ("""                {/* Radial Match circle & Recommendation */}
                <div className="flex flex-col items-center text-center space-y-4">
                  <span className="text-[9px] text-neutral-400 font-bold tracking-widest uppercase">Match Quality Index</span>
                  
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="46" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                      <circle cx="56" cy="56" r="46" stroke="url(#violet-gradient-dossier-v2)" strokeWidth="7" fill="transparent"
                        strokeDasharray={2 * Math.PI * 46}
                        strokeDashoffset={2 * Math.PI * 46 * (1 - (c.ai_score ?? 0) / 100)}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="violet-gradient-dossier-v2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-black text-neutral-200 tracking-tight">{c.ai_score ?? "—"}</span>
                      <span className="text-[8px] text-neutral-500 font-bold tracking-widest uppercase">Score</span>
                    </div>
                  </div>

                  {mq && (
                    <span className={`text-[9px] px-3 py-1 rounded-full border font-bold uppercase tracking-wider shadow-sm ${MATCH_COLORS[mq] ?? ""}`}>
                      {mq} Match
                    </span>
                  )}
                </div>""",
     """                {/* Radial Match circle & Recommendation */}
                <div className="flex flex-col space-y-4">
                  <AiConfidenceCard
                    score={c.ai_score ?? 0}
                    label="AI MATCH QUALITY"
                    detail={mq ? `${mq.toUpperCase()} CORRELATION` : "STRONG CORRELATION"}
                    className="w-full"
                  />
                  {c.flagged && (
                    <AiRiskWarning
                      title="Anomaly Detected"
                      message="Candidate has triggered integrity rules (suspicious browser tab switches or camera detection loss events during the automated screening session)."
                      className="w-full"
                    />
                  )}
                </div>"""),
]

process_file("components/recruitment/CandidateManagementView.tsx", replacements)
