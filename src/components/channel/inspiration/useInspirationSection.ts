"use client"

import { useState } from "react"

type InspirationMode = "gaps" | "trends" | "series" | "questions"

interface UseInspirationSectionOptions<T> {
  mode: InspirationMode
  initialData: T[] | null
  channelId: string
  channelData: {
    title: string
    handle?: string
    analysis: Record<string, unknown>
    videos?: { title: string; view_count: number; like_count?: number; comment_count?: number; published_at?: string }[]
  }
  onSaved: (data: T[]) => void
}

export function useInspirationSection<T>({
  mode,
  initialData,
  channelId,
  channelData,
  onSaved,
}: UseInspirationSectionOptions<T>) {
  const [data, setData] = useState<T[] | null>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customInstructions, setCustomInstructions] = useState("")
  const [showCustom, setShowCustom] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    setConfirmRegenerate(false)
    try {
      const res = await fetch("/api/ai/inspire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          channelId,
          channelData,
          customInstructions: customInstructions.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to generate")
        return
      }
      const result = json[mode] as T[]
      setData(result)
      onSaved(result)
    } catch {
      setError("Unexpected error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleGenerateClick() {
    if (data && data.length > 0) {
      setConfirmRegenerate(true)
    } else {
      generate()
    }
  }

  return {
    data,
    loading,
    error,
    customInstructions,
    setCustomInstructions,
    showCustom,
    setShowCustom,
    confirmRegenerate,
    setConfirmRegenerate,
    handleGenerateClick,
    generate,
  }
}
