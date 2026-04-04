"use client"

import { useState, useRef } from "react"
import { Upload, Scissors, Download, Loader2, X, Send } from "lucide-react"
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

function timecodeToSeconds(tc: string): number {
  const parts = tc.split(":").map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

export function EpisodeClipGenerator({ moment, selectedHook, onClose }: EpisodeClipGeneratorProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading-ffmpeg" | "processing" | "done" | "error">("idle")
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [caption, setCaption] = useState(
    selectedHook ? `${selectedHook.text}\n\n${selectedHook.caption}` : moment.suggestedHook
  )
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<string | null>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setAudioFile(f)
  }

  async function generateClip() {
    if (!audioFile) return
    setStatus("loading-ffmpeg")
    setProgress(0)

    const startSec = timecodeToSeconds(moment.startTimecode)
    const endSec = startSec + moment.durationSeconds
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

      const ext = audioFile.name.split(".").pop()?.toLowerCase() ?? "mp3"
      const inputName = `input.${ext}`

      await ffmpeg.writeFile(inputName, new Uint8Array(await audioFile.arrayBuffer()))

      const safeHook = hookText.replace(/'/g, "\\'").slice(0, 60)

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

      const data = await ffmpeg.readFile("output.mp4")
      const blob = new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: "video/mp4" })
      setClipUrl(URL.createObjectURL(blob))
      setStatus("done")
    } catch (e) {
      console.error(e)
      setErrorMsg("Processing failed. Make sure the file is a valid audio/video file.")
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

          {status === "idle" && !audioFile && (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Upload your audio or video file</p>
              <p className="text-xs text-muted-foreground mt-1">MP3, M4A, WAV, MP4 — processed locally in your browser</p>
              <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleFile} />
            </div>
          )}

          {audioFile && status === "idle" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <Scissors className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <Button onClick={generateClip} size="sm">
                  <Scissors className="h-3.5 w-3.5 mr-1.5" />
                  Generate
                </Button>
              </div>
            </div>
          )}

          {(status === "loading-ffmpeg" || status === "processing") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "loading-ffmpeg" ? "Loading FFmpeg (one-time, ~5s)…" : `Rendering waveform… ${progress}%`}
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
              <video src={clipUrl} controls className="w-full rounded-lg border border-border aspect-[9/16] object-contain bg-black" />

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
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}
