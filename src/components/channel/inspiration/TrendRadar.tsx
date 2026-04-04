"use client"

import { useState } from "react"
import { Loader2, Bookmark, Copy, Check, TrendingUp, TrendingDown, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SectionHeader } from "./SectionShell"
import { useInspirationSection } from "./useInspirationSection"
import type { MoodBoardItem } from "./types"

export interface Trend {
  name: string
  why: string
  velocity: "rising" | "peak" | "declining"
  format: string
  hook: string
}

interface TrendRadarProps {
  channelId: string
  channelData: {
    title: string
    handle?: string
    analysis: Record<string, unknown>
    videos?: { title: string; view_count: number; like_count?: number; comment_count?: number; published_at?: string }[]
  }
  initialData: Trend[] | null
  onSaved: (data: Trend[]) => void
  onSaveToMoodBoard: (item: MoodBoardItem) => void
}

const velocityConfig = {
  rising: {
    icon: TrendingUp,
    label: "Rising",
    color: "text-green-500",
    border: "border-green-500/30 bg-green-500/5",
    badge: "border-green-500/40 bg-green-500/10 text-green-500",
  },
  peak: {
    icon: Radio,
    label: "At Peak",
    color: "text-yellow-500",
    border: "border-yellow-500/30 bg-yellow-500/5",
    badge: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",
  },
  declining: {
    icon: TrendingDown,
    label: "Declining",
    color: "text-muted-foreground",
    border: "border-border bg-muted/20",
    badge: "border-border bg-muted text-muted-foreground",
  },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copy hook"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function TrendRadar({ channelId, channelData, initialData, onSaved, onSaveToMoodBoard }: TrendRadarProps) {
  const {
    data: trends,
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
  } = useInspirationSection<Trend>({ mode: "trends", initialData, channelId, channelData, onSaved })

  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  function handleSave(trend: Trend, index: number) {
    onSaveToMoodBoard({
      id: `trend-${Date.now()}-${index}`,
      type: "trend",
      title: trend.name,
      description: trend.why,
      format: trend.format,
      hook: trend.hook,
      savedAt: Date.now(),
    })
    setSavedIds((prev) => new Set([...prev, index]))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Trend Radar"
        description="Trending topics in your niche right now"
        hasData={!!trends && trends.length > 0}
        loading={loading}
        showCustom={showCustom}
        customInstructions={customInstructions}
        confirmRegenerate={confirmRegenerate}
        onToggleCustom={() => setShowCustom((v) => !v)}
        onCustomChange={setCustomInstructions}
        onGenerateClick={handleGenerateClick}
        onConfirm={generate}
        onCancelConfirm={() => setConfirmRegenerate(false)}
        generateLabel="Scan Trends"
      />

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Scanning trending topics…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={generate} className="mt-3">Try Again</Button>
        </div>
      )}

      {!loading && !error && (!trends || trends.length === 0) && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <Radio className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click &quot;Scan Trends&quot; to discover what&apos;s trending in your niche</p>
        </div>
      )}

      {!loading && trends && trends.length > 0 && (
        <div className="space-y-3">
          {trends.map((trend, i) => {
            const cfg = velocityConfig[trend.velocity] ?? velocityConfig.rising
            const VelocityIcon = cfg.icon
            return (
              <div key={i} className={cn("border rounded-lg p-4", cfg.border)}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <VelocityIcon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                    <span className="font-medium text-sm">{trend.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", cfg.badge)}>
                      {cfg.label}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {trend.format}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{trend.why}</p>

                <div className="bg-background/60 rounded-md px-3 py-2 border border-border/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Hook</p>
                      <p className="text-xs leading-relaxed italic">&quot;{trend.hook}&quot;</p>
                    </div>
                    <CopyButton text={trend.hook} />
                  </div>
                </div>

                <div className="flex justify-end mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-7 px-2 text-xs gap-1", savedIds.has(i) && "text-primary")}
                    onClick={() => handleSave(trend, i)}
                    disabled={savedIds.has(i)}
                  >
                    <Bookmark className={cn("h-3 w-3", savedIds.has(i) && "fill-primary")} />
                    {savedIds.has(i) ? "Saved" : "Save to Board"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
