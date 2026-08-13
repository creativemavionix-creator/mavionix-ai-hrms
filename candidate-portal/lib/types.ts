/**
 * Core types for the candidate portal — matches the Supabase schema.
 */

export type RoundType = "tech" | "interview" | "speaking" | "hr"
export type RoundStatus = "not_started" | "in_progress" | "completed"
export type ApplicationStage =
  | "applied"
  | "screened"
  | "shortlisted"
  | "assignment_sent"
  | "assignment_submitted"
  | "assignment_reviewed"
  | "tech_round"
  | "tech_round_completed"
  | "interview_round"
  | "interview_round_completed"
  | "speaking_round"
  | "speaking_round_completed"
  | "hr_round"
  | "hr_round_completed"
  | "offered"
  | "hired"
  | "rejected"

export interface TranscriptEntry {
  role: "ai" | "candidate"
  message: string
  timestamp: string
  answer_score?: number
  // State machine metadata
  state?: string
  memory?: any
  quality_metadata?: any
  intent?: string
  intent_confidence?: number
  is_warning?: boolean
  is_duplicate?: boolean
  is_plagiarism?: boolean
  suspected_plagiarism?: boolean
  // Copy-paste analyzer metrics
  suspected_copy_paste?: boolean
  copy_paste_risk_score?: number
  copy_paste_reasons?: string[]
  // Asynchronous verification metadata
  speaker?: string
  question?: string
  candidate_answer?: string
  turn?: number
  job_title?: string
  metadata?: any
  speaking_metrics?: {
    audio_duration?: number;
    words_per_minute?: number;
    filler_words_count?: number;
    microphone_fallback?: boolean;
  }
}

export interface AIInterviewRound {
  id: string
  application_id: string
  round_type: RoundType
  transcript: TranscriptEntry[]
  status: RoundStatus
  ai_score: number | null
  ai_summary: string | null
  strengths: string[] | null
  concerns: string[] | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  // Reprocessing fields
  requires_ai_reprocessing?: boolean
  ai_review_completed?: boolean
  evaluation_status?: string
  evaluation_engine?: string
  evaluation_model?: string
  evaluation_version?: number
  retry_count?: number
  last_retry_at?: string | null
  reviewed_at?: string | null
  compact_offline_data?: any
  browser_strike_count?: number
  speaking_eval?: {
    structure?: number;
    confidence?: number;
    conciseness?: number;
    pace?: number;
    vocabulary?: number;
    fillers?: number;
    avg_answer_length?: number;
  }
}

export interface CandidateToken {
  id: string
  candidate_id: string
  application_id: string
  token: string
  round_type: RoundType
  used: boolean
  expires_at: string
  created_at: string
}

export interface Assignment {
  id: string
  application_id: string
  title: string
  description: string
  requirements: string | null
  submission_url: string | null
  submission_text: string | null
  status: "pending" | "submitted" | "reviewed"
  score: number | null
  deadline: string | null
}

export interface CandidateSession {
  token?: string
  candidateId: string
  candidateName: string
  applicationId: string
  roundType: RoundType
  jobTitle: string
  stage: ApplicationStage
  round: AIInterviewRound | null
  assignment?: Assignment | null
  candidateSkills?: string[]
  jobDepartment?: string
  jobDescription?: string
  blueprint_version?: number
  round_blueprints?: Record<string, any>
}

export interface ChatMessage {
  id: string
  role: "ai" | "candidate"
  content: string
  timestamp: string
  answerScore?: number
  speaking_metrics?: {
    audio_duration?: number
    words_per_minute?: number
    filler_words_count?: number
    microphone_fallback?: boolean
  }
}

export interface RoundSummary {
  ai_score: number
  ai_summary: string
  strengths: string[]
  concerns: string[]
}

export interface AIResponse {
  type: "question" | "complete"
  message: string
  answer_score?: number
  exchange_number?: number
  round_complete: boolean
  summary?: RoundSummary
  auto_started_next_round?: string | null
}
