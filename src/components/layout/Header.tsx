"use client"

import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./ThemeToggle"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/upload": "New Episode",
  "/tiktok": "TikTok Analytics",
  "/instagram": "Instagram Analytics",
  "/chat": "AI Chat",
}

interface HeaderProps {
  onMenuOpen: () => void
}

export function Header({ onMenuOpen }: HeaderProps) {
  const pathname = usePathname()

  const title =
    pageTitles[pathname] ??
    (pathname.startsWith("/episode/") ? "Episode Detail" : "Expandcast")

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuOpen}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  )
}
