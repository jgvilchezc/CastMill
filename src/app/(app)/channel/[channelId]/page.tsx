"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ChannelDashboard } from "@/components/channel/ChannelDashboard"
import { Loader2 } from "lucide-react"

export default function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const [channel, setChannel] = useState<Record<string, unknown> | null>(null)
  const [videos, setVideos] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const [{ data: ch }, { data: vids }] = await Promise.all([
        supabase.from("channels").select("*").eq("id", channelId).single(),
        supabase.from("channel_videos").select("*").eq("channel_id", channelId).order("view_count", { ascending: false }),
      ])
      setChannel(ch)
      setVideos(vids ?? [])
      setLoading(false)
    }
    load()
  }, [channelId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!channel) {
    return <div className="py-16 text-center text-muted-foreground">Channel not found.</div>
  }

  return <ChannelDashboard channel={channel} videos={videos} onVideosUpdate={setVideos} />
}
