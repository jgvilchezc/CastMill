import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/neon/auth";
import { getSql } from "@/lib/neon/db";
import { normalizeRows } from "@/lib/neon/rows";
import { PLANS } from "@/lib/plans";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getSql();

  // The five separate Supabase reads collapse into two round trips: the
  // aggregate counts, and the recent-users list.
  const [aggregates, recentUsers] = await Promise.all([
    sql`
      select
        (select count(*)::int from profiles)                         as total_users,
        (select count(*)::int from episodes)                         as total_episodes,
        (select count(*)::int from profiles
           where episodes_used_this_month > 0)                       as active_users,
        (select count(*)::int from profiles where plan = 'free')     as free_count,
        (select count(*)::int from profiles where plan = 'starter')  as starter_count,
        (select count(*)::int from profiles where plan = 'pro')      as pro_count
    `,
    sql`
      select id, name, created_at, plan
      from profiles
      order by created_at desc
      limit 5
    `,
  ]);

  const a = (aggregates as {
    total_users: number;
    total_episodes: number;
    active_users: number;
    free_count: number;
    starter_count: number;
    pro_count: number;
  }[])[0];

  const planDistribution = {
    free: a.free_count,
    starter: a.starter_count,
    pro: a.pro_count,
  };

  const estimatedRevenue =
    planDistribution.starter * PLANS.starter.monthlyPrice +
    planDistribution.pro * PLANS.pro.monthlyPrice;

  return NextResponse.json({
    totalUsers: a.total_users,
    planDistribution,
    totalEpisodes: a.total_episodes,
    activeUsersThisMonth: a.active_users,
    estimatedRevenue,
    recentUsers: normalizeRows(recentUsers as Record<string, unknown>[]),
  });
}
