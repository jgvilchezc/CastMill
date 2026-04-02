"use client"

import { useState, useRef } from "react"
import { Upload, Scissors, Download, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"

interface ClipMoment {
  startSeconds: number
  endSeconds: number
  startTime: string
  endTime: string
  hook: string
}

interface ClipGeneratorProps {
  moment: ClipMoment
  onClose: () => void
}

export function ClipGenerator({ moment, onClose }: ClipGeneratorProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "loading-ffmpeg" | "processing" | "done" | "error">("idle")
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setVideoFile(f)
  }

  async function generateClip() {
    if (!videoFile) return
    setStatus("loading-ffmpeg")
    setProgress(0)

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

      await ffmpeg.writeFile("input.mp4", new Uint8Array(await videoFile.arrayBuffer()))

      await ffmpeg.exec([
        "-i", "input.mp4",
        "-ss", moment.startSeconds.toString(),
        "-to", moment.endSeconds.toString(),
        "-c:v", "libx264",
        "-c:a", "aac",
        "-preset", "fast",
        "-crf", "23",
        "output.mp4",
      ])

      const data = await ffmpeg.readFile("output.mp4")
      const blob = new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: "video/mp4" })
      setClipUrl(URL.createObjectURL(blob))
      setStatus("done")
    } catch (e) {
      console.error(e)
      setErrorMsg("Processing failed. Make sure the video file is valid.")
      setStatus("error")
    }
  }

  function download() {
    if (!clipUrl) return
    const a = document.createElement("a")
    a.href = clipUrl
    a.download = `clip-${moment.startTime.replace(":", "m")}s.mp4`
    a.click()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold">Cut Clip</h3>
            <p className="text-xs text-muted-foreground font-mono">{moment.startTime} → {moment.endTime} · {moment.endSeconds - moment.startSeconds}s</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground">Hook</p>
            <p className="text-sm font-medium mt-0.5">&ldquo;{moment.hook}&rdquo;</p>
          </div>

          {status === "idle" && !videoFile && (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Upload your video file</p>
              <p className="text-xs text-muted-foreground mt-1">Processed entirely in your browser — never leaves your device</p>
              <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
            </div>
          )}

          {videoFile && status === "idle" && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <Scissors className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{videoFile.name}</p>
                <p className="text-xs text-muted-foreground">{(videoFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <Button onClick={generateClip} size="sm">
                <Scissors className="h-3.5 w-3.5 mr-1.5" />
                Cut
              </Button>
            </div>
          )}

          {(status === "loading-ffmpeg" || status === "processing") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "loading-ffmpeg" ? "Loading FFmpeg (one-time, ~5s)…" : `Processing… ${progress}%`}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${status === "loading-ffmpeg" ? 5 : progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Processing happens in your browser — your video is never uploaded to any server.</p>
            </div>
          )}

          {status === "done" && clipUrl && (
            <div className="space-y-3">
              <video src={clipUrl} controls className="w-full rounded-lg border border-border" />
              <Button className="w-full" onClick={download}>
                <Download className="h-4 w-4 mr-2" />
                Download Clip
              </Button>
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
