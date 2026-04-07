import { NextResponse } from "next/server";
import { requireAdmin, createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { data: planCounts },
    { count: totalEpisodes },
    { data: activeUsersData },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("plan"),
    admin.from("episodes").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id")
      .gt("episodes_used_this_month", 0),
    admin
      .from("profiles")
      .select("id, name, created_at, plan")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const planDistribution = { free: 0, starter: 0, pro: 0 };
  (planCounts ?? []).forEach((p) => {
    if (p.plan in planDistribution)
      (planDistribution as Record<string, number>)[p.plan]++;
  });

  const estimatedRevenue =
    planDistribution.starter * PLANS.starter.monthlyPrice +
    planDistribution.pro * PLANS.pro.monthlyPrice;

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    planDistribution,
    totalEpisodes: totalEpisodes ?? 0,
    activeUsersThisMonth: activeUsersData?.length ?? 0,
    estimatedRevenue,
    recentUsers: recentUsers ?? [],
  });
}
