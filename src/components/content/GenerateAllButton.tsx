"use client"

import { Loader2 } from "lucide-react"

interface GenerateAllButtonProps {
  onGenerate: () => void
  isGenerating: boolean
}

export function GenerateAllButton({ onGenerate, isGenerating }: GenerateAllButtonProps) {
  return (
    <button
      onClick={onGenerate}
      disabled={isGenerating}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded
        bg-primary text-primary-foreground
        hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-150"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Generating…
        </>
      ) : (
        <>
          <span className="text-[10px] opacity-60">▶</span>
          Generate all
        </>
      )}
    </button>
  )
}
