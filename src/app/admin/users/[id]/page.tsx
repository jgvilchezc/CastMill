"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Save,
  Loader2,
  Film,
  Mic,
} from "lucide-react";
import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";
import { AdminUserDetailSkeleton } from "@/components/skeletons";

interface EpisodeRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  generation_count: number;
}

interface UserDetail {
  profile: {
    id: string;
    name: string | null;
    plan: PlanId;
    credits: number;
    episodes_used_this_month: number;
    billing_period_start: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    created_at: string;
  };
  email: string | null;
  lastSignIn: string | null;
  episodes: EpisodeRow[];
  episodeCount: number;
  hasVoiceProfile: boolean;
}

const PLAN_COLORS: Record<PlanId, string> = {
  free: "text-[#666]",
  starter: "text-sky-400",
  pro: "text-amber-400",
};

const STATUS_COLORS: Record<string, string> = {
  ready: "text-emerald-400",
  processing: "text-amber-400",
  failed: "text-red-400",
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1.5 text-[#444] hover:text-[#888] transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function InfoRow({ label, value, mono = true }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return (
    <div className="flex items-start justify-between py-2 border-b border-[#161616]">
      <span className="text-[10px] text-[#555] uppercase tracking-wider">{label}</span>
      <span className="text-[#444] text-xs">—</span>
    </div>
  );
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#161616]">
      <span className="text-[10px] text-[#555] uppercase tracking-wider shrink-0 mr-4">{label}</span>
      <div className="flex items-center min-w-0">
        <span className={`text-xs text-[#ccc] truncate ${mono ? "font-mono" : ""}`}>{value}</span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedField, setSavedField] = useState<string | null>(null);

  const [planEdit, setPlanEdit] = useState<PlanId>("free");
  const [creditsEdit, setCreditsEdit] = useState(0);
  const [episodesEdit, setEpisodesEdit] = useState(0);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const d: UserDetail = await res.json();
        setData(d);
        setPlanEdit(d.profile.plan);
        setCreditsEdit(d.profile.credits);
        setEpisodesEdit(d.profile.episodes_used_this_month);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  async function patch(fields: Record<string, unknown>, fieldKey: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const { profile } = await res.json();
      setData((prev) => prev ? { ...prev, profile } : prev);
      setSavedField(fieldKey);
      setTimeout(() => setSavedField(null), 2000);
    }
    setSaving(false);
  }

  if (loading) {
    return <AdminUserDetailSkeleton />;
  }

  if (!data) {
    return (
      <div className="p-8 text-xs text-red-400">User not found.</div>
    );
  }

  const { profile, email, lastSignIn, episodes, episodeCount, hasVoiceProfile } = data;
  const planConfig = PLANS[profile.plan];

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/users"
          className="text-[#555] hover:text-[#999] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-sm font-bold text-[#e8e8e8] flex items-center gap-2">
            {email ?? profile.name ?? profile.id.slice(0, 12)}
            <span className={`text-xs font-normal ${PLAN_COLORS[profile.plan]}`}>
              [{profile.plan}]
            </span>
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-0.5">{profile.id}</p>
        </div>
        <div className="ml-auto">
          <Link
            href={`/admin/preview/${profile.id}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#2a2a2a] rounded hover:border-amber-500/50 hover:text-amber-400 text-[#888] transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview as user
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
          <h2 className="text-[10px] font-bold tracking-widest uppercase text-[#555] mb-3">
            Account Info
          </h2>
          <div className="space-y-0">
            <InfoRow label="Email" value={email} />
            <InfoRow label="Name" value={profile.name} mono={false} />
            <InfoRow label="User ID" value={profile.id} />
            <InfoRow label="Joined" value={new Date(profile.created_at).toLocaleString()} mono={false} />
            <InfoRow label="Last Sign In" value={lastSignIn ? new Date(lastSignIn).toLocaleString() : null} mono={false} />
            <div className="flex items-center justify-between py-2">
              <span className="text-[10px] text-[#555] uppercase tracking-wider">Voice Profile</span>
              <span className={`text-xs ${hasVoiceProfile ? "text-emerald-400" : "text-[#444]"}`}>
                {hasVoiceProfile ? "✓ set" : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
          <h2 className="text-[10px] font-bold tracking-widest uppercase text-[#555] mb-3">
            Subscription
          </h2>
          <div className="space-y-0">
            <InfoRow label="Stripe Customer ID" value={profile.stripe_customer_id} />
            <InfoRow label="Stripe Subscription ID" value={profile.stripe_subscription_id} />
            <InfoRow label="Billing Period Start" value={profile.billing_period_start} />
          </div>
          <div className="mt-3 pt-3 border-t border-[#1a1a1a] grid grid-cols-3 gap-2 text-center">
            <div>
              <p className={`text-lg font-bold ${PLAN_COLORS[profile.plan]}`}>
                {profile.plan}
              </p>
              <p className="text-[10px] text-[#555]">Plan</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#ccc] tabular-nums">
                {profile.episodes_used_this_month}/{planConfig.episodesPerMonth}
              </p>
              <p className="text-[10px] text-[#555]">Episodes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#ccc] tabular-nums">
                {profile.credits}
              </p>
              <p className="text-[10px] text-[#555]">Credits</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-amber-900/30 rounded-lg p-5 bg-amber-950/10 mb-6">
        <h2 className="text-[10px] font-bold tracking-widest uppercase text-amber-600 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">
              Change Plan
            </label>
            <div className="flex gap-2">
              <select
                value={planEdit}
                onChange={(e) => setPlanEdit(e.target.value as PlanId)}
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-[#e8e8e8] px-2 py-1.5 focus:outline-none focus:border-[#444] font-mono"
              >
                <option value="free">free</option>
                <option value="starter">starter</option>
                <option value="pro">pro</option>
              </select>
              <button
                onClick={() => patch({ plan: planEdit }, "plan")}
                disabled={saving || planEdit === profile.plan}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#2a2a2a] rounded hover:border-amber-500/50 hover:text-amber-400 text-[#888] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving && savedField === null ? <Loader2 className="h-3 w-3 animate-spin" /> : savedField === "plan" ? <Check className="h-3 w-3 text-emerald-400" /> : <Save className="h-3 w-3" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">
              Credits
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={creditsEdit}
                onChange={(e) => setCreditsEdit(Number(e.target.value))}
                min={0}
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-[#e8e8e8] px-2 py-1.5 focus:outline-none focus:border-[#444] font-mono tabular-nums w-full"
              />
              <button
                onClick={() => patch({ credits: creditsEdit }, "credits")}
                disabled={saving || creditsEdit === profile.credits}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#2a2a2a] rounded hover:border-amber-500/50 hover:text-amber-400 text-[#888] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {savedField === "credits" ? <Check className="h-3 w-3 text-emerald-400" /> : <Save className="h-3 w-3" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#555] uppercase tracking-wider block mb-1.5">
              Episodes Used
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={episodesEdit}
                onChange={(e) => setEpisodesEdit(Number(e.target.value))}
                min={0}
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded text-xs text-[#e8e8e8] px-2 py-1.5 focus:outline-none focus:border-[#444] font-mono tabular-nums w-full"
              />
              <button
                onClick={() => patch({ episodes_used_this_month: episodesEdit }, "episodes")}
                disabled={saving || episodesEdit === profile.episodes_used_this_month}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[#2a2a2a] rounded hover:border-amber-500/50 hover:text-amber-400 text-[#888] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {savedField === "episodes" ? <Check className="h-3 w-3 text-emerald-400" /> : <Save className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-amber-900/20">
          <button
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              patch(
                { episodes_used_this_month: 0, billing_period_start: today },
                "billing"
              );
              setEpisodesEdit(0);
            }}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs text-[#666] hover:text-amber-400 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Reset billing period (set episodes to 0, start date to today)
          </button>
        </div>
      </div>

      <div className="border border-[#1e1e1e] rounded-lg p-5 bg-[#0d0d0d]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-bold tracking-widest uppercase text-[#555] flex items-center gap-2">
            <Film className="h-3.5 w-3.5" />
            Episodes
            <span className="text-[#444]">({episodeCount})</span>
          </h2>
        </div>

        {episodes.length === 0 ? (
          <p className="text-xs text-[#444] py-4 text-center">No episodes yet</p>
        ) : (
          <div className="space-y-0">
            {episodes.map((ep) => (
              <div
                key={ep.id}
                className="flex items-center justify-between py-2.5 border-b border-[#161616] last:border-0"
              >
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-xs text-[#ccc] truncate">{ep.title}</p>
                  <p className="text-[10px] text-[#555] font-mono mt-0.5">{ep.id.slice(0, 12)}…</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-[#555]">
                    <Mic className="h-3 w-3" />
                    {ep.generation_count}
                  </div>
                  <span className={`text-[10px] font-medium ${STATUS_COLORS[ep.status] ?? "text-[#555]"}`}>
                    {ep.status}
                  </span>
                  <span className="text-[10px] text-[#444]">
                    {new Date(ep.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
