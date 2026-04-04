"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Upload, Scissors, Download, Loader2, X, Send, Film, AudioLines, AlertTriangle, Sparkles, Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import { cn } from "@/lib/utils"

interface ClipMoment {
  id: string
  quote: string
  startTimecode: string
  endTimecode?: string
  durationSeconds: number
  suggestedHook: string
}

interface SelectedHook {
  text: string
  caption: string
}

interface EpisodeClipGeneratorProps {
  moment: ClipMoment
  selectedHook?: SelectedHook | null
  onClose: () => void
}

const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "video/mpeg"])
const VIDEO_LIMIT_BYTES = 1024 * 1024 * 1024
const VIDEO_WARN_BYTES = 200 * 1024 * 1024
const AUDIO_LIMIT_BYTES = 50 * 1024 * 1024

function isVideoFile(file: File) {
  return VIDEO_TYPES.has(file.type) || /\.(mp4|mov|webm|mkv|mpeg|mpg)$/i.test(file.name)
}

function tcToSec(tc: string): number {
  const parts = tc.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00"
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`
}

function fileSizeMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1)
}

/* ─── Timeline Scrubber ────────────────────────────────────────────── */

interface TimelineProps {
  duration: number
  rangeStart: number
  rangeEnd: number
  playhead: number
  onRangeChange: (start: number, end: number) => void
  onSeek: (sec: number) => void
}

function Timeline({ duration, rangeStart, rangeEnd, playhead, onRangeChange, onSeek }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ type: "start" | "end" | "range"; offsetSec: number } | null>(null)

  const pct = (sec: number) => duration > 0 ? (sec / duration) * 100 : 0

  const secFromX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return 0
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * duration)
  }, [duration])

  const handlePointerDown = useCallback((type: "start" | "end" | "range") => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const sec = secFromX(e.clientX)
    dragRef.current = { type, offsetSec: sec - rangeStart }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [secFromX, rangeStart])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const sec = secFromX(e.clientX)
    const { type, offsetSec } = dragRef.current
    const span = rangeEnd - rangeStart

    if (type === "start") {
      const clamped = Math.max(0, Math.min(sec, rangeEnd - 1))
      onRangeChange(clamped, rangeEnd)
    } else if (type === "end") {
      const clamped = Math.max(rangeStart + 1, Math.min(sec, duration))
      onRangeChange(rangeStart, clamped)
    } else {
      const newStart = Math.max(0, Math.min(sec - offsetSec, duration - span))
      onRangeChange(newStart, newStart + span)
    }
  }, [secFromX, rangeStart, rangeEnd, duration, onRangeChange])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return
    const sec = secFromX(e.clientX)
    onSeek(sec)
  }, [secFromX, onSeek])

  const ticks: number[] = []
  if (duration > 0) {
    const step = duration <= 60 ? 10 : duration <= 300 ? 30 : duration <= 900 ? 60 : 300
    for (let t = step; t < duration; t += step) ticks.push(t)
  }

  return (
    <div className="space-y-1 select-none">
      <div
        ref={trackRef}
        className="relative h-10 rounded-lg bg-muted/60 cursor-pointer overflow-hidden"
        onClick={handleTrackClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {ticks.map(t => (
          <div key={t} className="absolute top-0 h-full w-px bg-border/40" style={{ left: `${pct(t)}%` }}>
            <span className="absolute -top-0.5 left-1 text-[9px] text-muted-foreground/50 font-mono">{fmt(t)}</span>
          </div>
        ))}

        <div
          className="absolute top-0 h-full bg-primary/20 cursor-grab active:cursor-grabbing"
          style={{ left: `${pct(rangeStart)}%`, width: `${pct(rangeEnd) - pct(rangeStart)}%` }}
          onPointerDown={handlePointerDown("range")}
        >
          <div className="absolute inset-x-0 top-0 h-full border-y-2 border-primary/40" />
        </div>

        <div
          className="absolute top-0 h-full w-3 -ml-1.5 cursor-ew-resize z-10 group"
          style={{ left: `${pct(rangeStart)}%` }}
          onPointerDown={handlePointerDown("start")}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-1 rounded-full bg-primary group-hover:w-1.5 transition-all" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-5 w-3 rounded-sm bg-primary shadow-md flex items-center justify-center">
            <div className="w-0.5 h-2.5 bg-primary-foreground/70 rounded-full" />
          </div>
        </div>

        <div
          className="absolute top-0 h-full w-3 -ml-1.5 cursor-ew-resize z-10 group"
          style={{ left: `${pct(rangeEnd)}%` }}
          onPointerDown={handlePointerDown("end")}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-1 rounded-full bg-primary group-hover:w-1.5 transition-all" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-5 w-3 rounded-sm bg-primary shadow-md flex items-center justify-center">
            <div className="w-0.5 h-2.5 bg-primary-foreground/70 rounded-full" />
          </div>
        </div>

        {playhead >= 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-white z-20 pointer-events-none transition-[left] duration-100"
            style={{ left: `${pct(playhead)}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-0.5">
        <span>{fmt(rangeStart)}</span>
        <span className="text-primary font-semibold">{fmt(rangeEnd - rangeStart)}</span>
        <span>{fmt(rangeEnd)}</span>
      </div>
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────────────── */

export function EpisodeClipGenerator({ moment, selectedHook, onClose }: EpisodeClipGeneratorProps) {
  const aiStart = tcToSec(moment.startTimecode)
  const aiEnd = moment.endTimecode ? tcToSec(moment.endTimecode) : aiStart + moment.durationSeconds

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [rangeStart, setRangeStart] = useState(aiStart)
  const [rangeEnd, setRangeEnd] = useState(aiEnd)
  const [playhead, setPlayhead] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading-ffmpeg" | "processing" | "done" | "error">("idle")
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [sizeError, setSizeError] = useState("")
  const [sizeWarning, setSizeWarning] = useState("")
  const [caption, setCaption] = useState(
    selectedHook ? `${selectedHook.text}\n\n${selectedHook.caption}` : moment.suggestedHook
  )
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<string | null>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number>(0)

  const isVideo = mediaFile ? isVideoFile(mediaFile) : false
  const clipDuration = Math.max(0, rangeEnd - rangeStart)

  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl)
      if (clipUrl) URL.revokeObjectURL(clipUrl)
      cancelAnimationFrame(rafRef.current)
    }
  }, [mediaUrl, clipUrl])

  const syncPlayhead = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    setPlayhead(el.currentTime)
    if (!el.paused && el.currentTime < rangeEnd) {
      rafRef.current = requestAnimationFrame(syncPlayhead)
    } else if (el.currentTime >= rangeEnd) {
      el.pause()
      setIsPlaying(false)
    }
  }, [rangeEnd])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setSizeError("")
    setSizeWarning("")
    const video = isVideoFile(f)

    if (video && f.size > VIDEO_LIMIT_BYTES) {
      setSizeError(`This file is ${fileSizeMB(f.size)} MB. Video files over 1 GB require server-side processing (Pro plan, coming soon).`)
      return
    }
    if (!video && f.size > AUDIO_LIMIT_BYTES) {
      setSizeError(`Audio file is ${fileSizeMB(f.size)} MB — browser supports up to 50 MB. Try MP3 at lower bitrate.`)
      return
    }
    if (video && f.size > VIDEO_WARN_BYTES) {
      setSizeWarning(`${fileSizeMB(f.size)} MB — large files need 16 GB+ RAM and may take a few minutes.`)
    }

    setMediaFile(f)
    setMediaUrl(URL.createObjectURL(f))
  }

  function handleMediaLoaded() {
    const el = videoRef.current
    if (!el) return
    const dur = el.duration
    if (isFinite(dur) && dur > 0) {
      setMediaDuration(dur)
      const clampedStart = Math.min(rangeStart, dur - 1)
      const clampedEnd = Math.min(rangeEnd, dur)
      setRangeStart(clampedStart)
      setRangeEnd(clampedEnd > clampedStart ? clampedEnd : Math.min(clampedStart + 30, dur))
      el.currentTime = clampedStart
      setPlayhead(clampedStart)
    }
  }

  function handleRangeChange(start: number, end: number) {
    setRangeStart(start)
    setRangeEnd(end)
    const el = videoRef.current
    if (el && !isPlaying) {
      el.currentTime = start
      setPlayhead(start)
    }
  }

  function handleSeek(sec: number) {
    const el = videoRef.current
    if (!el) return
    el.currentTime = sec
    setPlayhead(sec)
  }

  function togglePreview() {
    const el = videoRef.current
    if (!el) return

    if (isPlaying) {
      el.pause()
      setIsPlaying(false)
      cancelAnimationFrame(rafRef.current)
      return
    }

    if (el.currentTime < rangeStart || el.currentTime >= rangeEnd) {
      el.currentTime = rangeStart
    }
    el.play()
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(syncPlayhead)
  }

  function applyAiSuggestion() {
    const start = mediaDuration > 0 ? Math.min(aiStart, mediaDuration - 1) : aiStart
    const end = mediaDuration > 0 ? Math.min(aiEnd, mediaDuration) : aiEnd
    setRangeStart(start)
    setRangeEnd(end)
    const el = videoRef.current
    if (el) {
      el.currentTime = start
      setPlayhead(start)
    }
  }

  async function generateClip() {
    if (!mediaFile || clipDuration < 1) return

    setStatus("loading-ffmpeg")
    setProgress(0)
    setErrorMsg("")

    const el = videoRef.current
    if (el) { el.pause(); setIsPlaying(false) }
    cancelAnimationFrame(rafRef.current)

    const hookText = selectedHook?.text ?? moment.suggestedHook
    const ffmpegLogs: string[] = []

    try {
      if (!ffmpegRef.current) {
        const ffmpeg = new FFmpeg()
        ffmpeg.on("progress", ({ progress: p }) => setProgress(Math.round(p * 100)))
        ffmpeg.on("log", ({ message }) => { ffmpegLogs.push(message) })
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        })
        ffmpegRef.current = ffmpeg
      }

      const ffmpeg = ffmpegRef.current
      setStatus("processing")
      ffmpegLogs.length = 0

      const ext = mediaFile.name.split(".").pop()?.toLowerCase() ?? "mp4"
      const inputName = `input.${ext}`
      await ffmpeg.writeFile(inputName, new Uint8Array(await mediaFile.arrayBuffer()))

      const safeHook = hookText
        .replace(/\\/g, "\\\\\\\\")
        .replace(/'/g, "\u2019")
        .replace(/:/g, "\\:")
        .replace(/%/g, "%%")
        .slice(0, 60)

      let exitCode: number

      if (isVideo) {
        exitCode = await ffmpeg.exec([
          "-y", "-ss", rangeStart.toString(), "-i", inputName, "-t", clipDuration.toString(),
          "-vf", [
            "scale=1080:1920:force_original_aspect_ratio=decrease",
            "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black",
            `drawtext=text='${safeHook}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h-180:line_spacing=16:bordercolor=black:borderw=3`,
          ].join(","),
          "-c:v", "libx264", "-c:a", "aac", "-preset", "ultrafast", "-crf", "28",
          "-movflags", "+faststart", "-pix_fmt", "yuv420p", "output.mp4",
        ])

        if (exitCode !== 0) {
          exitCode = await ffmpeg.exec([
            "-y", "-ss", rangeStart.toString(), "-i", inputName, "-t", clipDuration.toString(),
            "-vf", [
              "scale=1080:1920:force_original_aspect_ratio=decrease",
              "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black",
            ].join(","),
            "-c:v", "libx264", "-c:a", "aac", "-preset", "ultrafast", "-crf", "28",
            "-movflags", "+faststart", "-pix_fmt", "yuv420p", "output.mp4",
          ])
        }
      } else {
        exitCode = await ffmpeg.exec([
          "-y", "-ss", rangeStart.toString(), "-i", inputName, "-t", clipDuration.toString(),
          "-filter_complex", [
            "color=black:s=1080x1920:r=30[bg]",
            "[0:a]showwaves=s=1080x400:mode=cline:colors=8B5CF6|7C3AED:rate=30[wave]",
            "[bg][wave]overlay=0:760:format=auto[base]",
            `[base]drawtext=text='${safeHook}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=200:line_spacing=20:bordercolor=black:borderw=4[out]`,
          ].join(";"),
          "-map", "[out]", "-map", "0:a",
          "-c:v", "libx264", "-c:a", "aac", "-preset", "ultrafast", "-crf", "28",
          "-pix_fmt", "yuv420p", "output.mp4",
        ])
      }

      if (exitCode !== 0) {
        const tail = ffmpegLogs.slice(-10).join("\n")
        console.error("FFmpeg exit code:", exitCode, "\n", tail)
        throw new Error(`FFmpeg exited with code ${exitCode}`)
      }

      const data = await ffmpeg.readFile("output.mp4")
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer)

      if (bytes.byteLength < 1024) {
        console.error("FFmpeg output too small:", bytes.byteLength)
        throw new Error("FFmpeg produced an empty or corrupt file")
      }

      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" })
      setClipUrl(URL.createObjectURL(blob))
      setStatus("done")
    } catch (e) {
      console.error("Clip generation error:", e)
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("memory") || msg.includes("OOM")) {
        setErrorMsg("Out of memory — close other tabs and try again, or use a smaller file.")
      } else if (msg.includes("SharedArrayBuffer")) {
        setErrorMsg("Browser blocked multi-threaded processing. Try Chrome or Edge.")
      } else {
        setErrorMsg(`Processing failed: ${msg.slice(0, 200)}`)
      }
      setStatus("error")
    }
  }

  function download() {
    if (!clipUrl) return
    const a = document.createElement("a")
    a.href = clipUrl
    a.download = `clip-${fmt(rangeStart).replace(/:/g, "m")}-${fmt(rangeEnd).replace(/:/g, "m")}.mp4`
    a.click()
  }

  async function publishToTikTok() {
    if (!clipUrl) return
    setPublishing(true)
    try {
      const blob = await fetch(clipUrl).then((r) => r.blob())
      const form = new FormData()
      form.append("video", blob, "clip.mp4")
      form.append("caption", caption)
      const res = await fetch("/api/publish/tiktok", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPublishResult("tiktok")
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Clip Editor</h3>
              <p className="text-[11px] text-muted-foreground">
                {mediaFile ? `${fmt(clipDuration)} selected` : "Upload a file to start"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Upload */}
            {status === "idle" && !mediaFile && (
              <div>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 transition-colors group"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground/60 group-hover:text-primary/60 transition-colors mb-3" />
                  <p className="text-sm font-medium">Drop your file or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Video (MP4, MOV) → video clip · Audio (MP3, M4A) → audiogram
                  </p>
                  <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleFile} />
                </div>
                {sizeError && <p className="text-sm text-destructive mt-3">{sizeError}</p>}
              </div>
            )}

            {/* Editor */}
            {mediaFile && status === "idle" && (
              <>
                {/* Preview */}
                {isVideo && mediaUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-black">
                    <video
                      ref={videoRef}
                      src={mediaUrl}
                      onLoadedMetadata={handleMediaLoaded}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full aspect-video object-contain"
                      playsInline
                    />
                    <button
                      onClick={togglePreview}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
                    >
                      {!isPlaying && (
                        <div className="h-12 w-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        </div>
                      )}
                    </button>
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-0.5 text-[11px] font-mono text-white/80">
                      {fmt(playhead >= 0 ? playhead : rangeStart)}
                    </div>
                  </div>
                )}

                {!isVideo && mediaUrl && (
                  <div className="rounded-xl overflow-hidden border border-border bg-muted/30 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <AudioLines className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{mediaFile.name}</span>
                    </div>
                    <audio
                      ref={videoRef as React.RefObject<HTMLAudioElement>}
                      src={mediaUrl}
                      onLoadedMetadata={handleMediaLoaded}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Timeline */}
                {mediaDuration > 0 && (
                  <div className="space-y-3">
                    <Timeline
                      duration={mediaDuration}
                      rangeStart={rangeStart}
                      rangeEnd={rangeEnd}
                      playhead={playhead}
                      onRangeChange={handleRangeChange}
                      onSeek={handleSeek}
                    />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={togglePreview}
                      >
                        {isPlaying
                          ? <Pause className="h-3.5 w-3.5" />
                          : <Play className="h-3.5 w-3.5 ml-0.5" />
                        }
                      </Button>

                      <button
                        onClick={applyAiSuggestion}
                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/5"
                      >
                        <Sparkles className="h-3 w-3" />
                        AI: {fmt(aiStart)} → {fmt(aiEnd)}
                      </button>

                      <div className="ml-auto flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {isVideo ? <Film className="h-3 w-3 text-muted-foreground" /> : <AudioLines className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-[11px] text-muted-foreground">{fileSizeMB(mediaFile.size)} MB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hook overlay info */}
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Text overlay</p>
                  <p className="text-sm">&ldquo;{selectedHook?.text ?? moment.suggestedHook}&rdquo;</p>
                </div>

                {sizeWarning && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-xs text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <p>{sizeWarning}</p>
                  </div>
                )}

                {/* Generate */}
                <Button className="w-full" onClick={generateClip} disabled={clipDuration < 1}>
                  <Scissors className="h-4 w-4 mr-2" />
                  Generate {fmt(clipDuration)} {isVideo ? "video clip" : "audiogram"}
                </Button>
              </>
            )}

            {/* Processing */}
            {(status === "loading-ffmpeg" || status === "processing") && (
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {status === "loading-ffmpeg"
                    ? "Loading FFmpeg (one-time, ~5s)…"
                    : `${isVideo ? "Generating video clip" : "Rendering audiogram"}… ${progress}%`
                  }
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all rounded-full"
                    style={{ width: `${status === "loading-ffmpeg" ? 5 : progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Runs in your browser — file is never uploaded.</p>
              </div>
            )}

            {/* Result */}
            {status === "done" && clipUrl && (
              <div className="space-y-4">
                <video src={clipUrl} controls className="w-full rounded-xl border border-border aspect-9/16 object-contain bg-black" />

                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Caption</p>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={download}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={publishToTikTok}
                    disabled={publishing || !!publishResult}
                  >
                    {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {publishResult === "tiktok" ? "Posted!" : "Post to TikTok"}
                  </Button>
                </div>

                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => { setStatus("idle"); setClipUrl(null) }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Adjust range and regenerate
                </Button>

                {publishResult && (
                  <p className="text-sm text-emerald-400 text-center">
                    Clip sent to TikTok — it will appear in your drafts shortly.
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{errorMsg}</p>
                <Button variant="outline" size="sm" onClick={() => { setStatus("idle"); setErrorMsg("") }}>
                  Try again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
