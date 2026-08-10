"use client"

import { DetectorResult, BrowserPayload } from "../types"

export function setupBrowserFocusListener(
  onTabSwitch: (duration: number, result: DetectorResult<BrowserPayload>) => void
): () => void {
  if (typeof window === "undefined") return () => {}

  let blurStartTimestamp: number | null = null
  let tabSwitchesCount = 0

  const handleBlur = () => {
    blurStartTimestamp = Date.now()
    tabSwitchesCount++
    onTabSwitch(0, {
      detector: "browser",
      healthy: false,
      confidence: 1.0,
      timestamp: Date.now(),
      payload: { focused: false, tabSwitchesCount },
    })
  }

  const handleFocus = () => {
    let duration = 0
    if (blurStartTimestamp) {
      duration = Math.round((Date.now() - blurStartTimestamp) / 1000)
      blurStartTimestamp = null
    }
    onTabSwitch(duration, {
      detector: "browser",
      healthy: true,
      confidence: 1.0,
      timestamp: Date.now(),
      payload: { focused: true, tabSwitchesCount },
    })
  }

  window.addEventListener("blur", handleBlur)
  window.addEventListener("focus", handleFocus)

  return () => {
    window.removeEventListener("blur", handleBlur)
    window.removeEventListener("focus", handleFocus)
  }
}
