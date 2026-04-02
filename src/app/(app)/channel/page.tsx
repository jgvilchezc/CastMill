"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Youtube, Lock, Globe, ArrowRight, Loader2, Zap, Plus, Users, Eye, BarChart3, ChevronRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface SavedChannel {
  id: string
  title: string
  handle: string | null
  thumbnail_url: string | null
  subscriber_count: number
  video_count: number
  view_count: number
  analysis: Record<string, unknown> | null
  analyzed_at: string | null
  created_at: string
}

export default function ChannelPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [mode, setMode] = useState<"public" | "oauth">("public")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [savedChannels, setSavedChannels] = useState<SavedChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("channels")
      .select("id,title,handle,thumbnail_url,subscriber_count,video_count,view_count,analysis,analyzed_at,created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSavedChannels((data as SavedChannel[]) ?? [])
        setLoadingChannels(false)
        if (!data || data.length === 0) setShowForm(true)
      })
  }, [])

  async function handleImport() {
    if (!url.trim()) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/youtube/import-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelUrl: url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import failed")
      router.push(`/channel/${data.channel.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
          <Youtube className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channel Optimizer</h1>
          <p className="text-sm text-muted-foreground">Diagnose your channel and multiply every video</p>
        </div>
      </div>

      {/* Saved Channels */}
      {loadingChannels ? (
        <div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your channels…
        </div>
      ) : savedChannels.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Your Channels</p>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              Add Channel
            </Button>
          </div>
          <div className="space-y-2">
            {savedChannels.map((ch) => {
              const score = (ch.analysis?.score as number) ?? null
              return (
                <button
                  key={ch.id}
                  onClick={() => router.push(`/channel/${ch.id}`)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/30 transition-all text-left group"
                >
                  {ch.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ch.thumbnail_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <Youtube className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ch.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{Number(ch.subscriber_count).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{Number(ch.view_count).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {score !== null ? (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold",
                        score >= 70 ? "border-green-500/40 bg-green-500/10 text-green-400" :
                        score >= 40 ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" :
                        "border-red-500/40 bg-red-500/10 text-red-400"
                      )}>
                        <BarChart3 className="h-3 w-3" />
                        {score}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground border border-dashed border-border rounded-lg px-2 py-1">
                        Not analyzed
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Channel Form */}
      {(showForm || savedChannels.length === 0) && (
        <div className="border border-border rounded-xl p-5 space-y-5">
          <p className="text-sm font-semibold">
            {savedChannels.length > 0 ? "Add Another Channel" : "Connect a Channel"}
          </p>

          {/* Access Mode */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "public" as const, icon: Globe, title: "Public Analysis", desc: "Paste channel URL. Gets titles, views & engagement.", badge: "Free · Instant" },
              { key: "oauth" as const, icon: Lock, title: "Full Access", desc: "Connect Google to unlock CTR, retention & private data.", badge: "More accurate", soon: true },
            ].map(({ key, icon: Icon, title, desc, badge, soon }) => (
              <button
                key={key}
                onClick={() => !soon && setMode(key)}
                className={cn(
                  "relative text-left p-3.5 border-2 rounded-lg transition-all",
                  mode === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                  soon && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-semibold text-sm">{title}</span>
                  {soon && <span className="ml-auto text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Soon</span>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                <span className="inline-block mt-1.5 text-xs font-medium text-primary">{badge}</span>
              </button>
            ))}
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">YouTube Channel URL</label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
                placeholder="https://www.youtube.com/@yourhandle"
                className="flex-1 font-mono text-sm"
              />
              <Button onClick={handleImport} disabled={loading || !url.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">Supports: @handle · /channel/UCxxx · /c/name · /user/name</p>
          </div>
        </div>
      )}

      {/* What you get — only shown when no saved channels */}
      {savedChannels.length === 0 && !loadingChannels && (
        <div className="mt-6 border border-border rounded-xl p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">What you get</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              "Channel health score (0–100)",
              "Title & thumbnail pattern analysis",
              "Viral moment timestamps per video",
              "Ready-to-use TikTok/Reels captions",
              "AI repurposing for every format",
              "In-browser clip cutter (no upload needed)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
