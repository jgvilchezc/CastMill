import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveMemory } from "@/lib/memory/store";
import { chunkText } from "@/lib/memory/chunk";

export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: transcript } = await (supabase as any)
    .from("transcripts")
    .select("text")
    .eq("episode_id", body.episodeId)
    .eq("user_id", user.id)
    .single();

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
