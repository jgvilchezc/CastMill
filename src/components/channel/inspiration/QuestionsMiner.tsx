"use client"

import { useState } from "react"
import { Loader2, Bookmark, MessageCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SectionHeader } from "./SectionShell"
import { useInspirationSection } from "./useInspirationSection"
import type { MoodBoardItem } from "./types"

export interface AudienceQuestion {
  question: string
  topic: string
  videoIdea: string
  introHook: string
}

interface QuestionsMinerProps {
  channelId: string
  channelData: {
    title: string
    handle?: string
    analysis: Record<string, unknown>
    videos?: { title: string; view_count: number; like_count?: number; comment_count?: number; published_at?: string }[]
  }
  initialData: AudienceQuestion[] | null
  onSaved: (data: AudienceQuestion[]) => void
  onSaveToMoodBoard: (item: MoodBoardItem) => void
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
      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copy hook"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

const topicColors = [
  "bg-blue-500/10 text-blue-500 border-blue-500/30",
  "bg-purple-500/10 text-purple-500 border-purple-500/30",
  "bg-orange-500/10 text-orange-500 border-orange-500/30",
  "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
  "bg-pink-500/10 text-pink-500 border-pink-500/30",
  "bg-green-500/10 text-green-500 border-green-500/30",
]

export function QuestionsMiner({ channelId, channelData, initialData, onSaved, onSaveToMoodBoard }: QuestionsMinerProps) {
  const {
    data: questions,
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
  } = useInspirationSection<AudienceQuestion>({ mode: "questions", initialData, channelId, channelData, onSaved })

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  function toggleExpand(index: number) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  function handleSave(q: AudienceQuestion, index: number) {
    onSaveToMoodBoard({
      id: `question-${Date.now()}-${index}`,
      type: "question",
      title: q.videoIdea,
      description: q.question,
      hook: q.introHook,
      savedAt: Date.now(),
    })
    setSavedIds((prev) => new Set([...prev, index]))
  }

  const groupedByTopic = (questions ?? []).reduce<Record<string, { question: AudienceQuestion; index: number }[]>>(
    (acc, q, i) => {
      const topic = q.topic || "General"
      if (!acc[topic]) acc[topic] = []
      acc[topic].push({ question: q, index: i })
      return acc
    },
    {}
  )

  const topics = Object.keys(groupedByTopic)

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Audience Questions Miner"
        description="Questions your audience is asking that you haven't answered yet"
        hasData={!!questions && questions.length > 0}
        loading={loading}
        showCustom={showCustom}
        customInstructions={customInstructions}
        confirmRegenerate={confirmRegenerate}
        onToggleCustom={() => setShowCustom((v) => !v)}
        onCustomChange={setCustomInstructions}
        onGenerateClick={handleGenerateClick}
        onConfirm={generate}
        onCancelConfirm={() => setConfirmRegenerate(false)}
        generateLabel="Mine Questions"
      />

      {loading && (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Mining audience questions…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={generate} className="mt-3">Try Again</Button>
        </div>
      )}

      {!loading && !error && (!questions || questions.length === 0) && (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <MessageCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click &quot;Mine Questions&quot; to uncover what your audience wants to know</p>
        </div>
      )}

      {!loading && questions && questions.length > 0 && (
        <div className="space-y-4">
          {topics.map((topic, topicIndex) => (
            <div key={topic}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-xs px-2.5 py-1 rounded-full border font-semibold", topicColors[topicIndex % topicColors.length])}>
                  {topic}
                </span>
                <span className="text-xs text-muted-foreground">{groupedByTopic[topic].length} questions</span>
              </div>

              <div className="space-y-2">
                {groupedByTopic[topic].map(({ question: q, index }) => {
                  const isExpanded = expandedItems.has(index)
                  return (
                    <div key={index} className="border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors">
                      <button
                        onClick={() => toggleExpand(index)}
                        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <MessageCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm">{q.question}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Video Idea</p>
                            <p className="text-sm font-medium">{q.videoIdea}</p>
                          </div>

                          <div className="bg-background rounded-md px-3 py-2 border border-border/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Intro Hook</p>
                                <p className="text-xs leading-relaxed italic">&quot;{q.introHook}&quot;</p>
                              </div>
                              <CopyButton text={q.introHook} />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn("h-7 px-2 text-xs gap-1", savedIds.has(index) && "text-primary")}
                              onClick={() => handleSave(q, index)}
                              disabled={savedIds.has(index)}
                            >
                              <Bookmark className={cn("h-3 w-3", savedIds.has(index) && "fill-primary")} />
                              {savedIds.has(index) ? "Saved to Board" : "Save to Board"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
