import { supabase } from "@/lib/supabaseClient"

export interface TaskRecord {
  id?: string
  application_id: string
  title: string
  brief: string
  requirements: string
  deadline: string
  assigned_by?: string
  assigned_at?: string
  submission_url?: string
  submission_text?: string
  submission_files?: any
  submitted_at?: string
  review_status?: "pending" | "approved" | "rejected"
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  created_at?: string
}

// Assign a project task to a candidate
export async function assignProjectTask(
  applicationId: string,
  title: string,
  brief: string,
  requirements: string,
  deadlineDays: number = 3
): Promise<TaskRecord> {
  const deadlineDate = new Date(Date.now() + deadlineDays * 24 * 3600 * 1000).toISOString()
  
  const taskData: TaskRecord = {
    application_id: applicationId,
    title: title || "Distributed Microservices Rate Limiter & Async Router",
    brief: brief || "Implement a high-throughput token bucket rate limiter middleware in Python FastAPI backed by Redis async pipelines.",
    requirements: requirements || "1. Deliverable GitHub Repository URL\n2. Architecture & Design Report\n3. Benchmark test logs",
    deadline: deadlineDate,
    assigned_by: "recruiter",
    assigned_at: new Date().toISOString(),
    review_status: "pending"
  }

  // Backup in localStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`task_assigned_${applicationId}`, JSON.stringify(taskData))
      localStorage.setItem("assigned_project_task", JSON.stringify({
        title: taskData.title,
        description: taskData.brief,
        requirements: taskData.requirements,
        deadlineDays
      }))
    } catch (e) {}
  }

  // Attempt DB write
  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([taskData])
      .select()
    if (!error && data && data.length > 0) {
      return data[0] as TaskRecord
    }
  } catch (e) {
    console.warn("Notice: tasks table insert skipped or pending creation:", e)
  }

  return taskData
}

// Submit a project task as candidate
export async function submitProjectTask(
  applicationId: string,
  submissionText: string,
  submissionUrl: string,
  submissionFiles?: string
): Promise<TaskRecord | null> {
  const submissionPayload = {
    submission_text: submissionText,
    submission_url: submissionUrl,
    submission_files: submissionFiles || null,
    submitted_at: new Date().toISOString(),
    review_status: "pending"
  }

  // Backup in localStorage
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(`task_assigned_${applicationId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        const updated = { ...parsed, ...submissionPayload }
        localStorage.setItem(`task_assigned_${applicationId}`, JSON.stringify(updated))
      }
    } catch (e) {}
  }

  // Attempt DB update
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update(submissionPayload)
      .eq("application_id", applicationId)
      .select()

    if (!error && data && data.length > 0) {
      return data[0] as TaskRecord
    }
  } catch (e) {}

  return null
}

// Fetch assigned task for an application
export async function getTaskForApplication(applicationId: string): Promise<TaskRecord | null> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!error && data && data.length > 0) {
      return data[0] as TaskRecord
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(`task_assigned_${applicationId}`)
      if (saved) return JSON.parse(saved)
    } catch (e) {}
  }

  return null
}
