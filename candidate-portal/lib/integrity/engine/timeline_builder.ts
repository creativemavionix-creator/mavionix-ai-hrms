import { NormalizedSecurityEvent } from "./event_normalizer"

export interface TimelineGroup {
  date: string
  events: NormalizedSecurityEvent[]
}

export function buildSecurityTimeline(events: NormalizedSecurityEvent[]): NormalizedSecurityEvent[] {
  return [...events].sort((a, b) => (b.started_at > a.started_at ? 1 : -1))
}
