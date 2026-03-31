"use client"

import { FileText } from "lucide-react"
import { motion } from "framer-motion"
import { Transcript } from "@/lib/fixtures/transcripts"
import { formatTimestamp } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TranscriptViewProps {
  transcript: Transcript | undefined
}

export function TranscriptView({ transcript }: TranscriptViewProps) {
  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Transcript not available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {transcript.segments.map((seg, i) => {
        const isHost = seg.speaker.toLowerCase() === "host"
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.03 }}
            className="flex gap-3"
          >
            <div className="flex flex-col items-end gap-1 pt-0.5 min-w-[80px]">
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  isHost
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                )}
              >
                {seg.speaker}
              </span>
              <Badge variant="secondary" className="text-xs py-0 font-mono">
                {formatTimestamp(seg.startTime)}
              </Badge>
            </div>
            <p className="flex-1 text-sm leading-relaxed pt-1">{seg.text}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
