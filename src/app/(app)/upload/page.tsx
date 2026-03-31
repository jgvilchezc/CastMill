"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { DropZone } from "@/components/upload/DropZone"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { mockAI } from "@/lib/mock/mock-ai"
import { useEpisodes } from "@/lib/context/episode-context"
import { Episode } from "@/lib/fixtures/episodes"

type Phase = "idle" | "uploading" | "done"

function getProgressMessage(progress: number): string {
  if (progress < 30) return "Uploading audio..."
  if (progress < 60) return "Transcribing with AI..."
  if (progress < 90) return "Analyzing speakers..."
  return "Finalizing..."
}

export default function UploadPage() {
  const router = useRouter()
  const { addEpisode, updateTranscript } = useEpisodes()
  const [phase, setPhase] = useState<Phase>("idle")
  const [progress, setProgress] = useState(0)
  const [newEpisodeId, setNewEpisodeId] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")

  async function handleFile(file: File) {
    setFileName(file.name)
    setPhase("uploading")
    setProgress(0)

    const episodeId = `ep_new_${Date.now()}`

    try {
      const transcript = await mockAI.transcribeEpisode(file, (p) => setProgress(p))

      const newEpisode: Episode = {
        id: episodeId,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        date: new Date().toISOString().split("T")[0],
        duration: 0,
        topics: [],
        status: "ready",
        generationCount: 0,
        guests: [],
        description: "Newly uploaded episode.",
        thumbnailUrl: "",
      }

      addEpisode(newEpisode)
      updateTranscript(episodeId, { ...transcript, episodeId })

      setNewEpisodeId(episodeId)
      setPhase("done")
    } catch {
      setPhase("idle")
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Upload Episode</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a recording or script — Castmill will transcribe and generate content assets automatically.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <DropZone onFile={handleFile} />
          </motion.div>
        )}

        {phase === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border border-border bg-card p-8 text-center space-y-6"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{fileName}</p>
              <p className="text-base font-semibold">{getProgressMessage(progress)}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </motion.div>
        )}

        {phase === "done" && newEpisodeId && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-border bg-card p-8 text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Transcription complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">Your episode is ready. Generate content assets now.</p>
            </div>
            <Button onClick={() => router.push(`/episode/${newEpisodeId}`)}>
              View Episode
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
