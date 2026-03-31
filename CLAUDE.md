# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js)
npm run build    # Build for production
npm run lint     # Run ESLint
npm start        # Start production server
```

To add shadcn/ui components:
```bash
npx shadcn@latest add <component-name>
```

## Architecture

This is a **Next.js 16 App Router** project (React 19, TypeScript, Tailwind CSS 4) for a podcast content generation platform called **Castmill**.

### Path Aliases
`@/*` maps to `./src/*`

### State Management
All app state lives in React Context providers defined in `src/lib/context/` and wired together in `src/components/providers.tsx`:

- **UserContext** (`user-context.tsx`) — user identity, plan tier (free/starter/pro), credits, voice profile. Use `useUser()` hook.
- **EpisodeContext** (`episode-context.tsx`) — podcast episodes, transcripts, AI-generated content (blog, tweet_thread, linkedin, newsletter, youtube_desc, thumbnail), and memory chunks. Use `useEpisodes()` hook.

`src/components/providers.tsx` wraps the app with: `NextThemesProvider → UserProvider → EpisodeProvider → TooltipProvider`.

### Mock Data & APIs
No real backend yet. All data is simulated:
- `src/lib/fixtures/` — static mock data (episodes, transcripts, generations, voice profile, chunks)
- `src/lib/mock/mock-ai.ts` — async mock for AI operations (transcription, voice analysis, content generation)
- `src/lib/mock/mock-stripe.ts` — mock payment/plan upgrade flows

### UI Components
Uses **shadcn/ui** (new-york style, neutral base color, Lucide icons). Pre-installed components are in `src/components/ui/`. Config is in `components.json`.

Class merging utility: `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge).

### Styling
Tailwind CSS 4 via PostCSS. Theme tokens (colors, radius, etc.) are CSS custom properties in `src/app/globals.css`. Dark mode uses the `.dark` class via `next-themes`.
