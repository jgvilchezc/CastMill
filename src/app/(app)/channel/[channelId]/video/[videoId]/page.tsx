"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { VideoHub } from "@/components/channel/VideoHub"
import { Loader2 } from "lucide-react"

export default function VideoPage() {
  const { channelId, videoId } = useParams<{ channelId: string; videoId: string }>()
  const [video, setVideo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data } = await supabase
        .from("channel_videos")
        .select("*")
        .eq("id", videoId)
        .eq("channel_id", channelId)
        .single()
      setVideo(data)
      setLoading(false)
    }
    load()
  }, [channelId, videoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!video) {
    return <div className="py-16 text-center text-muted-foreground">Video not found.</div>
  }

  return <VideoHub video={video} channelId={channelId} onUpdate={setVideo} />
}
