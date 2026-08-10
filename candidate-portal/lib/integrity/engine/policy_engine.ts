import integrityPolicy from "../policies/integrity_policy.json"

export type EngineState = "NORMAL" | "GRACE_PERIOD" | "WARNING" | "STRIKE" | "LOCKOUT"

export interface StateMachineContext {
  state: EngineState
  absenceSeconds: number
  cameraStrikes: number
  tabStrikes: number
  isLockout: boolean
}

export function evaluateStateMachine(
  faceDetected: boolean,
  currentAbsenceSeconds: number,
  currentStrikes: number
): { nextState: EngineState; shouldPlayAudio: boolean; isNewStrike: boolean } {
  const policy = integrityPolicy.camera

  if (faceDetected) {
    return { nextState: "NORMAL", shouldPlayAudio: false, isNewStrike: false }
  }

  if (currentAbsenceSeconds < policy.grace_seconds) {
    return { nextState: "GRACE_PERIOD", shouldPlayAudio: false, isNewStrike: false }
  } else if (currentAbsenceSeconds < policy.strike_after) {
    return { nextState: "WARNING", shouldPlayAudio: true, isNewStrike: false }
  } else {
    const isLockout = currentStrikes + 1 >= policy.max_strikes
    return {
      nextState: isLockout ? "LOCKOUT" : "STRIKE",
      shouldPlayAudio: true,
      isNewStrike: true,
    }
  }
}
