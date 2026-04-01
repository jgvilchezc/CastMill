"use client"

import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GenerateAllButtonProps {
  onGenerate: () => void
  isGenerating: boolean
}

export function GenerateAllButton({ onGenerate, isGenerating }: GenerateAllButtonProps) {
  return (
    <Button onClick={onGenerate} disabled={isGenerating} size="lg">
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate All
        </>
      )}
    </Button>
  )
}
