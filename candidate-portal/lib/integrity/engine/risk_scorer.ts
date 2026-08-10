import { NormalizedSecurityEvent } from "./event_normalizer"

export type RiskBand = "EXCELLENT" | "GOOD" | "MODERATE" | "HIGH_RISK"

export interface IntegrityScoreResult {
  score: number
  ratingBand: RiskBand
  badgeColor: string
  cameraHealthPct: number
  browserFocusPct: number
  microphoneHealthPct: number
  networkHealthPct: number
  longestAbsenceSec: number
  totalEventsCount: number
  deductionsSummary: string[]
}

export function calculateIntegrityScore(
  events: NormalizedSecurityEvent[],
  cameraStrikes: number = 0,
  tabStrikes: number = 0,
  isLockout: boolean = false
): IntegrityScoreResult {
  let score = 100
  const deductions: string[] = []

  let totalAbsenceDuration = 0
  let longestAbsenceSec = 0
  let micDisconnectCount = 0
  let networkLossCount = 0

  events.forEach((evt) => {
    if (evt.type === "camera_absence") {
      totalAbsenceDuration += evt.duration
      if (evt.duration > longestAbsenceSec) {
        longestAbsenceSec = evt.duration
      }
      if (evt.severity === "warning") {
        score -= 5
        deductions.push(`-5 pts: Minor camera absence (${evt.duration}s)`)
      }
    } else if (evt.type === "tab_switch") {
      score -= 15
      deductions.push(`-15 pts: Browser tab switch (${evt.duration}s)`)
    } else if (evt.type === "mic_disconnected") {
      micDisconnectCount++
      score -= 10
      deductions.push(`-10 pts: Microphone disconnection`)
    } else if (evt.type === "network_loss") {
      networkLossCount++
      score -= 10
      deductions.push(`-10 pts: Network loss event`)
    }
  });

  // Apply strike deductions
  if (cameraStrikes > 0) {
    score -= cameraStrikes * 20
    deductions.push(`-${cameraStrikes * 20} pts: ${cameraStrikes} camera strike(s)`)
  }

  if (isLockout) {
    score = Math.min(score, 45)
    deductions.push(`Locked out due to 3 security strikes`)
  }

  // Ensure score bounds 0..100
  score = Math.max(0, Math.min(100, Math.round(score)))

  // Rating Bands
  let ratingBand: RiskBand = "EXCELLENT"
  let badgeColor = "bg-green-500/15 border-green-500/30 text-green-400"

  if (score <= 50) {
    ratingBand = "HIGH_RISK"
    badgeColor = "bg-red-500/15 border-red-500/30 text-red-400 font-bold"
  } else if (score <= 70) {
    ratingBand = "MODERATE"
    badgeColor = "bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold"
  } else if (score <= 90) {
    ratingBand = "GOOD"
    badgeColor = "bg-blue-500/15 border-blue-500/30 text-blue-400 font-bold"
  }

  // Calculate domain health percentages
  const cameraHealthPct = Math.max(0, 100 - cameraStrikes * 25 - (longestAbsenceSec > 15 ? 20 : 0))
  const browserFocusPct = Math.max(0, 100 - tabStrikes * 33)
  const microphoneHealthPct = Math.max(0, 100 - micDisconnectCount * 20)
  const networkHealthPct = Math.max(0, 100 - networkLossCount * 20)

  return {
    score,
    ratingBand,
    badgeColor,
    cameraHealthPct,
    browserFocusPct,
    microphoneHealthPct,
    networkHealthPct,
    longestAbsenceSec,
    totalEventsCount: events.length,
    deductionsSummary: deductions,
  }
}
