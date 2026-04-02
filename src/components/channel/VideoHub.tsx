"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import MarkdownIt from "markdown-it"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ChevronLeft, FileText, Scissors, Sparkles, Eye, ThumbsUp, Copy, Check, AlertTriangle, ClipboardPaste } from "lucide-react"
import { ViralMomentsPanel } from "./ViralMomentsPanel"
import { ClipGenerator } from "./ClipGenerator"

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })

interface VideoHubProps {
  video: Record<string, unknown>
  channelId: string
  onUpdate: (video: Record<string, unknown>) => void
}

interface TranscriptData {
  text: string
  segments: { text: string; offset: number; duration: number }[]
}

interface ViralMoment {
  rank: number
  startTime: string
  endTime: string
  startSeconds: number
  endSeconds: number
  hook: string
  reason: string
  viralScore: number
  format: string
  caption: string
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function VideoHub({ video, channelId, onUpdate }: VideoHubProps) {
  const [fetchingTranscript, setFetchingTranscript] = useState(false)
  const [transcriptError, setTranscriptError] = useState("")
  const [noCaptions, setNoCaptions] = useState(false)
  const [manualText, setManualText] = useState("")
  const [clipMoment, setClipMoment] = useState<ViralMoment | null>(null)

  const transcript = video.transcript as TranscriptData | null
  const viralMoments = video.viral_moments as { moments: ViralMoment[] } | null

  async function fetchTranscript(manual?: string) {
    setFetchingTranscript(true)
    setTranscriptError("")
    setNoCaptions(false)
    try {
      const res = await fetch("/api/youtube/video-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.youtube_video_id,
          channelVideoId: video.id,
          ...(manual ? { manualText: manual } : {}),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        onUpdate({ ...video, transcript: data.transcript })
        setManualText("")
      } else if (data.error === "no_captions") {
        setNoCaptions(true)
      } else {
        setTranscriptError(data.error ?? "Could not fetch transcript")
      }
    } finally {
      setFetchingTranscript(false)
    }
  }

  function submitManual() {
    if (manualText.trim().length < 50) return
    fetchTranscript(manualText.trim())
  }

  const ytUrl = `https://www.youtube.com/watch?v=${video.youtube_video_id as string}`

  return (
    <div>
      {/* Back + Header */}
      <div className="flex items-center gap-2 mb-5">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/channel/${channelId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to channel
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-4 mb-6">
        <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {video.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.thumbnail_url as string} alt="" className="w-36 aspect-video rounded-lg object-cover border border-border hover:opacity-90 transition-opacity" />
          ) : (
            <div className="w-36 aspect-video rounded-lg bg-muted border border-border" />
          )}
        </a>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight line-clamp-2 mb-1">
            <a href={ytUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              {video.title as string}
            </a>
          </h1>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatNum(video.view_count as number)}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{formatNum(video.like_count as number)}</span>
            <span>{(video.published_at as string)?.split("T")[0]}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="viral">
        <TabsList>
          <TabsTrigger value="viral" className="gap-1.5">
            <Scissors className="h-3.5 w-3.5" />
            Viral Moments
            {viralMoments?.moments?.length ? (
              <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 rounded-full">{viralMoments.moments.length}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="transcript" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Transcript
          </TabsTrigger>
          <TabsTrigger value="repurpose" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Repurpose
          </TabsTrigger>
        </TabsList>

        {/* Viral Moments Tab */}
        <TabsContent value="viral" className="mt-4">
          {!transcript && <TranscriptFetcher
            fetching={fetchingTranscript}
            noCaptions={noCaptions}
            error={transcriptError}
            manualText={manualText}
            onManualChange={setManualText}
            onFetch={() => fetchTranscript()}
            onSubmitManual={submitManual}
          />}
          <ViralMomentsPanel
            videoId={video.youtube_video_id as string}
            channelVideoId={video.id as string}
            title={video.title as string}
            transcript={transcript}
            initialMoments={viralMoments}
            onMomentsReady={(m) => onUpdate({ ...video, viral_moments: m })}
            onClipRequest={setClipMoment}
          />
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-4">
          {!transcript ? (
            <TranscriptFetcher
              fetching={fetchingTranscript}
              noCaptions={noCaptions}
              error={transcriptError}
              manualText={manualText}
              onManualChange={setManualText}
              onFetch={() => fetchTranscript()}
              onSubmitManual={submitManual}
            />
          ) : (
            <div className="border border-border rounded-lg p-5 max-h-96 overflow-y-auto">
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap font-mono">{transcript.text}</p>
            </div>
          )}
        </TabsContent>

        {/* Repurpose Tab */}
        <TabsContent value="repurpose" className="mt-4">
          {!transcript ? (
            <TranscriptFetcher
              fetching={fetchingTranscript}
              noCaptions={noCaptions}
              error={transcriptError}
              manualText={manualText}
              onManualChange={setManualText}
              onFetch={() => fetchTranscript()}
              onSubmitManual={submitManual}
            />
          ) : (
            <RepurposeSection transcript={transcript.text} title={video.title as string} />
          )}
        </TabsContent>
      </Tabs>

      {clipMoment && (
        <ClipGenerator moment={clipMoment} onClose={() => setClipMoment(null)} />
      )}
    </div>
  )
}

interface TranscriptFetcherProps {
  fetching: boolean
  noCaptions: boolean
  error: string
  manualText: string
  onManualChange: (v: string) => void
  onFetch: () => void
  onSubmitManual: () => void
}

function TranscriptFetcher({ fetching, noCaptions, error, manualText, onManualChange, onFetch, onSubmitManual }: TranscriptFetcherProps) {
  if (fetching) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Fetching captions from YouTube…
      </div>
    )
  }

  if (noCaptions) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-500">No captions found</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This video doesn&apos;t have auto-generated or manual subtitles on YouTube. You can paste the transcript manually to continue.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste transcript manually
          </p>
          <Textarea
            value={manualText}
            onChange={(e) => onManualChange(e.target.value)}
            placeholder="Paste the video transcript or script here… (min. 50 characters)"
            className="min-h-32 text-xs font-mono resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Tip: open the video on YouTube → &quot;…&quot; menu → &quot;Show transcript&quot;
            </p>
            <Button
              size="sm"
              onClick={onSubmitManual}
              disabled={manualText.trim().length < 50}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Use This Transcript
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center py-10 space-y-3">
      <p className="text-sm text-muted-foreground">Transcript needed to identify viral moments and generate content.</p>
      <Button onClick={onFetch} size="sm" className="gap-1.5">
        <FileText className="h-3.5 w-3.5" />
        Fetch Transcript
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const html = useMemo(() => md.render(content.trim()), [content])
  return (
    <div
      className="prose prose-sm prose-invert max-w-none rounded-lg border border-border bg-muted/30 p-5
        prose-headings:font-heading prose-headings:tracking-tight prose-headings:text-foreground
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
        prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/90
        prose-strong:text-foreground prose-strong:font-semibold
        prose-em:text-foreground/80
        prose-ul:text-sm prose-ol:text-sm prose-li:text-foreground/90
        prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
        prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function RepurposeSection({ transcript, title }: { transcript: string; title: string }) {
  const [activeFormat, setActiveFormat] = useState<string>("tweet_thread")
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [content, setContent] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  const formats = [
    { key: "tiktok_caption", label: "TikTok Caption", apiFormat: "tweet_thread" },
    { key: "reel_caption", label: "Reels Caption", apiFormat: "tweet_thread" },
    { key: "tweet_thread", label: "X Thread", apiFormat: "tweet_thread" },
    { key: "linkedin", label: "LinkedIn", apiFormat: "linkedin" },
    { key: "blog", label: "Blog Post", apiFormat: "blog" },
    { key: "newsletter", label: "Newsletter", apiFormat: "newsletter" },
  ]

  async function generate(fmt: string, apiFormat: string) {
    if (content[fmt] || generating.has(fmt)) return
    setGenerating((prev) => new Set(prev).add(fmt))
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: apiFormat, transcript: `Title: ${title}\n\n${transcript}` }),
      })
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)
      if (res.ok) setContent((prev) => ({ ...prev, [fmt]: data.content }))
    } catch (err) {
      console.error("repurpose generate failed:", err)
    } finally {
      setGenerating((prev) => { const s = new Set(prev); s.delete(fmt); return s })
    }
  }

  function handleTabClick(fmt: string, apiFormat: string) {
    setActiveFormat(fmt)
    if (!content[fmt] && !generating.has(fmt)) {
      generate(fmt, apiFormat)
    }
  }

  function copyContent() {
    if (!content[activeFormat]) return
    navigator.clipboard.writeText(content[activeFormat])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isGenerating = generating.has(activeFormat)
  const currentContent = content[activeFormat]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {formats.map((f) => {
          const isActive = activeFormat === f.key
          const isDone = !!content[f.key]
          const isPending = generating.has(f.key)
          return (
            <button
              key={f.key}
              onClick={() => handleTabClick(f.key, f.apiFormat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all
                ${isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {!isPending && isDone && !isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />}
              {f.label}
            </button>
          )
        })}
      </div>

      {isGenerating && (
        <div className="rounded-lg border border-border bg-muted/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Generating {formats.find((f) => f.key === activeFormat)?.label}…</span>
            <span className="ml-auto text-xs">~20–40s</span>
          </div>
          <div className="space-y-2.5">
            {[90, 75, 85, 60, 70].map((w, i) => (
              <div key={i} className="animate-pulse bg-muted rounded h-3.5" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      )}

      {!isGenerating && currentContent && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copyContent} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <MarkdownContent content={currentContent} />
        </div>
      )}

      {!isGenerating && !currentContent && (
        <div className="text-center py-10 space-y-3 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            Click a format above to generate content
          </p>
        </div>
      )}
    </div>
  )
}
