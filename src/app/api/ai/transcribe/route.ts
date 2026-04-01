import { NextResponse } from 'next/server';
import Groq from "groq-sdk";
import { createClient } from '@/lib/supabase/server';

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export async function POST(req: Request) {
  try {
    // Verify Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    if (process.env.USE_REAL_AI !== 'true' || !groq) {
      return NextResponse.json({ 
        error: "Real AI is disabled or missing API keys. Please configure .env" 
      }, { status: 501 });
    }

    // Convert Web File to a format Groq SDK can use (Node.js File/Blob)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a new File object that Groq SDK accepts
    const groqFile = new File([buffer], file.name, { type: file.type });

    // Call Groq Whisper API
    const transcription = await groq.audio.transcriptions.create({
      file: groqFile,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json", // verbose_json gives us timestamps and segments
      // No language set = Whisper auto-detects (supports Spanish, English, and 90+ more)
    });

    const segments = (transcription as any).segments?.map((s: any) => ({
      speaker: "Speaker",
      text: s.text.trim(),
      startTime: s.start,
      endTime: s.end,
    })) ?? [];

    return NextResponse.json({
      text: transcription.text,
      segments,
      language: (transcription as any).language ?? "unknown",
    });

  } catch (error: any) {
    console.error("Transcription Error:", error);
    return NextResponse.json({ error: error.message || "Failed to transcribe audio" }, { status: 500 });
  }
}