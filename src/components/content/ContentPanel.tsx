"use client"

import { useState, useMemo } from "react"
import { Copy, Check, Download, Loader2, ImageIcon, Sparkles, RefreshCw, Pencil, Save, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import MarkdownIt from "markdown-it"
import { type Generation, type ContentFormat, useEpisodes } from "@/lib/context/episode-context"
import { GenerationSettingsBar } from "./GenerationSettingsBar"
import type { GenerationParams } from "@/lib/generation-params"

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

interface ContentPanelProps {
  format: ContentFormat
  generation: Generation | "generating" | null
  params: GenerationParams
  onParamsChange: (p: GenerationParams) => void
  onGenerate: () => void
  episodeId: string
}

const formatLabels: Record<ContentFormat, string> = {
  blog:         "Blog Post",
  tweet_thread: "Tweet Thread",
  linkedin:     "LinkedIn Post",
  newsletter:   "Newsletter",
  youtube_desc: "YouTube Description",
  thumbnail:    "Thumbnail",
  chapters:     "Chapters",
  quotes:       "Quotes",
  show_notes:   "Show Notes",
}

export function ContentPanel({ format, generation, params, onParamsChange, onGenerate, episodeId }: ContentPanelProps) {
  const { updateGeneration } = useEpisodes()
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)

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

  function startEditing(content: string) {
    setEditText(content)
    setIsEditing(true)
  }

  async function saveEdit() {
    setIsSavingEdit(true)
    try {
      await updateGeneration(episodeId, format, editText)
      setIsEditing(false)
    } finally {
      setIsSavingEdit(false)
    }
  }

  if (format === "thumbnail") {
    return <ThumbnailPanel generation={generation} onGenerate={onGenerate} />
  }

  if (format === "quotes" && generation && generation !== "generating") {
    return (
      <QuotesPanel
        generation={generation}
        params={params}
        onParamsChange={onParamsChange}
        onGenerate={onGenerate}
      />
    )
  }

  return (
    <div>
      <GenerationSettingsBar format={format} params={params} onChange={onParamsChange} />

      <AnimatePresence mode="wait">
        {generation === null && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4 text-center"
          >
            <p className="text-sm text-muted-foreground">
              No {formatLabels[format]} yet
            </p>
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded
                hover:border-primary/50 hover:bg-primary/5 hover:text-foreground
                text-muted-foreground transition-all duration-150"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </button>
          </motion.div>
        )}

        {generation === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-8 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Generating {formatLabels[format]}…</span>
              <span className="ml-auto text-muted-foreground/40">~20–40s</span>
            </div>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-muted/50 rounded h-3"
                style={{ width: `${55 + (i % 4) * 12}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </motion.div>
        )}

        {generation && generation !== "generating" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Action bar */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={onGenerate}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </button>
              </div>
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSavingEdit}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/60 rounded
                        hover:border-border hover:text-foreground transition-all"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={isSavingEdit}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-primary-foreground bg-primary border border-primary rounded
                        hover:bg-primary/90 transition-all"
                    >
                      <Save className="h-3 w-3" />
                      {isSavingEdit ? "Saving…" : "Save"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(generation.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/60 rounded
                        hover:border-border hover:text-foreground transition-all"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleCopy(generation.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/60 rounded
                        hover:border-border hover:text-foreground transition-all"
                    >
                      {copied
                        ? <><Check className="h-3 w-3 text-primary" />Copied</>
                        : <><Copy className="h-3 w-3" />Copy</>
                      }
                    </button>
                    <button
                      onClick={() => handleDownload(generation.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/60 rounded
                        hover:border-border hover:text-foreground transition-all"
                    >
                      <Download className="h-3 w-3" />
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={20}
                className="w-full text-sm leading-relaxed font-mono px-4 py-3 border border-border bg-background rounded resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <MarkdownContent content={generation.content} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface QuotesPanelProps {
  generation: Generation
  params: GenerationParams
  onParamsChange: (p: GenerationParams) => void
  onGenerate: () => void
}

function parseQuotes(content: string): { text: string; speaker: string }[] {
  const lines = content.split("\n").filter(l => l.trim())
  const quotes: { text: string; speaker: string }[] = []
  let current = ""

  for (const line of lines) {
    if (line.trim().startsWith(">")) {
      current = line.replace(/^>\s*/, "").trim()
    } else if (line.trim().startsWith("—") || line.trim().startsWith("–") || line.trim().startsWith("-")) {
      const speaker = line.replace(/^[—–-]\s*/, "").trim()
      if (current) {
        quotes.push({ text: current, speaker })
        current = ""
      }
    } else if (current) {
      quotes.push({ text: current, speaker: "" })
      current = ""
    }
  }
  if (current) quotes.push({ text: current, speaker: "" })

  if (quotes.length === 0) {
    return [{ text: content, speaker: "" }]
  }
  return quotes
}

function QuotesPanel({ generation, params, onParamsChange, onGenerate }: QuotesPanelProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const quotes = parseQuotes(generation.content)

  function handleCopyQuote(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div>
      <GenerationSettingsBar format="quotes" params={params} onChange={onParamsChange} />
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={onGenerate}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Regenerate
        </button>
      </div>
      <div className="space-y-3">
        {quotes.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="border-l-2 border-primary/50 pl-4 py-3 pr-3 bg-card/50 rounded-r group relative"
          >
            <p className="text-sm leading-relaxed italic text-foreground/80">&ldquo;{q.text}&rdquo;</p>
            {q.speaker && (
              <p className="text-xs text-muted-foreground mt-1.5 font-mono">&mdash; {q.speaker}</p>
            )}
            <button
              onClick={() => handleCopyQuote(q.text, i)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground border border-border/60 rounded
                hover:border-border hover:text-foreground"
            >
              {copiedIdx === i ? <><Check className="h-3 w-3 text-primary" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

interface ThumbnailPanelProps {
  generation: Generation | "generating" | null
  onGenerate: () => void
}

function ThumbnailPanel({ generation, onGenerate }: ThumbnailPanelProps) {
  const [imgLoaded, setImgLoaded] = useState(false)

  async function handleDownload(dataUrl: string) {
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = "thumbnail.jpg"
    a.click()
  }

  return (
    <AnimatePresence mode="wait">
      {generation === null && (
        <motion.div
          key="thumb-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-6 py-12"
        >
          <div className="w-full max-w-md aspect-video border border-dashed border-border bg-muted/10 rounded-lg flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/40 font-mono">1280 × 720</p>
          </div>
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded
              hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Thumbnail
          </button>
          <p className="text-xs text-muted-foreground/40 font-mono">FLUX.1-schnell · ~30s</p>
        </motion.div>
      )}

      {generation === "generating" && (
        <motion.div
          key="thumb-generating"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-4 py-8"
        >
          <div className="w-full max-w-xl aspect-video bg-muted/20 border border-border rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-mono text-muted-foreground">Rendering…</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 35, ease: "linear" }}
              />
            </div>
          </div>
          <p className="text-xs font-mono text-muted-foreground/40">~30s · do not close this tab</p>
        </motion.div>
      )}

      {generation && generation !== "generating" && (
        <motion.div
          key="thumb-ready"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <button onClick={onGenerate} className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
            <button
              onClick={() => handleDownload(generation.content)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/60 rounded hover:border-border hover:text-foreground transition-all"
            >
              <Download className="h-3 w-3" />
              Download PNG
            </button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden relative">
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generation.content}
              alt="Generated thumbnail"
              className="w-full aspect-video object-cover"
              onLoad={() => setImgLoaded(true)}
            />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/30 text-center">
            1280 × 720 · FLUX.1-schnell
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => md.render(content.trim()), [content])

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
        prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-h3:uppercase prose-h3:tracking-widest prose-h3:font-mono
        prose-p:text-sm prose-p:leading-[1.75] prose-p:text-foreground/80
        prose-strong:text-foreground prose-strong:font-semibold
        prose-ul:text-sm prose-ol:text-sm prose-li:text-foreground/80 prose-li:leading-relaxed
        prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
        prose-code:text-[11px] prose-code:font-mono prose-code:text-primary/80 prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-hr:border-border/40"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
