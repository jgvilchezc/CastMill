"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsShellProps {
  platform: "tiktok" | "instagram";
  platformIcon: React.ReactNode;
  hasAccess: boolean;
  loading: boolean;
  hasAccount: boolean;
  children: React.ReactNode;
}

export function AnalyticsShell({
  platform,
  platformIcon,
  hasAccess,
  loading,
  hasAccount,
  children,
}: AnalyticsShellProps) {
  const platformLabel = platform === "tiktok" ? "TikTok Analytics" : "Instagram Analytics";

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted mx-auto mb-4">
            {platformIcon}
          </div>
          <h2 className="text-lg font-semibold mb-2">{platformLabel}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {platformLabel} requires the <strong>Pro plan</strong>.
          </p>
          <Button asChild>
            <Link href="/pricing">Upgrade to Pro</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAccount) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted mx-auto mb-4">
            {platformIcon}
          </div>
          <h2 className="text-lg font-semibold mb-2">Connect {platform === "tiktok" ? "TikTok" : "Instagram"}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your {platform === "tiktok" ? "TikTok" : "Instagram"} account to see analytics, browse your {platform === "tiktok" ? "videos" : "posts"},
            and get AI-powered content insights.
          </p>
          <Button asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Go to Settings
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <div className="max-w-4xl mx-auto space-y-6">{children}</div>;
}
