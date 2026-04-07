"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  Link2,
  Link2Off,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Zap,
  Rss,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/context/user-context";
import { PLANS } from "@/lib/plans";
import { SettingsAccountsSkeleton } from "@/components/skeletons";

interface ConnectedAccount {
  platform: "tiktok" | "instagram";
  platform_username: string | null;
  expires_at: string | null;
}

const PLATFORM_META = {
  tiktok: {
    name: "TikTok",
    description: "Publish clips directly to your TikTok account",
    authPath: "/api/auth/tiktok",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z" />
      </svg>
    ),
  },
  instagram: {
    name: "Instagram",
    description: "Publish Reels directly to your Instagram account",
    authPath: "/api/auth/instagram",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const plan = user?.plan ?? "free";
  const planConfig = PLANS[plan];

  const [accounts, setAccounts] = useState<Record<string, ConnectedAccount>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<"starter" | "pro" | null>(null);
  const [rssFeedUrl, setRssFeedUrl] = useState("");
  const [rssImporting, setRssImporting] = useState(false);
  const [rssResult, setRssResult] = useState<{ imported: number; skipped: number; feedTitle?: string } | null>(null);
  const [rssError, setRssError] = useState("");
  const billingSuccess = searchParams.get("billing") === "success";

  const justConnected = searchParams.get("connected");
  const connectError = searchParams.get("error");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("connected_accounts")
        .select("platform, platform_username, expires_at");
      if (data) {
        const map: Record<string, ConnectedAccount> = {};
        data.forEach((a: ConnectedAccount) => {
          map[a.platform] = a as ConnectedAccount;
        });
        setAccounts(map);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpgrade(targetPlan: "starter" | "pro") {
    setCheckoutLoading(targetPlan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan, interval: "monthly" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setCheckoutLoading(null);
    }
  }

  async function disconnect(platform: string) {
    setDisconnecting(platform);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("connected_accounts").delete().eq("platform", platform as "tiktok" | "instagram");
    setAccounts((prev) => {
      const next = { ...prev };
      delete next[platform];
      return next;
    });
    setDisconnecting(null);
  }

  function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your connected accounts and preferences.
        </p>
      </div>

      {justConnected && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>
            <span className="capitalize font-medium">{justConnected}</span>{" "}
            connected successfully.
          </p>
        </div>
      )}

      {connectError && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive mb-6 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>Connection failed. Please try again.</p>
        </div>
      )}

      {billingSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p>Payment successful! Your plan has been upgraded.</p>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-4">Billing & Plan</h2>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium capitalize flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Current plan:{" "}
                <span className="text-primary font-bold">{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {planConfig.episodesPerMonth} episodes/month · {planConfig.monthlyPrice === 0 ? "Free" : `$${planConfig.monthlyPrice}/mo`}
              </p>
            </div>
            {plan !== "free" && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/billing/portal", {
                      method: "POST",
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    window.location.href = data.url;
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground cursor-pointer"
              >
                Manage subscription
              </button>
            )}
          </div>

          {plan === "free" && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => handleUpgrade("starter")}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === "starter" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Upgrade to Starter — $19/mo"
                )}
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleUpgrade("pro")}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === "pro" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Upgrade to Pro — $49/mo
                  </span>
                )}
              </Button>
            </div>
          )}

          {plan === "starter" && (
            <div className="pt-1 border-t border-border">
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => handleUpgrade("pro")}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === "pro" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    Upgrade to Pro — $49/mo
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold mb-4">RSS Feed Import</h2>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Import episodes from your podcast RSS feed (Spotify, Apple Podcasts, Buzzsprout, etc.).
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Rss className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                value={rssFeedUrl}
                onChange={(e) => { setRssFeedUrl(e.target.value); setRssError(""); setRssResult(null); }}
                placeholder="https://feeds.example.com/your-podcast"
                className="w-full pl-9 pr-3 py-2 text-sm border border-border bg-background rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!rssFeedUrl.trim()) return;
                setRssImporting(true);
                setRssError("");
                setRssResult(null);
                try {
                  const res = await fetch("/api/rss/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ feedUrl: rssFeedUrl.trim(), maxEpisodes: 10 }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? "Import failed");
                  setRssResult({ imported: data.imported, skipped: data.skipped, feedTitle: data.feedTitle });
                } catch (err) {
                  setRssError(err instanceof Error ? err.message : "Import failed");
                } finally {
                  setRssImporting(false);
                }
              }}
              disabled={rssImporting || !rssFeedUrl.trim()}
            >
              {rssImporting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Importing…</>
              ) : (
                "Import"
              )}
            </Button>
          </div>
          {rssError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {rssError}
            </div>
          )}
          {rssResult && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {rssResult.feedTitle && <span className="font-medium">{rssResult.feedTitle}:</span>}
              {rssResult.imported} episode{rssResult.imported !== 1 ? "s" : ""} imported
              {rssResult.skipped > 0 && `, ${rssResult.skipped} skipped (already exist)`}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Episodes are imported as metadata. Upload audio separately or use &ldquo;Paste transcript&rdquo; to add transcripts.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold mb-4">Connected Accounts</h2>

        {!planConfig.publishDirect && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center mb-4">
            <p className="text-sm text-muted-foreground mb-3">
              Direct publishing to TikTok and Instagram requires the{" "}
              <strong>Pro plan</strong>.
            </p>
            <Button asChild size="sm" variant="outline">
              <a href="/pricing">Upgrade to Pro</a>
            </Button>
          </div>
        )}

        {loading ? (
          <SettingsAccountsSkeleton />
        ) : (
        <div className="space-y-3">
          {(
            Object.keys(PLATFORM_META) as Array<keyof typeof PLATFORM_META>
          ).map((platform) => {
            const meta = PLATFORM_META[platform];
            const account = accounts[platform];
            const expired = account ? isExpired(account.expires_at) : false;

            return (
              <div
                key={platform}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted text-foreground shrink-0">
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{meta.name}</p>
                    {account && !expired && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-emerald-500/15 text-emerald-400 border-0"
                      >
                        Connected
                      </Badge>
                    )}
                    {account && expired && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-amber-500/15 text-amber-400 border-0"
                      >
                        Token expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {account
                      ? `@${account.platform_username ?? "connected"}`
                      : meta.description}
                  </p>
                </div>

                {account && !expired ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => disconnect(platform)}
                    disabled={disconnecting === platform}
                  >
                    {disconnecting === platform ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2Off className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">Disconnect</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={!planConfig.publishDirect}
                    onClick={() => {
                      window.location.href = meta.authPath;
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    {account && expired ? "Reconnect" : "Connect"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
}
