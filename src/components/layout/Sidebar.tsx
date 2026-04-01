"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Upload, Brain, Settings, Zap, LogOut, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/context/user-context"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "New Episode", icon: Upload, href: "/upload" },
  { label: "Memory", icon: Brain, href: "/memory", disabled: true },
  { label: "Settings", icon: Settings, href: "/settings", disabled: true },
]

const planColors: Record<string, string> = {
  free: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
}

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, upgradePlan } = useUser()

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-border">
        <span className="text-lg font-bold tracking-tight">Castmill</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <div key={item.href}>
              {item.disabled ? (
                <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-50">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  <Badge variant="secondary" className="ml-auto text-xs py-0">Soon</Badge>
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full h-auto px-2 py-2 justify-start">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name ?? user.email ?? ""} />
                    <AvatarFallback>{(user.name ?? user.email ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{user.name ?? user.email}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-xs capitalize px-1.5 py-0.5 rounded font-medium", planColors[user.plan])}>
                        {user.plan}
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        {user.credits}
                      </span>
                    </div>
                  </div>
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48">
              <DropdownMenuItem onClick={() => upgradePlan("pro")}>
                Upgrade to Pro
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}
