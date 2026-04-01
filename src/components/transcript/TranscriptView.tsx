"use client"

import { FileText } from "lucide-react"
import { motion } from "framer-motion"
import { type Transcript } from "@/lib/context/episode-context"

interface TranscriptViewProps {
  transcript: Transcript | undefined
}

interface Segment {
  speaker?: string
  text: string
  startTime?: number
  start?: number
}

function parseSegments(segments: unknown): Segment[] | null {
  if (!Array.isArray(segments) || segments.length === 0) return null
  const first = segments[0]
  if (typeof first === "object" && first !== null && "text" in first) {
    return segments as Segment[]
  }
  return null
}

export function TranscriptView({ transcript }: TranscriptViewProps) {
  if (!transcript || (!transcript.text && !transcript.segments)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Transcript not available</p>
      </div>
    )
  }

  const segments = parseSegments(transcript.segments)

  // If we have structured segments, render them speaker by speaker
  if (segments) {
    return (
      <div className="space-y-4">
        {segments.map((seg, i) => {
          const speaker = seg.speaker ?? "Speaker"
          const isHost = speaker.toLowerCase().includes("host") || speaker === "Speaker 1"
          const time = seg.startTime ?? seg.start ?? 0
          const mins = Math.floor(time / 60).toString().padStart(2, "0")
          const secs = Math.floor(time % 60).toString().padStart(2, "0")

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.02 }}
              className="flex gap-3"
            >
              <div className="flex flex-col items-end gap-1 pt-0.5 min-w-[80px]">
                <span className={`text-xs font-bold font-mono px-2 py-0.5 border ${isHost ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"}`}>
                  {speaker}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{mins}:{secs}</span>
              </div>
              <p className="flex-1 text-sm leading-relaxed pt-1">{seg.text}</p>
            </motion.div>
          )
        })}
      </div>
    )
  }

  // Fallback: render the raw transcript text (what Groq Whisper returns)
  return (
    <div className="border-2 border-border bg-card/50 p-6">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 border-b border-border pb-2">
        Full Transcript
      </p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{transcript.text}</p>
    </div>
  )
}
