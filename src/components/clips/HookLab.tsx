"use client"

import { useState } from "react"
import { X, Loader2, Wand2, Copy, Check, Zap, Flame, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { HookVariant } from "@/components/clips/MomentCard"

interface HookLabProps {
  quote: string
  category: string
  episodeTitle: string
  topics: string[]
  episodeId: string
  momentId: string
  cachedHooks?: HookVariant[] | null
  onClose: () => void
  onSelectHook?: (hook: HookVariant) => void
  onHooksGenerated?: (momentId: string, hooks: HookVariant[]) => void
}

const STYLE_META = {
  curiosity: { icon: Zap, label: "Curiosity", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  controversy: { icon: Flame, label: "Controversy", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  actionable: { icon: Target, label: "Actionable", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
}

export function HookLab({ quote, category, episodeTitle, topics, episodeId, momentId, cachedHooks, onClose, onSelectHook, onHooksGenerated }: HookLabProps) {
  const [hooks, setHooks] = useState<HookVariant[] | null>(cachedHooks ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/ai/generate-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, category, episodeTitle, topics, episodeId, momentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Generation failed")
      setHooks(data.hooks)
      onHooksGenerated?.(momentId, data.hooks)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Hook Lab
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">3 hook styles to stop the scroll</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Source quote</p>
            <p className="text-sm leading-relaxed">&ldquo;{quote}&rdquo;</p>
            <Badge variant="outline" className="mt-2 text-xs">{category}</Badge>
          </div>

          {!hooks && !loading && (
            <Button className="w-full" onClick={generate}>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate 3 Hook Variants
            </Button>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Writing hooks…
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {hooks && (
            <div className="space-y-3">
              {hooks.map((hook) => {
                const meta = STYLE_META[hook.style] ?? STYLE_META.curiosity
                const Icon = meta.icon
                return (
                  <div key={hook.style} className={cn("rounded-lg border p-4 space-y-2", meta.bg)}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                      <span className={cn("text-xs font-semibold uppercase tracking-wider", meta.color)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug">{hook.text}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{hook.caption}</p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => copy(hook.text, `hook-${hook.style}`)}
                      >
                        {copied === `hook-${hook.style}` ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Hook
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => copy(`${hook.text}\n\n${hook.caption}`, `caption-${hook.style}`)}
                      >
                        {copied === `caption-${hook.style}` ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Caption
                      </Button>
                      {onSelectHook && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs ml-auto"
                          onClick={() => onSelectHook(hook)}
                        >
                          Use for clip
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              <Button variant="ghost" size="sm" className="w-full" onClick={generate}>
                <Wand2 className="h-3.5 w-3.5 mr-2" />
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
