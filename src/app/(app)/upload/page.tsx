"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Lock, Zap, Upload, FileText, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DropZone } from "@/components/upload/DropZone";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEpisodes } from "@/lib/context/episode-context";
import { useUser } from "@/lib/context/user-context";
import { createClient } from "@/lib/supabase/client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

type Phase = "idle" | "extracting" | "uploading" | "done" | "error";

const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/mpeg"]);
const GROQ_LIMIT_BYTES = 25 * 1024 * 1024;
const STORAGE_BUCKET = "episode-audio";

function isVideoFile(file: File) {
  return VIDEO_TYPES.has(file.type) || /\.(mp4|mov|avi|mkv|webm|mpeg|mpg)$/i.test(file.name);
}

function getProgressMessage(progress: number, phase: Phase): string {
  if (phase === "extracting") {
    if (progress < 20) return "Loading audio engine (one-time ~5s)…";
    if (progress < 80) return `Processing audio… ${progress}%`;
    return "Audio ready, preparing upload…";
  }
  if (progress < 30) return "Uploading audio…";
  if (progress < 65) return "Transcribing with Whisper AI…";
  if (progress < 90) return "Analyzing speakers…";
  return "Finalizing…";
}

export default function UploadPage() {
  const router = useRouter();
  const { addEpisode, updateTranscript, deleteEpisode } = useEpisodes();
  const { canUpload, episodesUsed, episodesLimit, consumeEpisodeCredit, user } = useUser();
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [newEpisodeId, setNewEpisodeId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pasteDuration, setPasteDuration] = useState("");
  const [isPasteSubmitting, setIsPasteSubmitting] = useState(false);

  async function extractAudio(file: File): Promise<File> {
    setPhase("extracting");
    setProgress(5);

    if (!ffmpegRef.current) {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.max(20, Math.round(20 + p * 60)));
      });
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegRef.current = ffmpeg;
    }

    setProgress(20);
    const ffmpeg = ffmpegRef.current;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const inputName = `input.${ext}`;

    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    await ffmpeg.exec([
      "-i", inputName,
      "-vn",
      "-acodec", "libmp3lame",
      "-b:a", "32k",
      "-ar", "16000",
      "-ac", "1",
      "audio.mp3",
    ]);

    setProgress(85);
    const data = await ffmpeg.readFile("audio.mp3");
    const blob = new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: "audio/mpeg" });

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.mp3`, { type: "audio/mpeg" });
  }

  const COMPRESS_THRESHOLD = 20 * 1024 * 1024;

  async function compressAudioForWhisper(file: File): Promise<File> {
    setPhase("extracting");
    setProgress(5);

    if (!ffmpegRef.current) {
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.max(20, Math.round(20 + p * 60)));
      });
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      ffmpegRef.current = ffmpeg;
    }

    setProgress(20);
    const ffmpeg = ffmpegRef.current;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
    const inputName = `compress_input.${ext}`;

    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));

    await ffmpeg.exec([
      "-i", inputName,
      "-vn",
      "-acodec", "libmp3lame",
      "-b:a", "32k",
      "-ar", "16000",
      "-ac", "1",
      "compressed.mp3",
    ]);

    setProgress(85);
    const data = await ffmpeg.readFile("compressed.mp3");
    const blob = new Blob([new Uint8Array(data as unknown as ArrayBuffer)], { type: "audio/mpeg" });

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.mp3`, { type: "audio/mpeg" });
  }

  async function handleFile(file: File) {
    if (!canUpload) return;

    const needsExtraction = isVideoFile(file);

    setFileName(file.name);

    let audioFile = file;

    if (needsExtraction) {
      try {
        audioFile = await extractAudio(file);
      } catch (err) {
        console.error("Audio extraction failed:", err);
        if (file.size > GROQ_LIMIT_BYTES) {
          setErrorMsg(
            `Could not extract audio automatically and the file is ${(file.size / 1024 / 1024).toFixed(0)} MB (limit 25 MB). ` +
            `Please export audio-only as MP3 and upload that file.`
          );
          setPhase("error");
          return;
        }
      }
    }

    if (audioFile.size > COMPRESS_THRESHOLD) {
      try {
        audioFile = await compressAudioForWhisper(audioFile);
      } catch (err) {
        console.error("Audio compression failed:", err);
      }
    }

    if (audioFile.size > GROQ_LIMIT_BYTES) {
      setErrorMsg(
        `Audio file is ${(audioFile.size / 1024 / 1024).toFixed(1)} MB after compression. ` +
        `Groq Whisper accepts up to 25 MB. For episodes longer than ~4 hours, ` +
        `try splitting the audio or using the "Paste transcript" option.`
      );
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setProgress(0);

    const supabase = createClient();
    const storagePath = `${user!.id}/${Date.now()}-${audioFile.name}`;
    let episodeId: string | null = null;

    try {
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const episode = await addEpisode({
        title,
        description: "Newly uploaded episode.",
        duration: 0,
        topics: [],
        guests: [],
        status: "processing",
        thumbnailUrl: null,
      });
      episodeId = episode.id;

      setProgress(10);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, audioFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setProgress(40);

      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });

      setProgress(80);

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Server returned an unexpected response (${res.status}). Please try again.`
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Transcription failed (${res.status})`);
      }

      const transcriptText: string = data.text ?? "";
      const segments: unknown[] = data.segments ?? [];

      await updateTranscript(episode.id, transcriptText, segments);

      const credited = await consumeEpisodeCredit();
      if (!credited) {
        console.warn("Episode created but credit not consumed — limit may have been reached concurrently");
      }

      setProgress(100);
      setNewEpisodeId(episode.id);
      setPhase("done");
    } catch (err: unknown) {
      console.error(err);
      supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      if (episodeId) {
        try { await deleteEpisode(episodeId); } catch { /* best-effort cleanup */ }
      }
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }

  function parseTimestampedText(raw: string): { plainText: string; segments: { speaker: string; text: string; start: number }[] } | null {
    const lines = raw.split(/\n+/).filter(l => l.trim())
    const pattern = /^\[(\d{1,2}):(\d{2})\]\s+(.+?):\s+(.+)$/
    const segs: { speaker: string; text: string; start: number }[] = []
    for (const line of lines) {
      const m = line.trim().match(pattern)
      if (!m) return null
      const mins = parseInt(m[1], 10)
      const secs = parseInt(m[2], 10)
      segs.push({ speaker: m[3], text: m[4], start: mins * 60 + secs })
    }
    if (segs.length === 0) return null
    return { plainText: segs.map(s => s.text).join(" "), segments: segs }
  }

  async function handlePasteSubmit() {
    if (!canUpload || !pasteTitle.trim() || !pasteText.trim()) return;
    setIsPasteSubmitting(true);
    try {
      const parsed = parseTimestampedText(pasteText.trim())

      const episode = await addEpisode({
        title: pasteTitle.trim(),
        description: "Created from pasted transcript.",
        duration: pasteDuration ? parseInt(pasteDuration, 10) * 60 : 0,
        topics: [],
        guests: [],
        status: "processing",
        thumbnailUrl: null,
      });

      if (parsed) {
        await updateTranscript(episode.id, parsed.plainText, parsed.segments);
      } else {
        await updateTranscript(episode.id, pasteText.trim(), []);
      }

      const credited = await consumeEpisodeCredit();
      if (!credited) {
        console.warn("Episode created but credit not consumed — limit may have been reached concurrently");
      }
      setNewEpisodeId(episode.id);
      setPhase("done");
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    } finally {
      setIsPasteSubmitting(false);
    }
  }

  const isAtLimit = !canUpload && user !== null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Upload Episode</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a recording or script — Expandcast will transcribe and generate
          content assets automatically.
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <span>
            {episodesUsed} / {episodesLimit} episodes used this month
          </span>
          {user?.plan !== "pro" && (
            <Link
              href="/pricing"
              className="text-primary underline underline-offset-2 hover:no-underline ml-1"
            >
              Upgrade for more
            </Link>
          )}
        </div>
      </div>

      {isAtLimit ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-border bg-card p-8 text-center space-y-5"
        >
          <div className="flex justify-center">
            <div className="bg-muted p-4 border-2 border-border">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold font-heading uppercase tracking-tight">
              Monthly limit reached
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ve used all {episodesLimit} episodes on your{" "}
              <span className="capitalize font-medium">{user?.plan}</span> plan
              this month. Upgrade to keep creating.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/pricing" className="flex items-center gap-2">
                See Upgrade Options
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center gap-0.5 border-b border-border mb-6">
                <button
                  onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-2 px-4 pb-2.5 pt-0 text-sm whitespace-nowrap transition-colors relative
                    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-150
                    ${inputMode === "upload" ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground/70 after:bg-transparent"}`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload file
                </button>
                <button
                  onClick={() => setInputMode("paste")}
                  className={`flex items-center gap-2 px-4 pb-2.5 pt-0 text-sm whitespace-nowrap transition-colors relative
                    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-150
                    ${inputMode === "paste" ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground/70 after:bg-transparent"}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Paste transcript
                </button>
              </div>

              {inputMode === "upload" ? (
                <>
                  <DropZone onFile={handleFile} />
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    Video files are automatically converted to audio in your browser before upload.
                    {" "}Files over 20 MB are compressed automatically.
                  </p>
                </>
              ) : (
                <div className="border-2 border-border bg-card p-6 space-y-4">
                  <div>
                    <label htmlFor="paste-title" className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Episode title *
                    </label>
                    <input
                      id="paste-title"
                      type="text"
                      value={pasteTitle}
                      onChange={(e) => setPasteTitle(e.target.value)}
                      placeholder="My Podcast Episode"
                      className="w-full px-3 py-2 text-sm border border-border bg-background rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="paste-duration" className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Duration (minutes, optional)
                    </label>
                    <input
                      id="paste-duration"
                      type="number"
                      min="0"
                      value={pasteDuration}
                      onChange={(e) => setPasteDuration(e.target.value)}
                      placeholder="60"
                      className="w-full px-3 py-2 text-sm border border-border bg-background rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="paste-text" className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Transcript *
                    </label>
                    <textarea
                      id="paste-text"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={"Paste your transcript here.\nSupports timestamped format:\n[00:00] Speaker: Hello everyone...\n[01:23] Guest: Thanks for having me...\n\nOr plain text from Zoom, Otter.ai, Rev, etc."}
                      rows={12}
                      className="w-full px-3 py-2 text-sm border border-border bg-background rounded resize-y font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <Button
                    onClick={handlePasteSubmit}
                    disabled={!pasteTitle.trim() || !pasteText.trim() || isPasteSubmitting}
                    className="w-full"
                  >
                    {isPasteSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating episode…
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Create episode from transcript
                      </>
                    )}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Tip: paste with <span className="font-mono">[MM:SS] Speaker: text</span> format to preserve timestamps and speakers.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {(phase === "extracting" || phase === "uploading") && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="border-2 border-border bg-card p-8 text-center space-y-6"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground font-mono">
                  {fileName}
                </p>
                <p className="text-base font-bold font-heading">
                  {getProgressMessage(progress, phase)}
                </p>
              </div>
              <Progress value={phase === "extracting" ? progress : progress} className="h-2" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-mono">
                  {phase === "extracting" ? `${progress}% — processing in your browser` : `${progress}% complete`}
                </p>
                {phase === "extracting" && (
                  <p className="text-xs text-muted-foreground">
                    Audio extraction runs locally — your video is never uploaded to any server.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {phase === "done" && newEpisodeId && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-2 border-primary bg-card p-8 text-center space-y-4 shadow-[8px_8px_0_0_var(--color-primary)]"
            >
              <div className="flex justify-center">
                <div className="bg-primary/10 p-4 border-2 border-primary">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading uppercase tracking-tight">
                  Transcription complete!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your episode is ready. Generate content assets now.
                </p>
              </div>
              <Button onClick={() => router.push(`/episode/${newEpisodeId}`)}>
                View Episode
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border-2 border-destructive bg-destructive/10 p-8 text-center space-y-4"
            >
              <p className="font-bold text-destructive font-heading uppercase">
                Upload failed
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {errorMsg}
              </p>
              <Button variant="outline" onClick={() => setPhase("idle")}>
                Try again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
