"use client"

import { useState, useEffect } from "react"
import { Loader2, Scissors, Copy, Check, Zap, FileSearch, Flame, Sparkles, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const VIRAL_STEPS = [
  { icon: FileSearch, label: "Reading transcript segments", duration: 4000 },
  { icon: Flame, label: "Scoring viral potential per moment", duration: 8000 },
  { icon: Sparkles, label: "Writing hooks & captions", duration: 10000 },
]

function ViralLoader() {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [dots, setDots] = useState("")

  useEffect(() => {
    let stepIndex = 0

    const advance = () => {
      const step = VIRAL_STEPS[stepIndex]
      if (!step) return
      const timer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepIndex])
        stepIndex++
        if (stepIndex < VIRAL_STEPS.length) {
          setActiveStep(stepIndex)
          advance()
        }
      }, step.duration)
      return timer
    }

    advance()

    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."))
    }, 400)

    return () => clearInterval(dotsInterval)
  }, [])

  const currentStep = VIRAL_STEPS[activeStep]
  const Icon = currentStep?.icon ?? Sparkles

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 rounded-full border-2 border-primary/20 animate-ping" />
        <div className="absolute w-12 h-12 rounded-full border border-primary/30 animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium">{currentStep?.label}{dots}</p>
        <p className="text-xs text-muted-foreground mt-1">Usually takes 20–40 seconds</p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        {VIRAL_STEPS.map((step, i) => {
          const StepIcon = step.icon
          const isDone = completedSteps.includes(i)
          const isActive = i === activeStep
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-500",
                isDone ? "border-primary/30 bg-primary/5 opacity-60" :
                isActive ? "border-primary/60 bg-primary/10" :
                "border-border/30 opacity-30"
              )}
            >
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> :
               isActive ? <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" /> :
               <StepIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              <span className={cn("text-xs", isActive ? "text-foreground font-medium" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ViralMoment {
  rank: number
  startTime: string
  endTime: string
  startSeconds: number
  endSeconds: number
  hook: string
  reason: string
  viralScore: number
  format: string
  caption: string
}

interface ViralMomentsPanelProps {
  videoId: string
  channelVideoId: string
  title: string
  transcript: { text: string; segments: { text: string; offset: number; duration: number }[] } | null
  initialMoments: { moments: ViralMoment[] } | null
  onMomentsReady: (moments: { moments: ViralMoment[] }) => void
  onClipRequest: (moment: ViralMoment) => void
}

export function ViralMomentsPanel({
  channelVideoId,
  title,
  transcript,
  initialMoments,
  onMomentsReady,
  onClipRequest,
}: ViralMomentsPanelProps) {
  const [moments, setMoments] = useState<{ moments: ViralMoment[] } | null>(initialMoments)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  async function analyze() {
    if (!transcript) return
    setLoading(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 58000)
      const res = await fetch("/api/youtube/viral-moments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelVideoId, transcript, title }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const text = await res.text()
      if (!text) return
      const data = JSON.parse(text)
      if (res.ok) {
        setMoments(data.viralMoments)
        onMomentsReady(data.viralMoments)
      }
    } catch (err) {
      console.error("viral-moments failed:", err)
    } finally {
      setLoading(false)
    }
  }

  function copyCaption(caption: string, idx: number) {
    navigator.clipboard.writeText(caption)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!transcript) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Fetch the transcript first to identify viral moments.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!moments && !loading && (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-muted-foreground">AI will scan the transcript and identify the 5 best moments for TikTok/Reels/Shorts.</p>
          <Button onClick={analyze}>
            <Zap className="h-4 w-4 mr-2" />
            Find Viral Moments
          </Button>
        </div>
      )}

      {loading && <ViralLoader />}

      {moments && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{moments.moments.length} viral moments identified</p>
            <Button variant="ghost" size="sm" onClick={analyze} disabled={loading} className="text-muted-foreground">
              <Loader2 className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
              Re-scan
            </Button>
          </div>

          {moments.moments
            .sort((a, b) => b.viralScore - a.viralScore)
            .map((moment, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                      {moment.startTime} → {moment.endTime}
                    </span>
                    <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                      {moment.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={cn("text-xs font-bold px-2 py-0.5 rounded-full", moment.viralScore >= 80 ? "bg-green-500/20 text-green-500" : moment.viralScore >= 60 ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground")}>
                      {moment.viralScore}/100
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium leading-snug">&ldquo;{moment.hook}&rdquo;</p>
                  <p className="text-xs text-muted-foreground mt-1">{moment.reason}</p>
                </div>

                <div className="bg-muted/30 rounded p-3 text-xs text-muted-foreground font-mono leading-relaxed">
                  {moment.caption}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyCaption(moment.caption, i)} className="gap-1.5">
                    {copied === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === i ? "Copied!" : "Copy Caption"}
                  </Button>
                  <Button size="sm" onClick={() => onClipRequest(moment)} className="gap-1.5">
                    <Scissors className="h-3.5 w-3.5" />
                    Cut Clip
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
