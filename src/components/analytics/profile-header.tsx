"use client";

import Link from "next/link";
import { RefreshCw, Settings, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProfileHeaderProps {
  platform: "tiktok" | "instagram";
  username: string | null;
  avatarUrl?: string;
  isVerified?: boolean;
  bio?: string;
  expired: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  stats: Array<{ label: string; value: string }>;
  platformIcon: React.ReactNode;
}

export function ProfileHeader({
  platform,
  username,
  avatarUrl,
  isVerified,
  bio,
  expired,
  refreshing,
  onRefresh,
  stats,
  platformIcon,
}: ProfileHeaderProps) {
  return (
    <div className="space-y-0">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username ?? platform}
                className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-border"
              />
            ) : (
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-muted text-foreground shrink-0">
                {platformIcon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold">@{username ?? "connected"}</h1>
                {isVerified && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/15 text-blue-400 border-0">
                    Verified
                  </Badge>
                )}
                {expired ? (
                  <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-400 border-0">
                    Token expired
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-emerald-500/15 text-emerald-400 border-0">
                    Connected
                  </Badge>
                )}
              </div>
              {bio && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{bio}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {stats.map((s) => (
                  <span key={s.label}>
                    <strong className="text-foreground">{s.value}</strong> {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onRefresh}
                  disabled={refreshing || expired}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh stats from {platform === "tiktok" ? "TikTok" : "Instagram"}</TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" asChild>
              <Link href="/settings">
                <Settings className="h-3 w-3 mr-1" />
                Manage
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {expired && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mt-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>
            Your {platform === "tiktok" ? "TikTok" : "Instagram"} token has expired.{" "}
            <Link href="/settings" className="underline font-medium">
              Reconnect in Settings
            </Link>{" "}
            to refresh your data.
          </p>
        </div>
      )}
    </div>
  );
}
