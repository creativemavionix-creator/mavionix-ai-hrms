"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  communicationsApi, candidatesApi,
  ApiChannel, MessageStats, ApiCandidate, ChannelStatus,
} from "@/lib/api"
import {
  Send, CheckCircle2, ShieldCheck, Mail, Loader2, AlertTriangle,
  RefreshCw, Sparkles, RotateCcw,
} from "lucide-react"

function getStatusDot(status: ChannelStatus) {
  return status === "active" ? "bg-emerald-500 shadow-emerald-500/50" :
         status === "warning" ? "bg-amber-500 shadow-amber-500/50" :
         status === "critical" ? "bg-red-500 shadow-red-500/50" : "bg-neutral-500"
}

export default function CommunicationView() {
  const [channels, setChannels] = useState<ApiChannel[]>([])
  const [candidates, setCandidates] = useState<ApiCandidate[]>([])
  const [stats, setStats] = useState<MessageStats | null>(null)
  const [loadingInit, setLoadingInit] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [selectedCandId, setSelectedCandId] = useState("")
  const [selectedChanId, setSelectedChanId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoadingInit(true); setFetchError(null)
    try {
      const [chans, cands, msgStats] = await Promise.all([
        communicationsApi.listChannels(),
        candidatesApi.list(),
        communicationsApi.messageStats(),
      ])
      setChannels(chans); setCandidates(cands); setStats(msgStats)
      if (chans.length > 0) setSelectedChanId(chans[0].id)
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load data.")
    } finally { setLoadingInit(false) }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handleGenerate = async () => {
    if (!selectedCandId || !selectedChanId) return
    setIsGenerating(true); setGenerateError(null)
    try {
      const draft = await communicationsApi.generateDraft(selectedCandId, selectedChanId)
      setSubject(draft.subject)
      setBody(draft.body)
    } catch (err: unknown) {
      setGenerateError(err instanceof Error ? err.message : "AI generation failed. Write manually.")
    } finally { setIsGenerating(false) }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandId || !body) return
    setIsSending(true); setSendError(null)
    try {
      await communicationsApi.sendMessage({
        candidate_id: selectedCandId, channel_id: selectedChanId,
        subject: subject || undefined, body,
      })
      const [updatedChans, updatedStats] = await Promise.all([
        communicationsApi.listChannels(), communicationsApi.messageStats(),
      ])
      setChannels(updatedChans); setStats(updatedStats)
      setSuccessMsg("OUTBOX SEND SUCCESSFUL")
      setSelectedCandId(""); setSubject(""); setBody("")
      setTimeout(() => setSuccessMsg(null), 4500)
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send.")
    } finally { setIsSending(false) }
  }

  const eligibleCands = candidates.filter(c => c.stage && !["hired", "rejected"].includes(c.stage))

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wider">
            OUTBOX & <span className="text-gradient">COMMUNICATION CENTER</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Automated candidate correspondence, AI triggers, and delivery statuses.</p>
        </div>
        <button onClick={loadAll} className="p-2 border border-white/[0.08] hover:bg-white/5 text-neutral-400 hover:text-white rounded-radius-md transition-all h-10 w-10 flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 ${loadingInit ? "animate-spin" : ""}`} />
        </button>
      </div>

      {fetchError && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-radius-md text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-radius-md text-xs font-semibold text-emerald-400 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "SENT TODAY", val: stats?.sent_today, delay: "reveal-delay-1" },
          { label: "PENDING OUTBOX", val: stats?.pending_count, delay: "reveal-delay-2" },
          { label: "RESPONSE ACCURACY", val: stats?.response_rate, suffix: "%", delay: "reveal-delay-3" },
          { label: "SCHEDULED SENDS", val: stats?.scheduled_sends, delay: "reveal-delay-4" },
        ].map(({ label, val, suffix, delay }) => (
          <Card key={label} className={`glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up ${delay}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <CardContent className="p-5">
              <p className="eyebrow text-neutral-400">{label}</p>
              {loadingInit ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-500 mt-2" />
              ) : (
                <p className="stat-number text-2xl mt-1.5 text-neutral-900 dark:text-white tracking-tight">{val ?? "—"}{suffix ?? ""}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Channel cards */}
        <div className="lg:col-span-6 space-y-4">
          <span className="eyebrow text-neutral-400 block">ACTIVE DISPATCH CHANNELS</span>
          {channels.map(chan => (
            <Card key={chan.id} className="glass-card border-white/[0.04] rounded-radius-lg hover:border-signal/30 transition-all shadow-sm relative overflow-hidden reveal-up">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1 truncate mr-4">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-radius-full shrink-0 animate-pulse shadow-[0_0_8px_rgba(0,0,0,0.5)] ${getStatusDot(chan.status)}`} />
                    <span className="text-neutral-900 dark:text-white font-extrabold text-xs tracking-wider uppercase truncate font-display">{chan.name}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-semibold uppercase">Channel Type: {chan.type}</div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-5">
                  <div>
                    <div className="text-xs font-extrabold text-neutral-900 dark:text-white">{chan.sent_volume.toLocaleString()}</div>
                    <div className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">SENT</div>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-emerald-400">{Number(chan.delivered_pct).toFixed(1)}%</div>
                    <div className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">DELIVERED</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sender form */}
        <Card className="lg:col-span-6 glass-card border-white/[0.04] rounded-radius-lg shadow-lg relative overflow-hidden reveal-up reveal-delay-2">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <CardTitle className="text-xs font-display font-extrabold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
              <Mail className="w-4 h-4 text-signal" />
              INTERACTIVE TEMPLATE SENDER
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSend}>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-radius-md text-[10px] font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>DRY-RUN ENVIRONMENT: Real email/SMS delivery is disabled in demo setups. Messages are logged to database as &apos;sent&apos; for audit compliance.</span>
              </div>
              {sendError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-radius-md text-[10px] font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">TARGET CANDIDATE *</label>
                <select required value={selectedCandId} onChange={e => setSelectedCandId(e.target.value)}
                  className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-900 dark:text-neutral-200 text-xs p-2.5 rounded-radius-md outline-none focus:border-signal font-semibold">
                  <option value="" className="text-neutral-500">SELECT RECIPIENT...</option>
                  {eligibleCands.map(c => (
                    <option key={c.id} value={c.id} className="text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-950 font-semibold">{c.name} ({c.job_title ?? "—"})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">OUTBOX DISPATCH CHANNEL</label>
                <select value={selectedChanId} onChange={e => setSelectedChanId(e.target.value)}
                  className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-900 dark:text-neutral-200 text-xs p-2.5 rounded-radius-md outline-none focus:border-signal font-semibold">
                  {channels.map(c => (
                    <option key={c.id} value={c.id} className="text-neutral-900 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-950 font-semibold">{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>

              {/* AI Generate Button */}
              <div className="flex items-center gap-3">
                <Button type="button" onClick={handleGenerate}
                  disabled={!selectedCandId || isGenerating}
                  title={!selectedCandId ? "Select a candidate first" : "Generate email draft with AI"}
                  className="bg-signal/10 border border-signal/30 text-signal hover:bg-signal/20 rounded-radius-md text-[10px] font-bold flex items-center gap-1.5 h-9 px-4 disabled:opacity-40 disabled:cursor-not-allowed">
                  {isGenerating ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> GENERATING DRAFT...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 text-signal" /> GENERATE WITH AI</>
                  )}
                </Button>
                {body && !isGenerating && (
                  <button type="button" onClick={handleGenerate}
                    title="Regenerate draft"
                    className="text-neutral-400 hover:text-signal p-1.5 bg-white/5 hover:bg-white/10 rounded-radius-md transition-all">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {generateError && (
                <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3 shrink-0" />{generateError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">SUBJECT LINE</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Interview invitation updates..."
                  className="bg-white/[0.02] dark:bg-black/25 border-white/[0.08] text-neutral-900 dark:text-neutral-200 text-xs p-2.5 rounded-radius-md focus:border-signal focus-visible:ring-0 placeholder:text-neutral-500 font-semibold" />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow text-neutral-400">MESSAGE CONTENT BODY</label>
                <textarea required rows={6} value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Select a candidate and click 'Generate with AI' or write manually..."
                  className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] text-neutral-900 dark:text-neutral-200 text-xs p-3 rounded-radius-md outline-none focus:border-signal resize-none placeholder:text-neutral-500 font-semibold" />
              </div>

              <Button type="submit" disabled={isSending || !selectedCandId || !body}
                className="w-full btn-primary text-white font-bold text-xs h-10 flex items-center justify-center gap-2 rounded-radius-md transition-transform hover:-translate-y-0.5">
                {isSending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> DISPATCHING DRAFT...</>
                ) : (
                  <><Send className="w-3.5 h-3.5 text-white" /> SEND OUTBOX REQUISITION</>
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
