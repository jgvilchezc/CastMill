import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import type { ChannelsRow, ChannelVideosRow } from "@/lib/neon/types";
import { normalizeRow, normalizeRows } from "@/lib/neon/rows";
import { getSql } from "@/lib/neon/db";

const YT_API = "https://www.googleapis.com/youtube/v3";

function extractChannelIdentifier(url: string): { type: "handle" | "id" | "username"; value: string } | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = u.pathname;

    const handleMatch = path.match(/^\/@(.+)/);
    if (handleMatch) return { type: "handle", value: handleMatch[1] };

    const channelMatch = path.match(/^\/channel\/([^/]+)/);
    if (channelMatch) return { type: "id", value: channelMatch[1] };

    const cMatch = path.match(/^\/c\/([^/]+)/);
    if (cMatch) return { type: "username", value: cMatch[1] };

    const userMatch = path.match(/^\/user\/([^/]+)/);
    if (userMatch) return { type: "username", value: userMatch[1] };

    return null;
  } catch {
    return null;
  }
}

async function fetchChannelByHandle(handle: string, apiKey: string) {
  const res = await fetch(
    `${YT_API}/channels?forHandle=${encodeURIComponent(handle)}&part=snippet,statistics&key=${apiKey}`
  );
  return res.json();
}

async function fetchChannelById(id: string, apiKey: string) {
  const res = await fetch(
    `${YT_API}/channels?id=${encodeURIComponent(id)}&part=snippet,statistics&key=${apiKey}`
  );
  return res.json();
}

async function fetchChannelByUsername(username: string, apiKey: string) {
  const res = await fetch(
    `${YT_API}/channels?forUsername=${encodeURIComponent(username)}&part=snippet,statistics&key=${apiKey}`
  );
  return res.json();
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });

  const { channelUrl } = await req.json();
  if (!channelUrl) return NextResponse.json({ error: "channelUrl is required" }, { status: 400 });

  const identifier = extractChannelIdentifier(channelUrl);
  if (!identifier) return NextResponse.json({ error: "Invalid YouTube channel URL" }, { status: 400 });

  let channelData: { items?: unknown[] };
  if (identifier.type === "handle") channelData = await fetchChannelByHandle(identifier.value, apiKey);
  else if (identifier.type === "id") channelData = await fetchChannelById(identifier.value, apiKey);
  else channelData = await fetchChannelByUsername(identifier.value, apiKey);

  if (!channelData.items?.length) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const ch = channelData.items[0] as {
    id: string;
    snippet: { title: string; customUrl?: string; description?: string; thumbnails: { default?: { url: string }; medium?: { url: string } } };
    statistics: { subscriberCount?: string; videoCount?: string; viewCount?: string };
  };

  const channelId = ch.id;
  const snippet = ch.snippet;
  const stats = ch.statistics;

  // Fetch last 20 most-viewed videos
  const searchRes = await fetch(
    `${YT_API}/search?channelId=${channelId}&type=video&part=snippet&maxResults=20&order=viewCount&key=${apiKey}`
  );
  const searchData = await searchRes.json();
  const videoIds: string[] = (searchData.items ?? []).map((v: { id: { videoId: string } }) => v.id.videoId).filter(Boolean);

  let videos: unknown[] = [];
  if (videoIds.length > 0) {
    const videosRes = await fetch(
      `${YT_API}/videos?id=${videoIds.join(",")}&part=snippet,statistics,contentDetails&key=${apiKey}`
    );
    const videosData = await videosRes.json();
    videos = (videosData.items ?? []).map((v: {
      id: string;
      snippet: { title: string; description?: string; thumbnails: { medium?: { url: string }; high?: { url: string } }; publishedAt: string };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
      contentDetails: { duration: string };
    }) => ({
      youtube_video_id: v.id,
      title: v.snippet.title,
      description: v.snippet.description ?? null,
      thumbnail_url: v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.medium?.url ?? null,
      view_count: parseInt(v.statistics.viewCount ?? "0"),
      like_count: parseInt(v.statistics.likeCount ?? "0"),
      comment_count: parseInt(v.statistics.commentCount ?? "0"),
      duration_seconds: parseDuration(v.contentDetails.duration),
      published_at: v.snippet.publishedAt,
    }));
  }

  // Upsert channel in DB
  let savedChannel: ChannelsRow;
  try {
    const rows = (await getSql()`
      insert into channels
        (user_id, youtube_channel_id, title, handle, description, thumbnail_url,
         subscriber_count, video_count, view_count)
      values (
        ${user.id}, ${channelId}, ${snippet.title}, ${snippet.customUrl ?? null},
        ${snippet.description ?? null},
        ${snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? null},
        ${parseInt(stats.subscriberCount ?? "0")},
        ${parseInt(stats.videoCount ?? "0")},
        ${parseInt(stats.viewCount ?? "0")}
      )
      on conflict (user_id, youtube_channel_id) do update set
        title            = excluded.title,
        handle           = excluded.handle,
        description      = excluded.description,
        thumbnail_url    = excluded.thumbnail_url,
        subscriber_count = excluded.subscriber_count,
        video_count      = excluded.video_count,
        view_count       = excluded.view_count
      returning
        id, user_id, created_at, youtube_channel_id, title, handle, description,
        thumbnail_url,
        subscriber_count::float8 as subscriber_count,
        video_count,
        view_count::float8 as view_count,
        access_type, analysis, analyzed_at, inspiration
    `) as Record<string, unknown>[];
    savedChannel = normalizeRow<ChannelsRow>(rows[0]);
  } catch (channelErr) {
    const message = channelErr instanceof Error ? channelErr.message : "Channel upsert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Upsert videos
  if (videos.length > 0 && savedChannel) {
    type VideoInsert = {
      channel_id: string; user_id: string; youtube_video_id: string; title: string;
      description: string | null; thumbnail_url: string | null; view_count: number;
      like_count: number; comment_count: number; duration_seconds: number; published_at: string;
    };
    const videoInserts: VideoInsert[] = (videos as VideoInsert[]).map((v) => ({
      ...v, channel_id: savedChannel.id, user_id: user.id,
    }));

    // One statement instead of N round trips: the rows travel as a single JSON
    // parameter and jsonb_to_recordset expands them server-side.
    await getSql()`
      insert into channel_videos
        (channel_id, user_id, youtube_video_id, title, description, thumbnail_url,
         view_count, like_count, comment_count, duration_seconds, published_at)
      select
        channel_id, user_id, youtube_video_id, title, description, thumbnail_url,
        view_count, like_count, comment_count, duration_seconds, published_at
      from jsonb_to_recordset(${JSON.stringify(videoInserts)}::jsonb) as x(
        channel_id uuid, user_id uuid, youtube_video_id text, title text,
        description text, thumbnail_url text, view_count bigint, like_count bigint,
        comment_count bigint, duration_seconds int, published_at timestamptz
      )
      on conflict (channel_id, youtube_video_id) do update set
        title            = excluded.title,
        description      = excluded.description,
        thumbnail_url    = excluded.thumbnail_url,
        view_count       = excluded.view_count,
        like_count       = excluded.like_count,
        comment_count    = excluded.comment_count,
        duration_seconds = excluded.duration_seconds,
        published_at     = excluded.published_at
    `;
  }

  // Fetch saved videos
  const savedVideos = normalizeRows<ChannelVideosRow>(
    (await getSql()`
      select
        id, channel_id, user_id, created_at, youtube_video_id, title, description,
        thumbnail_url,
        view_count::float8    as view_count,
        like_count::float8    as like_count,
        comment_count::float8 as comment_count,
        duration_seconds, published_at, transcript, viral_moments
      from channel_videos
      where channel_id = ${savedChannel.id}
      order by view_count desc
    `) as Record<string, unknown>[]
  );

  return NextResponse.json({ channel: savedChannel, videos: savedVideos ?? [] });
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? "0") * 3600) + (parseInt(match[2] ?? "0") * 60) + parseInt(match[3] ?? "0");
}
