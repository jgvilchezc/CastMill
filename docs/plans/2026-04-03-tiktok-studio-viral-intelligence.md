# TikTok Studio & Viral Intelligence — Implementation Plan
**Date:** 2026-04-03

## Goal
Add a Clips tab to every episode that lets podcasters turn any episode into short-form content for TikTok and Instagram Reels — with AI moment detection, hook generation, a local audio clip cutter, and a Trend Digest to inspire what to post.

---

## Features

### 1. Clip Studio (episode detail → "Clips" tab)
- **Moment Detection**: AI scans the transcript and surfaces the 5–8 most viral-worthy quotes (ranked by hooks, controversy, counter-intuition, or actionability). Cached in `episodes.viral_moments`.
- **Hook Lab**: For each detected moment, the user can generate 3 hook variants (curiosity, controversy, actionable). Results shown in a modal.
- **Clip Generator**: User uploads the episode audio file. FFmpeg.wasm trims + creates a waveform audiogram (1080×1920, 9:16) with the hook text overlay. Processed entirely in-browser.
- **Caption Export**: Download `.srt` caption file for the clip.

### 2. Trend Digest (banner inside Clips tab — Pro)
- A weekly snapshot of relevant TikTok Creative Center trends filtered to the episode's topics/niche.
- Cached in a `trend_digests` table (7-day TTL) keyed by `niche` to minimise API calls.
- Falls back to a curated seed dataset when `TIKTOK_CC_API_KEY` is not set.

### 3. Connected Accounts (Settings page)
- Users connect TikTok and/or Instagram via OAuth.
- Tokens stored in `connected_accounts` table (encrypted at application layer via server-side route).
- Direct-publish button on any clip sends the file to TikTok Content Posting API v2 or Meta Graph API.

---

## Plan Gating

| Feature                    | Free | Starter | Pro |
|----------------------------|------|---------|-----|
| Moment Detection           | ✗    | ✓ (3/ep)| ✓ (8/ep)|
| Hook Lab                   | ✗    | ✓       | ✓   |
| Clip Generator (download)  | ✗    | ✓       | ✓   |
| Trend Digest               | ✗    | ✗       | ✓   |
| Direct Publish (TT + IG)   | ✗    | ✗       | ✓   |

---

## Schema Changes
- `episodes`: add `viral_moments jsonb`
- New table: `trend_digests(id, niche, data jsonb, expires_at timestamptz)`
- New table: `connected_accounts(id, user_id, platform, access_token, refresh_token, expires_at, platform_user_id, platform_username)`

## New API Routes
| Route | Description |
|---|---|
| `POST /api/ai/detect-moments` | Detect viral moments from a transcript |
| `POST /api/ai/generate-hooks` | Generate 3 hook variants for a moment |
| `GET /api/trends/digest?niche=X` | Fetch/serve cached trend digest |
| `POST /api/publish/tiktok` | Upload + publish clip to TikTok |
| `POST /api/publish/instagram` | Upload + publish clip to Instagram |
| `GET /api/auth/tiktok` | Initiate TikTok OAuth |
| `GET /api/auth/tiktok/callback` | TikTok OAuth callback |
| `GET /api/auth/instagram` | Initiate Instagram OAuth |
| `GET /api/auth/instagram/callback` | Instagram OAuth callback |

## New Components
- `src/components/clips/ClipsHub.tsx` — main tab container
- `src/components/clips/MomentCard.tsx` — single detected moment row
- `src/components/clips/HookLab.tsx` — hook variants modal/panel
- `src/components/clips/TrendBanner.tsx` — trend digest banner (Pro)
- `src/components/clips/EpisodeClipGenerator.tsx` — FFmpeg.wasm audio clip modal
- `src/app/(app)/settings/page.tsx` — settings page with ConnectedAccounts

---

## Execution Order
1. Schema SQL + types.ts
2. plans.ts additions
3. API: detect-moments + generate-hooks
4. API: trends/digest
5. API: publish/tiktok + publish/instagram
6. API: OAuth routes (tiktok + instagram)
7. Components: ClipsHub + MomentCard + HookLab + TrendBanner + EpisodeClipGenerator
8. Episode page: add Clips tab
9. Settings page + Sidebar link
