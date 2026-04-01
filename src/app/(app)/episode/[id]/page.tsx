"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TranscriptView } from "@/components/transcript/TranscriptView"
import { ContentHub } from "@/components/content/ContentHub"
import { GenerateAllButton } from "@/components/content/GenerateAllButton"
import { useEpisodes } from "@/lib/context/episode-context"

export default function EpisodePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { episodes, transcripts, generations, selectEpisode, refreshEpisode } = useEpisodes()
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)

  useEffect(() => {
    selectEpisode(id)
    refreshEpisode(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const episode = episodes.find((e) => e.id === id)
  const transcript = transcripts[id]
  const episodeGenerations = generations.filter((g) => g.episodeId === id)

  if (!episode) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground">Episode not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => router.push("/dashboard")}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        Dashboard
      </Button>

      {/* Episode header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight">{episode.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(episode.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {episode.guests.map((guest) => (
                <Badge key={guest} variant="secondary">{guest}</Badge>
              ))}
              {episode.topics.map((topic) => (
                <Badge key={topic} variant="outline">{topic}</Badge>
              ))}
            </div>
          </div>
          <GenerateAllButton
            onGenerate={() => setIsGeneratingAll(true)}
            isGenerating={isGeneratingAll}
          />
        </div>
      </div>

      {/* Tabs: Transcript / Content */}
      <Tabs defaultValue="transcript">
        <TabsList className="mb-6">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="transcript">
          <TranscriptView transcript={transcript} />
        </TabsContent>

        <TabsContent value="content" forceMount className="data-[state=inactive]:hidden">
          <ContentHub
            key={id}
            episodeId={id}
            initialGenerations={episodeGenerations}
            triggerGenerateAll={isGeneratingAll}
            onGenerateAllDone={() => setIsGeneratingAll(false)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
