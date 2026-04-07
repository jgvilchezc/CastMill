import { Skeleton } from "@/components/ui/skeleton"

export function AppLayoutSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col border-r border-border p-4 gap-6">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        </div>
      </div>
      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="h-14 border-b border-border px-6 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
        <main className="flex-1 overflow-y-auto p-6" />
      </div>
    </div>
  )
}

export function EpisodeCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-sm" />
        <Skeleton className="h-5 w-18 rounded-sm" />
        <Skeleton className="h-5 w-12 rounded-sm" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full max-w-md mb-6 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <EpisodeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export function EpisodeDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto">

      {/* ← Dashboard nav */}
      <div className="flex items-center gap-1.5 mb-8">
        <Skeleton className="h-3.5 w-3.5" />
        <Skeleton className="h-3.5 w-16" />
      </div>

      {/* Episode header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title */}
            <Skeleton className="h-7 w-4/5" />
            {/* Date · duration · generated */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-1" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-1" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            {/* Topic & guest tags */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Skeleton className="h-5 w-16 rounded-sm" />
              <Skeleton className="h-5 w-20 rounded-sm" />
              <Skeleton className="h-5 w-14 rounded-sm" />
            </div>
          </div>
          {/* Action buttons (delete + generate) */}
          <div className="flex items-center gap-1 shrink-0">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border mb-8">
        <div className="flex gap-6 pb-3">
          <Skeleton className="h-4 w-[72px]" />
          <Skeleton className="h-4 w-[52px]" />
          <Skeleton className="h-4 w-[42px]" />
        </div>
      </div>

      {/* Default tab: transcript */}
      <TranscriptSkeleton />
    </div>
  )
}

export function TranscriptSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search bar + Copy button */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-[34px] flex-1 rounded" />
        <Skeleton className="h-[30px] w-[62px] rounded" />
      </div>

      {/* Transcript segments */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {/* Speaker label + timestamp column */}
          <div className="flex flex-col items-end gap-1 pt-0.5 min-w-[80px]">
            <Skeleton className="h-[22px] w-[60px] rounded-none" />
            <Skeleton className="h-3.5 w-[38px]" />
          </div>
          {/* Text content */}
          <div className="flex-1 space-y-1.5 pt-1">
            <Skeleton className="h-[18px] w-full" />
            <Skeleton className="h-[18px]" style={{ width: `${90 - (i % 3) * 15}%` }} />
            {i % 3 === 0 && <Skeleton className="h-[18px] w-3/5" />}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChannelListSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border border-border">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-7 w-14 rounded-lg" />
          <Skeleton className="h-4 w-4" />
        </div>
      ))}
    </div>
  )
}

export function ChannelDashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-56" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-24 h-14 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function VideoDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Skeleton className="h-4 w-24 mb-4" />
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="border-b border-border pb-3 flex gap-6">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

export function SettingsAccountsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function AdminUserDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-5 space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
