import { NextResponse } from 'next/server';
import Groq from "groq-sdk";
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const STORAGE_BUCKET = "episode-audio";

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export async function POST(req: Request) {
  let storagePath: string | undefined;

  try {
    // Verify Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    storagePath = body.storagePath;

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json({ error: "Missing storagePath" }, { status: 400 });
    }

    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (process.env.USE_REAL_AI !== 'true' || !groq) {
      return NextResponse.json({ 
        error: "Real AI is disabled or missing API keys. Please configure .env" 
      }, { status: 501 });
    }

    const admin = createAdminClient();
    const { data: fileData, error: downloadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `Could not download audio: ${downloadError?.message ?? "file not found"}` },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const fileName = storagePath.split("/").pop() ?? "audio.mp3";
    const groqFile = new File([buffer], fileName, { type: "audio/mpeg" });

    // Call Groq Whisper API
    const transcription = await groq.audio.transcriptions.create({
      file: groqFile,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
    });

    type GroqSegment = { text: string; start: number; end: number };
    const segments = (transcription as { segments?: GroqSegment[] }).segments?.map((s) => ({
      speaker: "Speaker",
      text: s.text.trim(),
      startTime: s.start,
      endTime: s.end,
    })) ?? [];

    admin.storage.from(STORAGE_BUCKET).remove([storagePath]);

    return NextResponse.json({
      text: transcription.text,
      segments,
      language: (transcription as { language?: string }).language ?? "unknown",
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to transcribe audio";
    console.error("Transcription Error:", msg);

    if (storagePath) {
      try {
        const admin = createAdminClient();
        admin.storage.from(STORAGE_BUCKET).remove([storagePath]);
      } catch { /* best-effort cleanup */ }
    }

    if (msg.includes("413") || msg.toLowerCase().includes("too large") || msg.toLowerCase().includes("maximum content size")) {
      return NextResponse.json(
        { error: "File too large for Groq Whisper (max 25 MB). Export as MP3 audio-only and try again." },
        { status: 413 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}