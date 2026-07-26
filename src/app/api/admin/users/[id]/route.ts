import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/neon/auth";
import { getSql } from "@/lib/neon/db";
import { normalizeRow, normalizeRows } from "@/lib/neon/rows";
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

  const sql = getSql();

  // Better Auth has no last_sign_in_at column; the most recent session's
  // createdAt is the equivalent signal.
  const [profileRows, authRows, episodeRows, countRows, voiceRows] =
    await Promise.all([
      sql`select * from profiles where id = ${id}`,
      sql`
        select
          u.email,
          (select max(s."createdAt") from neon_auth.session s where s."userId" = u.id)
            as last_sign_in_at
        from neon_auth."user" u
        where u.id = ${id}
      `,
      sql`
        select id, title, status, created_at, generation_count
        from episodes
        where user_id = ${id}
        order by created_at desc
        limit 20
      `,
      sql`select count(*)::int as total from episodes where user_id = ${id}`,
      sql`select id from voice_profiles where user_id = ${id}`,
    ]);

  const profile = (profileRows as Record<string, unknown>[])[0];
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const authUser = (
    authRows as { email: string; last_sign_in_at: Date | null }[]
  )[0];

  return NextResponse.json({
    profile: normalizeRow(profile),
    email: authUser?.email ?? null,
    lastSignIn: authUser?.last_sign_in_at
      ? new Date(authUser.last_sign_in_at).toISOString()
      : null,
    episodes: normalizeRows(episodeRows as Record<string, unknown>[]),
    episodeCount: (countRows as { total: number }[])[0].total,
    hasVoiceProfile: (voiceRows as unknown[]).length > 0,
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

  const parsedBody = body as Record<string, unknown>;
  const allowedFields = [
    "plan",
    "credits",
    "episodes_used_this_month",
    "billing_period_start",
  ] as const;

  const provided = allowedFields.filter((f) => f in parsedBody);
  if (provided.length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  // Column names cannot be parameterised, so instead of building dynamic SQL
  // each allowed column coalesces to its current value when not supplied. All
  // four are NOT NULL, so coalesce is unambiguous.
  const plan = "plan" in parsedBody ? parsedBody.plan : null;
  const credits = "credits" in parsedBody ? parsedBody.credits : null;
  const used =
    "episodes_used_this_month" in parsedBody
      ? parsedBody.episodes_used_this_month
      : null;
  const periodStart =
    "billing_period_start" in parsedBody
      ? parsedBody.billing_period_start
      : null;

  try {
    const rows = await getSql()`
      update profiles set
        plan                     = coalesce(${plan}::text, plan),
        credits                  = coalesce(${credits}::int, credits),
        episodes_used_this_month = coalesce(${used}::int, episodes_used_this_month),
        billing_period_start     = coalesce(${periodStart}::date, billing_period_start)
      where id = ${id}
      returning *
    `;

    const updated = (rows as Record<string, unknown>[])[0];
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: normalizeRow(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
