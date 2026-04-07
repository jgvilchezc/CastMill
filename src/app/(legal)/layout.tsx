"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const LEGAL_NAV = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="w-full border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-heading font-bold text-xl tracking-tighter">
              Expandcast
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-primary transition-colors uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-0 lg:gap-12 px-6 py-10 lg:py-16">
        <nav className="lg:w-64 shrink-0 mb-8 lg:mb-0">
          <div className="lg:sticky lg:top-24">
            <h2 className="font-mono font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Legal
            </h2>
            <ul className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {LEGAL_NAV.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "block whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors border-l-2 lg:border-l-4",
                      pathname === href
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <main className="flex-1 min-w-0">
          <article className="prose prose-invert prose-zinc max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-tight prose-h1:text-4xl prose-h1:lg:text-5xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-border prose-h2:pb-3 prose-h2:mt-12 prose-h2:mb-6 prose-h3:text-lg prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline prose-a:hover:underline">
            {children}
          </article>
        </main>
      </div>

      <footer className="w-full border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-muted-foreground font-mono text-xs uppercase">
            &copy; {new Date().getFullYear()} Expandcast. All rights reserved.
          </div>
          <div className="flex gap-6 text-muted-foreground font-mono text-xs uppercase">
            {LEGAL_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "hover:text-primary transition-colors",
                  pathname === href && "text-primary"
                )}
              >
                {label.split(" ")[0]}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
