"use client"

import { DetectorResult, NetPayload } from "../types"

export function setupNetworkListener(
  onStateChange: (result: DetectorResult<NetPayload>) => void
): () => void {
  if (typeof window === "undefined") return () => {}

  const handleOnline = () => {
    onStateChange({
      detector: "network",
      healthy: true,
      confidence: 1.0,
      timestamp: Date.now(),
      payload: { online: true, latencyMs: 24 },
    })
  }

  const handleOffline = () => {
    onStateChange({
      detector: "network",
      healthy: false,
      confidence: 0.0,
      timestamp: Date.now(),
      payload: { online: false, latencyMs: 9999 },
    })
  }

  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)

  handleOnline()

  return () => {
    window.removeEventListener("online", handleOnline)
    window.removeEventListener("offline", handleOffline)
  }
}
