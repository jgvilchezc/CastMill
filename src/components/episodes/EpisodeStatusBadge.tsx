import { CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Episode } from "@/lib/fixtures/episodes"

interface EpisodeStatusBadgeProps {
  status: Episode["status"]
}

export function EpisodeStatusBadge({ status }: EpisodeStatusBadgeProps) {
  if (status === "ready") {
    return (
      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
        <CheckCircle className="h-3 w-3" />
        Ready
      </Badge>
    )
  }
  if (status === "processing") {
    return (
      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      Failed
    </Badge>
  )
}
