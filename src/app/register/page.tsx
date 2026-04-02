"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register } from "@/app/actions/auth";

export default function RegisterPage() {
  const [state, action, isPending] = useActionState(register, undefined);

  return (
    <div className="min-h-screen w-full flex selection:bg-primary selection:text-primary-foreground">
      {/* Left Side - Visual/Brand */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 relative flex-col justify-between p-12 overflow-hidden border-r border-border">
        <div className="absolute inset-0 z-0 bg-dot-pattern opacity-30 mix-blend-overlay"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-120 h-120 bg-chart-4/20 rounded-full blur-[128px] z-0 mix-blend-screen"></div>

        <div className="relative z-10 flex items-center gap-2">
          <Zap className="w-8 h-8 text-primary" />
          <span className="font-heading font-bold text-2xl tracking-tighter text-white">Expandcast</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-6 inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm font-mono uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Join the Beta</span>
          </div>
          <h2 className="text-5xl font-heading font-extrabold tracking-tighter text-white mb-6 leading-tight">
            EXPAND YOUR <span className="text-chart-4">REACH.</span>
          </h2>
          <p className="text-zinc-400 text-lg">
            Create an account and turn any video or audio into weeks of social content automatically.
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
            <h1 className="text-4xl font-heading font-bold tracking-tighter mb-2">Get Started</h1>
            <p className="text-muted-foreground">Create your account to start generating content.</p>
          </div>

          {state?.error && (
            <div className="flex items-center gap-3 border-2 border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={action} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">Full Name</label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Jane Doe"
                className="h-12 rounded-none bg-secondary/20 border-border font-mono text-sm"
                required
              />
            </div>

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
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="h-12 rounded-none bg-secondary/20 border-border font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters long.</p>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="h-14 mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg rounded-none group w-full flex justify-between items-center px-6 disabled:opacity-70"
            >
              <span>{isPending ? "Creating account..." : "Create Account"}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          <div className="text-center mt-2">
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-bold">
                Log in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
