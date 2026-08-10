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

# 1. Update CandidateManagementView.tsx (Add file-size validation + render AiProvenanceChip)
candidate_replacements = [
    # Add file size validation in handleFile
    ("""  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.type !== "application/pdf") {
      setError("Only PDF resumes are supported.")
      return
    }
    setError(null)
    setFile(f)
  }""",
     """  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.type !== "application/pdf") {
      setError("Only PDF resumes are supported.")
      return
    }
    if (f && f.size > 10 * 1024 * 1024) {
      setError("Resume file size exceeds the 10 MB limit.")
      return
    }
    setError(null)
    setFile(f)
  }"""),

    # Render AiProvenanceChip above AiConfidenceCard in the candidate dossier
    ("""                {/* Radial Match circle & Recommendation */}
                <div className="flex flex-col space-y-4">
                  <AiConfidenceCard
                    score={c.ai_score ?? 0}
                    label="AI MATCH QUALITY"
                    detail={mq ? `${mq.toUpperCase()} CORRELATION` : "STRONG CORRELATION"}
                    className="w-full"
                  />""",
     """                {/* Radial Match circle & Recommendation */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-neutral-400 font-bold tracking-widest uppercase">Match Diagnostics</span>
                    {/* Future Backend Hook: Ready to surface scoring_method (e.g. mock vs real ai) */}
                    <AiProvenanceChip
                      provenance={c.ai_score ? "AI EVALUATED" : "PRELIMINARY"}
                      confidence={c.ai_score ?? 85}
                    />
                  </div>
                  <AiConfidenceCard
                    score={c.ai_score ?? 0}
                    label="AI MATCH QUALITY"
                    detail={mq ? `${mq.toUpperCase()} CORRELATION` : "STRONG CORRELATION"}
                    className="w-full"
                  />"""),
]

process_file("components/recruitment/CandidateManagementView.tsx", candidate_replacements)

# 2. Update CommunicationView.tsx (Add dry-run warning disclaimer at the top of the Composer Card)
communication_replacements = [
    ("""          <form onSubmit={handleSend}>
            <CardContent className="p-5 space-y-4 text-xs">""",
     """          <form onSubmit={handleSend}>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-radius-md text-[10px] font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>DRY-RUN ENVIRONMENT: Real email/SMS delivery is disabled in demo setups. Messages are logged to database as &apos;sent&apos; for audit compliance.</span>
              </div>"""),
]

process_file("components/recruitment/CommunicationView.tsx", communication_replacements)
