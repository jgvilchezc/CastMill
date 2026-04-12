"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Database, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SyncResult {
  captions: number;
  comments: number;
  profile: number;
  total: number;
}

interface ChatSyncStatusProps {
  hasInstagram: boolean;
}

export function ChatSyncStatus({ hasInstagram }: ChatSyncStatusProps) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/chat/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setResult(data);
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

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Database className="h-4 w-4 text-muted-foreground" />
        Data Sync
      </div>

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

      {result && (
        <div className="flex items-start gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg p-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Synced successfully</p>
            <p className="text-emerald-400/70 mt-0.5">
              {result.captions} posts, {result.comments} comment groups, {result.profile} profile
              {" "}&middot; {result.total} documents indexed
            </p>
          </div>
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
