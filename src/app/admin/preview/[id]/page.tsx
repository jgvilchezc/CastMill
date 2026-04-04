import { requireAdmin, createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Film, Mic, FileText, Twitter, Linkedin, Mail, Youtube, Image } from "lucide-react";
import type { PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

const FORMAT_META = {
  blog: { icon: FileText, label: "Blog Post", color: "text-violet-400" },
  tweet_thread: { icon: Twitter, label: "Tweet Thread", color: "text-sky-400" },
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "text-blue-400" },
  newsletter: { icon: Mail, label: "Newsletter", color: "text-emerald-400" },
  youtube_desc: { icon: Youtube, label: "YouTube Desc", color: "text-red-400" },
  thumbnail: { icon: Image, label: "Thumbnail", color: "text-pink-400" },
};

const PLAN_COLORS: Record<PlanId, string> = {
  free: "text-[#666] border-[#2a2a2a]",
  starter: "text-sky-400 border-sky-900/50",
  pro: "text-amber-400 border-amber-900/50",
};

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  const { id } = await params;
  const admin = createAdminClient();

  const [
    { data: profile },
    { data: authUser },
    { data: episodes },
    { data: recentGenerations },
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).single(),
    admin.auth.admin.getUserById(id),
    admin
      .from("episodes")
      .select("id, title, status, created_at, generation_count, description, duration")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("generations")
      .select("id, episode_id, format, status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (!profile) {
    return <div className="p-8 text-xs text-red-400 font-mono">User not found.</div>;
  }

  const email = authUser.user?.email ?? null;
  const planConfig = PLANS[profile.plan as PlanId];
  const episodeCount = episodes?.length ?? 0;

  const generationsByEpisode: Record<string, string[]> = {};
  (recentGenerations ?? []).forEach((g) => {
    if (!generationsByEpisode[g.episode_id]) {
      generationsByEpisode[g.episode_id] = [];
    }
    generationsByEpisode[g.episode_id].push(g.format);
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-mono">
      <div className="sticky top-0 z-50 bg-amber-500 text-black px-4 py-2.5 flex items-center gap-3">
        <Eye className="h-4 w-4 shrink-0" />
        <p className="text-xs font-bold flex-1">
          ADMIN PREVIEW MODE — Viewing as {email ?? profile.name ?? id}
        </p>
        <Link
          href={`/admin/users/${id}`}
          className="flex items-center gap-1.5 text-xs font-bold hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Exit preview
        </Link>
      </div>

      <div className="p-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="border border-[#1e1e1e] rounded-lg p-4 bg-[#0d0d0d]">
            <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2">Account</p>
            <p className="text-sm font-bold text-[#e8e8e8] truncate">{email ?? "—"}</p>
            {profile.name && (
              <p className="text-xs text-[#666] mt-0.5">{profile.name}</p>
            )}
          </div>
          <div className="border border-[#1e1e1e] rounded-lg p-4 bg-[#0d0d0d]">
            <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2">Plan</p>
            <p className={`text-sm font-bold uppercase ${PLAN_COLORS[profile.plan as PlanId].split(" ")[0]}`}>
              {profile.plan}
            </p>
            <p className="text-xs text-[#555] mt-0.5">
              {planConfig.monthlyPrice === 0 ? "Free" : `$${planConfig.monthlyPrice}/mo`}
            </p>
          </div>
          <div className="border border-[#1e1e1e] rounded-lg p-4 bg-[#0d0d0d]">
            <p className="text-[10px] text-[#555] uppercase tracking-widest mb-2">Usage This Month</p>
            <p className="text-sm font-bold text-[#e8e8e8] tabular-nums">
              {profile.episodes_used_this_month}
              <span className="text-[#555] font-normal">/{planConfig.episodesPerMonth}</span>
            </p>
            <p className="text-xs text-[#555] mt-0.5">{profile.credits} credits remaining</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-xs font-bold tracking-widest uppercase text-[#555] mb-4 flex items-center gap-2">
            <Film className="h-3.5 w-3.5" />
            Episodes ({episodeCount})
          </h2>
          {episodeCount === 0 ? (
            <div className="border border-dashed border-[#1e1e1e] rounded-lg p-10 text-center">
              <p className="text-xs text-[#444]">No episodes uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(episodes ?? []).map((ep) => {
                const formats = generationsByEpisode[ep.id] ?? [];
                return (
                  <div
                    key={ep.id}
                    className="border border-[#1e1e1e] rounded-lg p-4 bg-[#0d0d0d]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#e8e8e8] truncate">
                            {ep.title}
                          </p>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              ep.status === "ready"
                                ? "bg-emerald-950/50 text-emerald-400"
                                : ep.status === "processing"
                                ? "bg-amber-950/50 text-amber-400"
                                : "bg-red-950/50 text-red-400"
                            }`}
                          >
                            {ep.status}
                          </span>
                        </div>
                        {ep.description && (
                          <p className="text-xs text-[#555] mt-1 line-clamp-1">
                            {ep.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-[#555]">
                          {new Date(ep.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-[#444] flex items-center gap-1 justify-end mt-1">
                          <Mic className="h-3 w-3" />
                          {ep.generation_count} generations
                        </p>
                      </div>
                    </div>

                    {formats.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#161616] flex flex-wrap gap-2">
                        {formats.map((fmt) => {
                          const meta = FORMAT_META[fmt as keyof typeof FORMAT_META];
                          if (!meta) return null;
                          const Icon = meta.icon;
                          return (
                            <span
                              key={fmt}
                              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[#111] border border-[#1e1e1e] ${meta.color}`}
                            >
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
