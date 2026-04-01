"use client"

import { useState } from "react"
import { Copy, Check, Download, Loader2, ImageIcon, Sparkles } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { type Generation, type ContentFormat } from "@/lib/context/episode-context"
import { Button } from "@/components/ui/button"

interface ContentPanelProps {
  format: ContentFormat
  generation: Generation | "generating" | null
  onGenerate: () => void
}

const formatLabels: Record<ContentFormat, string> = {
  blog: "Blog Post",
  tweet_thread: "Tweet Thread",
  linkedin: "LinkedIn Post",
  newsletter: "Newsletter",
  youtube_desc: "YouTube Description",
  thumbnail: "Thumbnail Concepts",
}

export function ContentPanel({ format, generation, onGenerate }: ContentPanelProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload(content: string) {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${format}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (format === "thumbnail") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="rounded-full bg-muted p-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Thumbnail generation coming soon</p>
          <p className="text-sm text-muted-foreground mt-1">This feature requires image AI integration</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {generation === null && (
        <motion.div
          key="empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center gap-4"
        >
          <p className="text-muted-foreground text-sm">No {formatLabels[format]} generated yet</p>
          <Button onClick={onGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate {formatLabels[format]}
          </Button>
          <p className="text-xs text-muted-foreground">~2 seconds</p>
        </motion.div>
      )}

      {generation === "generating" && (
        <motion.div
          key="generating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-3 py-4"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-muted rounded h-4"
              style={{ width: `${70 + (i % 3) * 10}%` }}
            />
          ))}
        </motion.div>
      )}

      {generation && generation !== "generating" && (
        <motion.div
          key="ready"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleCopy(generation.content)}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload(generation.content)}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{generation.content.trim()}</pre>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
