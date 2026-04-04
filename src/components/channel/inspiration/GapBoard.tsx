"use client"

import { useState } from "react"
import { Loader2, Bookmark, TrendingUp, Minus, TrendingDown, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SectionHeader } from "./SectionShell"
import { useInspirationSection } from "./useInspirationSection"
import type { MoodBoardItem } from "./types"

export interface GapIdea {
  title: string
  angle: string
  demandScore: number
  saturationScore: number
  difficulty: "Easy" | "Medium" | "Hard"
  format: string
}

interface GapBoardProps {
  channelId: string
  channelData: {
    title: string
    handle?: string
    analysis: Record<string, unknown>
    videos?: { title: string; view_count: number; like_count?: number; comment_count?: number; published_at?: string }[]
  }
  initialData: GapIdea[] | null
  onSaved: (data: GapIdea[]) => void
  onSaveToMoodBoard: (item: MoodBoardItem) => void
}

const difficultyConfig = {
  Easy: "border-green-500/40 bg-green-500/10 text-green-500",
  Medium: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",
  Hard: "border-red-500/40 bg-red-500/10 text-red-500",
}

function ScorePair({ demand, saturation }: { demand: number; saturation: number }) {
  const opportunity = Math.max(0, demand - saturation * 0.5)
  return (
    <div className="space-y-1.5">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Demand
          </span>
          <span className="font-medium">{demand}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${demand}%` }} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <Minus className="h-3 w-3" /> Saturation
          </span>
          <span className="font-medium">{saturation}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", saturation >= 70 ? "bg-red-500" : saturation >= 40 ? "bg-yellow-500" : "bg-green-500")}
            style={{ width: `${saturation}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Zap className="h-3 w-3 text-primary" /> Opportunity
        </span>
        <span className={cn("text-xs font-bold", opportunity >= 50 ? "text-green-500" : opportunity >= 25 ? "text-yellow-500" : "text-muted-foreground")}>
          {Math.round(opportunity)}/100
        </span>
      </div>
    </div>
  )
}

export function GapBoard({ channelId, channelData, initialData, onSaved, onSaveToMoodBoard }: GapBoardProps) {
  const {
    data: gaps,
    loading,
    error,
    customInstructions,
    setCustomInstructions,
    showCustom,
    setShowCustom,
    confirmRegenerate,
    setConfirmRegenerate,
    handleGenerateClick,
    generate,
  } = useInspirationSection<GapIdea>({ mode: "gaps", initialData, channelId, channelData, onSaved })

  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  function handleSave(gap: GapIdea, index: number) {
    onSaveToMoodBoard({
      id: `gap-${Date.now()}-${index}`,
      type: "gap",
      title: gap.title,
      description: gap.angle,
      format: gap.format,
      savedAt: Date.now(),
    })
    setSavedIds((prev) => new Set([...prev, index]))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Content Gap Board"
        description="High-demand topics your channel hasn't covered yet"
        hasData={!!gaps && gaps.length > 0}
        loading={loading}
        showCustom={showCustom}
        customInstructions={customInstructions}
        confirmRegenerate={confirmRegenerate}
        onToggleCustom={() => setShowCustom((v) => !v)}
        onCustomChange={setCustomInstructions}
        onGenerateClick={handleGenerateClick}
        onConfirm={generate}
        onCancelConfirm={() => setConfirmRegenerate(false)}
        generateLabel="Find Gaps"
      />

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Analyzing content opportunities…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={generate} className="mt-3">
            Try Again
          </Button>
        </div>
      )}

      {!loading && !error && (!gaps || gaps.length === 0) && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <TrendingDown className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click &quot;Find Gaps&quot; to discover untapped content opportunities</p>
        </div>
      )}

      {!loading && gaps && gaps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {gaps.map((gap, i) => (
            <div key={i} className="border border-border rounded-lg p-4 space-y-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug flex-1">{gap.title}</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium shrink-0", difficultyConfig[gap.difficulty] ?? difficultyConfig.Medium)}>
                  {gap.difficulty}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{gap.angle}</p>

              <div className="bg-muted/30 rounded-md px-3 py-2">
                <ScorePair demand={gap.demandScore} saturation={gap.saturationScore} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  {gap.format}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 px-2 text-xs gap-1", savedIds.has(i) && "text-primary")}
                  onClick={() => handleSave(gap, i)}
                  disabled={savedIds.has(i)}
                >
                  <Bookmark className={cn("h-3 w-3", savedIds.has(i) && "fill-primary")} />
                  {savedIds.has(i) ? "Saved" : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
