"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Heart,
  Video,
  RefreshCw,
  ExternalLink,
  Loader2,
  Eye,
  MessageCircle,
  Share2,
  Clock,
  Sparkles,
  TrendingUp,
  Lightbulb,
  BarChart3,
  Type,
  AlertCircle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { PLANS } from "@/lib/plans";

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

interface Insights {
  contentThemes: Array<{
    theme: string;
    percentage: number;
    recommendation: string;
  }>;
  bestPerforming: {
    pattern: string;
    avgViews: number;
    suggestion: string;
  };
  captionStyle: {
    avgLength: string;
    commonPatterns: string[];
    improvement: string;
  };
  postingRecommendations: string[];
  contentIdeas: Array<{
    idea: string;
    reasoning: string;
  }>;
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const TIKTOK_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" />
  </svg>
);

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

  const [insights, setInsights] = useState<Insights | null>(null);
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

  if (!planConfig.publishDirect) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted mx-auto mb-4">
            {TIKTOK_ICON}
          </div>
          <h2 className="text-lg font-semibold mb-2">TikTok Analytics</h2>
          <p className="text-sm text-muted-foreground mb-4">
            TikTok Analytics requires the <strong>Pro plan</strong>.
          </p>
          <Button asChild>
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted mx-auto mb-4">
            {TIKTOK_ICON}
          </div>
          <h2 className="text-lg font-semibold mb-2">Connect TikTok</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your TikTok account to see analytics, browse your videos,
            and get AI-powered content insights.
          </p>
          <Button asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Go to Settings
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const expired = account.expires_at
    ? new Date(account.expires_at) < new Date()
    : false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {meta.avatar_url ? (
              <img
                src={meta.avatar_url}
                alt={account.platform_username ?? "TikTok"}
                className="h-14 w-14 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted text-foreground shrink-0">
                {TIKTOK_ICON}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold">
                  @{account.platform_username ?? "connected"}
                </h1>
                {meta.is_verified && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/15 text-blue-400 border-0">
                    Verified
                  </Badge>
                )}
                {expired ? (
                  <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-400 border-0">
                    Token expired
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-emerald-400 border-0">
                    Connected
                  </Badge>
                )}
              </div>
              {meta.bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {meta.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">{formatNumber(meta.follower_count)}</strong>{" "}
                  followers
                </span>
                <span>
                  <strong className="text-foreground">{formatNumber(meta.following_count)}</strong>{" "}
                  following
                </span>
                <span>
                  <strong className="text-foreground">{formatNumber(meta.likes_count)}</strong>{" "}
                  likes
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshStats}
                  disabled={refreshing || expired}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh stats from TikTok</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
              <Link href="/settings">
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {expired && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>
            Your TikTok token has expired.{" "}
            <Link href="/settings" className="underline font-medium">
              Reconnect in Settings
            </Link>{" "}
            to refresh your data.
          </p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" onValueChange={(v) => {
        if (v === "videos" && !videosLoaded) fetchVideos();
        if (v === "insights" && !videosLoaded) fetchVideos();
      }}>
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

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Followers" value={meta.follower_count} />
            <StatCard icon={UserPlus} label="Following" value={meta.following_count} />
            <StatCard icon={Heart} label="Likes" value={meta.likes_count} />
            <StatCard icon={Video} label="Videos" value={meta.video_count} />
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
                  <VideoCard key={video.id} video={video} compact />
                ))}
              </div>
            ) : videosLoaded ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">No videos found on this account.</p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* VIDEOS TAB */}
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
                <VideoCard key={video.id} video={video} />
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

        {/* INSIGHTS TAB */}
        <TabsContent value="insights" className="space-y-6 mt-4">
          {!insights && !insightsLoading && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="text-base font-semibold mb-2">AI Content Analysis</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Analyze your TikTok content to discover top-performing themes,
                caption patterns, and get personalized content ideas.
              </p>
              {!videosLoaded ? (
                <Button
                  onClick={async () => {
                    await fetchVideos();
                    analyzeContent();
                  }}
                  disabled={insightsLoading}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Load Videos & Analyze
                </Button>
              ) : videos.length > 0 ? (
                <Button onClick={analyzeContent} disabled={insightsLoading}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze My Content ({videos.length} videos)
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No videos available to analyze.
                </p>
              )}
            </div>
          )}

          {insightsLoading && (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm font-medium">Analyzing your content...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few seconds
              </p>
            </div>
          )}

          {insightsError && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {insightsError}
            </div>
          )}

          {insights && (
            <div className="space-y-6">
              {/* Content Themes */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Content Themes</h3>
                </div>
                <div className="space-y-3">
                  {insights.contentThemes.map((theme, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{theme.theme}</span>
                        <span className="text-xs text-muted-foreground">
                          {theme.percentage}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(theme.percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {theme.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best Performing */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Best Performing Content</h3>
                </div>
                <p className="text-sm mb-2">{insights.bestPerforming.pattern}</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Average views: {formatNumber(insights.bestPerforming.avgViews)}
                </p>
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-xs text-primary font-medium">
                    {insights.bestPerforming.suggestion}
                  </p>
                </div>
              </div>

              {/* Caption Style */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Type className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Caption Analysis</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Average length: {insights.captionStyle.avgLength}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {insights.captionStyle.commonPatterns.map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                  <p className="text-xs text-primary font-medium">
                    {insights.captionStyle.improvement}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {insights.postingRecommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Content Ideas */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Content Ideas</h3>
                </div>
                <div className="space-y-3">
                  {insights.contentIdeas.map((idea, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border p-3"
                    >
                      <p className="text-sm font-medium mb-1">{idea.idea}</p>
                      <p className="text-xs text-muted-foreground">
                        {idea.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <Button variant="outline" onClick={analyzeContent} disabled={insightsLoading}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Re-analyze
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{formatNumber(value)}</p>
    </div>
  );
}

function VideoCard({
  video,
  compact,
}: {
  video: TikTokVideo;
  compact?: boolean;
}) {
  const title = video.title || video.video_description || "Untitled";

  if (compact) {
    return (
      <a
        href={video.share_url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
      >
        {video.cover_image_url ? (
          <div className="aspect-9/16 max-h-40 overflow-hidden bg-muted">
            <img
              src={video.cover_image_url}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
        ) : (
          <div className="aspect-9/16 max-h-40 bg-muted flex items-center justify-center">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="p-3">
          <p className="text-xs font-medium line-clamp-2 mb-1.5">{title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatNumber(video.view_count)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatNumber(video.like_count)}
            </span>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={video.share_url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
    >
      {video.cover_image_url ? (
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
          <img
            src={video.cover_image_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-16 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Video className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1 mb-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-2">
          {formatDate(video.create_time)} · {formatDuration(video.duration)}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> {formatNumber(video.view_count)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {formatNumber(video.like_count)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {formatNumber(video.comment_count)}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" /> {formatNumber(video.share_count)}
          </span>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
    </a>
  );
}
