"use client";

import { ExternalLink, Eye, Heart, MessageCircle, Share2, Video, Image, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "./stat-card";

interface MediaItem {
  id: string;
  title?: string;
  caption?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp: string | number;
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  shareCount?: number;
  duration?: number;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
}

function formatDate(ts: string | number): string {
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface MediaCardProps {
  item: MediaItem;
  compact?: boolean;
  aspectRatio?: "portrait" | "square";
}

export function MediaCard({ item, compact, aspectRatio = "square" }: MediaCardProps) {
  const title = item.title || item.caption || "Untitled";
  const aspectClass = aspectRatio === "portrait" ? "aspect-9/16 max-h-40" : "aspect-square max-h-48";

  const TypeIcon = item.mediaType === "VIDEO" ? Play
    : item.mediaType === "CAROUSEL_ALBUM" ? Image
    : Video;

  if (compact) {
    return (
      <a
        href={item.permalink ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-md"
      >
        {item.thumbnailUrl ? (
          <div className={cn("overflow-hidden bg-muted relative", aspectClass)}>
            <img
              src={item.thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {item.mediaType === "VIDEO" && (
              <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                {item.duration ? formatDuration(item.duration) : <Play className="h-3 w-3" />}
              </div>
            )}
          </div>
        ) : (
          <div className={cn("bg-muted flex items-center justify-center", aspectClass)}>
            <TypeIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="p-3">
          <p className="text-xs font-medium line-clamp-2 mb-1.5">{title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.viewCount !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatNumber(item.viewCount)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatNumber(item.likeCount)}
            </span>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={item.permalink ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all hover:shadow-md"
    >
      {item.thumbnailUrl ? (
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted shrink-0 relative">
          <img src={item.thumbnailUrl} alt={title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-16 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <TypeIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1 mb-1">{title}</p>
        <p className="text-xs text-muted-foreground mb-2">
          {formatDate(item.timestamp)}
          {item.duration ? ` · ${formatDuration(item.duration)}` : ""}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {item.viewCount !== undefined && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {formatNumber(item.viewCount)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {formatNumber(item.likeCount)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> {formatNumber(item.commentCount)}
          </span>
          {item.shareCount !== undefined && (
            <span className="flex items-center gap-1">
              <Share2 className="h-3 w-3" /> {formatNumber(item.shareCount)}
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
    </a>
  );
}

export type { MediaItem };
export { formatDate, formatDuration };
