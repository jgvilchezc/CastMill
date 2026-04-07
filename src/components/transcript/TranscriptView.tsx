"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { FileText, Search, X, Save, Pencil, Copy, Check } from "lucide-react"
import { motion } from "framer-motion"
import { type Transcript } from "@/lib/context/episode-context"
import { useEpisodes } from "@/lib/context/episode-context"
import { Button } from "@/components/ui/button"
import { TranscriptSkeleton } from "@/components/skeletons"

interface TranscriptViewProps {
  transcript: Transcript | undefined
  episodeId: string
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

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escaped})`, "gi"))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">{part}</mark>
      : part
  )
}

export function TranscriptView({ transcript, episodeId, isLoading }: TranscriptViewProps & { isLoading?: boolean }) {
  const { updateTranscript } = useEpisodes()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editedSegments, setEditedSegments] = useState<Map<number, string>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [rawEditMode, setRawEditMode] = useState(false)
  const [rawText, setRawText] = useState("")
  const [copied, setCopied] = useState(false)

  const segments = useMemo(() => transcript ? parseSegments(transcript.segments) : null, [transcript])
  const hasEdits = editedSegments.size > 0 || rawEditMode

  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim()) return null
    if (segments) {
      return segments.reduce<number[]>((acc, seg, i) => {
        if (seg.text.toLowerCase().includes(searchQuery.toLowerCase())) acc.push(i)
        return acc
      }, [])
    }
    return null
  }, [searchQuery, segments])

  useEffect(() => {
    if (editingIdx !== null && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [editingIdx])

  function handleCopyTranscript() {
    let text: string
    if (segments) {
      text = segments.map((seg, i) => {
        const content = editedSegments.get(i) ?? seg.text
        const time = seg.startTime ?? seg.start ?? 0
        const mm = Math.floor(time / 60).toString().padStart(2, "0")
        const ss = Math.floor(time % 60).toString().padStart(2, "0")
        const speaker = seg.speaker ?? "Speaker"
        return `[${mm}:${ss}] ${speaker}: ${content}`
      }).join("\n\n")
    } else {
      text = transcript?.text ?? ""
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return <TranscriptSkeleton />
  }

  if (!transcript || (!transcript.text && !transcript.segments)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Transcript not available</p>
      </div>
    )
  }

  function startEditSegment(idx: number, text: string) {
    setEditingIdx(idx)
    if (!editedSegments.has(idx)) {
      setEditedSegments(new Map(editedSegments).set(idx, text))
    }
  }

  function updateSegmentText(idx: number, text: string) {
    setEditedSegments(new Map(editedSegments).set(idx, text))
  }

  function cancelEditing() {
    setEditingIdx(null)
    setEditedSegments(new Map())
    setRawEditMode(false)
    setRawText("")
  }

  async function saveAllChanges() {
    if (!segments && !rawEditMode) return
    setIsSaving(true)
    try {
      if (rawEditMode) {
        await updateTranscript(episodeId, rawText, [])
      } else if (segments) {
        const newSegments = segments.map((seg, i) => ({
          ...seg,
          text: editedSegments.get(i) ?? seg.text,
        }))
        const newText = newSegments.map(s => s.text).join(" ")
        await updateTranscript(episodeId, newText, newSegments)
      }
      setEditingIdx(null)
      setEditedSegments(new Map())
      setRawEditMode(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (segments) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript…"
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-border bg-background rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {filteredIndices && (
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
              {filteredIndices.length} match{filteredIndices.length !== 1 ? "es" : ""}
            </span>
          )}
          <button
            onClick={handleCopyTranscript}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/60 rounded
              hover:border-border hover:text-foreground transition-all shrink-0"
          >
            {copied
              ? <><Check className="h-3 w-3 text-primary" />Copied</>
              : <><Copy className="h-3 w-3" />Copy</>
            }
          </button>
        </div>

        {segments.map((seg, i) => {
          if (filteredIndices && !filteredIndices.includes(i)) return null

          const speaker = seg.speaker ?? "Speaker"
          const isHost = speaker.toLowerCase().includes("host") || speaker === "Speaker 1"
          const time = seg.startTime ?? seg.start ?? 0
          const mins = Math.floor(time / 60).toString().padStart(2, "0")
          const secs = Math.floor(time % 60).toString().padStart(2, "0")
          const isEditing = editingIdx === i

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.02 }}
              className="flex gap-3 group"
            >
              <div className="flex flex-col items-end gap-1 pt-0.5 min-w-[80px]">
                <span className={`text-xs font-bold font-mono px-2 py-0.5 border ${isHost ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"}`}>
                  {speaker}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{mins}:{secs}</span>
              </div>
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editedSegments.get(i) ?? seg.text}
                  onChange={(e) => {
                    updateSegmentText(i, e.target.value)
                    e.target.style.height = "auto"
                    e.target.style.height = e.target.scrollHeight + "px"
                  }}
                  onBlur={() => setEditingIdx(null)}
                  className="flex-1 text-sm leading-relaxed pt-1 px-2 py-1 border border-primary/50 bg-primary/5 rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <p
                  className="flex-1 text-sm leading-relaxed pt-1 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 -mx-2 -my-1 transition-colors relative"
                  onClick={() => startEditSegment(i, seg.text)}
                >
                  {highlightText(editedSegments.get(i) ?? seg.text, searchQuery)}
                  <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/40 absolute top-1 right-1 transition-colors" />
                </p>
              )}
            </motion.div>
          )
        })}

        {hasEdits && (
          <div className="sticky bottom-0 flex items-center justify-end gap-2 py-3 px-4 bg-background/95 backdrop-blur border-t border-border -mx-4">
            <span className="text-xs text-muted-foreground mr-auto">
              {editedSegments.size} segment{editedSegments.size !== 1 ? "s" : ""} modified
            </span>
            <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveAllChanges} disabled={isSaving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? "Saving…" : "Save all changes"}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-border bg-card/50 p-6">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Full Transcript
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/60 rounded
                hover:border-border hover:text-foreground transition-all"
            >
              {copied
                ? <><Check className="h-3 w-3 text-primary" />Copied</>
                : <><Copy className="h-3 w-3" />Copy</>
              }
            </button>
            {!rawEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setRawEditMode(true); setRawText(transcript.text) }}
                className="h-7 text-xs"
              >
                <Pencil className="h-3 w-3 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
        {rawEditMode ? (
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={20}
            className="w-full text-sm leading-relaxed whitespace-pre-wrap font-mono px-3 py-2 border border-border bg-background rounded resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{transcript.text}</p>
        )}
      </div>

      {rawEditMode && (
        <div className="sticky bottom-0 flex items-center justify-end gap-2 py-3 px-4 bg-background/95 backdrop-blur border-t border-border">
          <Button variant="outline" size="sm" onClick={cancelEditing} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={saveAllChanges} disabled={isSaving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      )}
    </div>
  )
}
