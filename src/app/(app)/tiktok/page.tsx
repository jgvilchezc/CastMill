"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Heart,
  Video,
  Eye,
  Clock,
  Sparkles,
  BarChart3,
  Loader2,
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
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
  display_name?: string;
  avatar_url?: string;
}

interface TikTokVideo {
  id: string;
  title?: string;
  video_description?: string;
  create_time: number;
  cover_image_url?: string;
  share_url?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  duration: number;
}

const TIKTOK_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" />
  </svg>
);

function ttToMediaItem(v: TikTokVideo): MediaItem {
  return {
    id: v.id,
    title: v.title || v.video_description,
    thumbnailUrl: v.cover_image_url,
    permalink: v.share_url,
    timestamp: v.create_time,
    likeCount: v.like_count,
    commentCount: v.comment_count,
    viewCount: v.view_count,
    shareCount: v.share_count,
    duration: v.duration,
    mediaType: "VIDEO",
  };
}

export default function TikTokAnalyticsPage() {
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

  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosCursor, setVideosCursor] = useState<number | null>(null);
  const [videosHasMore, setVideosHasMore] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [videosSort, setVideosSort] = useState<"recent" | "views" | "likes">("recent");
  const [videosSearch, setVideosSearch] = useState("");

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
        .eq("platform", "tiktok")
        .single();
      if (data) setAccount(data);
      setLoading(false);
    }
    load();
  }, []);

  const fetchVideos = useCallback(async (cursor?: number | null) => {
    setVideosLoading(true);
    try {
      const params = new URLSearchParams({ max_count: "20" });
      if (cursor) params.set("cursor", String(cursor));
      const res = await fetch(`/api/tiktok/videos?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (cursor) {
        setVideos((prev) => [...prev, ...data.videos]);
      } else {
        setVideos(data.videos);
      }
      setVideosCursor(data.cursor);
      setVideosHasMore(data.has_more);
      setVideosLoaded(true);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  async function refreshStats() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/tiktok/refresh-stats", { method: "POST" });
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

  async function analyzeContent() {
    if (videos.length === 0) return;
    setInsightsLoading(true);
    setInsightsError("");
    try {
      const res = await fetch("/api/tiktok/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
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

  const sortedVideos = [...videos]
    .filter((v) => {
      if (!videosSearch) return true;
      const q = videosSearch.toLowerCase();
      return (
        v.title?.toLowerCase().includes(q) ||
        v.video_description?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (videosSort === "views") return b.view_count - a.view_count;
      if (videosSort === "likes") return b.like_count - a.like_count;
      return b.create_time - a.create_time;
    });

  return (
    <AnalyticsShell
      platform="tiktok"
      platformIcon={TIKTOK_ICON}
      hasAccess={!!planConfig.publishDirect}
      loading={loading}
      hasAccount={!!account}
    >
      <ProfileHeader
        platform="tiktok"
        username={account?.platform_username ?? null}
        avatarUrl={meta.avatar_url}
        isVerified={meta.is_verified}
        bio={meta.bio}
        expired={expired}
        refreshing={refreshing}
        onRefresh={refreshStats}
        platformIcon={TIKTOK_ICON}
        stats={[
          { label: "followers", value: formatNumber(meta.follower_count) },
          { label: "following", value: formatNumber(meta.following_count) },
          { label: "likes", value: formatNumber(meta.likes_count) },
        ]}
      />

      <Tabs
        defaultValue="overview"
        onValueChange={(v) => {
          if (v === "videos" && !videosLoaded) fetchVideos();
          if (v === "insights" && !videosLoaded) fetchVideos();
        }}
      >
        <TabsList variant="line">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="h-4 w-4 mr-1.5" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Followers" value={meta.follower_count} accentClass="bg-cyan-500" />
            <StatCard icon={UserPlus} label="Following" value={meta.following_count} accentClass="bg-cyan-500" />
            <StatCard icon={Heart} label="Likes" value={meta.likes_count} accentClass="bg-cyan-500" />
            <StatCard icon={Video} label="Videos" value={meta.video_count} accentClass="bg-cyan-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Recent Videos</h2>
              {!videosLoaded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchVideos()}
                  disabled={videosLoading}
                >
                  {videosLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Video className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Load Videos
                </Button>
              )}
            </div>
            {videosLoading && !videosLoaded ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : videosLoaded && videos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {videos.slice(0, 6).map((video) => (
                  <MediaCard
                    key={video.id}
                    item={ttToMediaItem(video)}
                    compact
                    aspectRatio="portrait"
                  />
                ))}
              </div>
            ) : videosLoaded ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No videos found on this account.</p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <input
              type="text"
              value={videosSearch}
              onChange={(e) => setVideosSearch(e.target.value)}
              placeholder="Search videos..."
              className="w-full sm:w-64 px-3 py-2 text-sm border border-border bg-background rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              {(["recent", "views", "likes"] as const).map((sort) => (
                <Button
                  key={sort}
                  variant={videosSort === sort ? "default" : "outline"}
                  size="sm"
                  onClick={() => setVideosSort(sort)}
                  className="text-xs"
                >
                  {sort === "recent" && <Clock className="h-3 w-3 mr-1" />}
                  {sort === "views" && <Eye className="h-3 w-3 mr-1" />}
                  {sort === "likes" && <Heart className="h-3 w-3 mr-1" />}
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {videosLoading && !videosLoaded ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : sortedVideos.length > 0 ? (
            <div className="space-y-3">
              {sortedVideos.map((video) => (
                <MediaCard key={video.id} item={ttToMediaItem(video)} aspectRatio="portrait" />
              ))}
              {videosHasMore && (
                <div className="text-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => fetchVideos(videosCursor)}
                    disabled={videosLoading}
                  >
                    {videosLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : videosLoaded ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {videosSearch ? "No videos match your search." : "No videos found."}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading videos...</p>
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
            canAnalyze={videos.length > 0}
            mediaCount={videos.length}
            mediaLoaded={videosLoaded}
            onLoadAndAnalyze={async () => {
              await fetchVideos();
              analyzeContent();
            }}
            platform="tiktok"
          />
        </TabsContent>
      </Tabs>
    </AnalyticsShell>
  );
}
