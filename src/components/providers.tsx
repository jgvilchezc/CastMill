"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { UserProvider } from "@/lib/context/user-context"
import { EpisodeProvider } from "@/lib/context/episode-context"

export function Providers({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <UserProvider>
        <EpisodeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </EpisodeProvider>
      </UserProvider>
    </NextThemesProvider>
  )
}
