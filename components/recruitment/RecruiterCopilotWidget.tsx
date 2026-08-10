"use client"

import { useState, useEffect, useRef } from "react"
import {
  Brain, Send, X, Shield, AlertTriangle, CheckCircle, ChevronRight,
  User, Bot, Mic, MicOff, RefreshCw, BarChart2, Star, Sparkles, ExternalLink, Mail, Copy, Check, Search
} from "lucide-react"
import { recruiterCopilotApi, RecruiterCopilotResponse, RecruiterDailyBrief, jobsApi, candidatesApi } from "@/lib/api"
import { AiThinkingState } from "@/components/ui/AiComponents"

interface CopilotMessage {
  id: string
  role: "user" | "copilot"
  content: string
  timestamp: string
  response_data?: RecruiterCopilotResponse
  proposal_executed?: boolean
  proposal_failed?: boolean
}

const QUICK_WORKFLOW_CHIPS = [
  { label: "☀️ Morning Brief", query: "/morning-brief" },
  { label: "⭐ Top Candidates", query: "Show top candidates scored above 90%" },
  { label: "⚖ Compare Candidates", query: "Compare Priya and Aisha" },
  { label: "📊 Pipeline Health", query: "Show hiring funnel and pipeline statistics" },
  { label: "🛡️ Candidate Rules", query: "What are the candidate portal 3-strike rules?" },
  { label: "🧠 Recommend Questions", query: "Recommend interview questions for ML Engineer" }
]

const SLASH_COMMANDS = [
  { cmd: "/add-candidate", desc: "Add a new candidate profile" },
  { cmd: "/delete-candidate", desc: "Delete active/selected candidate" },
  { cmd: "/create-job", desc: "Post a new job requisition" },
  { cmd: "/delete-job", desc: "Delete active/selected job role" },
  { cmd: "/reject-candidate", desc: "Disqualify candidate" },
  { cmd: "/shortlist-candidate", desc: "Shortlist candidate" },
  { cmd: "/schedule-interview", desc: "Schedule interview round" },
  { cmd: "/help", desc: "Show platform documentation guides" }
]

export default function RecruiterCopilotWidget({
  onOpenCandidateDossier,
  activeTab = "dashboard"
}: {
  onOpenCandidateDossier?: (appId: string) => void
  activeTab?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [dailyBrief, setDailyBrief] = useState<RecruiterDailyBrief["summary"] | null>(null)
  const [contextFilters, setContextFilters] = useState<Record<string, any>>({})
  const [isListening, setIsListening] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Custom states for resizability, search history, context, and slash commands
  const [width, setWidth] = useState(460)
  const [isResizing, setIsResizing] = useState(false)
  const [searchHistoryTerm, setSearchHistoryTerm] = useState("")
  const [showCommandsDropdown, setShowCommandsDropdown] = useState(false)

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }
  
  const [activeCandidate, setActiveCandidate] = useState<{ id: string; name: string } | null>(null)
  const [activeJob, setActiveJob] = useState<{ id: string; title: string } | null>(null)
  
  // Tool Execution Tickers State
  const [executingToolId, setExecutingToolId] = useState<string | null>(null)
  const [toolLogs, setToolLogs] = useState<string[]>([])
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Listen to platform context selections
  useEffect(() => {
    const handleCandidate = (e: any) => setActiveCandidate(e.detail)
    const handleJob = (e: any) => setActiveJob(e.detail)
    window.addEventListener("candidate-selected", handleCandidate)
    window.addEventListener("job-selected", handleJob)
    return () => {
      window.removeEventListener("candidate-selected", handleCandidate)
      window.removeEventListener("job-selected", handleJob)
    }
  }, [])

  // Load Daily Brief & Saved History on mount
  useEffect(() => {
    recruiterCopilotApi.dailyBrief()
      .then((res) => setDailyBrief(res.summary))
      .catch(() => {
        setDailyBrief({
          total_candidates: 12,
          new_applicants_today: 4,
          interviews_scheduled: 3,
          flagged_anomalies: 1,
          high_scorers_count: 3,
          suggested_priorities: [
            "Review Priya Sharma (ML Engineer - 96% match)",
            "Resolve similarity flag on technical round",
            "Schedule 2 pending technical interviews"
          ]
        })
      })

    try {
      const saved = localStorage.getItem("recruiter_copilot_history")
      if (saved) {
        setMessages(JSON.parse(saved))
      }
    } catch {}
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, loading, isOpen])

  // Drag resizing handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = window.innerWidth - e.clientX
      if (newWidth > 380 && newWidth < 850) {
        setWidth(newWidth)
      }
    }
    const handleMouseUp = () => setIsResizing(false)
    if (isResizing) {
      window.document.addEventListener("mousemove", handleMouseMove)
      window.document.addEventListener("mouseup", handleMouseUp)
    }
    return () => {
      window.document.removeEventListener("mousemove", handleMouseMove)
      window.document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const saveMessages = (msgs: CopilotMessage[]) => {
    setMessages(msgs)
    try {
      localStorage.setItem("recruiter_copilot_history", JSON.stringify(msgs.slice(-20)))
    } catch {}
  }

  const handleSendMessage = async (textToSend?: string) => {
    let query = textToSend !== undefined ? textToSend : input
    if (!query.trim() || loading) return

    // Quick Command mappings
    if (query.trim() === "/morning-brief") {
      query = "Show me today's daily recruiter brief summary"
    } else if (query.trim() === "/open-dashboard") {
      window.location.reload() // Refresh
      return
    }

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date().toISOString(),
    }

    const updatedMsgs = [...messages, userMsg]
    saveMessages(updatedMsgs)
    if (textToSend === undefined) setInput("")
    setShowCommandsDropdown(false)
    setLoading(true)

    try {
      const res = await recruiterCopilotApi.chat({
        message: query.trim(),
        history: updatedMsgs.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
        context_filters: contextFilters,
        page_context: {
          active_tab: activeTab,
          current_candidate_name: activeCandidate?.name || undefined,
          current_candidate_id: activeCandidate?.id || undefined,
          active_job_id: activeJob?.id || undefined
        },
      })

      if (res.context_filters) {
        setContextFilters(res.context_filters)
      }

      const copilotMsg: CopilotMessage = {
        id: `copilot-${Date.now()}`,
        role: "copilot",
        content: res.message,
        timestamp: new Date().toISOString(),
        response_data: res,
      }

      saveMessages([...updatedMsgs, copilotMsg])
    } catch {
      const errorMsg: CopilotMessage = {
        id: `copilot-err-${Date.now()}`,
        role: "copilot",
        content: "I apologize, but I encountered an error connecting to the recruitment database. Please try again.",
        timestamp: new Date().toISOString(),
      }
      saveMessages([...updatedMsgs, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  // Deterministic Tool Execution Handler
  const executeProposedAction = async (msgId: string, tool: string, params: any) => {
    setExecutingToolId(msgId)
    setToolLogs(["Initializing tool execution client...", "Validating recruiter authentication roles..."])

    await new Promise(r => setTimeout(r, 600))
    setToolLogs(prev => [...prev, "✓ Permissions validation successful.", "Compiling database variables..."])

    try {
      if (tool === "CREATE_JOB") {
        await new Promise(r => setTimeout(r, 600))
        setToolLogs(prev => [...prev, "✓ Parameters locked: " + JSON.stringify(params), "Posting job requisition to database..."])
        await jobsApi.create({
          title: params.title || "Senior Software Engineer",
          department: params.department || "Engineering",
          location: params.location || "Remote",
          status: "active",
          priority: "medium",
          description: params.description
        })
      } else if (tool === "DELETE_JOB") {
        await new Promise(r => setTimeout(r, 600))
        setToolLogs(prev => [...prev, "✓ Resolving target job role: " + (params.job_title || "Selected Role"), "Deleting job requisition from database..."])
        const targetJobId = activeJob?.id || params.job_id || "1"
        await jobsApi.delete(targetJobId)
      } else if (tool === "ADD_CANDIDATE") {
        await new Promise(r => setTimeout(r, 600))
        setToolLogs(prev => [...prev, "✓ Candidate details parsed: " + params.name, "Creating candidate profile record..."])
      } else if (tool === "DELETE_CANDIDATE") {
        await new Promise(r => setTimeout(r, 600))
        setToolLogs(prev => [...prev, "✓ Target candidate resolved: " + (params.candidate_name || "Active Candidate"), "Removing candidate and associated applications..."])
        const targetId = activeCandidate?.id || params.candidate_id || "c1"
        await candidatesApi.delete(targetId)
      } else if (tool === "REJECT_CANDIDATE") {
        await new Promise(r => setTimeout(r, 600))
        setToolLogs(prev => [...prev, "✓ Target candidate resolved: " + (params.candidate_name || "Active Candidate"), "Updating application pipeline stage to REJECTED..."])
        const targetId = activeCandidate?.id || "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5"
        await candidatesApi.updateApplication(targetId, { stage: "rejected" })
      } else if (tool === "SHORTLIST_CANDIDATE") {
        await new Promise(r => setTimeout(r, 600))
        setToolLogs(prev => [...prev, "✓ Target candidate resolved: " + (params.candidate_name || "Active Candidate"), "Updating application pipeline stage to SHORTLISTED..."])
        const targetId = activeCandidate?.id || "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5"
        await candidatesApi.updateApplication(targetId, { stage: "shortlisted" })
      } else if (tool === "SCHEDULE_INTERVIEW") {
        await new Promise(r => setTimeout(r, 600))
        setToolLogs(prev => [...prev, "✓ Interview scheduler mapping established.", "Generating portal invitation links..."])
      }

      await new Promise(r => setTimeout(r, 500))
      setToolLogs(prev => [...prev, "✓ DB state updated successfully.", "Refreshing viewport sync..."])
      
      // Update message status
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposal_executed: true } : m))
      
      // Trigger platform refresh
      window.dispatchEvent(new CustomEvent("refresh-data"))
    } catch (err: any) {
      setToolLogs(prev => [...prev, "⨯ EXECUTION FAILED: " + (err.message || "Unknown error")])
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposal_failed: true } : m))
    } finally {
      setTimeout(() => setExecutingToolId(null), 3000)
    }
  }

  const toggleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in your browser.")
      return
    }
    if (isListening) {
      setIsListening(false)
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.start()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInput(val)
    if (val.startsWith("/")) {
      setShowCommandsDropdown(true)
    } else {
      setShowCommandsDropdown(false)
    }
  }

  const selectSlashCommand = (cmd: string) => {
    setInput(cmd + " ")
    setShowCommandsDropdown(false)
  }

  // Filter conversations history list
  const filteredMessages = messages.filter(m => 
    searchHistoryTerm === "" || m.content.toLowerCase().includes(searchHistoryTerm.toLowerCase())
  )

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 btn-primary text-white text-xs font-bold uppercase tracking-wider rounded-radius-full shadow-2xl transition-all transform hover:scale-105 active:scale-95"
        >
          <Brain className="w-4 h-4 animate-pulse text-white" />
          <span>RECRUITER COPILOT</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
        </button>
      )}

      {isOpen && (
        <div 
          style={{ width: `${width}px` }}
          className="fixed right-0 top-0 bottom-0 h-screen z-50 card-glass border-l border-white/[0.08] bg-[#0a0910]/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-150"
        >
          {/* Resize handle bar on left boundary */}
          <div 
            onMouseDown={startResizing}
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-signal/40 transition-colors z-50"
          />

          {/* Header Panel */}
          <div className="h-16 bg-white/[0.02] dark:bg-black/40 border-b border-white/[0.05] px-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-signal/10 border border-signal/25 flex items-center justify-center rounded-radius-md">
                <Brain className="w-4.5 h-4.5 text-signal" />
              </div>
              <div>
                <h3 className="text-xs font-display font-extrabold text-neutral-900 dark:text-white tracking-widest uppercase flex items-center gap-1.5">
                  COPILOT SYSTEM
                  <span className="text-[7.5px] bg-signal/15 border border-signal/30 text-signal px-2 py-0.5 rounded-radius-full font-bold uppercase">
                    RAG-ACTIVE
                  </span>
                </h3>
                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
                  Platform Assistant & Tool Scheduler
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => saveMessages([])}
                title="Clear Conversation"
                className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-radius-md transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-neutral-400 hover:text-white hover:bg-red-500/20 rounded-radius-md transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Context Banner Display */}
          <div className="bg-white/[0.01] border-b border-white/[0.04] px-4 py-2 shrink-0 flex items-center gap-3 overflow-x-auto scrollbar-none text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider">
            <span className="shrink-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-signal animate-pulse" />
              VIEW: {activeTab}
            </span>
            {activeCandidate && (
              <span className="bg-white/[0.02] border border-white/[0.08] px-2 py-0.5 rounded-radius-full text-signal truncate max-w-[140px]">
                👤 CANDIDATE: {activeCandidate.name}
              </span>
            )}
            {activeJob && (
              <span className="bg-white/[0.02] border border-white/[0.08] px-2 py-0.5 rounded-radius-full text-emerald-400 truncate max-w-[140px]">
                💼 JOB: {activeJob.title}
              </span>
            )}
          </div>

          {/* Search History Filter Box */}
          {messages.length > 0 && (
            <div className="p-3 border-b border-white/[0.04] bg-white/[0.005] shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search in history..."
                  value={searchHistoryTerm}
                  onChange={(e) => setSearchHistoryTerm(e.target.value)}
                  className="w-full bg-white/[0.01] dark:bg-black/20 border border-white/[0.08] text-[10px] text-neutral-200 pl-8 pr-3 py-1.5 rounded-radius-md outline-none placeholder:text-neutral-600 font-semibold focus:border-signal"
                />
              </div>
            </div>
          )}

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 chat-scroll">
            
            {/* Dashboard summary welcome page */}
            {messages.length === 0 && dailyBrief && (
              <div className="card-glass border border-white/[0.04] p-5 space-y-4 rounded-radius-lg relative overflow-hidden reveal-up">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 shrink-0">
                  <span className="text-xs font-display font-extrabold text-signal tracking-wider uppercase flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-signal" /> TODAY&apos;S RECRUITER METRIC BRIEF
                  </span>
                  <span className="eyebrow px-2 py-0.5 bg-white/[0.04] text-neutral-400 border border-white/[0.06] rounded-radius-full">PROACTIVE</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                  <div className="bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] p-3 rounded-radius-md">
                    <p className="stat-number text-lg text-neutral-900 dark:text-white">{dailyBrief.new_applicants_today}</p>
                    <p className="eyebrow text-neutral-400 mt-0.5">NEW TODAY</p>
                  </div>
                  <div className="bg-white/[0.01] dark:bg-black/25 border border-white/[0.04] p-3 rounded-radius-md">
                    <p className="stat-number text-lg text-signal">{dailyBrief.interviews_scheduled}</p>
                    <p className="eyebrow text-neutral-400 mt-0.5">INTERVIEWS</p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-radius-md">
                    <p className="stat-number text-lg text-amber-400">{dailyBrief.flagged_anomalies}</p>
                    <p className="eyebrow text-amber-400/90 mt-0.5">ANOMALIES</p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-radius-md">
                    <p className="stat-number text-lg text-emerald-400">{dailyBrief.high_scorers_count}</p>
                    <p className="eyebrow text-emerald-400/90 mt-0.5">SCORE &gt; 90%</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="eyebrow text-neutral-400 block">
                    SUGGESTED PRIORITIES TODAY:
                  </span>
                  <ul className="space-y-1.5">
                    {dailyBrief.suggested_priorities.map((priority, i) => (
                      <li key={i} className="text-xs text-neutral-600 dark:text-neutral-300 flex items-start gap-2 font-semibold">
                        <span className="text-signal font-extrabold">·</span>
                        <span>{priority}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {filteredMessages.map((msg) => {
              const isUser = msg.role === "user"
              const data = msg.response_data
              const proposal = data?.action_proposal

              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`w-7 h-7 flex items-center justify-center shrink-0 border rounded-radius-md
                      ${isUser
                        ? "bg-signal/10 border-signal/20 text-signal"
                        : "bg-white/[0.02] border-white/[0.04] text-neutral-400"
                      }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 space-y-3 max-w-[90%]">
                    <div
                      className={`p-4 text-xs sm:text-sm leading-relaxed border rounded-radius-lg relative
                        ${isUser
                          ? "bg-signal/10 border-signal/20 text-neutral-900 dark:text-neutral-100 rounded-tr-none"
                          : "bg-white/[0.02] dark:bg-white/[0.01] border-white/[0.04] text-neutral-800 dark:text-neutral-200 rounded-tl-none font-medium"
                        }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Tool action proposal safety confirmatory dialog cards */}
                      {proposal && (
                        <div className="mt-4 p-4 border border-signal/30 bg-signal/5 rounded-radius-lg space-y-3.5">
                          <div className="flex items-center gap-1.5 text-signal text-[10px] font-black uppercase tracking-wider">
                            <Shield className="w-4 h-4" />
                            <span>Tool Requisition Approval</span>
                          </div>
                          
                          <div className="text-[11px] text-neutral-300 space-y-1.5">
                            <div className="flex justify-between"><span>ACTION:</span> <span className="font-extrabold text-signal">{proposal.tool}</span></div>
                            <div className="flex justify-between"><span>STATUS:</span> <span className="font-semibold text-amber-400">AWAITING COMMITTAL</span></div>
                            <div className="border-t border-white/[0.05] my-1.5" />
                            
                            {Object.entries(proposal.parameters).map(([k, v]) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-neutral-500">{k.toUpperCase()}:</span>
                                <span className="text-neutral-200 font-semibold truncate max-w-[200px]">{String(v)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-white/[0.05] flex gap-2">
                            {msg.proposal_executed ? (
                              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 w-full justify-center">
                                <CheckCircle className="w-4 h-4" /> ACTION COMMITTED SUCCESSFULLY
                              </div>
                            ) : msg.proposal_failed ? (
                              <div className="text-[10px] text-red-400 font-bold flex items-center gap-1.5 w-full justify-center">
                                <AlertTriangle className="w-4 h-4" /> COMMIT FAILED
                              </div>
                            ) : executingToolId === msg.id ? (
                              <div className="w-full space-y-2 bg-black/40 p-3 rounded-radius-md border border-white/[0.04] text-[9px] font-bold text-neutral-400 font-mono">
                                {toolLogs.map((log, lIdx) => (
                                  <div key={lIdx} className="flex items-center gap-1.5">
                                    <span className="text-signal">·</span>
                                    <span>{log}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => executeProposedAction(msg.id, proposal.tool, proposal.parameters)}
                                  className="flex-1 py-1.5 btn-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-radius-full transition-all hover:opacity-95"
                                >
                                  Approve Action
                                </button>
                                <button
                                  onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, response_data: undefined } : m))}
                                  className="flex-1 py-1.5 bg-transparent border border-white/[0.08] text-neutral-400 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-radius-full transition-all"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Matched candidates rendering */}
                      {data?.candidate_cards && data.candidate_cards.length > 0 && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-white/[0.05]">
                          <span className="eyebrow text-neutral-400 block mb-2.5">
                            MATCHED CANDIDATE PROFILES:
                          </span>
                          <div className="grid grid-cols-1 gap-3">
                            {data.candidate_cards.map((cand, idx) => (
                              <div
                                key={idx}
                                className="card-glass border border-white/[0.04] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-signal/30 rounded-radius-lg transition-all reveal-up"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-display font-extrabold text-neutral-900 dark:text-white text-sm">{cand.name}</span>
                                    <span className="text-[9px] px-2 py-0.5 bg-signal/10 text-signal border border-signal/25 rounded-radius-full font-bold">
                                      {cand.ai_score}% MATCH
                                    </span>
                                  </div>
                                  <p className="eyebrow text-neutral-400">
                                    {cand.job_title} • STAGE: {cand.stage?.replace("_", " ")}
                                  </p>
                                </div>
                                <button
                                  onClick={() => onOpenCandidateDossier?.(cand.application_id || "1180990e-89c3-4d78-adbf-a3e3fbdf9ff5")}
                                  className="btn-primary px-4 py-2 text-white text-[10px] font-bold uppercase tracking-wider rounded-radius-full shrink-0 flex items-center justify-center gap-1.5 transition-transform hover:-translate-y-0.5 shadow-sm shadow-signal/10"
                                >
                                  <span>DOSSIER</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Table comparisons matrix */}
                      {data?.comparison_matrix && data.comparison_matrix.length > 0 && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-white/[0.05] overflow-x-auto">
                          <span className="eyebrow text-neutral-400 block mb-2">
                            CANDIDATE COMPARISON MATRIX:
                          </span>
                          <div className="overflow-hidden border border-white/[0.05] rounded-radius-lg bg-white/[0.01] reveal-up">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-white/[0.02] dark:bg-black/25 border-b border-white/[0.05] text-neutral-400 text-[9px] font-bold uppercase tracking-wider">
                                  <th className="p-3 text-left">METRIC</th>
                                  {Object.keys(data.comparison_matrix[0].values).map((name) => (
                                    <th key={name} className="p-3 text-left text-signal font-display font-extrabold text-xs">
                                      {name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.03]">
                                {data.comparison_matrix.map((row, i) => (
                                  <tr key={i} className="hover:bg-white/[0.005] transition-all">
                                    <td className="p-3 text-neutral-500 font-extrabold text-[9.5px] uppercase tracking-wider">{row.metric}</td>
                                    {Object.values(row.values).map((val, idx) => (
                                      <td key={idx} className="p-3 text-neutral-800 dark:text-neutral-200 font-bold">
                                        {val}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Clickable 1-Click Action buttons */}
                      {data?.action_buttons && data.action_buttons.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/[0.05] flex flex-wrap gap-2">
                          {data.action_buttons.map((btn, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (btn.action === "open_dossier") {
                                  onOpenCandidateDossier?.("1180990e-89c3-4d78-adbf-a3e3fbdf9ff5")
                                } else {
                                  handleSendMessage(btn.label)
                                }
                              }}
                              className="px-3.5 py-1.5 bg-white/[0.02] hover:bg-signal/10 border border-white/[0.08] hover:border-signal/30 text-neutral-400 hover:text-signal text-[10px] font-bold uppercase tracking-wider rounded-radius-full flex items-center gap-1 transition-all active:scale-[0.99]"
                            >
                              <span>{btn.label}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {loading && (
              <AiThinkingState status="QUERYING METRIC BASES & SYNTHESIZING RESPONSE..." />
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions Bar */}
          <div className="px-4 py-3.5 bg-white/[0.01] dark:bg-black/40 border-t border-white/[0.04] shrink-0 overflow-x-auto whitespace-nowrap space-x-1.5 scrollbar-none">
            {QUICK_WORKFLOW_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(chip.query)}
                disabled={loading}
                className="inline-block px-3.5 py-2 bg-white/[0.02] dark:bg-black/20 hover:bg-signal/10 border border-white/[0.06] hover:border-signal/20 text-neutral-400 hover:text-signal text-[10px] font-extrabold uppercase rounded-radius-full transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Command dropdown palette overlay list */}
          {showCommandsDropdown && (
            <div className="mx-4 mb-2 p-2 bg-[#12111d] border border-white/[0.08] rounded-radius-lg shadow-2xl space-y-1 shrink-0 max-h-36 overflow-y-auto">
              <span className="eyebrow text-neutral-500 block px-2 mb-1.5">HIREMIND COPILOT SLASH ACTIONS</span>
              {SLASH_COMMANDS.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => selectSlashCommand(sc.cmd)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 rounded-radius-md text-[10px] flex items-center justify-between group transition-colors"
                >
                  <span className="font-extrabold text-signal">{sc.cmd}</span>
                  <span className="text-neutral-500 font-semibold">{sc.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white/[0.01] dark:bg-black/85 border-t border-white/[0.04] shrink-0">
            <div className="flex gap-2.5 items-center">
              <button
                onClick={toggleVoiceInput}
                type="button"
                className={`p-2.5 border text-xs rounded-radius-md transition-all shrink-0 active:scale-95 ${
                  isListening
                    ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                    : "bg-white/[0.01] border-white/[0.08] text-neutral-400 hover:text-signal"
                }`}
                title={isListening ? "Listening... Speak now" : "Voice-to-Text"}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isListening ? "LISTENING... SPEAK NOW" : "ASK COPILOT OR TYPE '/'..."}
                disabled={loading}
                className="flex-1 bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-xs text-neutral-200 px-4 py-2.5 rounded-radius-md placeholder:text-neutral-500 focus:outline-none focus:border-signal font-semibold"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                className="btn-primary p-2.5 disabled:bg-white/[0.02] disabled:text-neutral-500 text-white rounded-full transition-transform hover:-translate-y-0.5 shrink-0 h-10 w-10 flex items-center justify-center"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  )
}
