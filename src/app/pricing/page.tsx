"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Minus, Zap, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  { label: "Episodes per month", free: "2", starter: "8", pro: "25" },
  { label: "Blog post generation", free: true, starter: true, pro: true },
  { label: "Twitter / X thread", free: true, starter: true, pro: true },
  { label: "LinkedIn post", free: true, starter: true, pro: true },
  { label: "Email newsletter", free: false, starter: true, pro: true },
  { label: "YouTube description", free: false, starter: true, pro: true },
  { label: "AI thumbnail", free: false, starter: true, pro: true },
  { label: "Voice Profile Engine", free: false, starter: true, pro: true },
  { label: "YouTube channels", free: "1", starter: "2", pro: "5" },
  { label: "Channel Optimizer (AI)", free: false, starter: false, pro: true },
  { label: "Viral moment detection", free: false, starter: false, pro: true },
  { label: "AI Inspiration Engine", free: false, starter: false, pro: true },
  { label: "Transcription (60+ langs)", free: true, starter: true, pro: true },
  { label: "Support", free: "Community", starter: "Email", pro: "Priority" },
] as const;

type FeatureValue = boolean | string;

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="h-4 w-4 text-primary mx-auto" />;
  if (value === false)
    return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm font-medium">{value}</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState<"starter" | "pro" | null>(null);
  const router = useRouter();

  const starterPrice = annual ? 15 : 19;
  const proPrice = annual ? 39 : 49;

  async function handleCheckout(plan: "starter" | "pro") {
    setLoading(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: annual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?redirect=/pricing`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
        >
          <Zap className="h-5 w-5 text-primary" />
          Expandcast
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started free</Link>
          </Button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter font-heading uppercase mb-4">
            Simple pricing.
            <br />
            <span className="text-primary">No credit confusion.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-mono">
            Per episode — not per minute, not per hour, not per credit. Upload
            an episode, get all your content.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className={cn(
                "text-sm font-medium",
                !annual && "text-foreground",
                annual && "text-muted-foreground",
              )}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual((a) => !a)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors",
                annual ? "bg-primary border-primary" : "bg-muted border-border",
              )}
              aria-label="Toggle annual billing"
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                  annual ? "translate-x-5" : "translate-x-1",
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium",
                annual && "text-foreground",
                !annual && "text-muted-foreground",
              )}
            >
              Annual
            </span>
            {annual && (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                Save ~20%
              </span>
            )}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Free */}
          <div className="border-2 border-border bg-card p-6 flex flex-col gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono mb-2">
                Free
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold font-heading">$0</span>
                <span className="text-muted-foreground mb-1">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                2 episodes/month. Forever free.
              </p>
            </div>

            <ul className="space-y-2.5 text-sm flex-1">
              {[
                "2 episodes / month",
                "Blog post",
                "Twitter thread",
                "LinkedIn post",
                "Transcription (60+ langs)",
                "1 channel import",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full rounded-none" asChild>
              <Link href="/register">Start free</Link>
            </Button>
          </div>

          {/* Starter */}
          <div className="border-2 border-border bg-card p-6 flex flex-col gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono mb-2">
                Starter
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold font-heading">
                  ${starterPrice}
                </span>
                <span className="text-muted-foreground mb-1">/mo</span>
              </div>
              {annual && (
                <p className="text-xs text-muted-foreground mt-1">
                  Billed $180/year
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                8 episodes/month. All 6 content formats.
              </p>
            </div>

            <ul className="space-y-2.5 text-sm flex-1">
              {[
                "8 episodes / month",
                "All 6 content formats",
                "Email newsletter",
                "YouTube description",
                "AI thumbnail",
                "Voice Profile Engine",
                "2 channel imports",
                "Email support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full rounded-none"
              onClick={() => handleCheckout("starter")}
              disabled={loading !== null}
            >
              {loading === "starter" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Get Starter"
              )}
            </Button>
          </div>

          {/* Pro — highlighted */}
          <div className="border-2 border-primary bg-card p-6 flex flex-col gap-6 shadow-[6px_6px_0_0_var(--color-primary)] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Recommended
              </span>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary font-mono mb-2">
                Pro
              </p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold font-heading">
                  ${proPrice}
                </span>
                <span className="text-muted-foreground mb-1">/mo</span>
              </div>
              {annual && (
                <p className="text-xs text-muted-foreground mt-1">
                  Billed $468/year
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                25 episodes/month. Full platform access.
              </p>
            </div>

            <ul className="space-y-2.5 text-sm flex-1">
              {[
                "25 episodes / month",
                "All 6 content formats",
                "Voice Profile Engine",
                "YouTube Channel Optimizer",
                "Viral moment detection",
                "AI Inspiration Engine",
                "5 channel imports",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full rounded-none shadow-none"
              onClick={() => handleCheckout("pro")}
              disabled={loading !== null}
            >
              {loading === "pro" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Go Pro
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Feature comparison table */}
        <div>
          <h2 className="text-xl font-bold font-heading uppercase tracking-tight mb-6 text-center">
            Compare all features
          </h2>
          <div className="border-2 border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 border-b-2 border-border bg-muted/30">
              <div className="p-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Feature
              </div>
              <div className="p-4 text-sm font-bold text-center uppercase tracking-wider">
                Free
              </div>
              <div className="p-4 text-sm font-bold text-center uppercase tracking-wider">
                Starter
              </div>
              <div className="p-4 text-sm font-bold text-center uppercase tracking-wider text-primary">
                Pro
              </div>
            </div>

            {FEATURES.map((row, i) => (
              <div
                key={row.label}
                className={cn(
                  "grid grid-cols-4 border-b border-border last:border-b-0",
                  i % 2 === 0 ? "bg-background" : "bg-muted/20",
                )}
              >
                <div className="p-4 text-sm font-medium">{row.label}</div>
                <div className="p-4 text-center">
                  <FeatureCell value={row.free as FeatureValue} />
                </div>
                <div className="p-4 text-center">
                  <FeatureCell value={row.starter as FeatureValue} />
                </div>
                <div className="p-4 text-center">
                  <FeatureCell value={row.pro as FeatureValue} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold font-heading uppercase tracking-tight mb-8 text-center">
            FAQ
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "What counts as an episode?",
                a: "Any audio or video file you upload — regardless of length. A 20-minute episode and a 2-hour episode both count as 1 episode.",
              },
              {
                q: "What happens if I go over my limit?",
                a: "You can upgrade at any time, or wait until your next billing cycle when credits reset. We never charge you automatically for overages.",
              },
              {
                q: "Can I switch plans?",
                a: "Yes, anytime. Upgrades take effect immediately. Downgrades apply at the next billing cycle.",
              },
              {
                q: "Is there a refund policy?",
                a: "14-day money-back guarantee on all paid plans. No questions asked.",
              },
              {
                q: "Do annual plans renew automatically?",
                a: "Yes. You'll receive an email 14 days before renewal. Cancel anytime before that at no charge.",
              },
            ].map(({ q, a }) => (
              <div
                key={q}
                className="border-b border-border pb-6 last:border-b-0"
              >
                <p className="font-bold mb-2">{q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 border-2 border-primary bg-primary/5 p-10 text-center">
          <h2 className="text-2xl font-extrabold font-heading uppercase tracking-tighter mb-3">
            Start free. Upgrade when ready.
          </h2>
          <p className="text-muted-foreground mb-6 font-mono">
            2 episodes/month. 3 content formats. No credit card required.
          </p>
          <Button
            size="lg"
            className="rounded-none h-14 px-10 text-base font-bold"
            asChild
          >
            <Link href="/register" className="flex items-center gap-2">
              Create Free Account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
