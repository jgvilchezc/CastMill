"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "./ContentPanel"
import { useEpisodes, type ContentFormat, type Generation } from "@/lib/context/episode-context"
import { useUser } from "@/lib/context/user-context"
import { loadParams, saveParams, type GenerationParams } from "@/lib/generation-params"
import { cn } from "@/lib/utils"

const TABS: { format: ContentFormat; label: string; requiredPlan: string }[] = [
  { format: "blog",         label: "Blog",        requiredPlan: "free"    },
  { format: "tweet_thread", label: "Tweets",      requiredPlan: "free"    },
  { format: "linkedin",     label: "LinkedIn",    requiredPlan: "free"    },
  { format: "quotes",       label: "Quotes",      requiredPlan: "free"    },
  { format: "chapters",     label: "Chapters",    requiredPlan: "free"    },
  { format: "newsletter",   label: "Newsletter",  requiredPlan: "starter" },
  { format: "youtube_desc", label: "YouTube",     requiredPlan: "starter" },
  { format: "show_notes",   label: "Show Notes",  requiredPlan: "starter" },
  { format: "thumbnail",    label: "Thumbnail",   requiredPlan: "starter" },
]

interface LockedFormatCardProps {
  label: string
  requiredPlan: string
}

function LockedFormatCard({ label, requiredPlan }: LockedFormatCardProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Lock className="h-4 w-4 text-muted-foreground/40" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Available on{" "}
          <span className="capitalize">{requiredPlan}</span> and above.
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="text-xs h-7">
        <Link href="/pricing">Upgrade</Link>
      </Button>
    </div>
  )
}

interface ContentHubProps {
  episodeId: string
  initialGenerations: Generation[]
  triggerGenerateAll?: boolean
  onGenerateAllDone?: () => void
}

export function ContentHub({ episodeId, initialGenerations, triggerGenerateAll, onGenerateAllDone }: ContentHubProps) {
  const { generateContent } = useEpisodes()
  const { canUseFormat } = useUser()
  const [activeFormat, setActiveFormat] = useState<ContentFormat>("blog")
  const [pendingFormats, setPendingFormats] = useState<Set<ContentFormat>>(new Set())
  const [params, setParams] = useState<GenerationParams>(loadParams)

  function handleParamsChange(next: GenerationParams) {
    setParams(next)
    saveParams(next)
  }

  const getState = (format: ContentFormat): Generation | "generating" | null => {
    if (pendingFormats.has(format)) return "generating"
    return initialGenerations.find(g => g.format === format && g.episodeId === episodeId) ?? null
  }

  const generateSingle = useCallback(async (format: ContentFormat) => {
    if (!canUseFormat(format)) return
    setPendingFormats(prev => new Set([...prev, format]))
    try {
      await generateContent(episodeId, format, params)
    } finally {
      setPendingFormats(prev => {
        const next = new Set(prev)
        next.delete(format)
        return next
      })
    }
  }, [episodeId, generateContent, canUseFormat, params])

  const handleGenerateAll = useCallback(async () => {
    const formats = TABS
      .filter(t => !pendingFormats.has(t.format) && canUseFormat(t.format))
      .map(t => t.format)
    if (formats.length === 0) return

    setPendingFormats(prev => new Set([...prev, ...formats]))

    await Promise.allSettled(
      formats.map(async (format) => {
        try {
          await generateContent(episodeId, format, params)
        } finally {
          setPendingFormats(prev => {
            const next = new Set(prev)
            next.delete(format)
            return next
          })
        }
      })
    )
    onGenerateAllDone?.()
  }, [episodeId, generateContent, onGenerateAllDone, pendingFormats, canUseFormat, params])

  useEffect(() => {
    if (triggerGenerateAll) {
      handleGenerateAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerGenerateAll])

  return (
    <div>
      {/* Format tabs */}
      <div className="flex items-center gap-0.5 border-b border-border mb-6 overflow-x-auto">
        {TABS.map(({ format, label }) => {
          const state = getState(format)
          const locked = !canUseFormat(format)
          const isActive = activeFormat === format
          const isDone = state && state !== "generating"
          const isGenerating = state === "generating"

          return (
            <button
              key={format}
              onClick={() => setActiveFormat(format)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 pb-2.5 pt-0 text-sm whitespace-nowrap transition-colors shrink-0",
                "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-150",
                isActive
                  ? "text-foreground after:bg-primary"
                  : "text-muted-foreground hover:text-foreground/70 after:bg-transparent"
              )}
            >
              {locked ? (
                <Lock className="h-2.5 w-2.5 text-muted-foreground/30" />
              ) : isGenerating ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              ) : isDone ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full border border-muted-foreground/30" />
              )}
              {label}
            </button>
          )
        })}
      </div>

      {/* Active panel */}
      {TABS.map(({ format, label, requiredPlan }) => (
        activeFormat === format && (
          <div key={format}>
            {canUseFormat(format) ? (
              <ContentPanel
                format={format}
                generation={getState(format)}
                params={params}
                onParamsChange={handleParamsChange}
                onGenerate={() => generateSingle(format)}
                episodeId={episodeId}
              />
            ) : (
              <LockedFormatCard label={label} requiredPlan={requiredPlan} />
            )}
          </div>
        )
      ))}
    </div>
  )
}
