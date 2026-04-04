import { requireAdmin, createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";
import { Users, Zap, Film, DollarSign, TrendingUp, ArrowRight } from "lucide-react";

async function getStats() {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { data: planCounts },
    { count: totalEpisodes },
    { data: activeUsersData },
    { data: recentProfiles },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("plan"),
    admin.from("episodes").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("id").gt("episodes_used_this_month", 0),
    admin
      .from("profiles")
      .select("id, name, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailMap: Record<string, string> = {};
  (authUsers?.users ?? []).forEach((u) => {
    if (u.email) emailMap[u.id] = u.email;
  });

  const planDistribution = { free: 0, starter: 0, pro: 0 };
  (planCounts ?? []).forEach((p) => {
    const plan = p.plan as PlanId;
    if (plan in planDistribution) planDistribution[plan]++;
  });

  const estimatedRevenue =
    planDistribution.starter * PLANS.starter.monthlyPrice +
    planDistribution.pro * PLANS.pro.monthlyPrice;

  const recentUsers = (recentProfiles ?? []).map((p) => ({
    ...p,
    email: emailMap[p.id] ?? null,
  }));

  return {
    totalUsers: totalUsers ?? 0,
    planDistribution,
    totalEpisodes: totalEpisodes ?? 0,
    activeUsersThisMonth: activeUsersData?.length ?? 0,
    estimatedRevenue,
    recentUsers,
  };
}

const PLAN_COLORS: Record<PlanId, string> = {
  free: "text-[#666]",
  starter: "text-sky-400",
  pro: "text-amber-400",
};

const PLAN_BAR_COLORS: Record<PlanId, string> = {
  free: "bg-[#333]",
  starter: "bg-sky-500",
  pro: "bg-amber-500",
};

export default async function AdminDashboard() {
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  const stats = await getStats();
  const total = stats.totalUsers || 1;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-lg font-bold tracking-tight text-[#e8e8e8]">
          Dashboard
        </h1>
        <p className="text-xs text-[#555] mt-0.5">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Active This Month"
          value={stats.activeUsersThisMonth.toLocaleString()}
          sub={`${Math.round((stats.activeUsersThisMonth / total) * 100)}% of users`}
        />
        <StatCard
          icon={<Film className="h-4 w-4" />}
          label="Episodes Processed"
          value={stats.totalEpisodes.toLocaleString()}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Est. MRR"
          value={`$${stats.estimatedRevenue.toLocaleString()}`}
          accent
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[#555] mb-4">
            Plan Distribution
          </h2>
          <div className="space-y-3">
            {(["free", "starter", "pro"] as PlanId[]).map((plan) => {
              const count = stats.planDistribution[plan];
              const pct = Math.round((count / total) * 100);
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs capitalize font-medium ${PLAN_COLORS[plan]}`}>
                      {plan}
                    </span>
                    <span className="text-xs text-[#555]">
                      {count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${PLAN_BAR_COLORS[plan]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-[#1a1a1a] grid grid-cols-3 gap-2 text-center">
            {(["free", "starter", "pro"] as PlanId[]).map((plan) => (
              <div key={plan}>
                <p className={`text-lg font-bold tabular-nums ${PLAN_COLORS[plan]}`}>
                  {stats.planDistribution[plan]}
                </p>
                <p className="text-[10px] text-[#555] capitalize">{plan}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold tracking-widest uppercase text-[#555]">
              Recent Signups
            </h2>
            <Link
              href="/admin/users"
              className="text-[10px] text-[#555] hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentUsers.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="flex items-center justify-between py-2 border-b border-[#161616] hover:border-[#2a2a2a] group transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs text-[#ccc] truncate group-hover:text-[#e8e8e8] transition-colors">
                    {u.email ?? u.name ?? u.id.slice(0, 8)}
                  </p>
                  <p className="text-[10px] text-[#555]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-[10px] font-medium capitalize ml-3 shrink-0 ${PLAN_COLORS[u.plan as PlanId]}`}>
                  {u.plan}
                </span>
              </Link>
            ))}
            {stats.recentUsers.length === 0 && (
              <p className="text-xs text-[#555] text-center py-4">No users yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 border border-[#1e1e1e] rounded-lg bg-[#0d0d0d]">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-bold text-[#e8e8e8]">Revenue Breakdown</span>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3">
          <div>
            <p className="text-[10px] text-[#555] mb-1">Starter subscribers</p>
            <p className="text-sm font-bold tabular-nums text-sky-400">
              {stats.planDistribution.starter} × ${PLANS.starter.monthlyPrice}
            </p>
            <p className="text-xs text-[#555]">
              = ${stats.planDistribution.starter * PLANS.starter.monthlyPrice}/mo
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#555] mb-1">Pro subscribers</p>
            <p className="text-sm font-bold tabular-nums text-amber-400">
              {stats.planDistribution.pro} × ${PLANS.pro.monthlyPrice}
            </p>
            <p className="text-xs text-[#555]">
              = ${stats.planDistribution.pro * PLANS.pro.monthlyPrice}/mo
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[#555] mb-1">Total est. MRR</p>
            <p className="text-sm font-bold tabular-nums text-emerald-400">
              ${stats.estimatedRevenue}/mo
            </p>
            <p className="text-xs text-[#555]">
              ${stats.estimatedRevenue * 12}/yr annualized
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`border rounded-lg p-4 bg-[#0d0d0d] ${accent ? "border-amber-500/30" : "border-[#1e1e1e]"}`}>
      <div className={`mb-2 ${accent ? "text-amber-400" : "text-[#555]"}`}>{icon}</div>
      <p className={`text-xl font-bold tabular-nums tracking-tight ${accent ? "text-amber-400" : "text-[#e8e8e8]"}`}>
        {value}
      </p>
      <p className="text-[10px] text-[#555] mt-0.5 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-[10px] text-[#444] mt-1">{sub}</p>}
    </div>
  );
}
