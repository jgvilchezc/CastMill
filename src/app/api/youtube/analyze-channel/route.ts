import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId } = await req.json();
  if (!channelId)
    return NextResponse.json({ error: "channelId required" }, { status: 400 });

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .eq("user_id", user.id)
    .single();
  if (!channel)
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  const { data: videos } = await supabase
    .from("channel_videos")
    .select(
      "title,view_count,like_count,comment_count,published_at,duration_seconds,thumbnail_url",
    )
    .eq("channel_id", channelId)
    .order("view_count", { ascending: false })
    .limit(20);

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
      "HTTP-Referer": "https://castmill.com",
      "X-Title": "Castmill",
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

  await supabase
    .from("channels")
    .update({ analysis, analyzed_at: new Date().toISOString() })
    .eq("id", channelId);

  return NextResponse.json({ analysis });
}
