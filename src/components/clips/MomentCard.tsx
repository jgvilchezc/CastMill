"use client"

import { useState } from "react"
import { Clock, Wand2, Scissors, Zap, Flame, Target, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface HookVariant {
  style: "curiosity" | "controversy" | "actionable"
  text: string
  caption: string
}

export interface ViralMoment {
  id: string
  quote: string
  startTimecode: string
  endTimecode?: string
  durationSeconds: number
  viralScore: number
  reason: string
  category: "counter-intuitive" | "actionable" | "emotional" | "controversial" | "story"
  suggestedHook: string
  hooks?: HookVariant[] | null
}

interface MomentCardProps {
  moment: ViralMoment
  index: number
  onHookLab: (moment: ViralMoment) => void
  onCut: (moment: ViralMoment) => void
}

const CATEGORY_META = {
  "counter-intuitive": { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Counter-intuitive" },
  "actionable": { icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Actionable" },
  "emotional": { icon: TrendingUp, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Emotional" },
  "controversial": { icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", label: "Controversial" },
  "story": { icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Story" },
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : "bg-muted-foreground"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{score}/10</span>
    </div>
  )
}

export function MomentCard({ moment, index, onHookLab, onCut }: MomentCardProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = CATEGORY_META[moment.category] ?? CATEGORY_META["actionable"]
  const Icon = meta.icon

  return (
    <div className="rounded-xl border border-border bg-card hover:bg-card/80 transition-colors">
      <button
        className="w-full text-left p-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary">#{index + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2">
              &ldquo;{moment.quote}&rdquo;
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs", meta.bg)}>
                <Icon className={cn("h-3 w-3", meta.color)} />
                <span className={meta.color}>{meta.label}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {moment.startTimecode}{moment.endTimecode ? ` → ${moment.endTimecode}` : ""} · {moment.durationSeconds}s
              </div>
              <ScoreBar score={moment.viralScore} />
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Why this works</p>
            <p className="text-sm text-muted-foreground">{moment.reason}</p>
          </div>

          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
            <p className="text-xs text-muted-foreground mb-1">Suggested hook</p>
            <p className="text-sm font-medium">&ldquo;{moment.suggestedHook}&rdquo;</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => { e.stopPropagation(); onHookLab(moment) }}
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Hook Lab
              {moment.hooks && moment.hooks.length > 0 && (
                <span className="ml-1 text-[10px] text-primary font-mono">{moment.hooks.length}</span>
              )}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={(e) => { e.stopPropagation(); onCut(moment) }}
            >
              <Scissors className="h-3.5 w-3.5 mr-1.5" />
              Cut Clip
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
