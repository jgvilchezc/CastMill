import Groq from "groq-sdk";
import { InferenceClient } from "@huggingface/inference";
import type { WhisperSegment } from "./format";

export interface WhisperResult {
  text: string;
  language: string;
  segments: WhisperSegment[];
  provider: "groq" | "huggingface";
}

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export function hasGroq(): boolean {
  return groq !== null;
}

export function hasHuggingFace(): boolean {
  return Boolean(process.env.HUGGINGFACE_API_KEY);
}

export async function transcribeWithGroq(
  file: File,
  glossary: string,
): Promise<WhisperResult> {
  if (!groq) throw new Error("GROQ_API_KEY not configured");

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    response_format: "verbose_json",
    ...(glossary ? { prompt: glossary } : {}),
  });

  const rawSegments =
    (transcription as { segments?: WhisperSegment[] }).segments ?? [];

  return {
    text: transcription.text,
    language: (transcription as { language?: string }).language ?? "unknown",
    segments: rawSegments.map((s) => ({
      text: s.text,
      start: s.start,
      end: s.end,
    })),
    provider: "groq",
  };
}

export async function transcribeWithHuggingFace(
  file: File,
): Promise<WhisperResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY not configured");

  const client = new InferenceClient(apiKey);
  const buffer = await file.arrayBuffer();
  const blob = new Blob([buffer], {
    type: file.type || "application/octet-stream",
  });

  const result = await client.automaticSpeechRecognition({
    model: "openai/whisper-large-v3",
    inputs: blob,
    provider: "hf-inference",
    parameters: { return_timestamps: true },
  });

  const text = (result.text ?? "").trim();
  if (!text) throw new Error("HF returned empty transcription");

  const segments: WhisperSegment[] =
    result.chunks?.flatMap((chunk) => {
      const [start, end] = chunk.timestamp ?? [];
      if (typeof start !== "number" || typeof end !== "number") return [];
      return [{ text: chunk.text, start, end }];
    }) ?? [];

  return {
    text,
    language: "unknown",
    segments,
    provider: "huggingface",
  };
}
