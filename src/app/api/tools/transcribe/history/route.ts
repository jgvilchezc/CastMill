import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listTranscriptions,
  deleteTranscription,
} from "@/lib/transcribe/history";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await listTranscriptions(supabase, user.id);
  return NextResponse.json({ items });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await deleteTranscription(supabase, body.id, user.id);
  return NextResponse.json({ ok: true });
}
