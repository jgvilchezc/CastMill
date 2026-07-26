import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { getSql } from "@/lib/neon/db";
import { saveMemory } from "@/lib/memory/store";
import { chunkText } from "@/lib/memory/chunk";

export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    episodeId?: string;
    title?: string;
  };
  if (!body.episodeId) {
    return NextResponse.json({ error: "episodeId required" }, { status: 400 });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "Embeddings not configured" },
      { status: 503 },
    );
  }

  const transcriptRows = (await getSql()`
    select text from transcripts
    where episode_id = ${body.episodeId} and user_id = ${user.id}
  `) as { text: string }[];
  const transcript = transcriptRows[0] ?? null;

  if (!transcript?.text) {
    return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
  }

  const chunks = chunkText(transcript.text);
  for (let i = 0; i < chunks.length; i++) {
    await saveMemory({
      userId: user.id,
      source: "episode",
      sourceId: `${body.episodeId}#${i}`,
      title: body.title ?? "Episodio",
      content: chunks[i],
      metadata: { episodeId: body.episodeId, chunk: i },
    });
  }

  return NextResponse.json({ indexed: chunks.length });
}
