import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/neon/auth";
import { getSql } from "@/lib/neon/db";
import { normalizeRows } from "@/lib/neon/rows";

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

  const sql = getSql();

  // Emails now live in the same database (neon_auth."user"), so this is a join
  // instead of a separate auth-admin listUsers() call capped at 200 rows.
  //
  // Search and plan filtering also moved into the query. The Supabase version
  // filtered by search AFTER pagination, so a match on page 3 was invisible
  // unless you were already on page 3, and `total` ignored the search entirely.
  const planFilter = plan && plan !== "all" ? plan : null;
  const searchFilter = search ? `%${search}%` : null;

  const [rows, totals] = await Promise.all([
    sql`
      select
        p.id, p.name, p.plan, p.credits, p.episodes_used_this_month,
        p.billing_period_start, p.created_at, p.stripe_subscription_id,
        u.email
      from profiles p
      left join neon_auth."user" u on u.id = p.id
      where (${planFilter}::text is null or p.plan = ${planFilter})
        and (
          ${searchFilter}::text is null
          or u.email ilike ${searchFilter}
          or p.name ilike ${searchFilter}
        )
      order by p.created_at desc
      limit ${pageSize} offset ${offset}
    `,
    sql`
      select count(*)::int as total
      from profiles p
      left join neon_auth."user" u on u.id = p.id
      where (${planFilter}::text is null or p.plan = ${planFilter})
        and (
          ${searchFilter}::text is null
          or u.email ilike ${searchFilter}
          or p.name ilike ${searchFilter}
        )
    `,
  ]);

  return NextResponse.json({
    users: normalizeRows(rows as Record<string, unknown>[]),
    total: (totals as { total: number }[])[0].total,
    page,
    pageSize,
  });
}
