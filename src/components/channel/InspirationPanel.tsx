"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Radio, ListVideo, MessageCircle, Lightbulb } from "lucide-react"
import { GapBoard } from "./inspiration/GapBoard"
import { TrendRadar } from "./inspiration/TrendRadar"
import { SeriesArchitect } from "./inspiration/SeriesArchitect"
import { QuestionsMiner } from "./inspiration/QuestionsMiner"
import { MoodBoard } from "./inspiration/MoodBoard"
import type { MoodBoardItem } from "./inspiration/types"
import type { GapIdea } from "./inspiration/GapBoard"
import type { Trend } from "./inspiration/TrendRadar"
import type { SeriesItem } from "./inspiration/SeriesArchitect"
import type { AudienceQuestion } from "./inspiration/QuestionsMiner"

const MOODBOARD_KEY = "castmill_moodboard_"

interface SavedInspiration {
  gaps?: GapIdea[]
  trends?: Trend[]
  series?: SeriesItem[]
  questions?: AudienceQuestion[]
}

interface InspirationPanelProps {
  channelId: string
  channel: Record<string, unknown>
  videos: Record<string, unknown>[]
  initialInspiration: SavedInspiration | null
  onInspirationUpdate: (inspiration: SavedInspiration) => void
}

export function InspirationPanel({
  channelId,
  channel,
  videos,
  initialInspiration,
  onInspirationUpdate,
}: InspirationPanelProps) {
  const [inspiration, setInspiration] = useState<SavedInspiration>(initialInspiration ?? {})
  const [moodBoardItems, setMoodBoardItems] = useState<MoodBoardItem[]>([])
  const [moodHydrated, setMoodHydrated] = useState(false)

  const moodKey = MOODBOARD_KEY + channelId

  useEffect(() => {
    try {
      const stored = localStorage.getItem(moodKey)
      if (stored) setMoodBoardItems(JSON.parse(stored) as MoodBoardItem[])
    } catch {}
    setMoodHydrated(true)
  }, [moodKey])

  useEffect(() => {
    if (!moodHydrated) return
    try {
      localStorage.setItem(moodKey, JSON.stringify(moodBoardItems))
    } catch {}
  }, [moodBoardItems, moodKey, moodHydrated])

  function handleSectionSaved<K extends keyof SavedInspiration>(key: K, data: NonNullable<SavedInspiration[K]>) {
    const updated = { ...inspiration, [key]: data }
    setInspiration(updated)
    onInspirationUpdate(updated)
  }

  function handleSaveToMoodBoard(item: MoodBoardItem) {
    setMoodBoardItems((prev) => {
      if (prev.some((p) => p.title === item.title && p.type === item.type)) return prev
      return [item, ...prev]
    })
  }

  function handleRemoveFromMoodBoard(id: string) {
    setMoodBoardItems((prev) => prev.filter((i) => i.id !== id))
  }

  const channelData = {
    title: channel.title as string,
    handle: channel.handle as string | undefined,
    analysis: (channel.analysis as Record<string, unknown>) ?? {},
    videos: videos.map((v) => ({
      title: v.title as string,
      view_count: v.view_count as number,
      like_count: v.like_count as number | undefined,
      comment_count: v.comment_count as number | undefined,
      published_at: v.published_at as string | undefined,
    })),
  }

  const boardCount = moodBoardItems.length

  return (
    <Tabs defaultValue="gaps">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="gaps" className="gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Content Gaps
          {inspiration.gaps && inspiration.gaps.length > 0 && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
          )}
        </TabsTrigger>
        <TabsTrigger value="trends" className="gap-1.5">
          <Radio className="h-3.5 w-3.5" />
          Trends
          {inspiration.trends && inspiration.trends.length > 0 && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
          )}
        </TabsTrigger>
        <TabsTrigger value="series" className="gap-1.5">
          <ListVideo className="h-3.5 w-3.5" />
          Series
          {inspiration.series && inspiration.series.length > 0 && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
          )}
        </TabsTrigger>
        <TabsTrigger value="questions" className="gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          Questions
          {inspiration.questions && inspiration.questions.length > 0 && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
          )}
        </TabsTrigger>
        <TabsTrigger value="board" className="gap-1.5">
          <Lightbulb className="h-3.5 w-3.5" />
          Board
          {boardCount > 0 && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {boardCount > 9 ? "9+" : boardCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="gaps" className="mt-4">
        <GapBoard
          channelId={channelId}
          channelData={channelData}
          initialData={inspiration.gaps ?? null}
          onSaved={(data) => handleSectionSaved("gaps", data)}
          onSaveToMoodBoard={handleSaveToMoodBoard}
        />
      </TabsContent>

      <TabsContent value="trends" className="mt-4">
        <TrendRadar
          channelId={channelId}
          channelData={channelData}
          initialData={inspiration.trends ?? null}
          onSaved={(data) => handleSectionSaved("trends", data)}
          onSaveToMoodBoard={handleSaveToMoodBoard}
        />
      </TabsContent>

      <TabsContent value="series" className="mt-4">
        <SeriesArchitect
          channelId={channelId}
          channelData={channelData}
          initialData={inspiration.series ?? null}
          onSaved={(data) => handleSectionSaved("series", data)}
          onSaveToMoodBoard={handleSaveToMoodBoard}
        />
      </TabsContent>

      <TabsContent value="questions" className="mt-4">
        <QuestionsMiner
          channelId={channelId}
          channelData={channelData}
          initialData={inspiration.questions ?? null}
          onSaved={(data) => handleSectionSaved("questions", data)}
          onSaveToMoodBoard={handleSaveToMoodBoard}
        />
      </TabsContent>

      <TabsContent value="board" className="mt-4">
        <MoodBoard items={moodBoardItems} onRemove={handleRemoveFromMoodBoard} />
      </TabsContent>
    </Tabs>
  )
}
