"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Plus, Trash2, MoveUp, MoveDown, HelpCircle, Tag, Check, ChevronRight,
  GitBranch, Eye, Clock, ShieldCheck, Sparkles, Sliders
} from "lucide-react"

export interface QuestionItemUI {
  id: string
  text: string
  difficulty: "easy" | "medium" | "hard"
  expected_duration_seconds: number
  mandatory: boolean
  allow_followups: boolean
  max_followups: number
  tags: string[]
  order: number
  extracted_field?: string
}

export interface TopicWeightUI {
  topic: string
  weight: number
}

export interface RoundBlueprintUI {
  enabled: boolean
  time_limit_minutes: number
  passing_score: number
  evaluation_focus: string[]
  topic_weights: TopicWeightUI[]
  custom_questions: QuestionItemUI[]
  assignment_details?: {
    title: string
    description: string
    estimated_hours: number
    deadline_hours: number
    submission_type: "github" | "zip" | "text"
    must_include: string[]
    optional_bonus: string[]
  }
  speaking_details?: {
    duration_seconds: number
    focus: string[]
  }
}

interface QuestionCardEditorProps {
  roundType: "assignment" | "tech" | "interview" | "speaking" | "hr"
  blueprint: RoundBlueprintUI
  onChange: (updated: RoundBlueprintUI) => void
}

const HR_FIELD_OPTIONS = [
  { label: "Notice Period", value: "notice_period" },
  { label: "Expected Salary", value: "expected_salary" },
  { label: "Work Location Preference", value: "work_preference" },
  { label: "Current Employment Status", value: "current_status" },
  { label: "Reason for Leaving", value: "reason_for_leaving" },
]

export function QuestionCardEditor({ roundType, blueprint, onChange }: QuestionCardEditorProps) {
  const [activeTab, setActiveTab] = useState<"questions" | "topics" | "flow" | "settings">("questions")
  const [newTagInput, setNewTagInput] = useState<{ [qId: string]: string }>({})
  const [newTopicName, setNewTopicName] = useState("")
  const [newTopicWeight, setNewTopicWeight] = useState(10)

  // ── Helper updates ──────────────────────────────────────────────────────────
  const updateBlueprint = (partial: Partial<RoundBlueprintUI>) => {
    onChange({ ...blueprint, ...partial })
  }

  const addQuestion = () => {
    const newQ: QuestionItemUI = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: "",
      difficulty: "medium",
      expected_duration_seconds: 120,
      mandatory: true,
      allow_followups: true,
      max_followups: 2,
      tags: [],
      order: (blueprint.custom_questions?.length || 0) + 1,
      extracted_field: roundType === "hr" ? "notice_period" : undefined,
    }
    updateBlueprint({
      custom_questions: [...(blueprint.custom_questions || []), newQ],
    })
  }

  const updateQuestion = (id: string, partial: Partial<QuestionItemUI>) => {
    const list = (blueprint.custom_questions || []).map(q => q.id === id ? { ...q, ...partial } : q)
    updateBlueprint({ custom_questions: list })
  }

  const removeQuestion = (id: string) => {
    const filtered = (blueprint.custom_questions || []).filter(q => q.id !== id)
      .map((q, idx) => ({ ...q, order: idx + 1 }))
    updateBlueprint({ custom_questions: filtered })
  }

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const questions = [...(blueprint.custom_questions || [])]
    const targetIdx = direction === "up" ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= questions.length) return

    const temp = questions[index]
    questions[index] = questions[targetIdx]
    questions[targetIdx] = temp

    const reordered = questions.map((q, idx) => ({ ...q, order: idx + 1 }))
    updateBlueprint({ custom_questions: reordered })
  }

  const addTagToQuestion = (qId: string) => {
    const tag = (newTagInput[qId] || "").trim().toLowerCase()
    if (!tag) return
    const q = blueprint.custom_questions.find(x => x.id === qId)
    if (q && !q.tags.includes(tag)) {
      updateQuestion(qId, { tags: [...q.tags, tag] })
    }
    setNewTagInput({ ...newTagInput, [qId]: "" })
  }

  const removeTagFromQuestion = (qId: string, tag: string) => {
    const q = blueprint.custom_questions.find(x => x.id === qId)
    if (q) {
      updateQuestion(qId, { tags: q.tags.filter(t => t !== tag) })
    }
  }

  const addTopicWeight = () => {
    if (!newTopicName.trim()) return
    const existing = blueprint.topic_weights || []
    if (!existing.some(t => t.topic.toLowerCase() === newTopicName.trim().toLowerCase())) {
      updateBlueprint({
        topic_weights: [...existing, { topic: newTopicName.trim(), weight: newTopicWeight }]
      })
    }
    setNewTopicName("")
    setNewTopicWeight(10)
  }

  const removeTopicWeight = (topicName: string) => {
    updateBlueprint({
      topic_weights: (blueprint.topic_weights || []).filter(t => t.topic !== topicName)
    })
  }

  return (
    <div className="space-y-5 text-xs">
      {/* Round Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.05] pb-3.5 gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`px-3.5 py-2 rounded-radius-md flex items-center gap-1.5 transition-all text-[11px] font-bold ${
              activeTab === "questions"
                ? "bg-signal text-white shadow-md shadow-signal/20"
                : "bg-white/[0.01] border border-white/[0.08] text-neutral-400 hover:text-white"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Questions ({blueprint.custom_questions?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("topics")}
            className={`px-3.5 py-2 rounded-radius-md flex items-center gap-1.5 transition-all text-[11px] font-bold ${
              activeTab === "topics"
                ? "bg-signal text-white shadow-md shadow-signal/20"
                : "bg-white/[0.01] border border-white/[0.08] text-neutral-400 hover:text-white"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Weighted Topics ({blueprint.topic_weights?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("flow")}
            className={`px-3.5 py-2 rounded-radius-md flex items-center gap-1.5 transition-all text-[11px] font-bold ${
              activeTab === "flow"
                ? "bg-signal text-white shadow-md shadow-signal/20"
                : "bg-white/[0.01] border border-white/[0.08] text-neutral-400 hover:text-white"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Live Flow Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-3.5 py-2 rounded-radius-md flex items-center gap-1.5 transition-all text-[11px] font-bold ${
              activeTab === "settings"
                ? "bg-signal text-white shadow-md shadow-signal/20"
                : "bg-white/[0.01] border border-white/[0.08] text-neutral-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Round Rules</span>
          </button>
        </div>

        {/* Enabled Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-neutral-400 text-[10px] tracking-wider uppercase">
          <span>Enable Round:</span>
          <input
            type="checkbox"
            checked={blueprint.enabled}
            onChange={(e) => updateBlueprint({ enabled: e.target.checked })}
            className="accent-signal w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* ── TAB 1: QUESTIONS EDITOR ────────────────────────────────────────── */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
              Define exact questions for candidates. The AI will ask them in sequence.
            </p>
            <Button
              type="button"
              onClick={addQuestion}
              className="btn-primary text-xs font-bold px-4 h-9 rounded-full flex items-center gap-1.5 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Question
            </Button>
          </div>

          {(!blueprint.custom_questions || blueprint.custom_questions.length === 0) ? (
            <div className="border border-dashed border-white/[0.08] p-8 text-center text-neutral-500 rounded-radius-lg bg-white/[0.01] space-y-2.5">
              <Sparkles className="w-6 h-6 mx-auto text-signal animate-pulse" />
              <p className="text-xs font-display font-extrabold uppercase tracking-wider">No custom questions added</p>
              <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wider">The AI uses default matching vectors. Click &quot;Add Custom Question&quot; to customize.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {blueprint.custom_questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white/[0.01] dark:bg-black/20 border border-white/[0.04] p-5 rounded-radius-lg space-y-3.5 relative group reveal-up"
                >
                  {/* Header & Controls */}
                  <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-signal/10 border border-signal/20 text-signal font-extrabold px-2.5 py-0.5 rounded-radius-full text-[9px] uppercase tracking-wider">
                        Q{idx + 1}
                      </span>
                      <span className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-wider">ID: {q.id}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 text-neutral-400 hover:text-signal disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 rounded-lg transition-all"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(idx, "down")}
                        disabled={idx === blueprint.custom_questions.length - 1}
                        className="p-1.5 text-neutral-400 hover:text-signal disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 rounded-lg transition-all"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all ml-2"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-1.5">
                    <label className="eyebrow text-neutral-400 block">
                      Question Text:
                    </label>
                    <textarea
                      value={q.text}
                      onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                      placeholder="e.g., Explain Docker multi-stage builds and how you optimize layer caching for production containers."
                      className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-xs text-neutral-200 p-3 rounded-radius-md resize-none min-h-[64px] focus:outline-none focus:border-signal font-semibold"
                    />
                  </div>

                  {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white/[0.01] p-3.5 border border-white/[0.04] rounded-radius-lg">
                    {/* Difficulty */}
                    <div className="space-y-1">
                      <label className="eyebrow text-neutral-400 block">Difficulty:</label>
                      <select
                        value={q.difficulty}
                        onChange={(e) => updateQuestion(q.id, { difficulty: e.target.value as any })}
                        className="w-full bg-white/[0.02] dark:bg-black/30 border border-white/[0.08] text-xs text-neutral-200 p-2 rounded-radius-md focus:outline-none focus:border-signal font-bold uppercase tracking-wider"
                      >
                        <option value="easy" className="text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-950 font-bold">Easy</option>
                        <option value="medium" className="text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-950 font-bold">Medium</option>
                        <option value="hard" className="text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-950 font-bold">Hard</option>
                      </select>
                    </div>

                    {/* Max AI Followups */}
                    <div className="space-y-1">
                      <label className="eyebrow text-neutral-400 block">Max AI Follow-ups:</label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={q.max_followups}
                        onChange={(e) => updateQuestion(q.id, { max_followups: parseInt(e.target.value) || 0 })}
                        className="w-full bg-white/[0.02] dark:bg-black/30 border border-white/[0.08] text-xs text-neutral-200 p-2 rounded-radius-md focus:outline-none focus:border-signal font-bold"
                      />
                    </div>

                    {/* HR Field Mapping (Only for HR Round) */}
                    {roundType === "hr" ? (
                      <div className="space-y-1">
                        <label className="eyebrow text-neutral-400 block">Map To Field:</label>
                        <select
                          value={q.extracted_field || ""}
                          onChange={(e) => updateQuestion(q.id, { extracted_field: e.target.value })}
                          className="w-full bg-white/[0.02] dark:bg-black/30 border border-white/[0.08] text-neutral-200 p-2 rounded-radius-md focus:outline-none focus:border-signal font-bold uppercase tracking-wider"
                        >
                          {HR_FIELD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value} className="text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-950 font-bold">{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-5 pt-5 font-bold uppercase tracking-wider text-[9px] text-neutral-400">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.mandatory}
                            onChange={(e) => updateQuestion(q.id, { mandatory: e.target.checked })}
                            className="accent-signal w-4 h-4"
                          />
                          <span>Mandatory</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.allow_followups}
                            onChange={(e) => updateQuestion(q.id, { allow_followups: e.target.checked })}
                            className="accent-signal w-4 h-4"
                          />
                          <span>Allow Follow-ups</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="eyebrow text-neutral-400 block">Topic Tags:</label>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1 pl-1">
                      {q.tags.map(t => (
                        <span key={t} className="bg-signal/10 border border-signal/25 text-signal px-2.5 py-0.5 text-[9px] rounded-radius-full font-bold flex items-center gap-1.5 uppercase tracking-wider">
                          #{t}
                          <button type="button" onClick={() => removeTagFromQuestion(q.id, t)} className="hover:text-white font-extrabold text-xs">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 max-w-xs pt-1.5">
                      <input
                        type="text"
                        placeholder="Add tag (e.g. docker)"
                        value={newTagInput[q.id] || ""}
                        onChange={(e) => setNewTagInput({ ...newTagInput, [q.id]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTagToQuestion(q.id); } }}
                        className="flex-1 bg-white/[0.02] border border-white/[0.08] text-[10px] p-2 px-3 rounded-radius-md focus:outline-none focus:border-signal text-neutral-200 font-semibold"
                      />
                      <Button
                        type="button"
                        onClick={() => addTagToQuestion(q.id)}
                        className="bg-white/[0.02] border border-white/[0.08] hover:text-signal text-[10px] px-3.5 h-8 rounded-radius-md font-bold uppercase tracking-wider transition-all"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: WEIGHTED TOPICS ───────────────────────────────────────────── */}
      {activeTab === "topics" && (
        <div className="space-y-4">
          <p className="eyebrow text-neutral-400">
            Define weighted topics to score semantic candidate coverage (e.g. Docker: 10, Redis: 6).
          </p>

          <div className="flex flex-col sm:flex-row items-end gap-3.5 bg-white/[0.01] dark:bg-black/25 p-4 border border-white/[0.04] rounded-radius-lg">
            <div className="flex-1 w-full space-y-1.5">
              <label className="eyebrow text-neutral-400 block">Topic Name:</label>
              <input
                type="text"
                placeholder="e.g. Kubernetes"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] text-xs p-2.5 px-3 rounded-radius-md focus:outline-none focus:border-signal text-neutral-200 font-semibold"
              />
            </div>
            <div className="w-full sm:w-32 space-y-1.5">
              <label className="eyebrow text-neutral-400 block">Weight (1-10):</label>
              <input
                type="number"
                min="1"
                max="10"
                value={newTopicWeight}
                onChange={(e) => setNewTopicWeight(parseInt(e.target.value) || 1)}
                className="w-full bg-white/[0.02] border border-white/[0.08] text-xs p-2.5 px-3 rounded-radius-md focus:outline-none focus:border-signal text-neutral-200 font-bold"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Button
                type="button"
                onClick={addTopicWeight}
                className="w-full sm:w-auto btn-primary text-white text-xs px-4 h-10 rounded-radius-md font-bold flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5 text-white" /> Add Weighted Topic
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(blueprint.topic_weights || []).map(tw => (
              <div key={tw.topic} className="bg-white/[0.01] border border-white/[0.04] p-4 flex items-center justify-between rounded-radius-lg hover:border-signal/20 transition-all">
                <div className="font-bold">
                  <span className="text-xs text-neutral-900 dark:text-neutral-200 uppercase tracking-wider">#{tw.topic}</span>
                  <span className="text-[10px] text-neutral-400 ml-2.5 uppercase tracking-wider">Weight: {tw.weight}/10</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTopicWeight(tw.topic)}
                  className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-radius-md transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: LIVE FLOW PREVIEW ───────────────────────────────────────── */}
      {activeTab === "flow" && (
        <div className="space-y-4">
          <div className="bg-white/[0.01] border border-white/[0.04] p-5 rounded-radius-lg space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <h4 className="text-xs font-display font-extrabold uppercase tracking-wider text-signal flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-signal" /> Candidate Experience Flowchart Preview
            </h4>

            {(!blueprint.custom_questions || blueprint.custom_questions.length === 0) ? (
              <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider pl-1">No custom questions added yet to render sequence preview.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-white/[0.05]">
                {blueprint.custom_questions.map((q, idx) => (
                  <div key={q.id} className="relative pl-10">
                    <div className="absolute left-2 top-2.5 w-4.5 h-4.5 bg-signal text-white text-[9px] font-bold rounded-radius-full flex items-center justify-center -translate-x-1/2">
                      {idx + 1}
                    </div>

                    <div className="bg-white/[0.01] border border-white/[0.04] p-4 space-y-2 rounded-radius-lg">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-display font-extrabold text-neutral-900 dark:text-neutral-200">
                          {q.text || "(Empty Question Text)"}
                        </span>
                        <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-radius-full font-bold uppercase tracking-wider shrink-0 mt-0.5">
                          {q.difficulty}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[9px] text-neutral-500 font-bold uppercase tracking-wider">
                        <span>Max Follow-ups: {q.max_followups}</span>
                        <span>·</span>
                        <span>Duration: ~{q.expected_duration_seconds}s</span>
                        {q.tags.length > 0 && (
                          <>
                            <span>·</span>
                            <span>Tags: {q.tags.map(t => `#${t}`).join(", ")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: ROUND RULES ────────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="bg-white/[0.01] border border-white/[0.04] p-5 rounded-radius-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="eyebrow text-neutral-400 block">Time Limit (Minutes):</label>
              <input
                type="number"
                value={blueprint.time_limit_minutes || 30}
                onChange={(e) => updateBlueprint({ time_limit_minutes: parseInt(e.target.value) || 30 })}
                className="w-full bg-white/[0.02] border border-white/[0.08] text-xs p-2.5 px-3 rounded-radius-md focus:outline-none focus:border-signal text-neutral-200 font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow text-neutral-400 block">Passing Threshold Score (%):</label>
              <input
                type="number"
                value={blueprint.passing_score || 70}
                onChange={(e) => updateBlueprint({ passing_score: parseInt(e.target.value) || 70 })}
                className="w-full bg-white/[0.02] border border-white/[0.08] text-xs p-2.5 px-3 rounded-radius-md focus:outline-none focus:border-signal text-neutral-200 font-bold"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
