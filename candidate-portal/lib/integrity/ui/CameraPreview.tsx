"use client"

import { Video } from "lucide-react"

export interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  streamRef: React.RefObject<MediaStream | null>
  faceDetected: boolean
  confidence: number
  landmarks: number
  hint: string
}

export default function CameraPreview({
  videoRef,
  canvasRef,
  streamRef,
  faceDetected,
}: CameraPreviewProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "90px",
        right: "24px",
        width: "200px",
        height: "155px",
        zIndex: 99999,
      }}
      className="bg-black border border-[var(--hm-border)] shadow-2xl rounded-sm overflow-hidden flex flex-col font-mono"
    >
      {/* Top Header Bar */}
      <div className="bg-[var(--hm-bg-inset)] border-b border-[var(--hm-border-subtle)] px-2 py-0.5 flex items-center justify-between text-[8px] text-[var(--hm-text-muted)] shrink-0">
        <span className="font-bold uppercase text-[var(--hm-text-primary)] text-[8px] flex items-center gap-1">
          <Video className="w-2.5 h-2.5 text-green-400" /> SELF PREVIEW
        </span>
        <span
          className={`px-1.5 py-0.2 rounded font-bold text-[7px] flex items-center gap-0.5 ${
            faceDetected
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
          }`}
        >
          {faceDetected ? "ON" : "OFF"}
        </span>
      </div>

      {/* Live Video Feed - Clean 4:3 PIP Feed */}
      <div className="relative flex-1 bg-neutral-900 overflow-hidden flex items-center justify-center">
        <video
          ref={(el) => {
            if (videoRef) (videoRef as any).current = el
            if (el && streamRef?.current && el.srcObject !== streamRef.current) {
              el.srcObject = streamRef.current
              el.play().catch(() => {})
            }
          }}
          playsInline
          muted
          autoPlay
          onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
