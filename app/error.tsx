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
      <div className="card-glass p-8 rounded-2xl border border-white/10 max-w-md w-full space-y-4 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display uppercase tracking-wider text-white">RECRUITMENT WORKSTATION RECOVERY</h2>
          <p className="text-xs text-white/50 mt-1">
            A transient client network or state exception occurred. Click below to reload the workstation cleanly.
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="btn-primary w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-lg shadow-signal/20"
        >
          <RefreshCw className="w-4 h-4" /> RELOAD WORKSTATION
        </button>
      </div>
    </div>
  )
}
