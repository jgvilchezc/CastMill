"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles, Lock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/context/user-context"
import { PLANS } from "@/lib/plans"
import { MomentCard, type ViralMoment } from "@/components/clips/MomentCard"
import { HookLab } from "@/components/clips/HookLab"
import { EpisodeClipGenerator } from "@/components/clips/EpisodeClipGenerator"
import { TrendBanner } from "@/components/clips/TrendBanner"

interface ClipsHubProps {
  episodeId: string
  episodeTitle: string
  topics: string[]
  transcriptText: string
  cachedMoments?: ViralMoment[] | null
}

interface SelectedHook {
  text: string
  caption: string
}

export function ClipsHub({ episodeId, episodeTitle, topics, transcriptText, cachedMoments }: ClipsHubProps) {
  const { user } = useUser()
  const plan = user?.plan ?? "free"
  const planConfig = PLANS[plan]

  const [moments, setMoments] = useState<ViralMoment[] | null>(cachedMoments ?? null)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState("")

  const [hookLabMoment, setHookLabMoment] = useState<ViralMoment | null>(null)
  const [clipMoment, setClipMoment] = useState<ViralMoment | null>(null)
  const [selectedHook, setSelectedHook] = useState<SelectedHook | null>(null)

  useEffect(() => {
    if (cachedMoments) setMoments(cachedMoments)
  }, [cachedMoments])

  if (!planConfig.clipsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-muted mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Clip Studio</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Turn your best moments into TikTok and Instagram Reels. Detect viral clips, generate hooks, and cut audiograms — all without leaving the app.
        </p>
        <Button asChild>
          <Link href="/pricing">
            Unlock with Starter
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    )
  }

  async function detectMoments() {
    if (!transcriptText) {
      setDetectError("No transcript available. Process the episode first.")
      return
    }
    setDetecting(true)
    setDetectError("")
    try {
      const res = await fetch("/api/ai/detect-moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, transcript: transcriptText, topics }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Detection failed")
      setMoments(data.moments)
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setDetecting(false)
    }
  }

  function handleSelectHook(hook: SelectedHook) {
    setSelectedHook(hook)
    setHookLabMoment(null)
    if (clipMoment) {
      setClipMoment(clipMoment)
    } else if (hookLabMoment) {
      setClipMoment(hookLabMoment)
    }
  }

  const displayMoments = moments?.slice(0, planConfig.clipsPerEpisode) ?? []

  return (
    <div className="space-y-4">
      {planConfig.trendDigest && (
        <TrendBanner topics={topics} />
      )}

      {!moments && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mx-auto mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-base font-semibold mb-1">Find viral moments</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
            AI scans your transcript and surfaces the {planConfig.clipsPerEpisode} moments most likely to go viral on TikTok or Reels.
          </p>
          <Button onClick={detectMoments} disabled={detecting || !transcriptText}>
            {detecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Detecting…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Detect Viral Moments
              </>
            )}
          </Button>
          {detectError && (
            <p className="text-sm text-destructive mt-3">{detectError}</p>
          )}
        </div>
      )}

      {moments && displayMoments.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No moments detected. Try an episode with more conversational content.
        </p>
      )}

      {displayMoments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {displayMoments.length} moment{displayMoments.length !== 1 ? "s" : ""} detected
              {plan !== "pro" && (
                <span className="ml-1">
                  · <Link href="/pricing" className="text-primary hover:underline">upgrade for {PLANS.pro.clipsPerEpisode}</Link>
                </span>
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={detectMoments} disabled={detecting}>
              {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="ml-1.5">Re-scan</span>
            </Button>
          </div>

          {displayMoments.map((m, i) => (
            <MomentCard
              key={m.id}
              moment={m}
              index={i}
              onHookLab={(mom) => { setHookLabMoment(mom); setSelectedHook(null) }}
              onCut={(mom) => { setClipMoment(mom) }}
            />
          ))}
        </div>
      )}

      {hookLabMoment && (
        <HookLab
          quote={hookLabMoment.quote}
          category={hookLabMoment.category}
          episodeTitle={episodeTitle}
          topics={topics}
          onClose={() => setHookLabMoment(null)}
          onSelectHook={(hook) => handleSelectHook({ text: hook.text, caption: hook.caption })}
        />
      )}

      {clipMoment && (
        <EpisodeClipGenerator
          moment={clipMoment}
          selectedHook={selectedHook}
          onClose={() => { setClipMoment(null); setSelectedHook(null) }}
        />
      )}
    </div>
  )
}
