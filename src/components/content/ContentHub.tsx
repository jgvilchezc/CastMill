"use client"

import { useState, useCallback, useEffect } from "react"
import {
  FileText, Twitter, Linkedin, Mail, Youtube, ImageIcon, Loader2, CheckCircle2,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ContentPanel } from "./ContentPanel"
import { useEpisodes, type ContentFormat, type Generation } from "@/lib/context/episode-context"

const TABS: { format: ContentFormat; label: string; icon: React.ElementType }[] = [
  { format: "blog", label: "Blog", icon: FileText },
  { format: "tweet_thread", label: "Tweets", icon: Twitter },
  { format: "linkedin", label: "LinkedIn", icon: Linkedin },
  { format: "newsletter", label: "Newsletter", icon: Mail },
  { format: "youtube_desc", label: "YouTube", icon: Youtube },
  { format: "thumbnail", label: "Thumbnail", icon: ImageIcon },
]

interface ContentHubProps {
  episodeId: string
  initialGenerations: Generation[]
  triggerGenerateAll?: boolean
  onGenerateAllDone?: () => void
}

export function ContentHub({ episodeId, initialGenerations, triggerGenerateAll, onGenerateAllDone }: ContentHubProps) {
  const { generateContent } = useEpisodes()
  const [pendingFormats, setPendingFormats] = useState<Set<ContentFormat>>(new Set())

  const getState = (format: ContentFormat): Generation | "generating" | null => {
    if (pendingFormats.has(format)) return "generating"
    return initialGenerations.find(g => g.format === format && g.episodeId === episodeId) ?? null
  }

  const generateSingle = useCallback(async (format: ContentFormat) => {
    if (format === "thumbnail") return
    setPendingFormats(prev => new Set([...prev, format]))
    try {
      await generateContent(episodeId, format)
    } finally {
      setPendingFormats(prev => {
        const next = new Set(prev)
        next.delete(format)
        return next
      })
    }
  }, [episodeId, generateContent])

  const handleGenerateAll = useCallback(async () => {
    const formats = TABS
      .filter(t => t.format !== "thumbnail" && !pendingFormats.has(t.format))
      .map(t => t.format)
    if (formats.length === 0) return

    for (const format of formats) {
      setPendingFormats(prev => new Set([...prev, format]))
      try {
        await generateContent(episodeId, format)
      } finally {
        setPendingFormats(prev => {
          const next = new Set(prev)
          next.delete(format)
          return next
        })
      }
    }
    onGenerateAllDone?.()
  }, [episodeId, generateContent, onGenerateAllDone, pendingFormats])

  useEffect(() => {
    if (triggerGenerateAll) {
      handleGenerateAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerGenerateAll])

  return (
    <Tabs defaultValue="blog">
      <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
        {TABS.map(({ format, label, icon: Icon }) => {
          const state = getState(format)
          return (
            <TabsTrigger key={format} value={format} className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
              {state === "generating" && (
                <Loader2 className="h-3 w-3 animate-spin ml-0.5" />
              )}
              {state && state !== "generating" && format !== "thumbnail" && (
                <CheckCircle2 className="h-3 w-3 text-primary ml-0.5" />
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {TABS.map(({ format }) => (
        <TabsContent key={format} value={format}>
          <ContentPanel
            format={format}
            generation={getState(format)}
            onGenerate={() => generateSingle(format)}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
