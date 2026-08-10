"use client"

import { useState, useEffect, useRef, useCallback } from "react"

export interface SecurityEvent {
  id: string
  timestamp: string
  type: "camera_absence" | "tab_switch" | "mic_disconnection" | "portal_refresh"
  reason: "face_not_visible" | "camera_disabled" | "permission_revoked" | "camera_disconnected" | "tab_switch"
  duration_sec: number
  confidence: number
  details?: string
}

export interface CameraPresenceState {
  isCameraActive: boolean
  faceDetected: boolean
  confidence: number
  status: "NORMAL" | "GRACE_PERIOD" | "YELLOW_WARNING" | "STRIKE_ISSUED" | "LOCKOUT" | "DISCONNECTED"
  absenceSeconds: number
  cameraStrikes: number
  events: SecurityEvent[]
}

// Web Audio API Synthesized Warning Chime (Zero External Files Needed)
function playWarningChime(pitch: number = 880) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(pitch, ctx.currentTime + 0.25) // Ramp to pitch
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  } catch (e) {
    console.warn("Audio warning chime error:", e)
  }
}

export function useMediaPipePresence(isEnabled: boolean = true) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [faceDetected, setFaceDetected] = useState(true)
  const [confidence, setConfidence] = useState(0.95)
  const [status, setStatus] = useState<CameraPresenceState["status"]>("NORMAL")
  const [absenceSeconds, setAbsenceSeconds] = useState(0)
  const [cameraStrikes, setCameraStrikes] = useState(0)
  const [events, setEvents] = useState<SecurityEvent[]>([])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastAbsenceStartRef = useRef<number | null>(null)
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null)
  const nativeDetectorRef = useRef<any>(null)

  // Initialize Native Browser FaceDetector API if available
  useEffect(() => {
    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        nativeDetectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxFaces: 1 })
      } catch (e) {
        console.warn("Native FaceDetector init fallback:", e)
      }
    }
  }, [])

  // Start WebCam stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      setIsCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      console.warn("WebCam access warning:", err)
      setIsCameraActive(false)
      const newEvent: SecurityEvent = {
        id: `sec-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "camera_absence",
        reason: err.name === "NotAllowedError" ? "permission_revoked" : "camera_disconnected",
        duration_sec: 0,
        confidence: 1.0,
        details: err.message || "WebCam stream unavailable",
      }
      setEvents((prev) => [...prev, newEvent])
    }
  }, [])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsCameraActive(false)
  }, [])

  // Auto-attach streamRef to videoRef whenever camera becomes active or DOM mounts
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isCameraActive])

  // 5-10 FPS Detection Loop (sampling every 150ms)
  useEffect(() => {
    if (!isEnabled || !isCameraActive) return

    let isCheckingNative = false

    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video.readyState < 2) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = 160
      canvas.height = 120
      ctx.drawImage(video, 0, 0, 160, 120)

      // ── YCbCr Human Chrominance & Motion Detection Engine ─────────────────
      const frameData = ctx.getImageData(0, 0, 160, 120)
      const data = frameData.data

      let totalLum = 0
      let humanSkinPixels = 0
      let motionPixels = 0
      let centralSampleCount = 0

      const prevData = prevFrameDataRef.current

      // Sample central region (x: 24..136, y: 15..105)
      for (let y = 15; y < 105; y += 2) {
        for (let x = 24; x < 136; x += 2) {
          const idx = (y * 160 + x) * 4
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]

          const lum = 0.299 * r + 0.587 * g + 0.114 * b
          totalLum += lum
          centralSampleCount++

          // 1. Standard YCbCr Human Skin Chrominance Bounds
          // Converts RGB to YCbCr space (eliminates wood, yellow walls, and lamps)
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b

          if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
            humanSkinPixels++
          }

          // 2. Frame-Difference Micro-Motion Detection
          if (prevData) {
            const diff = Math.abs(r - prevData[idx]) + Math.abs(g - prevData[idx + 1]) + Math.abs(b - prevData[idx + 2])
            if (diff > 28) {
              motionPixels++
            }
          }
        }
      }

      // Store current frame for next difference check
      prevFrameDataRef.current = new Uint8ClampedArray(data)

      const avgLum = totalLum / centralSampleCount
      const skinRatio = humanSkinPixels / centralSampleCount
      const motionRatio = motionPixels / centralSampleCount

      // Candidate is PRESENT ONLY IF:
      // 1. Lens is not covered (avgLum > 15) AND
      // 2. YCbCr Human Skin Ratio >= 3.5% OR (Skin Ratio >= 1.5% AND active motion detected)
      const isDarkness = avgLum <= 15
      const isCandidatePresent = skinRatio >= 0.035 || (skinRatio >= 0.015 && motionRatio >= 0.005)

      const isDetected = !isDarkness && isCandidatePresent
      const confVal = isDetected ? Math.min(0.98, 0.85 + skinRatio * 2) : 0.1

      setFaceDetected(isDetected)
      setConfidence(confVal)

      if (isDetected) {
        // Face returned! Reset absence clock & yellow warning
        if (lastAbsenceStartRef.current !== null) {
          const duration = Math.round((Date.now() - lastAbsenceStartRef.current) / 1000)
          if (duration >= 3) {
            const newEvt: SecurityEvent = {
              id: `sec-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: "camera_absence",
              reason: "face_not_visible",
              duration_sec: duration,
              confidence: confVal,
              details: `Candidate returned to camera frame after ${duration}s`,
            }
            setEvents((prev) => [...prev, newEvt])
          }
          lastAbsenceStartRef.current = null
        }
        setAbsenceSeconds(0)
        setStatus((prev) => (prev === "LOCKOUT" ? "LOCKOUT" : "NORMAL"))
      } else {
        // Face absent
        if (lastAbsenceStartRef.current === null) {
          lastAbsenceStartRef.current = Date.now()
        }
        const currentAbsence = Math.round((Date.now() - lastAbsenceStartRef.current) / 1000)
        setAbsenceSeconds(currentAbsence)

        if (currentAbsence < 3) {
          setStatus("GRACE_PERIOD") // 0-3s silent grace
        } else if (currentAbsence < 15) {
          if (status !== "YELLOW_WARNING") {
            playWarningChime(660) // Soft alert chime
          }
          setStatus("YELLOW_WARNING") // 3-15s soft yellow banner
        } else {
          // 15s continuous absence trigger strike
          if (status !== "STRIKE_ISSUED" && status !== "LOCKOUT") {
            playWarningChime(1046.5) // Loud strike warning chime
            setStatus("STRIKE_ISSUED")
            setCameraStrikes((prevStrikes) => {
              const newStrikes = prevStrikes + 1
              if (newStrikes >= 3) {
                setStatus("LOCKOUT")
              }
              return newStrikes
            })

            const strikeEvt: SecurityEvent = {
              id: `sec-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              type: "camera_absence",
              reason: "face_not_visible",
              duration_sec: currentAbsence,
              confidence: 0.95,
              details: `Camera Strike issued (15s continuous absence)`,
            }
            setEvents((prev) => [...prev, strikeEvt])
          }
        }
      }
    }, 150)

    return () => clearInterval(interval)
  }, [isEnabled, isCameraActive, status])

  return {
    videoRef,
    canvasRef,
    streamRef,
    isCameraActive,
    faceDetected,
    confidence,
    status,
    absenceSeconds,
    cameraStrikes,
    events,
    startCamera,
    stopCamera,
    setEvents,
  }
}
