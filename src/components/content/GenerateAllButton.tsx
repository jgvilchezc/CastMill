"use client"

import { useState } from "react"
import { Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GenerateAllButtonProps {
  onGenerate: () => void
}

export function GenerateAllButton({ onGenerate }: GenerateAllButtonProps) {
  const [generating, setGenerating] = useState(false)

  function handleClick() {
    setGenerating(true)
    onGenerate()
    // Reset after a reasonable timeout (content hub handles actual state)
    setTimeout(() => setGenerating(false), 12000)
  }

  return (
    <Button onClick={handleClick} disabled={generating} size="lg">
      {generating ? (
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
