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
    # 1. Imports
    ("""import {
  aiReportsApi, ApiAIReport, AIReportStats, AIReportFilter, VerificationStatus,
} from "@/lib/api"
import {
  Brain, Star, CheckCircle, HelpCircle, AlertTriangle, Cpu,
  Activity, MessageSquare, Shield, Loader2, RefreshCw, X,
} from "lucide-react\"""",
     """import {
  aiReportsApi, ApiAIReport, AIReportStats, AIReportFilter, VerificationStatus,
} from "@/lib/api"
import {
  Brain, Star, CheckCircle, HelpCircle, AlertTriangle, Cpu,
  Activity, MessageSquare, Shield, Loader2, RefreshCw, X,
} from "lucide-react"
import { AiThinkingState, AiSummaryPanel } from "@/components/ui/AiComponents\""""),

    # 2. Loading state replacement with AiThinkingState
    ("""      {/* Loading skeleton */}
      {loadingReports && !fetchError && (
        <div className="p-20 flex items-center justify-center gap-3 text-neutral-400 font-semibold text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> COMPUTING CLASSIFICATIONS...
        </div>
      )}""",
     """      {/* Loading skeleton */}
      {loadingReports && !fetchError && (
        <AiThinkingState status="COMPUTING CLASSIFICATIONS & MODEL MATCHES..." />
      )}"""),

    # 3. Add AiSummaryPanel above filter tabs
    ("""      {/* Filter tabs */}
      <div className="flex bg-white/[0.02] dark:bg-black/40 border border-white/[0.05] p-1 rounded-xl w-full md:w-96">""",
     """      {/* Summary insights panel */}
      {!loadingStats && stats && (
        <AiSummaryPanel
          title="AI Model Telemetry & Matching Metrics"
          bullets={[
            `Analyzed a total of ${stats.total_reports} AI screening report dossiers.`,
            `Flagged ${stats.flagged_count} candidate compliance or integrity anomalies.`,
            `Integrating from ${stats.active_sources} live data ingestion endpoints.`,
            "Platform classification confidence threshold is active at 75% baseline value."
          ]}
          className="w-full"
        />
      )}

      {/* Filter tabs */}
      <div className="flex bg-white/[0.02] dark:bg-black/40 border border-white/[0.05] p-1 rounded-radius-md w-full md:w-96">"""),

    # 4. Corner rounding modifications
    ("""        <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">""",
     """        <Card className="glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardContent className="p-5 flex items-center justify-between">"""),

    ("""            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shadow-md">""",
     """            <div className="w-10 h-10 rounded-radius-md bg-violet-500/10 border border-violet-500/25 flex items-center justify-center shadow-md">"""),

    ("""            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shadow-md">""",
     """            <div className="w-10 h-10 rounded-radius-md bg-red-500/10 border border-red-500/25 flex items-center justify-center shadow-md">"""),

    ("""            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-md">""",
     """            <div className="w-10 h-10 rounded-radius-md bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-md">"""),

    ("""          <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
            className={`flex-1 px-4 py-2 text-[10px] font-bold rounded-lg transition-all uppercase ${
              activeFilter === tab.id
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10"
                : "text-neutral-400 hover:text-white"
            }`}>""",
     """          <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
            className={`flex-1 px-4 py-2 text-[10px] font-bold rounded-radius-full transition-all uppercase ${
              activeFilter === tab.id
                ? "bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white shadow-md shadow-violet-500/10"
                : "text-neutral-400 hover:text-white"
            }`}>"""),

    ("""  return (
    <Card className={`glass-card border-white/[0.04] hover:border-violet-500/30 transition-all rounded-2xl relative overflow-hidden""",
     """  return (
    <Card className={`glass-card border-white/[0.04] hover:border-violet-500/30 transition-all rounded-radius-lg relative overflow-hidden"""),

    ("""          <div className="flex flex-col items-end gap-1.5 shrink-0 text-[9px] font-bold">
            <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">""",
     """          <div className="flex flex-col items-end gap-1.5 shrink-0 text-[9px] font-bold">
            <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-0.5 rounded-radius-full uppercase tracking-wider">"""),

    ("""            {r.confidence !== null && (
              <span className="bg-white/[0.02] text-neutral-400 border border-white/[0.08] px-2.5 py-0.5 rounded-full uppercase tracking-wider">""",
     """            {r.confidence !== null && (
              <span className="bg-white/[0.02] text-neutral-400 border border-white/[0.08] px-2.5 py-0.5 rounded-radius-full uppercase tracking-wider">"""),

    ("""        <div className="grid grid-cols-3 gap-3 bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-xl">""",
     """        <div className="grid grid-cols-3 gap-3 bg-white/[0.01] border border-white/[0.04] p-3.5 rounded-radius-md">"""),

    ("""            <div className="flex items-center gap-1.5 mt-1 text-[9.5px] font-bold tracking-wider">
              <Star className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold ${matchColor}`}>{matchLabel}</span>
            </div>""",
     """            <div className="flex items-center gap-1.5 mt-1 text-[9.5px] font-bold tracking-wider">
              <Star className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className={`px-2 py-0.5 rounded-radius-full border text-[8px] font-bold ${matchColor}`}>{matchLabel}</span>
            </div>"""),

    ("""        <div className="bg-white/[0.01] dark:bg-black/25 p-3.5 rounded-xl border border-white/[0.04] space-y-1">""",
     """        <div className="bg-white/[0.01] dark:bg-black/25 p-3.5 rounded-radius-md border border-white/[0.04] space-y-1">"""),

    ("""            {(r.tags ?? []).map(tag => (
              <span key={tag}
                className="bg-white/[0.01] border border-white/[0.08] text-[8.5px] px-2.5 py-0.5 text-neutral-400 rounded-full font-bold uppercase tracking-wider">""",
     """            {(r.tags ?? []).map(tag => (
              <span key={tag}
                className="bg-white/[0.01] border border-white/[0.08] text-[8.5px] px-2.5 py-0.5 text-neutral-400 rounded-radius-full font-bold uppercase tracking-wider">"""),

    ("""              {isVerified ? (
                <Button onClick={() => onRevoke(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white">
                  REVOKE VERIFICATION
                </Button>
              ) : (
                <Button onClick={() => onVerify(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  VERIFY CREDENTIALS
                </Button>
              )}

              {/* Flag / Dismiss */}
              {r.flagged ? (
                <Button onClick={() => onDismissFlag(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white">
                  DISMISS FLAG
                </Button>
              ) : (
                <Button onClick={() => onFlag(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                  FLAG ANOMALY
                </Button>
              )}""",
     """              {isVerified ? (
                <Button onClick={() => onRevoke(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white">
                  REVOKE VERIFICATION
                </Button>
              ) : (
                <Button onClick={() => onVerify(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  VERIFY CREDENTIALS
                </Button>
              )}

              {/* Flag / Dismiss */}
              {r.flagged ? (
                <Button onClick={() => onDismissFlag(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white">
                  DISMISS FLAG
                </Button>
              ) : (
                <Button onClick={() => onFlag(r.id)}
                  className="h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-radius-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                  FLAG ANOMALY
                </Button>
              )}"""),
]

process_file("components/recruitment/AiIntelligenceView.tsx", replacements)
