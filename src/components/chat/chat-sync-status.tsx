"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Database,
  Instagram,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyncStatus {
  synced: boolean;
  captions?: number;
  comments?: number;
  profile?: number;
  total?: number;
  lastSyncedAt?: string;
}

interface SyncResult {
  captions: number;
  comments: number;
  profile: number;
  total: number;
  failed: number;
  warning?: string;
}

interface ChatSyncStatusProps {
  hasInstagram: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ChatSyncStatus({ hasInstagram }: ChatSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (hasFetched) return;
    try {
      const res = await fetch("/api/chat/sync");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch {
      setSyncStatus(null);
    } finally {
      setLoadingStatus(false);
      setHasFetched(true);
    }
  }, [hasFetched]);

  useEffect(() => {
    if (hasInstagram) {
      fetchStatus();
    } else {
      setLoadingStatus(false);
    }
  }, [hasInstagram, fetchStatus]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setLastWarning(null);

    try {
      const res = await fetch("/api/chat/sync", { method: "POST" });
      const data: SyncResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      if (data.warning) {
        setLastWarning(data.warning);
      }

      setSyncStatus({
        synced: data.total > 0,
        captions: data.captions,
        comments: data.comments,
        profile: data.profile,
        total: data.total,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (!hasInstagram) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <Instagram className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          Connect your Instagram account first to sync data for AI chat.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href="/settings">Go to Settings</a>
        </Button>
      </div>
    );
  }

  if (loadingStatus) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Checking sync status...</span>
        </div>
      </div>
    );
  }

  const isSynced = syncStatus?.synced && (syncStatus.total ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Database className="h-4 w-4 text-muted-foreground" />
        Data Sync
      </div>

      {isSynced ? (
        <>
          <div className="flex items-start gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg p-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium">Data synced</p>
              <p className="text-emerald-400/70">
                {syncStatus.captions ?? 0} posts, {syncStatus.comments ?? 0} comment groups, {syncStatus.profile ?? 0} profile
                {" "}&middot; {syncStatus.total} docs indexed
              </p>
              {syncStatus.lastSyncedAt && (
                <p className="flex items-center gap-1 text-emerald-400/50">
                  <Clock className="h-2.5 w-2.5" />
                  Last synced {timeAgo(syncStatus.lastSyncedAt)}
                </p>
              )}
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleSync}
            disabled={syncing}
            className="w-full text-xs h-8"
          >
            <RefreshCw
              className={cn("h-3 w-3 mr-1.5", syncing && "animate-spin")}
            />
            {syncing ? "Updating data..." : "Update data"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Sync your Instagram posts, comments, and profile data to enable AI-powered insights.
          </p>

          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="w-full"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1.5", syncing && "animate-spin")}
            />
            {syncing ? "Syncing data..." : "Sync Instagram Data"}
          </Button>
        </>
      )}

      {lastWarning && (
        <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>{lastWarning}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
