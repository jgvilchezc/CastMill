"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText, Twitter, Linkedin, Mail, Youtube, ImageIcon, Loader2, CheckCircle2,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ContentPanel } from "./ContentPanel"
import { Generation, ContentFormat } from "@/lib/fixtures/generations"
import { mockAI } from "@/lib/mock/mock-ai"

type GenerationState = Generation | "generating" | null

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
  const [generationMap, setGenerationMap] = useState<Record<ContentFormat, GenerationState>>(() => {
    const map = {} as Record<ContentFormat, GenerationState>
    for (const tab of TABS) {
      const existing = initialGenerations.find(
        (g) => g.format === tab.format && g.episodeId === episodeId
      )
      map[tab.format] = existing ?? null
    }
    return map
  })

  const handleGenerateAll = useCallback(async () => {
    const formatsToGenerate = TABS.filter((t) => t.format !== "thumbnail").map((t) => t.format)
    setGenerationMap((prev) => {
      const next = { ...prev }
      for (const f of formatsToGenerate) {
        next[f] = "generating"
      }
      return next
    })
    await Promise.allSettled(
      formatsToGenerate.map(async (format) => {
        try {
          const sourceId = episodeId === "ep_50" ? episodeId : "ep_50"
          const result = await mockAI.generateContent(sourceId, format)
          setGenerationMap((prev) => ({ ...prev, [format]: { ...result, episodeId } }))
        } catch {
          setGenerationMap((prev) => ({ ...prev, [format]: null }))
        }
      })
    )
    onGenerateAllDone?.()
  }, [episodeId, onGenerateAllDone])

  // Trigger generate all from parent
  useEffect(() => {
    if (triggerGenerateAll) {
      handleGenerateAll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerGenerateAll])

  async function generateSingle(format: ContentFormat) {
    if (format === "thumbnail") return
    setGenerationMap((prev) => ({ ...prev, [format]: "generating" }))
    try {
      // Use ep_50 as the source for mock data regardless of episode id
      const sourceId = episodeId === "ep_50" ? episodeId : "ep_50"
      const result = await mockAI.generateContent(sourceId, format)
      setGenerationMap((prev) => ({ ...prev, [format]: { ...result, episodeId } }))
    } catch {
      setGenerationMap((prev) => ({ ...prev, [format]: null }))
    }
  }

  return (
    <Tabs defaultValue="blog">
      <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
        {TABS.map(({ format, label, icon: Icon }) => {
          const state = generationMap[format]
          return (
            <TabsTrigger key={format} value={format} className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
              {state === "generating" && (
                <Loader2 className="h-3 w-3 animate-spin ml-0.5" />
              )}
              {state && state !== "generating" && format !== "thumbnail" && (
                <CheckCircle2 className="h-3 w-3 text-green-500 ml-0.5" />
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {TABS.map(({ format }) => (
        <TabsContent key={format} value={format}>
          <ContentPanel
            format={format}
            generation={generationMap[format]}
            onGenerate={() => generateSingle(format)}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
