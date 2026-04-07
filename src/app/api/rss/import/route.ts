import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { XMLParser } from 'fast-xml-parser';
import { isValidPublicUrl, sanitizeString } from '@/lib/security/validate';

export const maxDuration = 120;

interface FeedItem {
  title?: string;
  pubDate?: string;
  description?: string;
  'itunes:duration'?: string | number;
  enclosure?: {
    '@_url'?: string;
    '@_type'?: string;
    '@_length'?: string;
  };
  guid?: string | { '#text': string };
}

function parseItunesDuration(raw: string | number | undefined): number {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  const parts = raw.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(raw, 10) || 0;
}

function getGuid(item: FeedItem): string {
  if (!item.guid) return item.title ?? "";
  if (typeof item.guid === "string") return item.guid;
  return item.guid["#text"] ?? item.title ?? "";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { feedUrl, maxEpisodes = 5 } = await req.json() as {
      feedUrl: string;
      maxEpisodes?: number;
    };

    if (!feedUrl || typeof feedUrl !== "string") {
      return NextResponse.json({ error: "Missing feedUrl" }, { status: 400 });
    }

    if (!isValidPublicUrl(feedUrl)) {
      return NextResponse.json({ error: "Invalid or disallowed feed URL" }, { status: 400 });
    }

    const feedRes = await fetch(sanitizeString(feedUrl, 2048), {
      headers: { 'User-Agent': 'Expandcast/1.0' },
    });

    if (!feedRes.ok) {
      return NextResponse.json({ error: `Failed to fetch feed (${feedRes.status})` }, { status: 400 });
    }

    const xml = await feedRes.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    const parsed = parser.parse(xml);

    const channel = parsed?.rss?.channel;
    if (!channel) {
      return NextResponse.json({ error: "Invalid RSS feed — no channel found" }, { status: 400 });
    }

    const rawItems: FeedItem[] = Array.isArray(channel.item)
      ? channel.item
      : channel.item
        ? [channel.item]
        : [];

    const items = rawItems.slice(0, Math.min(maxEpisodes, 20));

    const { data: existingEpisodes } = await supabase
      .from("episodes")
      .select("title")
      .eq("user_id", user.id);

    const existingTitles = new Set((existingEpisodes ?? []).map(e => e.title));

    const imported: { title: string; id: string }[] = [];
    const skipped: string[] = [];

    for (const item of items) {
      const title = (item.title ?? "Untitled Episode").trim();

      if (existingTitles.has(title)) {
        skipped.push(title);
        continue;
      }

      const duration = parseItunesDuration(item['itunes:duration']);
      const audioUrl = item.enclosure?.['@_url'] ?? null;
      const description = typeof item.description === "string"
        ? item.description.replace(/<[^>]*>/g, "").slice(0, 500)
        : "";

      const { data: episode, error } = await supabase
        .from("episodes")
        .insert({
          user_id: user.id,
          title,
          description,
          duration,
          topics: [],
          guests: [],
          status: "ready",
          thumbnail_url: null,
        })
        .select()
        .single();

      if (error || !episode) {
        skipped.push(title);
        continue;
      }

      if (description) {
        await supabase
          .from("transcripts")
          .upsert(
            { episode_id: episode.id, user_id: user.id, text: description, segments: [] },
            { onConflict: "episode_id" }
          );
      }

      imported.push({ title, id: episode.id });
      existingTitles.add(title);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rssTable = (supabase as any).from("rss_feeds");

    const { data: existingFeed } = await rssTable
      .select("id")
      .eq("user_id", user.id)
      .eq("feed_url", feedUrl)
      .maybeSingle();

    if (!existingFeed) {
      await rssTable
        .insert({
          user_id: user.id,
          feed_url: feedUrl,
          last_synced_at: new Date().toISOString(),
          episode_guids: items.map(getGuid),
        });
    } else {
      await rssTable
        .update({
          last_synced_at: new Date().toISOString(),
          episode_guids: items.map(getGuid),
        })
        .eq("id", existingFeed.id);
    }

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length,
      episodes: imported,
      feedTitle: channel.title ?? null,
    });

  } catch (error: unknown) {
    console.error("RSS Import Error:", error);
    return NextResponse.json({ error: "Failed to import RSS feed" }, { status: 500 });
  }
}
