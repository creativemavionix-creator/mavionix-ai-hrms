"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { analyticsApi, AnalyticsSummary } from "@/lib/api"
import { BarChart3, TrendingUp, PieChart, Users2, AlertTriangle, RefreshCw } from "lucide-react"

// ── SVG area chart (reused for time-to-hire) ──────────────────────────────────
function AreaChart({
  values, labels, maxVal,
}: { values: number[]; labels: string[]; maxVal: number }) {
  const W = 500; const H = 150
  if (values.length === 0) return <p className="text-neutral-500 text-xs font-semibold py-8 text-center uppercase tracking-wider">No Data</p>

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - (v / maxVal) * H
    return `${x},${y}`
  }).join(" ")

  return (
    <div className="h-[210px] w-full flex flex-col justify-between">
      <div className="relative flex-1 mt-4">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0,1,2,3,4].map(i => <div key={i} className="w-full border-t border-white/[0.04] border-dashed" />)}
        </div>
        <svg className="absolute inset-0 w-full h-[150px]" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C800FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#C800FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`M 0,${H} L ${pts} L ${W},${H} Z`} fill="url(#areaGrad)" />
          <path d={`M ${pts}`} fill="none" stroke="#C800FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {values.map((v, i) => {
            const x = (i / (values.length - 1)) * W
            const y = H - (v / maxVal) * H
            return <circle key={i} cx={x} cy={y} r="3.5" fill="#0f0f15" stroke="#C800FF" strokeWidth="2" />
          })}
        </svg>
        <div className="absolute inset-x-0 top-0 h-[150px] pointer-events-none">
          {values.map((v, i) => (
            <div key={i} className="stat-number text-[9px] text-neutral-400 absolute"
              style={{ left: `${(i / (values.length - 1)) * 95}%`, bottom: `${(v / maxVal) * 88}%` }}>
              {v}d
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-bold text-neutral-500 border-t border-white/[0.05] pt-3 px-1">
        {labels.map((m, i) => <span key={i} className="eyebrow">{m}</span>)}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsView() {
  const [data,    setData]    = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try { setData(await analyticsApi.summary()) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to load analytics.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const tthValues = data?.time_to_hire.map(p => p.avg_days) ?? []
  const tthLabels = data?.time_to_hire.map(p => p.month) ?? []
  const maxTth    = Math.max(...tthValues, 5)
  const maxBucket = Math.max(...(data?.score_distribution.map(b => b.count) ?? [1]), 1)

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-extrabold text-neutral-900 dark:text-white tracking-wider">
            ANALYTICS & <span className="text-gradient">EFFICIENCY METRICS</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">Platform efficiency indices, conversion ratios, and stats overview.</p>
        </div>
        <button onClick={fetchData} className="p-2 border border-white/[0.08] hover:bg-white/5 text-neutral-400 hover:text-white rounded-xl transition-all h-10 w-10 flex items-center justify-center">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchData} className="ml-auto underline">Retry</button>
        </div>
      )}

      {loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card border-white/[0.04] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white/5 rounded-full animate-pulse" />
                <div className="w-40 h-3.5 bg-white/5 rounded animate-pulse" />
              </div>
              <div className="h-[180px] w-full bg-white/[0.01] border border-white/[0.05] rounded-xl flex items-center justify-center">
                <span className="text-[10px] text-neutral-500 font-mono tracking-widest animate-pulse">COMPUTING METRICS...</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Time-to-Hire */}
          <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg relative overflow-hidden reveal-up reveal-delay-1">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-signal" />
                AVERAGE TIME-TO-HIRE TREND (DAYS)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {tthValues.every(v => v === 0) ? (
                <p className="text-neutral-500 text-xs font-semibold py-12 text-center uppercase tracking-wider leading-relaxed">
                  No hired candidates yet. Charts will populate once candidates are hired.
                </p>
              ) : (
                <AreaChart values={tthValues} labels={tthLabels} maxVal={maxTth} />
              )}
            </CardContent>
          </Card>

          {/* Source of Hire */}
          <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg relative overflow-hidden reveal-up reveal-delay-2">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
                <PieChart className="w-4 h-4 text-signal" />
                SOURCE-OF-HIRE BREAKDOWN
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 pt-4">
              {data.source_of_hire.length === 0 ? (
                <p className="text-neutral-500 text-xs font-semibold text-center py-8 uppercase tracking-wider">No source details available.</p>
              ) : (
                <div className="space-y-4">
                  {data.source_of_hire.map((src, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-neutral-700 dark:text-neutral-300">{src.name}</span>
                        <div className="flex gap-2">
                          <span className="text-neutral-900 dark:text-white">{src.count} apps</span>
                          <span className="text-neutral-400">{src.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-white/[0.02] dark:bg-black/25 rounded-full h-2.5 overflow-hidden border border-white/[0.03]">
                        <div className="bg-signal h-full rounded-full transition-all duration-500"
                          style={{ width: `${src.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department pipeline */}
          <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg relative overflow-hidden reveal-up reveal-delay-3">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
                <Users2 className="w-4 h-4 text-signal" />
                DEPARTMENT PIPELINE CONVERSION
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 pt-4">
              {data.dept_pipeline.length === 0 ? (
                <p className="text-neutral-500 text-xs font-semibold text-center py-8 uppercase tracking-wider">No department data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.05] text-neutral-400 text-[9px] font-bold uppercase tracking-wider">
                        <th className="pb-3">DEPARTMENT</th>
                        <th className="pb-3 text-center">APPLIED</th>
                        <th className="pb-3 text-center">INTERVIEWED</th>
                        <th className="pb-3 text-center">HIRED</th>
                        <th className="pb-3 text-right">CONVERSION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {data.dept_pipeline.map(row => (
                        <tr key={row.department} className="hover:bg-white/[0.01] dark:hover:bg-white/[0.005] transition-all">
                          <td className="py-3 text-neutral-900 dark:text-neutral-200 font-extrabold">{row.department}</td>
                          <td className="py-3 text-center text-neutral-400 font-semibold">{row.applied}</td>
                          <td className="py-3 text-center text-neutral-400 font-semibold">{row.interviewed}</td>
                          <td className="py-3 text-center text-emerald-400 font-extrabold">{row.hired}</td>
                          <td className="py-3 text-right font-extrabold text-signal">{row.conversion}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Score Distribution */}
          <Card className="glass-card border-white/[0.04] rounded-2xl shadow-lg relative overflow-hidden reveal-up reveal-delay-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-xs font-bold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-signal" />
                AI SCORE DISTRIBUTION HISTOGRAM
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-4 flex flex-col justify-between h-[230px]">
              <div className="flex-1 flex items-end gap-5 justify-between relative mt-4 h-[130px]">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                  {[0,1,2,3].map(i => <div key={i} className="w-full border-t border-white/[0.04] border-dashed" />)}
                </div>
                {data.score_distribution.map((bucket, i) => {
                  const pct = (bucket.count / maxBucket) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2.5 group z-10">
                      <span className="text-[10px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        {bucket.count}
                      </span>
                      <div className="w-full bg-white/[0.02] dark:bg-black/25 border border-white/[0.08] rounded-radius-md h-[120px] flex items-end overflow-hidden">
                        <div className="w-full bg-signal hover:bg-signal-hover transition-all rounded-t-radius-md"
                          style={{ height: `${Math.max(pct, 4)}%` }} />
                      </div>
                      <div className="text-center space-y-0.5">
                        <div className="text-[9.5px] text-neutral-900 dark:text-neutral-200 font-extrabold">{bucket.label}</div>
                        <div className="text-[7.5px] text-neutral-500 font-bold uppercase tracking-wider">{bucket.rank}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}
