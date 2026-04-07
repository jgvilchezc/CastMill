"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Scissors, Trash2, Loader2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TranscriptView } from "@/components/transcript/TranscriptView"
import { ContentHub } from "@/components/content/ContentHub"
import { GenerateAllButton } from "@/components/content/GenerateAllButton"
import { ClipsHub } from "@/components/clips/ClipsHub"
import { useEpisodes } from "@/lib/context/episode-context"
import type { ViralMoment } from "@/components/clips/MomentCard"
import { EpisodeDetailSkeleton } from "@/components/skeletons"

export default function EpisodePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { episodes, transcripts, generations, selectEpisode, refreshEpisode, deleteEpisode, isLoadingEpisodes } = useEpisodes()
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshingTranscript, setIsRefreshingTranscript] = useState(true)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteEpisode(id)
      router.push("/dashboard")
    } catch {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    selectEpisode(id)
    setIsRefreshingTranscript(true)
    refreshEpisode(id).finally(() => setIsRefreshingTranscript(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const episode = episodes.find((e) => e.id === id)
  const transcript = transcripts[id]
  const episodeGenerations = generations.filter((g) => g.episodeId === id)

  if (isLoadingEpisodes) {
    return <EpisodeDetailSkeleton />
  }

  if (!episode) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-muted-foreground text-sm">Episode not found.</p>
        <button className="mt-4 text-sm text-muted-foreground hover:text-foreground underline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  const cachedMoments = episode.viralMoments as ViralMoment[] | null
  const doneCount = episodeGenerations.filter(g => g.status === "ready").length

  return (
    <div className="max-w-3xl mx-auto">

      {/* Nav */}
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8 group"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Dashboard
      </button>

      {/* Episode header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
              {episode.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
              <span className="text-xs font-mono text-muted-foreground">
                {new Date(episode.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              {episode.duration > 0 && (
                <>
                  <span className="text-muted-foreground/30 text-xs">·</span>
                  <span className="text-xs font-mono text-muted-foreground">{Math.round(episode.duration / 60)}min</span>
                </>
              )}
              {doneCount > 0 && (
                <>
                  <span className="text-muted-foreground/30 text-xs">·</span>
                  <span className="text-xs font-mono text-primary">{doneCount} generated</span>
                </>
              )}
            </div>

            {(episode.topics.length > 0 || episode.guests.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {episode.guests.map((g) => (
                  <span key={g} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-sm font-medium">
                    {g}
                  </span>
                ))}
                {episode.topics.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-sm">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={isDeleting}
                  className="p-1.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  {isDeleting
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete episode?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{episode.title}&rdquo; along with its transcript and all generated content. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <GenerateAllButton
              onGenerate={() => setIsGeneratingAll(true)}
              isGenerating={isGeneratingAll}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transcript">
        <div className="border-b border-border mb-8">
          <TabsList variant="line" className="h-auto p-0 gap-6">
            <TabsTrigger
              value="transcript"
              className="h-auto pb-3 pt-0 px-0 rounded-none text-sm"
            >
              Transcript
            </TabsTrigger>
            <TabsTrigger
              value="content"
              className="h-auto pb-3 pt-0 px-0 rounded-none text-sm"
            >
              Content
            </TabsTrigger>
            <TabsTrigger
              value="clips"
              className="h-auto pb-3 pt-0 px-0 rounded-none text-sm flex items-center gap-1.5"
            >
              <Scissors className="h-3.5 w-3.5" />
              Clips
              {cachedMoments && cachedMoments.length > 0 && (
                <span className="text-[10px] font-mono text-primary">
                  {cachedMoments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transcript">
          <TranscriptView transcript={transcript} episodeId={id} isLoading={isRefreshingTranscript} />
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

        <TabsContent value="clips">
          <ClipsHub
            episodeId={id}
            episodeTitle={episode.title}
            topics={episode.topics}
            transcriptText={transcript?.text ?? ""}
            transcriptSegments={transcript?.segments}
            cachedMoments={cachedMoments}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
