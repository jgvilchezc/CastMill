import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  formatParagraphs,
  inferDuration,
} from "@/lib/transcribe/format";
import {
  hasGroq,
  hasHuggingFace,
  transcribeWithGroq,
  transcribeWithHuggingFace,
  type WhisperResult,
} from "@/lib/transcribe/whisper";
import { generateTitle } from "@/lib/transcribe/title";
import { saveTranscription } from "@/lib/transcribe/history";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_GLOSSARY_CHARS = 500;
const ANONYMOUS_DAILY_LIMIT = {
  maxRequests: 3,
  windowMs: 24 * 60 * 60 * 1000,
};

const ACCEPTED_MIME = new Set([
  "audio/ogg",
  "audio/opus",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/webm",
]);

const ACCEPTED_EXTENSIONS = new Set([
  "opus",
  "ogg",
  "mp3",
  "mpeg",
  "mpga",
  "m4a",
  "mp4",
  "wav",
  "webm",
]);

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function hasAcceptedType(file: File): boolean {
  if (file.type && ACCEPTED_MIME.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? ACCEPTED_EXTENSIONS.has(ext) : false;
}

export async function POST(req: Request) {
  if (!hasGroq() && !hasHuggingFace()) {
    return NextResponse.json(
      {
        error:
          "Servicio no disponible. Configurá GROQ_API_KEY o HUGGINGFACE_API_KEY.",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Esperaba multipart/form-data." },
      { status: 400 },
    );
  }

  const audio = formData.get("audio");
  const glossaryRaw = formData.get("glossary");

  if (!(audio instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo de audio." },
      { status: 400 },
    );
  }
  if (audio.size === 0) {
    return NextResponse.json(
      { error: "El archivo está vacío." },
      { status: 400 },
    );
  }
  if (audio.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Máximo 25 MB. Probá con un audio más corto o convertilo a MP3." },
      { status: 413 },
    );
  }
  if (!hasAcceptedType(audio)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá opus, mp3, wav, m4a, ogg o webm." },
      { status: 400 },
    );
  }

  const glossary =
    typeof glossaryRaw === "string"
      ? glossaryRaw.trim().slice(0, MAX_GLOSSARY_CHARS)
      : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const ip = getClientIp(req);
    const rl = checkRateLimit(
      `tools:transcribe:ip:${ip}`,
      ANONYMOUS_DAILY_LIMIT,
    );
    if (!rl.allowed) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      const res = NextResponse.json(
        {
          error:
            "Llegaste al límite gratis (3/día). Iniciá sesión para uso ilimitado.",
        },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }
  }

  let result: WhisperResult | null = null;
  let primaryError: string | null = null;

  if (hasGroq()) {
    try {
      result = await transcribeWithGroq(audio, glossary);
    } catch (err) {
      primaryError = err instanceof Error ? err.message : "Groq failed";
      console.error("Groq transcribe failed:", primaryError);
    }
  }

  if (!result && hasHuggingFace()) {
    try {
      result = await transcribeWithHuggingFace(audio);
      if (glossary) {
        console.warn(
          "HF fallback used — glossary biasing not supported by HF Whisper",
        );
      }
    } catch (err) {
      const hfError = err instanceof Error ? err.message : "HF failed";
      console.error("HF transcribe failed:", hfError);
      return NextResponse.json(
        {
          error:
            "Ambos proveedores fallaron. Revisá GROQ_API_KEY y HUGGINGFACE_API_KEY.",
          details: { groq: primaryError, huggingface: hfError },
        },
        { status: 502 },
      );
    }
  }

  if (!result) {
    return NextResponse.json(
      {
        error:
          "Transcripción falló y no hay fallback configurado. Configurá HUGGINGFACE_API_KEY como respaldo.",
        details: { groq: primaryError },
      },
      { status: 502 },
    );
  }

  const text =
    result.segments.length > 0
      ? formatParagraphs(result.segments)
      : result.text.trim();
  const duration = inferDuration(result.segments);

  let historyId: string | null = null;
  let title: string | null = null;
  if (user) {
    try {
      title = await generateTitle(text);
      historyId = await saveTranscription(supabase, {
        userId: user.id,
        title,
        text,
        language: result.language === "unknown" ? null : result.language,
        duration,
        filename: audio.name,
        provider: result.provider,
      });
    } catch (err) {
      console.error("[transcribe] history save failed:", err);
    }
  }

  return NextResponse.json({
    text,
    language: result.language,
    duration,
    filename: audio.name,
    provider: result.provider,
    historyId,
    title,
  });
}
