"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Zap, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/app/actions/auth";
import { signInWithOAuth } from "@/app/actions/oauth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}


export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const [state, action, isPending] = useActionState(login, undefined);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error") === "oauth_failed";

  async function handleOAuth(provider: "google" | "twitter") {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch {
      setOauthLoading(null);
    }
  }

  return (
    <div className="min-h-screen w-full flex selection:bg-primary selection:text-primary-foreground">
      {/* Left Side - Visual/Brand */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 relative flex-col justify-between p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 z-0 bg-dot-pattern opacity-30 mix-blend-overlay"></div>
        <div className="absolute -top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] z-0 mix-blend-screen"></div>

        <div className="relative z-10 flex items-center gap-2">
          <Zap className="w-8 h-8 text-primary" />
          <span className="font-heading font-bold text-2xl tracking-tighter text-white">Expandcast</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-heading font-extrabold tracking-tighter text-white mb-6 leading-tight">
            WELCOME BACK TO THE <span className="text-primary">STUDIO.</span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Pick up where you left off. Expand your content into a multi-channel distribution engine.
          </p>
        </div>

        <div className="relative z-10 text-sm text-zinc-500 font-mono">
          © {new Date().getFullYear()} EXPANDCAST INC.
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
        <div className="absolute top-8 left-8 flex lg:hidden items-center gap-2">
          <Zap className="w-8 h-8 text-primary" />
          <span className="font-heading font-bold text-2xl tracking-tighter">Expandcast</span>
        </div>

        <div className="w-full max-w-md flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-heading font-bold tracking-tighter mb-2">Log In</h1>
            <p className="text-muted-foreground">Enter your credentials to access your dashboard.</p>
          </div>

          {(state?.error || oauthError) && (
            <div className="flex items-center gap-3 border-2 border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{state?.error ?? "OAuth sign-in failed. Try again."}</span>
            </div>
          )}

          {/* OAuth buttons */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-none border-border font-medium gap-3"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
            >
              {oauthLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-mono uppercase">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form action={action} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">Email Address</label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="creator@podcast.com"
                className="h-12 rounded-none bg-secondary/20 border-border font-mono text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link href="#" className="text-xs text-primary hover:underline font-mono">Forgot password?</Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="h-12 rounded-none bg-secondary/20 border-border font-mono text-sm"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="h-14 mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg rounded-none group w-full flex justify-between items-center px-6 disabled:opacity-70"
            >
              <span>{isPending ? "Signing in..." : "Sign In"}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <div className="text-center mt-4">
            <p className="text-muted-foreground text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-bold">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
