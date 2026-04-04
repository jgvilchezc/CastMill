import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const plan = searchParams.get("plan") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const admin = createAdminClient();

  const { data: authUsers } = await admin.auth.admin.listUsers({
    page,
    perPage: 200,
  });

  const emailMap: Record<string, string> = {};
  (authUsers?.users ?? []).forEach((u) => {
    if (u.email) emailMap[u.id] = u.email;
  });

  let query = admin
    .from("profiles")
    .select("id, name, plan, credits, episodes_used_this_month, billing_period_start, created_at, lemon_squeezy_subscription_id", { count: "exact" });

  if (plan && plan !== "all") {
    query = query.eq("plan", plan as "free" | "starter" | "pro");
  }

  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: profiles, count } = await query;

  let results = (profiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? null,
  }));

  if (search) {
    const lower = search.toLowerCase();
    results = results.filter(
      (u) =>
        u.email?.toLowerCase().includes(lower) ||
        u.name?.toLowerCase().includes(lower)
    );
  }

  return NextResponse.json({
    users: results,
    total: count ?? 0,
    page,
    pageSize,
  });
}
