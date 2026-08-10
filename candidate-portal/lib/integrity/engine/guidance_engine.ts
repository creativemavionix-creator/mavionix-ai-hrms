"use client"

import { CameraPayload, CalibrationProfile, RollingProfile } from "../types"

export interface GuidanceResult {
  hint: string
  actionNeeded: "none" | "center_face" | "move_closer" | "improve_lighting" | "tilt_screen" | "reposition"
  lightingStatus: "optimal" | "low" | "covered"
}

export function evaluateGuidance(
  camera: CameraPayload,
  calibration?: CalibrationProfile | null,
  rolling?: RollingProfile | null
): GuidanceResult {
  // 1. Dark / Covered Lens
  if (camera.brightness < 18) {
    return {
      hint: "Improve front lighting — camera lens is dark or covered",
      actionNeeded: "improve_lighting",
      lightingStatus: "covered",
    }
  }

  // 2. Face Missing
  if (!camera.faceDetected) {
    return {
      hint: "Look directly at your screen & do not cover your face",
      actionNeeded: "reposition",
      lightingStatus: "optimal",
    }
  }

  // 3. Face Centering / Alignment Guidance
  if (camera.boundingBox) {
    const boxCenterX = camera.boundingBox.x + camera.boundingBox.width / 2
    const boxCenterY = camera.boundingBox.y + camera.boundingBox.height / 2

    // Center of 160x120 canvas is (80, 60)
    const driftX = Math.abs(boxCenterX - 80)
    const driftY = Math.abs(boxCenterY - 60)

    if (driftX > 32 || driftY > 26) {
      return {
        hint: "Please center your face in the middle of the frame",
        actionNeeded: "center_face",
        lightingStatus: "optimal",
      }
    }
  }

  // 4. Distance / Face Size Guidance
  const targetArea = rolling ? rolling.avgFaceAreaPct : calibration ? calibration.initialFaceAreaPct : 0.20
  if (camera.faceAreaPct < Math.max(0.06, targetArea * 0.4)) {
    return {
      hint: "Move slightly closer to your camera",
      actionNeeded: "move_closer",
      lightingStatus: "optimal",
    }
  }

  // 5. Ambient Lighting Quality Guidance (Adaptive Rolling Profile)
  const baseBrightness = rolling ? rolling.avgBrightness : calibration ? calibration.initialBrightness : 50
  if (camera.brightness < Math.max(22, baseBrightness * 0.45)) {
    return {
      hint: "Front lighting is low — adjust room light",
      actionNeeded: "improve_lighting",
      lightingStatus: "low",
    }
  }

  return {
    hint: "Face detected and centered",
    actionNeeded: "none",
    lightingStatus: "optimal",
  }
}
