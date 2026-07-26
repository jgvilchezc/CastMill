import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import type { ChannelsRow } from "@/lib/neon/types";
import { normalizeRow, normalizeRows } from "@/lib/neon/rows";
import { getSql } from "@/lib/neon/db";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await req.json();
  if (!channelId)
    return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const channelRows = (await getSql()`
    select * from channels where id = ${channelId} and user_id = ${user.id}
  `) as Record<string, unknown>[];
  const channel = channelRows[0] ? normalizeRow<ChannelsRow>(channelRows[0]) : null;
  if (!channel)
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  // view/like/comment counts are bigint: the pg driver hands those back as
  // strings, so toLocaleString() below would silently skip thousand separators.
  // published_at is timestamptz and arrives as a Date, which has no .split().
  // The ::float8 casts and normalizeRows() restore the shapes this code expects.
  const videos = normalizeRows<{
    title: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    published_at: string | null;
    duration_seconds: number;
    thumbnail_url: string | null;
  }>(
    (await getSql()`
      select
        title,
        view_count::float8      as view_count,
        like_count::float8      as like_count,
        comment_count::float8   as comment_count,
        published_at,
        duration_seconds,
        thumbnail_url
      from channel_videos
      where channel_id = ${channelId}
      order by view_count desc
      limit 20
    `) as Record<string, unknown>[]
  );

  const videosText = (videos ?? [])
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" — ${v.view_count.toLocaleString()} views, ${v.like_count.toLocaleString()} likes, ${v.comment_count.toLocaleString()} comments, ${Math.round(v.duration_seconds / 60)}min, published: ${v.published_at?.split("T")[0] ?? "unknown"}`,
    )
    .join("\n");

  const prompt = `You are an expert YouTube channel growth strategist. Analyze this YouTube channel and its top videos.

CHANNEL: "${channel.title}"
Subscribers: ${channel.subscriber_count.toLocaleString()}
Total videos: ${channel.video_count}
Total views: ${channel.view_count.toLocaleString()}

TOP 20 VIDEOS BY VIEWS:
${videosText}

Provide a comprehensive channel analysis in this EXACT JSON format (no markdown, just JSON):
{
  "score": <overall channel health score 0-100>,
  "scoreBreakdown": {
    "titleOptimization": <0-100>,
    "contentConsistency": <0-100>,
    "engagementRate": <0-100>,
    "uploadFrequency": <0-100>
  },
  "topPatterns": [
    "<pattern observed in best-performing videos>"
  ],
  "weaknesses": [
    "<specific weakness with example>"
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "titles|thumbnails|content|schedule|engagement",
      "title": "<short recommendation title>",
      "description": "<actionable 1-2 sentence description>",
      "impact": "<expected impact if implemented>"
    }
  ],
  "bestVideo": {
    "title": "<title of best performing video>",
    "reason": "<why it performed well>"
  },
  "worstVideo": {
    "title": "<title of underperforming video>",
    "reason": "<why it underperformed>"
  },
  "contentPillars": ["<topic 1>", "<topic 2>", "<topic 3>"],
  "audienceInsights": "<1-2 sentences about the audience based on engagement patterns>"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    signal: controller.signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://expandcast.com",
      "X-Title": "Expandcast",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      models: [
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen3.6-plus-preview:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
      ],
      route: "fallback",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 10000,
    }),
  });

  clearTimeout(timeout);

  if (!orRes.ok) {
    const err = await orRes.json().catch(() => ({}));
    console.error("OpenRouter analyze-channel error:", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 502 });
  }

  const orData = await orRes.json();
  const text: string = orData.choices?.[0]?.message?.content ?? "";

  let analysis;
  try {
    const stripped = text
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
  } catch {
    console.error(
      "Failed to parse AI analysis. Raw response (last 300):",
      text.slice(-300),
    );
    return NextResponse.json(
      { error: "Failed to parse AI analysis", raw: text.slice(0, 300) },
      { status: 500 },
    );
  }

  await getSql()`
    update channels
    set analysis = ${JSON.stringify(analysis)}::jsonb, analyzed_at = now()
    where id = ${channelId} and user_id = ${user.id}
  `;

  return NextResponse.json({ analysis });
}
