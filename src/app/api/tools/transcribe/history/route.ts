import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import {
  listTranscriptions,
  deleteTranscription,
  saveTranscription,
} from "@/lib/transcribe/history";
import { generateTitle } from "@/lib/transcribe/title";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await listTranscriptions(user.id);
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    title?: string;
    language?: string | null;
    duration?: number;
    filename?: string;
    fileCount?: number;
    provider?: string;
  };

  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const text = body.text;
  const title =
    typeof body.title === "string" && body.title.trim().length > 0
      ? body.title
      : await generateTitle(text);
  const filename =
    typeof body.filename === "string" && body.filename.length > 0
      ? body.filename
      : `Conversación (${body.fileCount ?? 0} audios)`;

  const id = await saveTranscription({
    userId: user.id,
    title,
    text,
    language: body.language ?? null,
    duration: body.duration ?? 0,
    filename,
    provider: body.provider ?? "groq",
  });

  if (!id) {
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ id, title });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteTranscription(body.id, user.id);
  return NextResponse.json({ ok: true });
}
