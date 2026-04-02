import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelVideoId, transcript, title } = await req.json();
  if (!transcript) return NextResponse.json({ error: "transcript required" }, { status: 400 });

  const segmentsText = transcript.segments
    ?.slice(0, 300)
    .map((s: { offset: number; text: string }) => `[${formatTime(s.offset / 1000)}] ${s.text}`)
    .join("\n") ?? transcript.text?.slice(0, 4000) ?? "";

  const prompt = `You are a viral content strategist specializing in short-form video (TikTok, Reels, YouTube Shorts).

VIDEO TITLE: "${title}"

TRANSCRIPT WITH TIMESTAMPS:
${segmentsText}

Identify the 5 most viral-worthy moments from this video. For each moment, provide the clip timestamp range (ideal for 30-60 second TikTok/Reel).

Return ONLY valid JSON, no markdown:
{
  "moments": [
    {
      "rank": 1,
      "startTime": "<MM:SS>",
      "endTime": "<MM:SS>",
      "startSeconds": <number>,
      "endSeconds": <number>,
      "hook": "<the first sentence that grabs attention>",
      "reason": "<why this is viral — controversy/insight/story/humor/value>",
      "viralScore": <0-100>,
      "format": "tiktok|reel|short",
      "caption": "<ready-to-use TikTok/Reels caption with hashtags>"
    }
  ]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    signal: controller.signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
      max_tokens: 1500,
    }),
  });

  clearTimeout(timeout);

  if (!orRes.ok) {
    const err = await orRes.json().catch(() => ({}));
    console.error("OpenRouter viral-moments error:", err);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 502 });
  }

  const orData = await orRes.json();
  const text: string = orData.choices?.[0]?.message?.content ?? "";

  let viralMoments;
  try {
    const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    viralMoments = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
  } catch {
    console.error("Failed to parse viral moments. Raw response:", text.slice(0, 500));
    return NextResponse.json({ error: "Failed to parse viral moments", raw: text.slice(0, 300) }, { status: 500 });
  }

  if (channelVideoId) {
    await supabase
      .from("channel_videos")
      .update({ viral_moments: viralMoments })
      .eq("id", channelVideoId)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ viralMoments });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
