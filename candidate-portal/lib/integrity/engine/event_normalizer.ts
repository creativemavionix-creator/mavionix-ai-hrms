export type SecurityEventType =
  | "camera_absence"
  | "tab_switch"
  | "mic_disconnected"
  | "network_loss"
  | "fullscreen_exit"
  | "portal_refresh"

export type EventSeverity = "info" | "warning" | "strike" | "lockout"

export interface NormalizedSecurityEvent {
  id: string
  type: SecurityEventType
  severity: EventSeverity
  started_at: string
  ended_at?: string
  duration: number // in seconds
  metadata?: {
    confidence?: number
    landmarks?: number
    reason?: string
    details?: string
  }
}

export function createNormalizedEvent(
  type: SecurityEventType,
  severity: EventSeverity,
  duration: number,
  metadata?: NormalizedSecurityEvent["metadata"]
): NormalizedSecurityEvent {
  const now = new Date()
  return {
    id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    severity,
    started_at: now.toLocaleTimeString(),
    ended_at: now.toLocaleTimeString(),
    duration: Math.max(0, duration),
    metadata: {
      confidence: 0.95,
      ...metadata,
    },
  }
}
