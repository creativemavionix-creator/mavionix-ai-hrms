"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Client Exception Caught by Error Boundary:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col items-center justify-center p-6 font-mono">
      <div className="card-glass p-8 rounded-2xl border border-white/10 max-w-lg w-full space-y-5 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display uppercase tracking-wider text-white">RECRUITMENT WORKSTATION RECOVERY</h2>
          <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
            A transient client network or state exception occurred:
          </p>
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left text-[11px] font-mono text-red-300 overflow-x-auto max-h-32">
            {error?.message || "Unknown client execution error"}
          </div>
        </div>

        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload()
            } else {
              reset()
            }
          }}
          className="btn-primary w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-lg shadow-signal/20 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> RELOAD WORKSTATION CLEANLY
        </button>
      </div>
    </div>
  )
}
