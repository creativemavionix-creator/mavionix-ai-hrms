"use client"

import { Clock, Shield, AlertTriangle } from "lucide-react"
import { NormalizedSecurityEvent } from "../engine/event_normalizer"

export interface SecurityTimelineProps {
  events?: NormalizedSecurityEvent[]
}

export default function SecurityTimeline({ events = [] }: SecurityTimelineProps) {
  const displayEvents: NormalizedSecurityEvent[] =
    events.length > 0
      ? events
      : [
          {
            id: "evt-1",
            type: "camera_absence",
            severity: "warning",
            started_at: "14:02:11",
            ended_at: "14:02:23",
            duration: 12,
            metadata: { confidence: 0.96, details: "Camera presence restored after brief warning" },
          },
          {
            id: "evt-2",
            type: "tab_switch",
            severity: "warning",
            started_at: "14:18:05",
            ended_at: "14:18:09",
            duration: 4,
            metadata: { confidence: 1.0, details: "Browser tab switched to external window" },
          },
        ]

  return (
    <div className="bg-[var(--hm-bg-card)] border border-[var(--hm-border)] p-6 rounded-2xl shadow-xl space-y-5 font-mono text-base">
      <div className="flex items-center justify-between border-b border-[var(--hm-border-subtle)] pb-2">
        <span className="text-lg font-bold text-[var(--hm-text-muted)] uppercase tracking-wider block">
          UNIFIED SECURITY TIMELINE AUDIT ({displayEvents.length} EVENTS RECORDED):
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-lg border-collapse border border-[var(--hm-border-subtle)] rounded-lg">
          <thead>
            <tr className="bg-[var(--hm-bg-inset)] text-[var(--hm-text-muted)] uppercase text-left">
              <th className="p-2 border border-[var(--hm-border-subtle)] rounded-lg">TIMESTAMP</th>
              <th className="p-2 border border-[var(--hm-border-subtle)] rounded-lg">EVENT TYPE</th>
              <th className="p-2 border border-[var(--hm-border-subtle)] rounded-lg">SEVERITY</th>
              <th className="p-2 border border-[var(--hm-border-subtle)] rounded-lg">DURATION</th>
              <th className="p-2 border border-[var(--hm-border-subtle)] rounded-lg">DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {displayEvents.map((evt) => (
              <tr key={evt.id} className="border-t border-[var(--hm-border-subtle)] hover:bg-[var(--hm-bg-inset)]">
                <td className="p-2 border border-[var(--hm-border-subtle)] rounded-lg text-[var(--hm-text-muted)] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--hm-text-muted)]" />
                  <span>{evt.started_at}</span>
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] rounded-lg font-bold uppercase text-[var(--hm-accent)]">
                  {evt.type.replace("_", " ")}
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] rounded-lg font-bold uppercase">
                  <span
                    className={`px-1.5 py-0.5 rounded text-base ${
                      evt.severity === "strike" || evt.severity === "lockout"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {evt.severity}
                  </span>
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] rounded-lg font-bold text-amber-400">
                  {evt.duration}s
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] rounded-lg text-[var(--hm-text-secondary)]">
                  {evt.metadata?.details || "Telemetry logged"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
