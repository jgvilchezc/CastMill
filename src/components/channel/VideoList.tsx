"use client"

import Link from "next/link"
import { Eye, ThumbsUp, MessageCircle, Clock, Scissors } from "lucide-react"

interface VideoListProps {
  videos: Record<string, unknown>[]
  channelId: string
  onUpdate: (videos: Record<string, unknown>[]) => void
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function VideoList({ videos, channelId }: VideoListProps) {
  if (videos.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">No videos found.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {videos.map((video) => {
        const hasViral = !!(video.viral_moments as { moments?: unknown[] } | null)?.moments?.length
        return (
          <Link
            key={video.id as string}
            href={`/channel/${channelId}/video/${video.id}`}
            className="group border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all hover:shadow-sm"
          >
            <div className="relative aspect-video bg-muted overflow-hidden">
              {video.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail_url as string}
                  alt={video.title as string}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Eye className="h-8 w-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                {formatDuration(video.duration_seconds as number)}
              </div>
              {hasViral && (
                <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Scissors className="h-3 w-3" />
                  Clips ready
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors mb-2">
                {video.title as string}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatNum(video.view_count as number)}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {formatNum(video.like_count as number)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {formatNum(video.comment_count as number)}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                  <Clock className="h-3 w-3" />
                  {(video.published_at as string)?.split("T")[0] ?? "—"}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
