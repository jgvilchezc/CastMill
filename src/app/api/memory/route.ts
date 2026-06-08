import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  saveMemory,
  listMemories,
  deleteMemory,
  togglePin,
} from "@/lib/memory/store";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const source = new URL(req.url).searchParams.get("source") ?? undefined;
  const memories = await listMemories(userId, source ? { source } : undefined);
  return NextResponse.json({ memories });
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: unknown;
    content?: unknown;
    pinned?: unknown;
    source?: unknown;
    sourceId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 200) : null;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const pinned = body.pinned === true;

  const ALLOWED_CLIENT_SOURCES = new Set(["manual", "transcript"]);
  if (
    typeof body.source === "string" &&
    !ALLOWED_CLIENT_SOURCES.has(body.source)
  ) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  const source =
    typeof body.source === "string" && ALLOWED_CLIENT_SOURCES.has(body.source)
      ? (body.source as "manual" | "transcript")
      : "manual";
  const sourceId =
    typeof body.sourceId === "string" && body.sourceId
      ? body.sourceId
      : crypto.randomUUID();

  if (!content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "Embeddings not configured (GOOGLE_GENERATIVE_AI_API_KEY)" },
      { status: 503 },
    );
  }

  const { id } = await saveMemory({
    userId,
    source,
    sourceId,
    title,
    content,
    pinned,
  });
  return NextResponse.json({ id }, { status: 201 });
}

export async function PATCH(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string; pinned?: boolean };
  if (!body.id || typeof body.pinned !== "boolean") {
    return NextResponse.json(
      { error: "id and pinned required" },
      { status: 400 },
    );
  }
  await togglePin(body.id, userId, body.pinned);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteMemory(body.id, userId);
  return NextResponse.json({ ok: true });
}
