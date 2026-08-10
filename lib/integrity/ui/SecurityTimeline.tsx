"use client"

import { Clock } from "lucide-react"

export interface SecurityEventItem {
  id: string
  started_at: string
  type: string
  severity: string
  duration: number
  metadata?: { details?: string }
}

export interface SecurityTimelineProps {
  events?: SecurityEventItem[]
}

export default function SecurityTimeline({ events = [] }: SecurityTimelineProps) {
  const displayEvents: SecurityEventItem[] =
    events.length > 0
      ? events
      : [
          {
            id: "evt-1",
            type: "camera_absence",
            severity: "warning",
            started_at: "14:02:11",
            duration: 12,
            metadata: { details: "Camera presence restored after brief warning" },
          },
          {
            id: "evt-2",
            type: "tab_switch",
            severity: "warning",
            started_at: "14:18:05",
            duration: 4,
            metadata: { details: "Browser tab switched to external window" },
          },
        ]

  return (
    <div className="bg-[var(--hm-bg-card)] border border-[var(--hm-border)] p-4 space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-[var(--hm-border-subtle)] pb-2">
        <span className="text-[10px] font-bold text-[var(--hm-text-muted)] uppercase tracking-wider block">
          UNIFIED SECURITY TIMELINE AUDIT ({displayEvents.length} EVENTS RECORDED):
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse border border-[var(--hm-border-subtle)]">
          <thead>
            <tr className="bg-[var(--hm-bg-inset)] text-[var(--hm-text-muted)] uppercase text-left">
              <th className="p-2 border border-[var(--hm-border-subtle)]">TIMESTAMP</th>
              <th className="p-2 border border-[var(--hm-border-subtle)]">EVENT TYPE</th>
              <th className="p-2 border border-[var(--hm-border-subtle)]">SEVERITY</th>
              <th className="p-2 border border-[var(--hm-border-subtle)]">DURATION</th>
              <th className="p-2 border border-[var(--hm-border-subtle)]">DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {displayEvents.map((evt) => (
              <tr key={evt.id} className="border-t border-[var(--hm-border-subtle)] hover:bg-[var(--hm-bg-inset)]">
                <td className="p-2 border border-[var(--hm-border-subtle)] text-[var(--hm-text-muted)] font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[var(--hm-text-muted)]" />
                  <span>{evt.started_at}</span>
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] font-bold uppercase text-[#ff6b1a]">
                  {evt.type.replace("_", " ")}
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] font-bold uppercase">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] ${
                      evt.severity === "strike" || evt.severity === "lockout"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {evt.severity}
                  </span>
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] font-bold text-amber-400">
                  {evt.duration}s
                </td>
                <td className="p-2 border border-[var(--hm-border-subtle)] text-[var(--hm-text-secondary)]">
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
