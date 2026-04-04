"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Lock, Zap } from "lucide-react";
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
    if (progress < 80) return `Extracting audio… ${progress}%`;
    return "Audio extracted, preparing upload…";
  }
  if (progress < 30) return "Uploading audio…";
  if (progress < 65) return "Transcribing with Whisper AI…";
  if (progress < 90) return "Analyzing speakers…";
  return "Finalizing…";
}

export default function UploadPage() {
  const router = useRouter();
  const { addEpisode, updateTranscript } = useEpisodes();
  const { canUpload, episodesUsed, episodesLimit, consumeEpisodeCredit, user } = useUser();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [newEpisodeId, setNewEpisodeId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const ffmpegRef = useRef<FFmpeg | null>(null);

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
      "-q:a", "5",
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

  async function handleFile(file: File) {
    if (!canUpload) return;

    const needsExtraction = isVideoFile(file);
    const exceedsLimit = file.size > GROQ_LIMIT_BYTES;

    if (exceedsLimit && !needsExtraction) {
      setErrorMsg(
        `File too large (${(file.size / 1024 / 1024).toFixed(0)} MB). ` +
        `Groq Whisper accepts up to 25 MB for audio files. ` +
        `Try exporting as MP3 at a lower bitrate.`
      );
      setPhase("error");
      return;
    }

    const credited = await consumeEpisodeCredit();
    if (!credited) return;

    setFileName(file.name);

    let audioFile = file;

    if (needsExtraction) {
      try {
        audioFile = await extractAudio(file);
      } catch (err) {
        console.error("Audio extraction failed:", err);
        if (exceedsLimit) {
          setErrorMsg(
            `Could not extract audio automatically and the file is ${(file.size / 1024 / 1024).toFixed(0)} MB (limit 25 MB). ` +
            `Please export audio-only as MP3 and upload that file.`
          );
          setPhase("error");
          return;
        }
      }
    }

    if (audioFile.size > GROQ_LIMIT_BYTES) {
      setErrorMsg(
        `Audio file is ${(audioFile.size / 1024 / 1024).toFixed(1)} MB but Groq Whisper accepts up to 25 MB. ` +
        `Try exporting as MP3 at a lower bitrate (mono, 64 kbps).`
      );
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setProgress(0);

    const supabase = createClient();
    const storagePath = `${user!.id}/${Date.now()}-${audioFile.name}`;

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

      setProgress(100);
      setNewEpisodeId(episode.id);
      setPhase("done");
    } catch (err: unknown) {
      console.error(err);
      supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
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
              <DropZone onFile={handleFile} />
              <p className="text-center text-xs text-muted-foreground mt-3">
                Video files are automatically converted to audio in your browser before upload.
              </p>
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
