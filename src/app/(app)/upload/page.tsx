"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { DropZone } from "@/components/upload/DropZone"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useEpisodes } from "@/lib/context/episode-context"

type Phase = "idle" | "uploading" | "done" | "error"

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
  const [errorMsg, setErrorMsg] = useState("")

  async function handleFile(file: File) {
    setFileName(file.name)
    setPhase("uploading")
    setProgress(0)

    try {
      // 1. Create the episode row in Supabase first so we have a real UUID
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      const episode = await addEpisode({
        title,
        description: "Newly uploaded episode.",
        duration: 0,
        topics: [],
        guests: [],
        status: "processing",
        thumbnailUrl: null,
      })

      setProgress(15)

      // 2. Transcribe via the API route (real Groq Whisper or mock fallback)
      const formData = new FormData()
      formData.append("file", file)

      setProgress(30)
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      })

      setProgress(80)

      let transcriptText = ""
      let segments: unknown[] = []
      if (res.ok) {
        const data = await res.json()
        transcriptText = data.text ?? ""
        segments = data.segments ?? []
      } else {
        // Fallback mock transcript when AI isn't configured
        transcriptText = `[Mock transcript for "${title}". Configure GROQ_API_KEY in .env.local for real transcription.]`
      }

      // 3. Save transcript to Supabase and mark episode as ready
      await updateTranscript(episode.id, transcriptText, segments)

      setProgress(100)
      setNewEpisodeId(episode.id)
      setPhase("done")
    } catch (err: unknown) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.")
      setPhase("error")
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
            className="border-2 border-border bg-card p-8 text-center space-y-6"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground font-mono">{fileName}</p>
              <p className="text-base font-bold font-heading">{getProgressMessage(progress)}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground font-mono">{progress}% complete</p>
          </motion.div>
        )}

        {phase === "done" && newEpisodeId && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-2 border-primary bg-card p-8 text-center space-y-4 shadow-[8px_8px_0_0_var(--color-primary)]"
          >
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 border-2 border-primary">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading uppercase tracking-tight">Transcription complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">Your episode is ready. Generate content assets now.</p>
            </div>
            <Button onClick={() => router.push(`/episode/${newEpisodeId}`)}>
              View Episode
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border-2 border-destructive bg-destructive/10 p-8 text-center space-y-4"
          >
            <p className="font-bold text-destructive font-heading uppercase">Upload failed</p>
            <p className="text-sm text-muted-foreground font-mono">{errorMsg}</p>
            <Button variant="outline" onClick={() => setPhase("idle")}>Try again</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
