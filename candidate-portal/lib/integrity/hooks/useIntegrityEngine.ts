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

function playSynthesizedChime(pitch: number = 880, isStrike: boolean = false) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = isStrike ? "sawtooth" : "sine"
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(pitch, ctx.currentTime + 0.3)
    gain1.gain.setValueAtTime(0.55, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start()
    osc1.stop(ctx.currentTime + 0.3)

    if (isStrike) {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "square"
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1)
      osc2.frequency.exponentialRampToValueAtTime(1244.5, ctx.currentTime + 0.35)
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.1)
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(ctx.currentTime + 0.1)
      osc2.stop(ctx.currentTime + 0.35)
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

          // Repetitive Louder Audio Chime Logic (SILENCED DURING HARDWARE DEVICE CHECK)
          if (isInterviewActive) {
            if (evalRes.nextState === "WARNING") {
              if (now - lastChimeTimeRef.current >= 1500) {
                playSynthesizedChime(660, false)
                lastChimeTimeRef.current = now
              }
            } else if (evalRes.nextState === "STRIKE" || evalRes.nextState === "LOCKOUT") {
              if (now - lastChimeTimeRef.current >= 1000) {
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
            const evt = createNormalizedEvent("camera_absence", "strike", duration, {
              confidence: res.confidence,
              details: `Camera strike issued (5s continuous absence)`,
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
