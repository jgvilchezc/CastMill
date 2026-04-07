"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { PlanId } from "@/lib/plans";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  plan: PlanId;
  credits: number;
  episodes_used_this_month: number;
  created_at: string;
  stripe_subscription_id: string | null;
}

const PLAN_COLORS: Record<PlanId, string> = {
  free: "text-[#666] bg-[#1a1a1a] border-[#2a2a2a]",
  starter: "text-sky-400 bg-sky-950/30 border-sky-900/50",
  pro: "text-amber-400 bg-amber-950/30 border-amber-900/50",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      search,
      plan: planFilter,
    });
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, search, planFilter]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-lg font-bold tracking-tight text-[#e8e8e8]">Users</h1>
        <p className="text-xs text-[#555] mt-0.5">{total} total</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded text-xs text-[#e8e8e8] placeholder-[#555] pl-9 pr-3 py-2 focus:outline-none focus:border-[#444] font-mono"
          />
        </div>

        <div className="flex items-center gap-1">
          {(["all", "free", "starter", "pro"] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPlanFilter(p);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-[10px] rounded border uppercase tracking-wider font-bold transition-colors ${
                planFilter === p
                  ? "border-amber-500/50 text-amber-400 bg-amber-950/30"
                  : "border-[#2a2a2a] text-[#555] hover:border-[#3a3a3a] hover:text-[#888]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-[#1e1e1e] rounded-lg overflow-hidden bg-[#0d0d0d]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e1e1e]">
              <th className="text-left px-4 py-3 text-[10px] text-[#555] uppercase tracking-widest font-medium">
                User
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#555] uppercase tracking-widest font-medium hidden lg:table-cell">
                Plan
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#555] uppercase tracking-widest font-medium hidden md:table-cell">
                Episodes
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#555] uppercase tracking-widest font-medium hidden xl:table-cell">
                Credits
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#555] uppercase tracking-widest font-medium hidden lg:table-cell">
                Joined
              </th>
              <th className="text-left px-4 py-3 text-[10px] text-[#555] uppercase tracking-widest font-medium">
                LS Sub
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#161616]">
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-3 bg-[#1a1a1a] rounded animate-pulse w-3/4" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[#555]">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#161616] hover:bg-[#111] group transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-[#ccc] group-hover:text-[#e8e8e8] truncate max-w-[220px] transition-colors">
                      {user.email ?? "—"}
                    </p>
                    {user.name && (
                      <p className="text-[10px] text-[#555]">{user.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${PLAN_COLORS[user.plan]}`}
                    >
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="tabular-nums text-[#888]">
                      {user.episodes_used_this_month}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="tabular-nums text-[#888]">
                      {user.credits}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-[#555]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.stripe_subscription_id ? (
                      <span className="text-emerald-500 text-[10px]">✓ active</span>
                    ) : (
                      <span className="text-[#444] text-[10px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-[#444] hover:text-amber-400 transition-colors"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[10px] text-[#555]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-[#2a2a2a] text-[#555] hover:text-[#999] hover:border-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-[#2a2a2a] text-[#555] hover:text-[#999] hover:border-[#3a3a3a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
