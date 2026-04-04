"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Hash, Music2, Lightbulb, ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TrendDigest {
  hashtags: string[]
  sounds: string[]
  formats: string[]
  insight: string
}

interface TrendBannerProps {
  topics: string[]
}

export function TrendBanner({ topics }: TrendBannerProps) {
  const [digest, setDigest] = useState<TrendDigest | null>(null)
  const [niche, setNiche] = useState("")
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function fetchDigest() {
      try {
        const params = topics.length > 0 ? `?topics=${encodeURIComponent(topics.join(","))}` : ""
        const res = await fetch(`/api/trends/digest${params}`)
        if (res.ok) {
          const data = await res.json()
          setDigest(data.digest)
          setNiche(data.niche)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDigest()
  }, [topics])

  if (loading) {
    return (
      <div className="h-14 rounded-xl bg-muted/30 border border-border animate-pulse" />
    )
  }

  if (!digest) return null

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-violet-500/10 transition-colors"
      >
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-violet-500/15 shrink-0">
          <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-violet-200">
            Trend Digest
            {niche !== "default" && (
              <span className="ml-2 text-xs text-violet-400 capitalize">· {niche}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">Weekly TikTok pulse for your niche</p>
        </div>
        <div className="flex items-center gap-2">
          {digest.hashtags.slice(0, 2).map((h) => (
            <Badge key={h} variant="secondary" className="text-xs bg-violet-500/20 text-violet-300 border-0 hidden sm:inline-flex">
              {h}
            </Badge>
          ))}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </div>
      </button>

      <div className={cn("overflow-hidden transition-all duration-300", expanded ? "max-h-96" : "max-h-0")}>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-violet-500/20 pt-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Hash className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-300">Top Hashtags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {digest.hashtags.map((h) => (
                <Badge key={h} variant="secondary" className="text-xs bg-violet-500/20 text-violet-300 border-0 cursor-pointer hover:bg-violet-500/30 transition-colors">
                  {h}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Music2 className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-300">Trending Sounds</span>
            </div>
            <ul className="space-y-1">
              {digest.sounds.map((s) => (
                <li key={s} className="text-xs text-muted-foreground">· {s}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-300">Winning Formats</span>
            </div>
            <ul className="space-y-1">
              {digest.formats.map((f) => (
                <li key={f} className="text-xs text-muted-foreground">· {f}</li>
              ))}
            </ul>
          </div>

          <div className="sm:col-span-3 bg-violet-500/10 rounded-lg px-3 py-2">
            <p className="text-xs text-violet-300">
              <span className="font-medium">Data insight · </span>
              {digest.insight}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
