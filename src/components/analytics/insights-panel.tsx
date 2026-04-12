"use client";

import { TrendingUp, BarChart3, Type, Lightbulb, RefreshCw, Sparkles, Loader2, AlertCircle, MessageSquare, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "./stat-card";

interface ContentTheme {
  theme: string;
  percentage: number;
  recommendation: string;
}

interface BestPerforming {
  pattern: string;
  avgViews?: number;
  avgLikes?: number;
  suggestion: string;
}

interface CaptionStyle {
  avgLength: string;
  commonPatterns: string[];
  improvement: string;
}

interface ContentIdea {
  idea: string;
  reasoning: string;
}

interface CommentSentiment {
  overall: string;
  positiveThemes: string[];
  negativeThemes: string[];
  suggestion: string;
}

interface HashtagStrategy {
  topHashtags: string[];
  recommendation: string;
}

interface InsightsData {
  contentThemes: ContentTheme[];
  bestPerforming: BestPerforming;
  captionStyle: CaptionStyle;
  postingRecommendations: string[];
  contentIdeas: ContentIdea[];
  commentSentiment?: CommentSentiment;
  hashtagStrategy?: HashtagStrategy;
}

interface InsightsPanelProps {
  insights: InsightsData | null;
  loading: boolean;
  error: string;
  onAnalyze: () => void;
  onReanalyze: () => void;
  canAnalyze: boolean;
  mediaCount: number;
  mediaLoaded: boolean;
  onLoadAndAnalyze: () => void;
  platform: "tiktok" | "instagram";
}

export function InsightsPanel({
  insights,
  loading,
  error,
  onAnalyze,
  onReanalyze,
  canAnalyze,
  mediaCount,
  mediaLoaded,
  onLoadAndAnalyze,
  platform,
}: InsightsPanelProps) {
  const platformLabel = platform === "tiktok" ? "TikTok" : "Instagram";
  const mediaLabel = platform === "tiktok" ? "videos" : "posts";

  if (!insights && !loading) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
        <h3 className="text-base font-semibold mb-2">AI Content Analysis</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Analyze your {platformLabel} content to discover top-performing themes,
          caption patterns, and get personalized content ideas.
        </p>
        {!mediaLoaded ? (
          <Button onClick={onLoadAndAnalyze} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Load {mediaLabel} & Analyze
          </Button>
        ) : canAnalyze ? (
          <Button onClick={onAnalyze} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Analyze My Content ({mediaCount} {mediaLabel})
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            No {mediaLabel} available to analyze.
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-sm font-medium">Analyzing your content...</p>
        <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="space-y-6">
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
                <span className="text-xs text-muted-foreground">{theme.percentage}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(theme.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{theme.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Best Performing Content</h3>
        </div>
        <p className="text-sm mb-2">{insights.bestPerforming.pattern}</p>
        {insights.bestPerforming.avgViews !== undefined && (
          <p className="text-xs text-muted-foreground mb-2">
            Average views: {formatNumber(insights.bestPerforming.avgViews)}
          </p>
        )}
        {insights.bestPerforming.avgLikes !== undefined && (
          <p className="text-xs text-muted-foreground mb-2">
            Average likes: {formatNumber(insights.bestPerforming.avgLikes)}
          </p>
        )}
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
          <p className="text-xs text-primary font-medium">{insights.bestPerforming.suggestion}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Type className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Caption Analysis</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Average length: {insights.captionStyle.avgLength}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {insights.captionStyle.commonPatterns.map((p, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
          ))}
        </div>
        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
          <p className="text-xs text-primary font-medium">{insights.captionStyle.improvement}</p>
        </div>
      </div>

      {insights.hashtagStrategy && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Hashtag Strategy</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {insights.hashtagStrategy.topHashtags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
            ))}
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
            <p className="text-xs text-primary font-medium">{insights.hashtagStrategy.recommendation}</p>
          </div>
        </div>
      )}

      {insights.commentSentiment && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Comment Sentiment</h3>
          </div>
          <p className="text-sm mb-3">{insights.commentSentiment.overall}</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs font-medium text-emerald-400 mb-1.5">Positive themes</p>
              <div className="space-y-1">
                {insights.commentSentiment.positiveThemes.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground">+ {t}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-amber-400 mb-1.5">Areas to address</p>
              <div className="space-y-1">
                {insights.commentSentiment.negativeThemes.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground">- {t}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
            <p className="text-xs text-primary font-medium">{insights.commentSentiment.suggestion}</p>
          </div>
        </div>
      )}

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

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Content Ideas</h3>
        </div>
        <div className="space-y-3">
          {insights.contentIdeas.map((idea, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium mb-1">{idea.idea}</p>
              <p className="text-xs text-muted-foreground">{idea.reasoning}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={onReanalyze} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Re-analyze
        </Button>
      </div>
    </div>
  );
}

export type { InsightsData, ContentTheme, BestPerforming, CaptionStyle, ContentIdea, CommentSentiment, HashtagStrategy };
