import { supabase } from "@/lib/supabaseClient"

export type CanonicalStage =
  | "submitted"
  | "under_review"
  | "approved"
  | "task_assigned"
  | "task_submitted"
  | "task_approved"
  | "interview_scheduled"
  | "interview_completed"
  | "decision_hired"
  | "decision_rejected"
  | "rejected"

export interface StageHistoryRecord {
  id?: string
  application_id: string
  from_stage: string | null
  to_stage: string
  changed_by: string
  changed_at?: string
  note?: string
}

// Convert canonical stages to database enum values for Supabase storage
export function toDbStage(stage: string): string {
  switch (stage) {
    case "submitted":
    case "under_review":
      return "applied"
    case "approved":
      return "shortlisted"
    case "task_assigned":
      return "assignment_sent"
    case "task_submitted":
      return "assignment_submitted"
    case "interview_scheduled":
      return "tech_round"
    case "decision_hired":
      return "hired"
    case "decision_rejected":
      return "rejected"
    default:
      return stage
  }
}

// Convert database enum values to canonical state machine stages
export function toCanonicalStage(stage: string): CanonicalStage {
  switch (stage) {
    case "applied":
    case "submitted":
      return "under_review"
    case "screened":
      return "under_review"
    case "shortlisted":
    case "approved":
      return "approved"
    case "assignment_sent":
    case "task_assigned":
      return "task_assigned"
    case "assignment_submitted":
    case "task_submitted":
      return "task_submitted"
    case "tech_round":
    case "interview_scheduled":
      return "interview_scheduled"
    case "hired":
    case "decision_hired":
      return "decision_hired"
    case "rejected":
    case "decision_rejected":
      return "decision_rejected"
    default:
      return "under_review"
  }
}

// Log a stage transition to stage_history table and localStorage audit trail
export async function logStageTransition(
  applicationId: string,
  fromStage: string | null,
  toStage: string,
  changedBy: string = "recruiter",
  note: string = ""
): Promise<StageHistoryRecord> {
  const record: StageHistoryRecord = {
    application_id: applicationId,
    from_stage: fromStage,
    to_stage: toStage,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    note: note || `Stage updated to ${toStage}`
  }

  // Local audit trail backup in localStorage
  if (typeof window !== "undefined") {
    try {
      const existingKey = `stage_history_${applicationId}`
      const existing = JSON.parse(localStorage.getItem(existingKey) || "[]")
      localStorage.setItem(existingKey, JSON.stringify([record, ...existing]))
    } catch (e) {
      console.warn("Failed to store local stage history backup:", e)
    }
  }

  // Attempt to write to Supabase stage_history table if table exists
  try {
    const { data, error } = await supabase
      .from("stage_history")
      .insert([record])
      .select()

    if (!error && data && data.length > 0) {
      return data[0] as StageHistoryRecord
    }
  } catch (err) {
    console.warn("Notice: stage_history table write skipped or table pending creation:", err)
  }

  return record
}

// Fetch stage history for a specific application
export async function getStageHistory(applicationId: string): Promise<StageHistoryRecord[]> {
  try {
    const { data, error } = await supabase
      .from("stage_history")
      .select("*")
      .eq("application_id", applicationId)
      .order("changed_at", { ascending: false })

    if (!error && data && data.length > 0) {
      return data as StageHistoryRecord[]
    }
  } catch (e) {}

  // Fallback to local storage audit trail
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(`stage_history_${applicationId}`)
      if (saved) return JSON.parse(saved)
    } catch (e) {}
  }

  return []
}
