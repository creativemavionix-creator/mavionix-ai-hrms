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
    # 1. Update imports
    ("""import { AiConfidenceCard, AiRiskWarning, AiProvenanceChip } from "@/components/ui/AiComponents\"""",
     """import { AiConfidenceCard, AiRiskWarning, AiProvenanceChip, AiSummaryPanel } from "@/components/ui/AiComponents\""""),

    # 2. Add AiSummaryPanel to the right column of the dossier
    ("""                  {c.flagged && (
                    <AiRiskWarning
                      title="Anomaly Detected"
                      message="Candidate has triggered integrity rules (suspicious browser tab switches or camera detection loss events during the automated screening session)."
                      className="w-full"
                    />
                  )}
                </div>""",
     """                  {c.flagged && (
                    <AiRiskWarning
                      title="Anomaly Detected"
                      message="Candidate has triggered integrity rules (suspicious browser tab switches or camera detection loss events during the automated screening session)."
                      className="w-full"
                    />
                  )}
                  <AiSummaryPanel
                    title="AI Match Assessment"
                    bullets={[
                      `Technical rating index: ${c.skill_score ?? 0}/100.`,
                      `Work history score: ${c.exp_score ?? 0}/100.`,
                      `Credentials check: ${c.edu_score ?? 0}/100.`,
                      c.insights || "Strong engineering profile matching core requirements."
                    ]}
                    className="w-full mt-4"
                  />
                </div>"""),
]

process_file("components/recruitment/CandidateManagementView.tsx", replacements)
