"use client"

import { SlidersHorizontal, ChevronDown, ChevronUp, AlertTriangle, Sparkles, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface SectionHeaderProps {
  title: string
  description: string
  hasData: boolean
  loading: boolean
  showCustom: boolean
  customInstructions: string
  confirmRegenerate: boolean
  onToggleCustom: () => void
  onCustomChange: (v: string) => void
  onGenerateClick: () => void
  onConfirm: () => void
  onCancelConfirm: () => void
  generateLabel: string
}

export function SectionHeader({
  title,
  description,
  hasData,
  loading,
  showCustom,
  customInstructions,
  confirmRegenerate,
  onToggleCustom,
  onCustomChange,
  onGenerateClick,
  onConfirm,
  onCancelConfirm,
  generateLabel,
}: SectionHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 text-xs text-muted-foreground"
            onClick={onToggleCustom}
            title="Customize request"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {showCustom ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            onClick={onGenerateClick}
            disabled={loading}
            size="sm"
            variant={hasData ? "outline" : "default"}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : hasData ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {loading ? "Generating…" : hasData ? "Regenerate" : generateLabel}
          </Button>
        </div>
      </div>

      {showCustom && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Additional focus or context for the AI
          </p>
          <Textarea
            value={customInstructions}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="e.g. Focus on beginner-friendly topics, I'm planning a Q4 2025 sprint, target audience is entrepreneurs…"
            className="min-h-16 text-xs resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This context will be sent to the AI along with your channel data.
          </p>
        </div>
      )}

      {confirmRegenerate && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              Replace saved content?
            </p>
            <p className="text-xs text-muted-foreground">
              Regenerating will overwrite the previously saved results for this section. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onConfirm} className="h-7 text-xs gap-1.5">
                <RefreshCw className="h-3 w-3" />
                Yes, regenerate
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelConfirm} className="h-7 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
