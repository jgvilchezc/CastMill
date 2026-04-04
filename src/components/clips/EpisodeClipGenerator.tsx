"use client"

import { useState, useRef } from "react"
import { Upload, Scissors, Download, Loader2, X, Send, Film, AudioLines, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

interface ClipMoment {
  id: string
  quote: string
  startTimecode: string
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

function timecodeToSeconds(tc: string): number {
  const parts = tc.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

function fileSizeMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1)
}

export function EpisodeClipGenerator({ moment, selectedHook, onClose }: EpisodeClipGeneratorProps) {
  const [mediaFile, setMediaFile] = useState<File | null>(null)
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

  const isVideo = mediaFile ? isVideoFile(mediaFile) : false

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    setSizeError("")
    setSizeWarning("")

    const video = isVideoFile(f)

    if (video && f.size > VIDEO_LIMIT_BYTES) {
      setSizeError(
        `This file is ${fileSizeMB(f.size)} MB. Video files over 1 GB require server-side processing, ` +
        `which will be available on the Pro plan soon. For now, try trimming the video or exporting at a lower resolution.`
      )
      return
    }

    if (!video && f.size > AUDIO_LIMIT_BYTES) {
      setSizeError(
        `Audio file is ${fileSizeMB(f.size)} MB — browser processing supports up to 50 MB. ` +
        `Try exporting as MP3 at a lower bitrate.`
      )
      return
    }

    if (video && f.size > VIDEO_WARN_BYTES) {
      setSizeWarning(
        `This file is ${fileSizeMB(f.size)} MB. Processing large videos in the browser requires a computer ` +
        `with at least 16 GB of RAM and may take a few minutes.`
      )
    }

    setMediaFile(f)
  }

  async function generateClip() {
    if (!mediaFile) return

    setStatus("loading-ffmpeg")
    setProgress(0)
    setErrorMsg("")

    const startSec = timecodeToSeconds(moment.startTimecode)
    const hookText = selectedHook?.text ?? moment.suggestedHook

    try {
      if (!ffmpegRef.current) {
        const ffmpeg = new FFmpeg()
        ffmpeg.on("progress", ({ progress: p }) => setProgress(Math.round(p * 100)))
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        })
        ffmpegRef.current = ffmpeg
      }

      const ffmpeg = ffmpegRef.current
      setStatus("processing")

      const ext = mediaFile.name.split(".").pop()?.toLowerCase() ?? "mp4"
      const inputName = `input.${ext}`

      await ffmpeg.writeFile(inputName, new Uint8Array(await mediaFile.arrayBuffer()))

      const safeHook = hookText.replace(/'/g, "\\'").slice(0, 60)

      if (isVideo) {
        await ffmpeg.exec([
          "-ss", startSec.toString(),
          "-t", moment.durationSeconds.toString(),
          "-i", inputName,
          "-vf",
          [
            "scale=1080:1920:force_original_aspect_ratio=decrease",
            "pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
            `drawtext=text='${safeHook}':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h-180:line_spacing=16:bordercolor=black:borderw=3`,
          ].join(","),
          "-c:v", "libx264",
          "-c:a", "aac",
          "-preset", "ultrafast",
          "-crf", "28",
          "-movflags", "+faststart",
          "output.mp4",
        ])
      } else {
        const endSec = startSec + moment.durationSeconds
        await ffmpeg.exec([
          "-ss", startSec.toString(),
          "-to", endSec.toString(),
          "-i", inputName,
          "-filter_complex",
          [
            "color=black:s=1080x1920:r=30[bg]",
            "[0:a]showwaves=s=1080x400:mode=cline:colors=8B5CF6|7C3AED:rate=30[wave]",
            "[bg][wave]overlay=0:760:format=auto[base]",
            `[base]drawtext=text='${safeHook}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=200:line_spacing=20:font=Sans:style=Bold:bordercolor=black:borderw=4[out]`,
          ].join(";"),
          "-map", "[out]",
          "-map", "0:a",
          "-c:v", "libx264",
          "-c:a", "aac",
          "-preset", "ultrafast",
          "-crf", "28",
          "-t", moment.durationSeconds.toString(),
          "output.mp4",
        ])
      }

      const data = await ffmpeg.readFile("output.mp4")
      const blob = new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: "video/mp4" })
      setClipUrl(URL.createObjectURL(blob))
      setStatus("done")
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("memory") || msg.includes("OOM") || msg.includes("allocation")) {
        setErrorMsg(
          `Out of memory — your browser ran out of RAM processing this file. ` +
          `Close other tabs and try again, or use a smaller file.`
        )
      } else if (msg.includes("SharedArrayBuffer") || msg.includes("cross-origin")) {
        setErrorMsg(
          `Your browser blocked multi-threaded processing. ` +
          `Try Chrome or Edge, or use a shorter file.`
        )
      } else {
        setErrorMsg(
          `Processing failed: ${msg.slice(0, 150)}. ` +
          `Try a different file format or a shorter file.`
        )
      }
      setStatus("error")
    }
  }

  function download() {
    if (!clipUrl) return
    const a = document.createElement("a")
    a.href = clipUrl
    a.download = `clip-${moment.startTimecode.replace(/:/g, "m")}.mp4`
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

  const progressLabel = isVideo
    ? `Generating video clip… ${progress}%`
    : `Rendering audiogram… ${progress}%`

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Scissors className="h-4 w-4 text-primary" />
              Clip Generator
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {moment.startTimecode} · {moment.durationSeconds}s
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Hook overlay</p>
            <p className="text-sm font-medium mt-0.5">&ldquo;{selectedHook?.text ?? moment.suggestedHook}&rdquo;</p>
          </div>

          {status === "idle" && !mediaFile && (
            <div>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Upload your audio or video file</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Video (MP4, MOV) for a video clip · Audio (MP3, M4A) for an audiogram
                </p>
                <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleFile} />
              </div>
              {sizeError && (
                <p className="text-sm text-destructive mt-3">{sizeError}</p>
              )}
            </div>
          )}

          {mediaFile && status === "idle" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                {isVideo ? (
                  <Film className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <AudioLines className="h-4 w-4 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{mediaFile.name}</p>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {isVideo ? "Video Clip" : "Audiogram"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{fileSizeMB(mediaFile.size)} MB</p>
                </div>
                <Button onClick={generateClip} size="sm">
                  <Scissors className="h-3.5 w-3.5 mr-1.5" />
                  Generate
                </Button>
              </div>

              {sizeWarning && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>{sizeWarning}</p>
                </div>
              )}
            </div>
          )}

          {(status === "loading-ffmpeg" || status === "processing") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "loading-ffmpeg" ? "Loading FFmpeg (one-time, ~5s)…" : progressLabel}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all rounded-full"
                  style={{ width: `${status === "loading-ffmpeg" ? 5 : progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Everything runs in your browser — your file is never uploaded.</p>
            </div>
          )}

          {status === "done" && clipUrl && (
            <div className="space-y-4">
              <video src={clipUrl} controls className="w-full rounded-lg border border-border aspect-9/16 object-contain bg-black" />

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Caption</p>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
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
                  {publishing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {publishResult === "tiktok" ? "Posted!" : "Post to TikTok"}
                </Button>
              </div>

              {publishResult && (
                <p className="text-sm text-emerald-400 text-center">
                  Clip sent to TikTok — it will appear in your drafts shortly.
                </p>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={() => { setStatus("idle"); setMediaFile(null); setErrorMsg(""); setSizeWarning("") }}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
