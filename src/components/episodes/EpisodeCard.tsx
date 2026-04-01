"use client"

import Link from "next/link"
import { FileText, Clock, Users } from "lucide-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type Episode } from "@/lib/context/episode-context"
import { EpisodeStatusBadge } from "./EpisodeStatusBadge"
import { formatDuration } from "@/lib/utils"

const gradients = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-cyan-500 to-blue-600",
]

function getGradient(id: string) {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return gradients[sum % gradients.length]
}

interface EpisodeCardProps {
  episode: Episode
}

export function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        {/* Thumbnail */}
        <div className={`h-32 bg-gradient-to-br ${getGradient(episode.id)} relative`}>
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="gap-1 bg-black/50 text-white border-0 backdrop-blur-sm">
              <Clock className="h-3 w-3" />
              {formatDuration(episode.duration)}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{episode.title}</h3>
            <EpisodeStatusBadge status={episode.status} />
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {new Date(episode.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{episode.description}</p>
          <div className="flex flex-wrap gap-1">
            {episode.topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs py-0">
                {topic}
              </Badge>
            ))}
          </div>
        </CardContent>

        <CardFooter className="px-4 pb-4 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {episode.generationCount > 0 ? `${episode.generationCount} outputs` : "No content yet"}
            </span>
            {episode.guests.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {episode.guests[0]}
              </span>
            )}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/episode/${episode.id}`}>View</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
