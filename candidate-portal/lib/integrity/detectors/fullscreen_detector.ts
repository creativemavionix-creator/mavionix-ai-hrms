"use client"

export function setupFullscreenListener(onFullscreenExit: () => void) {
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      onFullscreenExit()
    }
  }

  document.addEventListener("fullscreenchange", handleFullscreenChange)
  return () => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }
}
