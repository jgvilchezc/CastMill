"use client";

import { useEffect, useRef, useState } from "react";
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
  Clock,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useUser } from "@/lib/context/user-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildMarkdown, parseGlossary } from "@/lib/transcribe/format";
import {
  sortFiles,
  buildCombinedText,
  buildCombinedMarkdown,
  type CombinedBlock,
} from "@/lib/transcribe/queue";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_GLOSSARY_CHARS = 500;
const MAX_BATCH_FILES = 25;

type QueueStatus = "queued" | "transcribing" | "done" | "error";

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  filename: string;
  provider: "groq" | "huggingface";
}

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  result?: TranscriptionResult;
  error?: string;
  editedText?: string;
}

interface HistoryItem {
  id: string;
  title: string;
  text: string;
  language: string | null;
  duration: number | null;
  filename: string | null;
  created_at: string;
  provider: string | null;
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

function makeItemId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "transcripcion";
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

// Build the combined blocks from successful items, in their current order.
function successfulBlocks(items: QueueItem[]): CombinedBlock[] {
  return items
    .filter((item) => item.status === "done" && item.result)
    .map((item) => ({
      filename: item.result!.filename,
      durationSeconds: item.result!.duration,
      text: item.editedText ?? item.result!.text,
    }));
}

export function TranscribeTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [glossary, setGlossary] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processed, setProcessed] = useState(false);
  const [view, setView] = useState<"separate" | "combined">("separate");

  // Reorder drag state (index of the item being dragged).
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Single-item result actions feedback.
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [combinedCopied, setCombinedCopied] = useState(false);
  const [savedToMemory, setSavedToMemory] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);

  // History item loaded into a read panel (combined or single).
  const [loadedHistory, setLoadedHistory] = useState<HistoryItem | null>(null);

  const { user } = useUser();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/tools/transcribe/history")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setHistory((d.items ?? []) as HistoryItem[]))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when the user identity changes
  }, [user?.id]);

  function loadFromHistory(item: HistoryItem) {
    setLoadedHistory(item);
    setError(null);
  }

  async function deleteFromHistory(id: string) {
    const res = await fetch("/api/tools/transcribe/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      setLoadedHistory((prev) => (prev?.id === id ? null : prev));
    }
  }

  // Validate + append files to the queue, then sort by filename/lastModified.
  function addFiles(picked: File[]) {
    // Adding files mid-batch would orphan them (the run iterates a snapshot)
    // and reset the results panel. Ignore until the current batch settles.
    if (submitting) return;
    setError(null);
    if (picked.length === 0) return;

    setQueue((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const next = [...prev];
      const messages: string[] = [];
      let capped = false;

      for (const file of picked) {
        if (next.length >= MAX_BATCH_FILES) {
          capped = true;
          break;
        }
        if (file.size === 0) {
          messages.push(`"${file.name}" está vacío y se omitió.`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          messages.push(
            `"${file.name}" supera los 25 MB y se omitió. Probá con un audio más corto o convertilo a MP3.`,
          );
          continue;
        }
        const id = makeItemId(file);
        if (existingIds.has(id)) continue;
        existingIds.add(id);
        next.push({ id, file, status: "queued" });
      }

      if (capped) {
        messages.push(
          `Máximo ${MAX_BATCH_FILES} audios por lote. Se ignoraron los archivos extra.`,
        );
      }

      if (messages.length > 0) setError(messages.join(" "));

      // Sort the whole queue by the wrapped File (name asc, lastModified tiebreak).
      const sortedFiles = sortFiles(next.map((item) => item.file));
      const byId = new Map(next.map((item) => [item.id, item]));
      return sortedFiles.map((file) => byId.get(makeItemId(file))!);
    });

    // A fresh batch invalidates any previous results.
    setProcessed(false);
    setSavedToMemory(false);
    setLoadedHistory(null);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
    // Allow re-selecting the same files later.
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeItem(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setProcessed(false);
  }

  function reorder(from: number, to: number) {
    if (from === to || to < 0) return;
    setQueue((prev) => {
      if (to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function transcribeOne(
    item: QueueItem,
    glossaryValue: string,
    skipHistory: boolean,
  ): Promise<{ result: TranscriptionResult } | { error: string }> {
    const fd = new FormData();
    fd.append("audio", item.file);
    if (glossaryValue) fd.append("glossary", glossaryValue);
    if (skipHistory) fd.append("skipHistory", "1");

    try {
      const res = await fetch("/api/tools/transcribe", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          error:
            typeof data?.error === "string" ? data.error : "Error desconocido.",
        };
      }
      return { result: data as TranscriptionResult };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "No se pudo transcribir." };
    }
  }

  async function handleSubmit() {
    if (queue.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    setProcessed(false);
    setSavedToMemory(false);
    setLoadedHistory(null);

    const glossaryValue = glossary.trim().slice(0, MAX_GLOSSARY_CHARS);
    const isBatch = queue.length >= 2;

    // Reset every item to queued before starting.
    setQueue((prev) =>
      prev.map((item) => ({
        ...item,
        status: "queued",
        result: undefined,
        error: undefined,
        editedText: undefined,
      })),
    );

    // Iterate over the queue as it stands at submit time. Reorder is locked
    // while submitting, so this snapshot stays authoritative for the whole run.
    const order = [...queue];
    // Collect successful results in processing order for the combined save.
    const successes: TranscriptionResult[] = [];

    try {
      for (const target of order) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === target.id ? { ...item, status: "transcribing" } : item,
          ),
        );

        const outcome = await transcribeOne(target, glossaryValue, isBatch);

        if ("error" in outcome) {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === target.id
                ? { ...item, status: "error", error: outcome.error }
                : item,
            ),
          );
        } else {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === target.id
                ? {
                    ...item,
                    status: "done",
                    result: outcome.result,
                    editedText: outcome.result.text,
                  }
                : item,
            ),
          );
          successes.push(outcome.result);

          // Single-file path: save history exactly like before (no skipHistory).
          if (!isBatch) {
            const data = outcome.result as TranscriptionResult & {
              historyId?: string;
              title?: string;
            };
            if (data.historyId && data.title) {
              setHistory((prev) => [
                {
                  id: data.historyId!,
                  title: data.title!,
                  text: data.text,
                  language: data.language ?? null,
                  duration: data.duration ?? null,
                  filename: data.filename ?? null,
                  created_at: new Date().toISOString(),
                  provider: data.provider ?? null,
                },
                ...prev,
              ]);
            }
          }
        }
      }

      setProcessed(true);
      setView("separate");

      // Batch path: save one combined history entry for logged-in users.
      if (isBatch && user && successes.length > 0) {
        await saveCombinedHistory(successes);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function saveCombinedHistory(results: TranscriptionResult[]) {
    if (results.length === 0) return;

    const blocks: CombinedBlock[] = results.map((r) => ({
      filename: r.filename,
      durationSeconds: r.duration,
      text: r.text,
    }));
    const combinedText = buildCombinedText(blocks);
    const totalDuration = results.reduce(
      (sum, r) => sum + Math.max(0, r.duration),
      0,
    );
    const firstLanguage =
      results
        .map((r) => r.language)
        .find((lang) => lang && lang !== "unknown") ?? null;
    const provider = results[0]?.provider ?? null;

    try {
      const res = await fetch("/api/tools/transcribe/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: combinedText,
          language: firstLanguage,
          duration: totalDuration,
          filename: `Conversación (${blocks.length} audios)`,
          fileCount: blocks.length,
          provider,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { id: string; title: string };
      setHistory((prev) => [
        {
          id: data.id,
          title: data.title,
          text: combinedText,
          language: firstLanguage,
          duration: totalDuration,
          filename: `Conversación (${blocks.length} audios)`,
          created_at: new Date().toISOString(),
          provider,
        },
        ...prev,
      ]);
    } catch {
      // Best-effort: combined history save failure is non-fatal.
    }
  }

  function updateEditedText(id: string, value: string) {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, editedText: value } : item)),
    );
  }

  async function copyText(text: string, key: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    if (key === "__combined__") {
      setCombinedCopied(true);
      setTimeout(() => setCombinedCopied(false), 1500);
    } else {
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    }
  }

  function downloadItemTxt(item: QueueItem) {
    const text = item.editedText ?? item.result?.text ?? "";
    if (!text || !item.result) return;
    downloadBlob(
      text,
      `${stripExtension(item.result.filename)}.txt`,
      "text/plain;charset=utf-8",
    );
  }

  function downloadCombinedTxt(blocks: CombinedBlock[]) {
    if (blocks.length === 0) return;
    downloadBlob(
      buildCombinedText(blocks),
      "conversacion.txt",
      "text/plain;charset=utf-8",
    );
  }

  function downloadCombinedMd(blocks: CombinedBlock[]) {
    if (blocks.length === 0) return;
    const md = buildCombinedMarkdown(blocks, {
      date: todayISO(),
      glossary: parseGlossary(glossary),
    });
    downloadBlob(md, "conversacion.md", "text/markdown;charset=utf-8");
  }

  // Single-file .md download (matches the original single-file behavior).
  function downloadSingleMd(item: QueueItem) {
    const text = item.editedText ?? item.result?.text ?? "";
    if (!text || !item.result) return;
    const md = buildMarkdown(text, {
      filename: item.result.filename,
      duration: item.result.duration,
      language: item.result.language,
      date: todayISO(),
      glossary: parseGlossary(glossary),
    });
    downloadBlob(
      md,
      `${stripExtension(item.result.filename)}.md`,
      "text/markdown;charset=utf-8",
    );
  }

  async function saveSingleToMemory(item: QueueItem) {
    const text = item.editedText ?? item.result?.text ?? "";
    if (!text || !item.result) return;
    setSavingMemory(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "transcript",
          sourceId: item.result.filename,
          title: item.result.filename,
          content: text,
        }),
      });
      if (res.ok) setSavedToMemory(true);
    } finally {
      setSavingMemory(false);
    }
  }

  async function saveCombinedToMemory(blocks: CombinedBlock[]) {
    if (blocks.length === 0) return;
    const combinedText = buildCombinedText(blocks);
    const title = `Conversación (${blocks.length} audios)`;
    setSavingMemory(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "transcript",
          sourceId: title,
          title,
          content: combinedText,
        }),
      });
      if (res.ok) setSavedToMemory(true);
    } finally {
      setSavingMemory(false);
    }
  }

  const glossaryRemaining = MAX_GLOSSARY_CHARS - glossary.length;
  const canReorder = !submitting;
  const hasResults =
    processed && queue.some((item) => item.status === "done" && item.result);
  const isBatch = queue.length >= 2;
  const blocks = successfulBlocks(queue);
  const combinedText = buildCombinedText(blocks);
  const submitLabel = submitting
    ? "Transcribiendo…"
    : `Transcribir ${queue.length} ${queue.length === 1 ? "audio" : "audios"}`;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" />
          Quick Transcribe
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subí uno o varios audios (WhatsApp, voice notes, lo que sea). Te
          devuelvo texto limpio listo para pasarle a un LLM. Glosario opcional
          para nombres y términos únicos.
        </p>
      </div>

      <motion.div
        whileHover={{ scale: 1.005 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onDragOver={(e) => {
          if (submitting) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (submitting) return;
          inputRef.current?.click();
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors",
          submitting
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="audio/*,.opus,.ogg,.mp3,.wav,.m4a,.webm"
          className="hidden"
          onChange={handleInputChange}
          disabled={submitting}
        />
        <UploadCloud
          className={cn(
            "mb-3 h-10 w-10 transition-colors",
            dragOver ? "text-primary" : "text-muted-foreground",
          )}
        />
        <p className="text-base font-medium">Arrastrá un audio o hacé click</p>
        <p className="mt-1 text-xs text-muted-foreground">
          .opus · .mp3 · .wav · .m4a · .ogg · .webm · máx 25 MB · hasta{" "}
          {MAX_BATCH_FILES} audios
        </p>
      </motion.div>

      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, index) => (
            <QueueItemRow
              key={item.id}
              item={item}
              index={index}
              total={queue.length}
              canReorder={canReorder}
              isDragTarget={dragIndex !== null && dragIndex !== index}
              onRemove={() => removeItem(item.id)}
              onMoveUp={() => reorder(index, index - 1)}
              onMoveDown={() => reorder(index, index + 1)}
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => {
                if (dragIndex !== null && dragIndex !== index) {
                  reorder(dragIndex, index);
                  setDragIndex(index);
                }
              }}
              onDragEnd={() => setDragIndex(null)}
            />
          ))}
        </div>
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
        disabled={queue.length === 0 || submitting}
        size="lg"
        className="w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Transcribiendo…
          </>
        ) : (
          submitLabel
        )}
      </Button>

      {hasResults && isBatch && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5">
              <Button
                variant={view === "combined" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("combined")}
              >
                Combinado
              </Button>
              <Button
                variant={view === "separate" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("separate")}
              >
                Separado
              </Button>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(combinedText, "__combined__")}
              >
                {combinedCopied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar todo
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCombinedTxt(blocks)}
              >
                <Download className="h-4 w-4" />
                .txt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCombinedMd(blocks)}
              >
                <Download className="h-4 w-4" />
                .md
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => saveCombinedToMemory(blocks)}
                disabled={savingMemory || savedToMemory}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {savedToMemory
                  ? "Guardado en Memory"
                  : savingMemory
                    ? "Guardando…"
                    : "Guardar en Memory"}
              </Button>
            </div>
          </div>

          {view === "combined" ? (
            <div className="space-y-1">
              <Textarea
                value={combinedText}
                readOnly
                rows={18}
                className="font-mono text-sm leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                Texto combinado en el orden actual. Editá cada audio en la vista
                Separado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue
                .filter((item) => item.status === "done" && item.result)
                .map((item) => (
                  <ResultBlock
                    key={item.id}
                    item={item}
                    copied={copiedId === item.id}
                    onCopy={() =>
                      copyText(item.editedText ?? item.result!.text, item.id)
                    }
                    onChange={(value) => updateEditedText(item.id, value)}
                    onDownloadTxt={() => downloadItemTxt(item)}
                  />
                ))}
            </div>
          )}
        </motion.div>
      )}

      {hasResults && !isBatch && (
        <SingleResult
          item={queue.find((item) => item.status === "done" && item.result)!}
          copied={copiedId === "__single__"}
          savingMemory={savingMemory}
          savedToMemory={savedToMemory}
          onCopy={(text) => copyText(text, "__single__")}
          onChange={(value) =>
            updateEditedText(
              queue.find((i) => i.status === "done" && i.result)!.id,
              value,
            )
          }
          onDownloadTxt={downloadItemTxt}
          onDownloadMd={downloadSingleMd}
          onSaveToMemory={saveSingleToMemory}
        />
      )}

      {loadedHistory && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            {loadedHistory.language && loadedHistory.language !== "unknown" && (
              <Badge variant="secondary">{loadedHistory.language}</Badge>
            )}
            {loadedHistory.duration ? (
              <Badge variant="secondary">
                {formatDuration(loadedHistory.duration)}
              </Badge>
            ) : null}
            {loadedHistory.provider && (
              <Badge variant="outline" className="text-xs">
                via {loadedHistory.provider}
              </Badge>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(loadedHistory.text, "__loaded__")}
              >
                {copiedId === "__loaded__" ? (
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLoadedHistory(null)}
              >
                <X className="h-4 w-4" />
                Cerrar
              </Button>
            </div>
          </div>
          <Textarea
            value={loadedHistory.text}
            readOnly
            rows={16}
            className="font-mono text-sm leading-relaxed"
          />
        </motion.div>
      )}

      {user && history.length > 0 && (
        <div className="mt-8 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Historial
          </div>
          <div className="space-y-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <button
                  onClick={() => loadFromHistory(item)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.filename ?? "audio"} ·{" "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => deleteFromHistory(item.id)}
                  aria-label="Eliminar"
                  className="text-muted-foreground/60 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface QueueItemRowProps {
  item: QueueItem;
  index: number;
  total: number;
  canReorder: boolean;
  isDragTarget: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function QueueItemRow({
  item,
  index,
  total,
  canReorder,
  isDragTarget,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: QueueItemRowProps) {
  return (
    <Card
      draggable={canReorder}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        if (canReorder) e.preventDefault();
      }}
      onDragEnter={() => {
        if (canReorder) onDragEnter();
      }}
      onDrop={(e) => {
        if (canReorder) e.preventDefault();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-3 p-3",
        canReorder && "cursor-grab active:cursor-grabbing",
        isDragTarget && "border-primary/50",
      )}
    >
      {canReorder ? (
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      ) : (
        <span className="w-4 shrink-0" aria-hidden />
      )}

      <StatusIcon status={item.status} />

      <FileAudio className="h-5 w-5 shrink-0 text-primary" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(item.file.size)}
          {item.status === "error" && item.error ? (
            <span className="text-destructive"> · {item.error}</span>
          ) : null}
        </p>
      </div>

      {canReorder && (
        <div className="flex shrink-0 flex-col">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Subir"
            className="text-muted-foreground/60 hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Bajar"
            className="text-muted-foreground/60 hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={item.status === "transcribing"}
        aria-label="Quitar"
      >
        <X className="h-4 w-4" />
      </Button>
    </Card>
  );
}

function StatusIcon({ status }: { status: QueueStatus }) {
  switch (status) {
    case "transcribing":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
    case "done":
      return <Check className="h-4 w-4 shrink-0 text-green-600" />;
    case "error":
      return <X className="h-4 w-4 shrink-0 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 shrink-0 text-muted-foreground/50" />;
  }
}

interface ResultBlockProps {
  item: QueueItem;
  copied: boolean;
  onCopy: () => void;
  onChange: (value: string) => void;
  onDownloadTxt: () => void;
}

function ResultBlock({
  item,
  copied,
  onCopy,
  onChange,
  onDownloadTxt,
}: ResultBlockProps) {
  const result = item.result!;
  return (
    <div className="space-y-2 rounded-lg border border-border/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-sm font-medium">{result.filename}</span>
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
          <Button variant="outline" size="sm" onClick={onCopy}>
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
          <Button variant="outline" size="sm" onClick={onDownloadTxt}>
            <Download className="h-4 w-4" />
            .txt
          </Button>
        </div>
      </div>
      <Textarea
        value={item.editedText ?? result.text}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="font-mono text-sm leading-relaxed"
      />
    </div>
  );
}

interface SingleResultProps {
  item: QueueItem;
  copied: boolean;
  savingMemory: boolean;
  savedToMemory: boolean;
  onCopy: (text: string) => void;
  onChange: (value: string) => void;
  onDownloadTxt: (item: QueueItem) => void;
  onDownloadMd: (item: QueueItem) => void;
  onSaveToMemory: (item: QueueItem) => void;
}

function SingleResult({
  item,
  copied,
  savingMemory,
  savedToMemory,
  onCopy,
  onChange,
  onDownloadTxt,
  onDownloadMd,
  onSaveToMemory,
}: SingleResultProps) {
  const result = item.result!;
  const text = item.editedText ?? result.text;
  return (
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
          <Button variant="outline" size="sm" onClick={() => onCopy(text)}>
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
          <Button variant="outline" size="sm" onClick={() => onDownloadTxt(item)}>
            <Download className="h-4 w-4" />
            .txt
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDownloadMd(item)}>
            <Download className="h-4 w-4" />
            .md
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSaveToMemory(item)}
            disabled={savingMemory || savedToMemory}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {savedToMemory
              ? "Guardado en Memory"
              : savingMemory
                ? "Guardando…"
                : "Guardar en Memory"}
          </Button>
        </div>
      </div>
      <Textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        className="font-mono text-sm leading-relaxed"
      />
      <p className="text-xs text-muted-foreground">
        Editá el texto si querés antes de copiar/descargar.
      </p>
    </motion.div>
  );
}
