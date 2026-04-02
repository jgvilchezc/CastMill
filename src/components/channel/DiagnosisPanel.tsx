"use client"

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface Recommendation {
  priority: "high" | "medium" | "low"
  category: string
  title: string
  description: string
  impact: string
}

interface DiagnosisPanelProps {
  analysis: Record<string, unknown>
}

const priorityConfig = {
  high: { color: "border-red-500 bg-red-500/10 text-red-500", label: "High Priority" },
  medium: { color: "border-yellow-500 bg-yellow-500/10 text-yellow-500", label: "Medium" },
  low: { color: "border-green-500 bg-green-500/10 text-green-500", label: "Low" },
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", value >= 70 ? "bg-green-500" : value >= 40 ? "bg-yellow-500" : "bg-red-500")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function DiagnosisPanel({ analysis }: DiagnosisPanelProps) {
  const breakdown = analysis.scoreBreakdown as Record<string, number> | undefined
  const recommendations = (analysis.recommendations as Recommendation[]) ?? []
  const patterns = (analysis.topPatterns as string[]) ?? []
  const weaknesses = (analysis.weaknesses as string[]) ?? []
  const pillars = (analysis.contentPillars as string[]) ?? []

  return (
    <div className="space-y-6">
      {/* Score Breakdown */}
      {breakdown !== undefined && (
        <div className="border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold mb-4">Score Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            <ScoreBar label="Title Optimization" value={breakdown.titleOptimization ?? 0} />
            <ScoreBar label="Content Consistency" value={breakdown.contentConsistency ?? 0} />
            <ScoreBar label="Engagement Rate" value={breakdown.engagementRate ?? 0} />
            <ScoreBar label="Upload Frequency" value={breakdown.uploadFrequency ?? 0} />
          </div>
        </div>
      )}

      {/* Best/Worst Video */}
      {!!(analysis.bestVideo || analysis.worstVideo) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {!!analysis.bestVideo && (
            <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">Best Performer</span>
              </div>
              <p className="text-sm font-medium line-clamp-2">{(analysis.bestVideo as { title: string }).title}</p>
              <p className="text-xs text-muted-foreground mt-1">{(analysis.bestVideo as { reason: string }).reason}</p>
            </div>
          )}
          {!!analysis.worstVideo && (
            <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Needs Work</span>
              </div>
              <p className="text-sm font-medium line-clamp-2">{(analysis.worstVideo as { title: string }).title}</p>
              <p className="text-xs text-muted-foreground mt-1">{(analysis.worstVideo as { reason: string }).reason}</p>
            </div>
          )}
        </div>
      )}

      {/* Content Pillars + Audience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pillars.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Content Pillars</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pillars.map((p) => (
                <span key={p} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{p}</span>
              ))}
            </div>
          </div>
        )}
        {!!analysis.audienceInsights && (
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Audience Insights</span>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.audienceInsights as string}</p>
          </div>
        )}
      </div>

      {/* Patterns + Weaknesses */}
      {(patterns.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {patterns.length > 0 && (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-semibold">What&apos;s Working</span>
              </div>
              <ul className="space-y-2">
                {patterns.map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-semibold">Weaknesses</span>
              </div>
              <ul className="space-y-2">
                {weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-yellow-500 mt-0.5">⚠</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Actionable Recommendations</h3>
          <div className="space-y-3">
            {recommendations
              .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
              .map((rec, i) => {
                const cfg = priorityConfig[rec.priority]
                return (
                  <div key={i} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className="font-medium text-sm">{rec.title}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                    <p className="text-xs text-primary">Impact: {rec.impact}</p>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
