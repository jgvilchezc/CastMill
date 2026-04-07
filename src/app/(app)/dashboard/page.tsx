"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Plus, Mic, Search, X, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { EpisodeCard } from "@/components/episodes/EpisodeCard"
import { useEpisodes } from "@/lib/context/episode-context"
import { DashboardSkeleton } from "@/components/skeletons"

interface TranscriptHit {
  episodeId: string
  snippet: string
}

export default function DashboardPage() {
  const { episodes, isLoadingEpisodes } = useEpisodes()
  const [searchQuery, setSearchQuery] = useState("")
  const [transcriptHits, setTranscriptHits] = useState<TranscriptHit[]>([])
  const [isSearchingTranscripts, setIsSearchingTranscripts] = useState(false)
  const [hasSearchedTranscripts, setHasSearchedTranscripts] = useState(false)

  const filteredEpisodes = useMemo(() => {
    if (!searchQuery.trim()) return episodes
    const q = searchQuery.toLowerCase()
    return episodes.filter(ep =>
      ep.title.toLowerCase().includes(q) ||
      ep.topics.some(t => t.toLowerCase().includes(q))
    )
  }, [episodes, searchQuery])

  const transcriptMatchIds = useMemo(() => new Set(transcriptHits.map(h => h.episodeId)), [transcriptHits])

  const displayEpisodes = useMemo(() => {
    if (!hasSearchedTranscripts || !searchQuery.trim()) return filteredEpisodes
    const titleIds = new Set(filteredEpisodes.map(e => e.id))
    const extra = episodes.filter(e => transcriptMatchIds.has(e.id) && !titleIds.has(e.id))
    return [...filteredEpisodes, ...extra]
  }, [filteredEpisodes, hasSearchedTranscripts, searchQuery, episodes, transcriptMatchIds])

  const searchTranscripts = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearchingTranscripts(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
      if (res.ok) {
        const data = await res.json()
        setTranscriptHits(data.results ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setIsSearchingTranscripts(false)
      setHasSearchedTranscripts(true)
    }
  }, [searchQuery])

  function clearSearch() {
    setSearchQuery("")
    setTranscriptHits([])
    setHasSearchedTranscripts(false)
  }

  if (isLoadingEpisodes) {
    return <DashboardSkeleton />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Episodes</h2>
          <p className="text-muted-foreground text-sm mt-1">{episodes.length} episode{episodes.length !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Plus className="h-4 w-4 mr-2" />
            New Episode
          </Link>
        </Button>
      </div>

      {episodes.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setHasSearchedTranscripts(false)
              }}
              onKeyDown={(e) => { if (e.key === "Enter") searchTranscripts() }}
              placeholder="Search episodes…"
              className="w-full pl-9 pr-9 py-2 text-sm border border-border bg-background rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {searchQuery.trim() && !hasSearchedTranscripts && (
            <Button
              variant="outline"
              size="sm"
              onClick={searchTranscripts}
              disabled={isSearchingTranscripts}
              className="whitespace-nowrap"
            >
              {isSearchingTranscripts ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Searching…</>
              ) : (
                "Search in transcripts"
              )}
            </Button>
          )}
        </div>
      )}

      {episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Mic className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No episodes yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Upload your first recording to get started</p>
          <Button asChild>
            <Link href="/upload">
              <Plus className="h-4 w-4 mr-2" />
              Upload your first episode
            </Link>
          </Button>
        </div>
      ) : displayEpisodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-muted-foreground">No episodes match &ldquo;{searchQuery}&rdquo;</p>
          {!hasSearchedTranscripts && (
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={searchTranscripts}
              disabled={isSearchingTranscripts}
            >
              {isSearchingTranscripts ? "Searching transcripts…" : "Try searching in transcripts"}
            </Button>
          )}
        </div>
      ) : (
        <>
          {hasSearchedTranscripts && transcriptHits.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3 font-mono">
              Found in {transcriptHits.length} transcript{transcriptHits.length !== 1 ? "s" : ""}
            </p>
          )}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
              hidden: {},
            }}
          >
            {displayEpisodes.map((episode) => {
              const hit = transcriptHits.find(h => h.episodeId === episode.id)
              return (
                <div key={episode.id} className="relative">
                  <EpisodeCard episode={episode} />
                  {hit && (
                    <div className="mt-1 px-3 py-2 bg-muted/30 rounded border border-border/50">
                      <p className="text-xs text-muted-foreground font-mono leading-relaxed line-clamp-2">
                        {hit.snippet}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </motion.div>
        </>
      )}
    </div>
  )
}
