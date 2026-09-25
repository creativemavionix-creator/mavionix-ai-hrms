"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { processCameraFrame, initMediaPipeEngine } from "../detectors/camera_detector"
import { setupBrowserFocusListener } from "../detectors/browser_detector"
import { setupMicrophoneListener } from "../detectors/microphone_detector"
import { setupNetworkListener } from "../detectors/network_detector"
import { createNormalizedEvent, NormalizedSecurityEvent } from "../engine/event_normalizer"
import { calculateIntegrityScore, IntegrityScoreResult } from "../engine/risk_scorer"
import { evaluateStateMachine, EngineState } from "../engine/policy_engine"
import { evaluateGuidance, GuidanceResult } from "../engine/guidance_engine"
import { evaluateReadiness, updateRollingProfile, ReadinessState } from "../engine/readiness_engine"
import { DetectorResult, CameraPayload, MicPayload, NetPayload, BrowserPayload, CalibrationProfile, RollingProfile } from "../types"

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return null
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx()
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {})
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

function playSynthesizedChime(pitch: number = 880, isStrike: boolean = false) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const duration = 0.28

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, now)
    osc1.frequency.exponentialRampToValueAtTime(pitch, now + duration)

    // Smooth envelope attack and decay to prevent any hardware clicks/pops
    gain1.gain.setValueAtTime(0.0001, now)
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.03)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + duration)

    if (isStrike) {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "sine"
      osc2.frequency.setValueAtTime(880, now + 0.05)
      osc2.frequency.exponentialRampToValueAtTime(1100, now + duration + 0.05)

      gain2.gain.setValueAtTime(0.0001, now + 0.05)
      gain2.gain.exponentialRampToValueAtTime(0.15, now + 0.08)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.05)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.05)
      osc2.stop(now + duration + 0.05)
    }
  } catch (e) {
    console.warn("Audio chime error:", e)
  }
}

export function useIntegrityEngine(isEnabled: boolean = true, isInterviewActive: boolean = false) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraResult, setCameraResult] = useState<DetectorResult<CameraPayload> | null>(null)
  const [micResult, setMicResult] = useState<DetectorResult<MicPayload> | null>(null)
  const [netResult, setNetResult] = useState<DetectorResult<NetPayload> | null>(null)
  const [browserResult, setBrowserResult] = useState<DetectorResult<BrowserPayload> | null>(null)

  const [engineState, setEngineState] = useState<EngineState>("NORMAL")
  const [absenceSeconds, setAbsenceSeconds] = useState(0)

  const [cameraStrikes, setCameraStrikes] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("hm_camera_strikes")
      return stored ? parseInt(stored, 10) : 0
    }
    return 0
  })

  const [tabStrikes, setTabStrikes] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("hm_tab_strikes")
      return stored ? parseInt(stored, 10) : 0
    }
    return 0
  })

  const [isLockout, setIsLockout] = useState(() => {
    if (typeof window !== "undefined") {
      const c = sessionStorage.getItem("hm_camera_strikes")
      const t = sessionStorage.getItem("hm_tab_strikes")
      const cs = c ? parseInt(c, 10) : 0
      const ts = t ? parseInt(t, 10) : 0
      return cs >= 3 || ts >= 3
    }
    return false
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("hm_camera_strikes", cameraStrikes.toString())
      if (cameraStrikes >= 3) {
        setIsLockout(true)
      }
    }
  }, [cameraStrikes])

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("hm_tab_strikes", tabStrikes.toString())
      if (tabStrikes >= 3) {
        setIsLockout(true)
      }
    }
  }, [tabStrikes])

  const [events, setEvents] = useState<NormalizedSecurityEvent[]>([])
  const [calibrationProfile, setCalibrationProfile] = useState<CalibrationProfile | null>(null)
  const [rollingProfile, setRollingProfile] = useState<RollingProfile | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastAbsenceStartRef = useRef<number | null>(null)
  const lastChimeTimeRef = useRef<number>(0)

  // Start WebCam stream & Microphone Audio stream
  const startCamera = useCallback(async () => {
    try {
      initMediaPipeEngine()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.warn("Camera/Mic start error:", err)
      // Fallback to video only if audio permission fails
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        })
        streamRef.current = videoOnlyStream
        setIsCameraActive(true)
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnlyStream
          videoRef.current.play().catch(() => {})
        }
      } catch (videoErr) {
        setIsCameraActive(false)
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  // Ensure camera and microphone tracks are stopped when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  // 1. Core Camera Frame Loop (Runs every 150ms)
  useEffect(() => {
    if (!isEnabled || !isCameraActive) return

    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const res = processCameraFrame(videoRef.current, canvasRef.current)
        setCameraResult(res)

        if (res.payload.faceDetected) {
          lastAbsenceStartRef.current = null
          setAbsenceSeconds(0)
          if (engineState !== "NORMAL") {
            setEngineState("NORMAL")
          }
          setRollingProfile((prev) => updateRollingProfile(prev, res.payload))
        } else {
          if (!lastAbsenceStartRef.current) {
            lastAbsenceStartRef.current = Date.now()
          }
          const duration = Math.round((Date.now() - lastAbsenceStartRef.current) / 1000)
          setAbsenceSeconds(duration)

          const evalRes = evaluateStateMachine(false, duration, cameraStrikes)
          const now = Date.now()

          // Audio chime logic (only when interview is actively in session)
          if (isInterviewActive) {
            const stateJustChanged = evalRes.nextState !== engineState
            if (evalRes.nextState === "WARNING") {
              if (stateJustChanged || now - lastChimeTimeRef.current >= 6000) {
                playSynthesizedChime(660, false)
                lastChimeTimeRef.current = now
              }
            } else if (evalRes.nextState === "STRIKE" || evalRes.nextState === "LOCKOUT") {
              if (evalRes.isNewStrike || stateJustChanged || now - lastChimeTimeRef.current >= 6000) {
                playSynthesizedChime(1046.5, true)
                lastChimeTimeRef.current = now
              }
            }
          }

          if (evalRes.isNewStrike && engineState !== "STRIKE" && engineState !== "LOCKOUT" && isInterviewActive) {
            setCameraStrikes((c) => {
              const next = c + 1
              if (next >= 3) setIsLockout(true)
              return next
            })

            // Distinguish specific strike violation type
            let eventType: "multiple_faces" | "looking_away" | "face_occluded" | "camera_absence" = "camera_absence"
            let details = `Camera strike issued (5s continuous absence)`
            if (res.payload.isMultipleFaces || res.payload.absenceReason === "multiple_faces") {
              eventType = "multiple_faces"
              details = `Multiple people (${res.payload.faceCount}) detected in camera frame`
            } else if (res.payload.isLookingAway || res.payload.absenceReason === "looking_away") {
              eventType = "looking_away"
              details = `Candidate looked away from screen for prolonged duration`
            } else if (res.payload.isFaceCovered || res.payload.absenceReason === "face_covered") {
              eventType = "face_occluded"
              details = `Face obstructed or covered from camera`
            }

            const evt = createNormalizedEvent(eventType, "strike", duration, {
              confidence: res.confidence,
              details,
            })
            setEvents((prev) => [...prev, evt])
          }

          setEngineState(evalRes.nextState)
        }
      }
    }, 150)

    return () => clearInterval(interval)
  }, [isEnabled, isCameraActive, cameraStrikes, engineState, isInterviewActive])

  // 2. Setup Detector Listeners
  useEffect(() => {
    if (!isEnabled) return

    const cleanupBrowser = setupBrowserFocusListener((duration, res) => {
      setBrowserResult(res)
      if (!res.healthy && isInterviewActive) {
        playSynthesizedChime(880, true)
        setTabStrikes((t) => {
          const next = t + 1
          if (next >= 3) setIsLockout(true)
          return next
        })
        const evt = createNormalizedEvent("tab_switch", "warning", duration, {
          details: `Browser tab switch detected (${duration}s)`,
        })
        setEvents((prev) => [...prev, evt])
      }
    })

    const cleanupMic = setupMicrophoneListener((res) => {
      setMicResult(res)
      if (!res.healthy && isInterviewActive) {
        const evt = createNormalizedEvent("mic_disconnected", "warning", 0, {
          details: `Microphone input device disconnected`,
        })
        setEvents((prev) => [...prev, evt])
      }
    })

    const cleanupNet = setupNetworkListener((res) => {
      setNetResult(res)
      if (!res.healthy && isInterviewActive) {
        const evt = createNormalizedEvent("network_loss", "warning", 0, {
          details: `Browser network connectivity lost`,
        })
        setEvents((prev) => [...prev, evt])
      }
    })

    return () => {
      cleanupBrowser()
      cleanupMic()
      cleanupNet()
    }
  }, [isEnabled, isInterviewActive])

  // 3. Evaluate Readiness State
  const readinessState: ReadinessState = evaluateReadiness(
    cameraResult?.payload,
    micResult?.payload,
    netResult?.payload,
    browserResult?.payload
  )

  // 4. Evaluate Guidance Engine
  const guidance: GuidanceResult = cameraResult
    ? evaluateGuidance(cameraResult.payload, calibrationProfile, rollingProfile)
    : { hint: "Initializing camera...", actionNeeded: "none", lightingStatus: "optimal" }

  const acknowledgeCameraWarning = useCallback(() => {
    lastAbsenceStartRef.current = null
    setAbsenceSeconds(0)
    setEngineState("NORMAL")
  }, [])

  const resetStrikes = useCallback(() => {
    lastAbsenceStartRef.current = null
    setAbsenceSeconds(0)
    setCameraStrikes(0)
    setTabStrikes(0)
    setIsLockout(false)
    setEngineState("NORMAL")
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("hm_camera_strikes")
      sessionStorage.removeItem("hm_tab_strikes")
    }
  }, [])

  // 5. Calculate Integrity Score
  const scoreResult: IntegrityScoreResult = calculateIntegrityScore(events, cameraStrikes, tabStrikes, isLockout)
  const countdownSeconds = Math.max(0, 5 - absenceSeconds)

  return {
    videoRef,
    canvasRef,
    streamRef,
    isCameraActive,
    cameraResult,
    micResult,
    netResult,
    browserResult,
    readinessState,
    guidance,
    engineState,
    absenceSeconds,
    countdownSeconds,
    absenceReason: cameraResult?.payload.absenceReason || "none",
    isMultipleFaces: cameraResult?.payload.isMultipleFaces || false,
    cameraStrikes,
    tabStrikes,
    isLockout,
    events,
    scoreResult,
    startCamera,
    stopCamera,
    setCalibrationProfile,
    acknowledgeCameraWarning,
    resetStrikes,
  }
}
