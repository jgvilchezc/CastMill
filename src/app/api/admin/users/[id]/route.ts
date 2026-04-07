import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin";
import { isValidUUID, parseJsonBody } from "@/lib/security/validate";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: authUser },
    { data: episodes, count: episodeCount },
    { data: voiceProfile },
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).single(),
    admin.auth.admin.getUserById(id),
    admin
      .from("episodes")
      .select("id, title, status, created_at, generation_count", { count: "exact" })
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin.from("voice_profiles").select("*").eq("user_id", id).maybeSingle(),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    profile,
    email: authUser.user?.email ?? null,
    lastSignIn: authUser.user?.last_sign_in_at ?? null,
    episodes: episodes ?? [],
    episodeCount: episodeCount ?? 0,
    hasVoiceProfile: !!voiceProfile,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req, 4096);
  if (bodyError) return bodyError;

  const admin = createAdminClient();

  const allowedFields = [
    "plan",
    "credits",
    "episodes_used_this_month",
    "billing_period_start",
  ];

  const parsedBody = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in parsedBody) {
      update[field] = parsedBody[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
