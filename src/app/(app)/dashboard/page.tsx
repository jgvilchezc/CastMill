"use client"

import Link from "next/link"
import { Plus, Mic } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { EpisodeCard } from "@/components/episodes/EpisodeCard"
import { useEpisodes } from "@/lib/context/episode-context"

export default function DashboardPage() {
  const { episodes } = useEpisodes()

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
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } },
            hidden: {},
          }}
        >
          {episodes.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </motion.div>
      )}
    </div>
  )
}
