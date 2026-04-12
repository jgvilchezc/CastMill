"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  ImageIcon,
  Heart,
  Eye,
  Clock,
  MessageCircle,
  Video,
  Sparkles,
  BarChart3,
  Loader2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { PLANS } from "@/lib/plans";
import {
  AnalyticsShell,
  ProfileHeader,
  StatCard,
  MediaCard,
  InsightsPanel,
  formatNumber,
} from "@/components/analytics";
import type { MediaItem, InsightsData } from "@/components/analytics";

interface PlatformMeta {
  bio?: string;
  display_name?: string;
  avatar_url?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
}

interface IGMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

const IG_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

function igToMediaItem(m: IGMedia): MediaItem {
  return {
    id: m.id,
    caption: m.caption,
    thumbnailUrl: m.thumbnail_url || m.media_url,
    permalink: m.permalink,
    timestamp: m.timestamp,
    likeCount: m.like_count,
    commentCount: m.comments_count,
    mediaType: m.media_type,
  };
}

export default function InstagramAnalyticsPage() {
  const { user } = useUser();
  const plan = user?.plan ?? "free";
  const planConfig = PLANS[plan];

  const [account, setAccount] = useState<{
    platform_username: string | null;
    platform_meta: PlatformMeta;
    expires_at: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [media, setMedia] = useState<IGMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaCursor, setMediaCursor] = useState<string | null>(null);
  const [mediaHasMore, setMediaHasMore] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaSort, setMediaSort] = useState<"recent" | "likes" | "comments">("recent");
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState<"all" | "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM">("all");

  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("connected_accounts")
        .select("platform_username, platform_meta, expires_at")
        .eq("platform", "instagram")
        .single();
      if (data) setAccount(data);
      setLoading(false);
    }
    load();
  }, []);

  const fetchMedia = useCallback(async (cursor?: string | null) => {
    setMediaLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("after", cursor);
      const res = await fetch(`/api/instagram/media?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (cursor) {
        setMedia((prev) => [...prev, ...data.media]);
      } else {
        setMedia(data.media);
      }
      setMediaCursor(data.cursor);
      setMediaHasMore(data.has_more);
      setMediaLoaded(true);
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setMediaLoading(false);
    }
  }, []);

  async function refreshStats() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/instagram/refresh-stats", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.platform_meta) {
        setAccount((prev) =>
          prev ? { ...prev, platform_meta: data.platform_meta } : prev
        );
      }
    } catch (err) {
      console.error("Failed to refresh stats:", err);
    } finally {
      setRefreshing(false);
    }
  }

  async function fetchCommentsForTopPosts(posts: IGMedia[]) {
    const topPosts = [...posts]
      .sort((a, b) => b.comments_count - a.comments_count)
      .slice(0, 5)
      .filter((p) => p.comments_count > 0);

    const allComments: Array<Record<string, unknown>> = [];
    for (const post of topPosts) {
      try {
        const res = await fetch(`/api/instagram/comments?media_id=${post.id}`);
        if (res.ok) {
          const data = await res.json();
          allComments.push(...(data.comments ?? []));
        }
      } catch {
        // skip failed comment fetches
      }
    }
    return allComments;
  }

  async function analyzeContent() {
    if (media.length === 0) return;
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const comments = await fetchCommentsForTopPosts(media);
      const res = await fetch("/api/instagram/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media, comments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInsights(data.insights);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setInsightsLoading(false);
    }
  }

  const meta = account?.platform_meta ?? {};
  const expired = account?.expires_at
    ? new Date(account.expires_at) < new Date()
    : false;

  const filteredMedia = [...media]
    .filter((m) => {
      if (mediaFilter !== "all" && m.media_type !== mediaFilter) return false;
      if (!mediaSearch) return true;
      return m.caption?.toLowerCase().includes(mediaSearch.toLowerCase());
    })
    .sort((a, b) => {
      if (mediaSort === "likes") return b.like_count - a.like_count;
      if (mediaSort === "comments") return b.comments_count - a.comments_count;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  return (
    <AnalyticsShell
      platform="instagram"
      platformIcon={IG_ICON}
      hasAccess={!!planConfig.publishDirect}
      loading={loading}
      hasAccount={!!account}
    >
      <ProfileHeader
        platform="instagram"
        username={account?.platform_username ?? null}
        avatarUrl={meta.avatar_url}
        bio={meta.bio}
        expired={expired}
        refreshing={refreshing}
        onRefresh={refreshStats}
        platformIcon={IG_ICON}
        stats={[
          { label: "followers", value: formatNumber(meta.follower_count) },
          { label: "following", value: formatNumber(meta.following_count) },
          { label: "posts", value: formatNumber(meta.media_count) },
        ]}
      />

      <Tabs
        defaultValue="overview"
        onValueChange={(v) => {
          if (v === "media" && !mediaLoaded) fetchMedia();
          if (v === "insights" && !mediaLoaded) fetchMedia();
        }}
      >
        <TabsList variant="line">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="media">
            <ImageIcon className="h-4 w-4 mr-1.5" />
            Media
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Followers"
              value={meta.follower_count}
              accentClass="bg-gradient-to-r from-pink-500 to-amber-500"
            />
            <StatCard
              icon={UserPlus}
              label="Following"
              value={meta.following_count}
              accentClass="bg-gradient-to-r from-pink-500 to-amber-500"
            />
            <StatCard
              icon={ImageIcon}
              label="Posts"
              value={meta.media_count}
              accentClass="bg-gradient-to-r from-pink-500 to-amber-500"
            />
            <StatCard
              icon={Heart}
              label="Avg Engagement"
              value={
                media.length > 0
                  ? Math.round(
                      media.reduce((sum, m) => sum + m.like_count + m.comments_count, 0) /
                        media.length
                    )
                  : undefined
              }
              accentClass="bg-gradient-to-r from-pink-500 to-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Recent Posts</h2>
              {!mediaLoaded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMedia()}
                  disabled={mediaLoading}
                >
                  {mediaLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Load Posts
                </Button>
              )}
            </div>
            {mediaLoading && !mediaLoaded ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : mediaLoaded && media.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {media.slice(0, 6).map((m) => (
                  <MediaCard
                    key={m.id}
                    item={igToMediaItem(m)}
                    compact
                    aspectRatio="square"
                  />
                ))}
              </div>
            ) : mediaLoaded ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No posts found on this account.</p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <input
              type="text"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="Search by caption..."
              className="w-full sm:w-64 px-3 py-2 text-sm border border-border bg-background rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-muted-foreground" />
                {(["all", "IMAGE", "VIDEO", "CAROUSEL_ALBUM"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={mediaFilter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMediaFilter(f)}
                    className="text-xs h-7 px-2"
                  >
                    {f === "all" && "All"}
                    {f === "IMAGE" && <ImageIcon className="h-3 w-3" />}
                    {f === "VIDEO" && <Video className="h-3 w-3" />}
                    {f === "CAROUSEL_ALBUM" && "Carousel"}
                  </Button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              {(["recent", "likes", "comments"] as const).map((sort) => (
                <Button
                  key={sort}
                  variant={mediaSort === sort ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMediaSort(sort)}
                  className="text-xs"
                >
                  {sort === "recent" && <Clock className="h-3 w-3 mr-1" />}
                  {sort === "likes" && <Heart className="h-3 w-3 mr-1" />}
                  {sort === "comments" && <MessageCircle className="h-3 w-3 mr-1" />}
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {mediaLoading && !mediaLoaded ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filteredMedia.length > 0 ? (
            <div className="space-y-3">
              {filteredMedia.map((m) => (
                <MediaCard key={m.id} item={igToMediaItem(m)} aspectRatio="square" />
              ))}
              {mediaHasMore && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchMedia(mediaCursor)}
                    disabled={mediaLoading}
                  >
                    {mediaLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : mediaLoaded ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {mediaSearch || mediaFilter !== "all"
                  ? "No posts match your filters."
                  : "No posts found."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading posts...</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6 mt-4">
          <InsightsPanel
            insights={insights}
            loading={insightsLoading}
            error={insightsError}
            onAnalyze={analyzeContent}
            onReanalyze={analyzeContent}
            canAnalyze={media.length > 0}
            mediaCount={media.length}
            mediaLoaded={mediaLoaded}
            onLoadAndAnalyze={async () => {
              await fetchMedia();
              analyzeContent();
            }}
            platform="instagram"
          />
        </TabsContent>
      </Tabs>
    </AnalyticsShell>
  );
}
