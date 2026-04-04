"use client"

import { useState } from "react"
import { Loader2, Bookmark, ListVideo, Plus, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SectionHeader } from "./SectionShell"
import { useInspirationSection } from "./useInspirationSection"
import type { MoodBoardItem } from "./types"

export interface SeriesItem {
  seriesName: string
  description: string
  existingVideos: string[]
  nextEpisodes: { title: string; angle: string }[]
}

interface SeriesArchitectProps {
  channelId: string
  channelData: {
    title: string
    handle?: string
    analysis: Record<string, unknown>
    videos?: { title: string; view_count: number; like_count?: number; comment_count?: number; published_at?: string }[]
  }
  initialData: SeriesItem[] | null
  onSaved: (data: SeriesItem[]) => void
  onSaveToMoodBoard: (item: MoodBoardItem) => void
}

export function SeriesArchitect({ channelId, channelData, initialData, onSaved, onSaveToMoodBoard }: SeriesArchitectProps) {
  const {
    data: series,
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
  } = useInspirationSection<SeriesItem>({ mode: "series", initialData, channelId, channelData, onSaved })

  const [savedSeries, setSavedSeries] = useState<Set<number>>(new Set())
  const [savedEpisodes, setSavedEpisodes] = useState<Set<string>>(new Set())

  function handleSaveSeries(s: SeriesItem, index: number) {
    onSaveToMoodBoard({
      id: `series-${Date.now()}-${index}`,
      type: "series",
      title: s.seriesName,
      description: s.description,
      savedAt: Date.now(),
    })
    setSavedSeries((prev) => new Set([...prev, index]))
  }

  function handleSaveEpisode(ep: { title: string; angle: string }, seriesName: string, key: string) {
    onSaveToMoodBoard({
      id: `series-ep-${Date.now()}-${key}`,
      type: "series",
      title: ep.title,
      description: `${seriesName}: ${ep.angle}`,
      savedAt: Date.now(),
    })
    setSavedEpisodes((prev) => new Set([...prev, key]))
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Series Architect"
        description="Series opportunities based on your existing content"
        hasData={!!series && series.length > 0}
        loading={loading}
        showCustom={showCustom}
        customInstructions={customInstructions}
        confirmRegenerate={confirmRegenerate}
        onToggleCustom={() => setShowCustom((v) => !v)}
        onCustomChange={setCustomInstructions}
        onGenerateClick={handleGenerateClick}
        onConfirm={generate}
        onCancelConfirm={() => setConfirmRegenerate(false)}
        generateLabel="Build Series"
      />

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Mapping content series…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={generate} className="mt-3">Try Again</Button>
        </div>
      )}

      {!loading && !error && (!series || series.length === 0) && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <ListVideo className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click &quot;Build Series&quot; to discover series hidden in your content</p>
        </div>
      )}

      {!loading && series && series.length > 0 && (
        <div className="space-y-4">
          {series.map((s, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm">{s.seriesName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 px-2 text-xs gap-1 shrink-0", savedSeries.has(i) && "text-primary")}
                  onClick={() => handleSaveSeries(s, i)}
                  disabled={savedSeries.has(i)}
                >
                  <Bookmark className={cn("h-3 w-3", savedSeries.has(i) && "fill-primary")} />
                  {savedSeries.has(i) ? "Saved" : "Save Series"}
                </Button>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>

                {s.existingVideos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Existing videos in this series
                    </p>
                    <div className="space-y-1.5">
                      {s.existingVideos.map((title, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
                          <Film className="h-3 w-3 text-primary shrink-0" />
                          <span className="text-foreground">{title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Suggested next episodes
                  </p>
                  <div className="space-y-2">
                    {s.nextEpisodes.map((ep, j) => {
                      const epKey = `${i}-${j}`
                      return (
                        <div
                          key={j}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-md border border-dashed border-border hover:border-primary/40 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{ep.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{ep.angle}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-6 px-2 text-xs gap-1 shrink-0", savedEpisodes.has(epKey) && "text-primary")}
                            onClick={() => handleSaveEpisode(ep, s.seriesName, epKey)}
                            disabled={savedEpisodes.has(epKey)}
                          >
                            <Bookmark className={cn("h-3 w-3", savedEpisodes.has(epKey) && "fill-primary")} />
                            {savedEpisodes.has(epKey) ? "Saved" : "Save"}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
