"use client"

export type DetectorType = "camera" | "microphone" | "network" | "browser" | "fullscreen"

export interface DetectorResult<T> {
  detector: DetectorType
  healthy: boolean
  confidence: number // 0.0 to 1.0
  timestamp: number
  payload: T
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface CameraPayload {
  faceDetected: boolean
  confidence: number
  landmarksCount: number
  boundingBox?: BoundingBox
  brightness: number
  faceAreaPct: number
  skinRatio: number
}

export interface MicPayload {
  active: boolean
  audioLevel: number // 0.0 to 1.0
  muted: boolean
}

export interface NetPayload {
  online: boolean
  latencyMs: number
}

export interface BrowserPayload {
  focused: boolean
  tabSwitchesCount: number
}

export interface CalibrationProfile {
  calibratedAt: number
  faceDetected: boolean
  initialBoundingBox?: BoundingBox
  initialBrightness: number
  initialFaceAreaPct: number
  initialConfidence: number
}

export interface RollingProfile {
  avgBrightness: number
  avgFaceAreaPct: number
  avgConfidence: number
  sampleCount: number
}

export interface ReadinessCheckItem {
  id: string
  label: string
  status: "pending" | "checking" | "passed" | "failed"
  detail: string
  confidence: number
}
