"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileAudio,
  Loader2,
  Copy,
  Download,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMarkdown, parseGlossary } from "@/lib/transcribe/format";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_GLOSSARY_CHARS = 500;

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  filename: string;
  provider: "groq" | "huggingface";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TranscribeTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [glossary, setGlossary] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [editedText, setEditedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToMemory, setSavedToMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);

  function handleFile(picked: File | null) {
    setError(null);
    if (!picked) return;
    if (picked.size === 0) {
      setError("El archivo está vacío.");
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setError("Máximo 25 MB. Probá con un audio más corto o convertilo a MP3.");
      return;
    }
    setFile(picked);
    setResult(null);
    setEditedText("");
    setSavedToMemory(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit() {
    if (!file || submitting) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("audio", file);
      if (glossary.trim()) {
        fd.append("glossary", glossary.trim().slice(0, MAX_GLOSSARY_CHARS));
      }

      const res = await fetch("/api/tools/transcribe", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Error desconocido.");
        return;
      }

      setResult(data);
      setEditedText(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo transcribir.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!editedText) return;
    await navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function baseName(): string {
    if (!result) return "transcripcion";
    return result.filename.replace(/\.[^.]+$/, "") || "transcripcion";
  }

  function handleDownloadTxt() {
    if (!editedText || !result) return;
    downloadBlob(editedText, `${baseName()}.txt`, "text/plain;charset=utf-8");
  }

  async function handleSaveToMemory() {
    if (!editedText || !result) return;
    setSavingMemory(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "transcript",
          sourceId: result.filename,
          title: result.filename,
          content: editedText,
        }),
      });
      if (res.ok) setSavedToMemory(true);
    } finally {
      setSavingMemory(false);
    }
  }

  function handleDownloadMd() {
    if (!editedText || !result) return;
    const md = buildMarkdown(editedText, {
      filename: result.filename,
      duration: result.duration,
      language: result.language,
      date: todayISO(),
      glossary: parseGlossary(glossary),
    });
    downloadBlob(md, `${baseName()}.md`, "text/markdown;charset=utf-8");
  }

  const glossaryRemaining = MAX_GLOSSARY_CHARS - glossary.length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" />
          Quick Transcribe
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subí un audio (WhatsApp, voice note, lo que sea). Te devuelvo texto
          limpio listo para pasarle a un LLM. Glosario opcional para nombres y
          términos únicos.
        </p>
      </div>

      {!file ? (
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.opus,.ogg,.mp3,.wav,.m4a,.webm"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <UploadCloud
            className={cn(
              "mb-3 h-10 w-10 transition-colors",
              dragOver ? "text-primary" : "text-muted-foreground",
            )}
          />
          <p className="text-base font-medium">Arrastrá un audio o hacé click</p>
          <p className="mt-1 text-xs text-muted-foreground">
            .opus · .mp3 · .wav · .m4a · .ogg · .webm · máx 25 MB
          </p>
        </motion.div>
      ) : (
        <Card className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileAudio className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              setResult(null);
              setEditedText("");
              setError(null);
            }}
            disabled={submitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="glossary">Glosario (opcional)</Label>
          <span
            className={cn(
              "text-xs",
              glossaryRemaining < 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {glossaryRemaining} chars
          </span>
        </div>
        <Textarea
          id="glossary"
          placeholder="Castmill, ExpandCast, pgvector, José Vilchez…"
          value={glossary}
          onChange={(e) => setGlossary(e.target.value.slice(0, MAX_GLOSSARY_CHARS))}
          rows={3}
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground">
          Nombres propios, jerga, términos únicos. Whisper los va a reconocer
          mejor.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!file || submitting}
        size="lg"
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcribiendo…
          </>
        ) : (
          "Transcribir"
        )}
      </Button>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            {result.language && result.language !== "unknown" && (
              <Badge variant="secondary">{result.language}</Badge>
            )}
            {result.duration > 0 && (
              <Badge variant="secondary">{formatDuration(result.duration)}</Badge>
            )}
            <Badge variant="outline" className="text-xs">
              via {result.provider}
            </Badge>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
                <Download className="h-4 w-4" />
                .txt
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMd}>
                <Download className="h-4 w-4" />
                .md
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveToMemory}
                disabled={savingMemory || savedToMemory}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {savedToMemory ? "Guardado en Memory" : savingMemory ? "Guardando…" : "Guardar en Memory"}
              </Button>
            </div>
          </div>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={16}
            className="font-mono text-sm leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            Editá el texto si querés antes de copiar/descargar.
          </p>
        </motion.div>
      )}
    </div>
  );
}
