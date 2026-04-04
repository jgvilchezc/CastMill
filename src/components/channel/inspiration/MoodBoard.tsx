"use client"

import { useState } from "react"
import { Trash2, Copy, Check, Lightbulb, GitMerge, ClipboardList, Pin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MoodBoardItem } from "./types"

interface MoodBoardProps {
  items: MoodBoardItem[]
  onRemove: (id: string) => void
}

const typeConfig = {
  gap: {
    label: "Gap",
    color: "border-blue-500/30 bg-blue-500/5",
    badge: "bg-blue-500/10 text-blue-500",
    icon: Pin,
  },
  trend: {
    label: "Trend",
    color: "border-green-500/30 bg-green-500/5",
    badge: "bg-green-500/10 text-green-500",
    icon: Pin,
  },
  series: {
    label: "Series",
    color: "border-purple-500/30 bg-purple-500/5",
    badge: "bg-purple-500/10 text-purple-500",
    icon: Pin,
  },
  question: {
    label: "Question",
    color: "border-orange-500/30 bg-orange-500/5",
    badge: "bg-orange-500/10 text-orange-500",
    icon: Pin,
  },
}

function CopyBriefButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Button onClick={handleCopy} size="sm" variant="default" className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy Brief"}
    </Button>
  )
}

function buildBrief(items: MoodBoardItem[]): string {
  if (items.length === 0) return ""

  const lines: string[] = [
    "=== VIDEO BRIEF ===",
    "",
  ]

  const byType: Record<string, MoodBoardItem[]> = {}
  for (const item of items) {
    if (!byType[item.type]) byType[item.type] = []
    byType[item.type].push(item)
  }

  const typeLabels: Record<string, string> = {
    gap: "Content Gaps",
    trend: "Trends",
    series: "Series Ideas",
    question: "Audience Questions",
  }

  for (const [type, typeItems] of Object.entries(byType)) {
    lines.push(`--- ${typeLabels[type] ?? type.toUpperCase()} ---`)
    for (const item of typeItems) {
      lines.push(`• ${item.title}`)
      if (item.description) lines.push(`  ${item.description}`)
      if (item.hook) lines.push(`  Hook: "${item.hook}"`)
      if (item.format) lines.push(`  Format: ${item.format}`)
    }
    lines.push("")
  }

  lines.push("===================")
  return lines.join("\n")
}

export function MoodBoard({ items, onRemove }: MoodBoardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(items.map((i) => i.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  const selectedItems = selectedIds.size > 0
    ? items.filter((i) => selectedIds.has(i.id))
    : items

  const brief = buildBrief(selectedItems)

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Inspiration Board</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Save ideas from any section to build your creative brief
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">Your board is empty</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Use the &quot;Save&quot; button on any idea from Content Gaps, Trends, Series, or Questions to pin it here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Inspiration Board</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} idea{items.length !== 1 ? "s" : ""} saved
            {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs h-8">
              Clear selection
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-8">
              Select all
            </Button>
          )}
          <CopyBriefButton text={brief} />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">
            Brief will include <span className="font-medium text-foreground">{selectedIds.size} selected idea{selectedIds.size !== 1 ? "s" : ""}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => {
          const cfg = typeConfig[item.type] ?? typeConfig.gap
          const isSelected = selectedIds.has(item.id)
          return (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              className={cn(
                "border rounded-lg p-3 cursor-pointer transition-all group relative",
                cfg.color,
                isSelected && "ring-2 ring-primary ring-offset-1"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.badge)}>
                  {cfg.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(item.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="text-sm font-medium leading-snug mb-1.5">{item.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>

              {item.hook && (
                <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-1">&quot;{item.hook}&quot;</p>
              )}

              {item.format && (
                <span className="inline-block mt-2 text-xs bg-background/60 px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground">
                  {item.format}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {selectedIds.size > 0 ? `Brief preview (${selectedIds.size} selected)` : "Full brief preview"}
          </span>
        </div>
        <pre className="p-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto max-h-48">
          {brief}
        </pre>
      </div>
    </div>
  )
}
