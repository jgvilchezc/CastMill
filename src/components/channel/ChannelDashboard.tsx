"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, BarChart3, Video, TrendingUp, Brain, BarChart2, Lightbulb, CheckCircle2 } from "lucide-react"
import { DiagnosisPanel } from "./DiagnosisPanel"
import { VideoList } from "./VideoList"

const ANALYSIS_STEPS = [
  { icon: BarChart2, label: "Reading video performance data", duration: 4000 },
  { icon: TrendingUp, label: "Detecting content patterns", duration: 7000 },
  { icon: Brain, label: "Running AI diagnosis", duration: 14000 },
  { icon: Lightbulb, label: "Generating recommendations", duration: 8000 },
]

function AnalysisLoader() {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [dots, setDots] = useState("")

  useEffect(() => {
    let stepIndex = 0
    let elapsed = 0

    const advance = () => {
      const step = ANALYSIS_STEPS[stepIndex]
      if (!step) return
      const timer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepIndex])
        stepIndex++
        if (stepIndex < ANALYSIS_STEPS.length) {
          setActiveStep(stepIndex)
          elapsed += step.duration
          advance()
        }
      }, step.duration)
      return timer
    }

    advance()

    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."))
    }, 400)

    return () => {
      clearInterval(dotsInterval)
    }
  }, [])

  const currentStep = ANALYSIS_STEPS[activeStep]
  const Icon = currentStep?.icon ?? Brain

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-full border-2 border-primary/20 animate-ping" />
        <div className="absolute w-16 h-16 rounded-full border border-primary/30 animate-pulse" />
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{currentStep?.label}{dots}</p>
        <p className="text-xs text-muted-foreground mt-1">This may take 30–60 seconds</p>
      </div>

      <div className="w-full max-w-sm space-y-2.5">
        {ANALYSIS_STEPS.map((step, i) => {
          const StepIcon = step.icon
          const isDone = completedSteps.includes(i)
          const isActive = i === activeStep
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-500 ${
                isDone
                  ? "border-primary/30 bg-primary/5 opacity-60"
                  : isActive
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/30 bg-transparent opacity-30"
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <StepIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className={`text-xs ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ChannelDashboardProps {
  channel: Record<string, unknown>
  videos: Record<string, unknown>[]
  onVideosUpdate: (videos: Record<string, unknown>[]) => void
}

export function ChannelDashboard({ channel, videos, onVideosUpdate }: ChannelDashboardProps) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(
    (channel.analysis as Record<string, unknown>) ?? null
  )

  async function runAnalysis() {
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const res = await fetch("/api/youtube/analyze-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id }),
      })
      const text = await res.text()
      if (!text) {
        setAnalysisError("Server returned an empty response. Try again.")
        return
      }
      const data = JSON.parse(text)
      if (res.ok) {
        setAnalysis(data.analysis)
      } else {
        setAnalysisError(data.error ?? "Analysis failed. Please try again.")
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Unexpected error. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  const score = (analysis?.score as number) ?? null

  return (
    <div>
      {/* Channel Header */}
      <div className="flex items-start gap-4 mb-6">
        {typeof channel.thumbnail_url === "string" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.thumbnail_url} alt="" className="w-14 h-14 rounded-full object-cover border border-border" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{channel.title as string}</h1>
          {typeof channel.handle === "string" && <p className="text-sm text-muted-foreground">{channel.handle}</p>}
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span>{Number(channel.subscriber_count).toLocaleString()} subscribers</span>
            <span>{Number(channel.video_count).toLocaleString()} videos</span>
            <span>{Number(channel.view_count).toLocaleString()} total views</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {score !== null && (
            <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border-2 ${score >= 70 ? "border-green-500 bg-green-500/10" : score >= 40 ? "border-yellow-500 bg-yellow-500/10" : "border-red-500 bg-red-500/10"}`}>
              <span className="text-2xl font-black">{score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          )}
          <Button onClick={runAnalysis} disabled={analyzing} size="sm" variant={analysis ? "outline" : "default"}>
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {analysis ? "Re-analyze" : "Analyze Channel"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={analysis ? "diagnosis" : "videos"}>
        <TabsList>
          <TabsTrigger value="diagnosis" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Diagnosis
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Videos ({videos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnosis" className="mt-4">
          {analyzing && <AnalysisLoader />}
          {!analyzing && analysisError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 text-center space-y-3">
              <p className="text-sm text-destructive font-medium">Analysis failed</p>
              <p className="text-xs text-muted-foreground">{analysisError}</p>
              <Button variant="outline" size="sm" onClick={runAnalysis}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Try Again
              </Button>
            </div>
          )}
          {!analyzing && !analysisError && !analysis && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm mb-4">Run the analysis to get your channel health score, pattern insights, and actionable recommendations.</p>
              <Button onClick={runAnalysis}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze Now
              </Button>
            </div>
          )}
          {!analyzing && !analysisError && analysis && <DiagnosisPanel analysis={analysis} />}
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <VideoList videos={videos} channelId={channel.id as string} onUpdate={onVideosUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
