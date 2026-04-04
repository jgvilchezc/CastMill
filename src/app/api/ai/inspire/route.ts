import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type InspirationMode = "gaps" | "trends" | "series" | "questions";

interface ChannelData {
  title: string;
  handle?: string;
  analysis: Record<string, unknown>;
  videos?: { title: string; view_count: number; like_count?: number; comment_count?: number; published_at?: string }[];
}

function buildPrompt(mode: InspirationMode, channelData: ChannelData, customInstructions?: string): string {
  const { title, handle, analysis, videos = [] } = channelData;
  const pillars = (analysis.contentPillars as string[]) ?? [];
  const patterns = (analysis.topPatterns as string[]) ?? [];
  const weaknesses = (analysis.weaknesses as string[]) ?? [];
  const audienceInsights = (analysis.audienceInsights as string) ?? "";

  const channelHeader = `CHANNEL: "${title}"${handle ? ` (${handle})` : ""}
Content Pillars: ${pillars.join(", ") || "unknown"}
Audience: ${audienceInsights || "general audience"}
Top Patterns: ${patterns.join("; ") || "none detected"}
Weaknesses: ${weaknesses.join("; ") || "none detected"}`;

  const videosText = videos
    .slice(0, 20)
    .map((v, i) => `${i + 1}. "${v.title}" — ${(v.view_count ?? 0).toLocaleString()} views`)
    .join("\n");

  const customBlock = customInstructions?.trim()
    ? `\nCREATOR FOCUS / ADDITIONAL CONTEXT:\n"${customInstructions.trim()}"\n`
    : "";

  switch (mode) {
    case "gaps":
      return `You are a YouTube content strategist expert.

${channelHeader}
${customBlock}
TOP VIDEOS:
${videosText || "No videos available"}

Identify 6-8 high-opportunity content gaps — topics with strong demand that this channel has NOT covered yet or has undercovered. Use the creator's focus/context if provided to tailor the suggestions.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "gaps": [
    {
      "title": "<compelling video title>",
      "angle": "<unique angle or hook that makes it stand out>",
      "demandScore": <0-100, audience demand for this topic>,
      "saturationScore": <0-100, how saturated YouTube is with this topic>,
      "difficulty": "Easy|Medium|Hard",
      "format": "Short|Long-form|Series|Tutorial|Reaction|Explainer"
    }
  ]
}`;

    case "trends":
      return `You are a YouTube trend analyst expert.

${channelHeader}
${customBlock}
Identify 5 trending topics or content formats that are relevant to this channel's niche RIGHT NOW in 2025-2026. Focus on topics gaining momentum. Use the creator's focus/context if provided to tailor the suggestions.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "trends": [
    {
      "name": "<trend name>",
      "why": "<1-2 sentences: why this trend is relevant for this channel>",
      "velocity": "rising|peak|declining",
      "format": "Short|Long-form|Series|Reaction|Tutorial|Documentary",
      "hook": "<a ready-to-use opening line or hook for a video on this trend>"
    }
  ]
}`;

    case "series":
      return `You are a YouTube content architect expert.

${channelHeader}
${customBlock}
TOP VIDEOS:
${videosText || "No videos available"}

Analyze the video history and identify 2-3 content series opportunities: either unfinished series the channel started, or new series that would fit naturally given their content pillars and best performers. Use the creator's focus/context if provided to tailor the suggestions.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "series": [
    {
      "seriesName": "<series name>",
      "description": "<1-2 sentences describing the series concept and why it fits this channel>",
      "existingVideos": ["<title of existing video that fits this series>"],
      "nextEpisodes": [
        { "title": "<next episode title>", "angle": "<what makes this episode unique>" }
      ]
    }
  ]
}`;

    case "questions":
      return `You are a YouTube audience researcher expert.

${channelHeader}
${customBlock}
TOP VIDEOS:
${videosText || "No videos available"}

Based on the channel's topics and audience, identify 8-10 questions the audience is VERY LIKELY asking that haven't been answered yet (or could be answered better). Group them by topic. Use the creator's focus/context if provided to tailor the suggestions.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "questions": [
    {
      "question": "<the audience question>",
      "topic": "<topic category this belongs to>",
      "videoIdea": "<specific video concept that answers this question>",
      "introHook": "<an engaging opening line referencing that the audience asked for this>"
    }
  ]
}`;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mode, channelId, channelData, customInstructions } = (await req.json()) as {
      mode: InspirationMode;
      channelId: string;
      channelData: ChannelData;
      customInstructions?: string;
    };

    if (!mode || !channelData) {
      return NextResponse.json({ error: "mode and channelData are required" }, { status: 400 });
    }

    if (!["gaps", "trends", "series", "questions"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const prompt = buildPrompt(mode, channelData, customInstructions);

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
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    clearTimeout(timeout);

    if (!orRes.ok) {
      const err = await orRes.json().catch(() => ({}));
      console.error("OpenRouter inspire error:", err);
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const orData = await orRes.json();
    const text: string = orData.choices?.[0]?.message?.content ?? "";

    let result;
    try {
      const stripped = text
        .replace(/```(?:json)?\s*/gi, "")
        .replace(/```/g, "")
        .trim();
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
    } catch {
      console.error("Failed to parse AI inspire response. Raw:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: text.slice(0, 300) },
        { status: 500 }
      );
    }

    if (channelId) {
      const { data: existingChannel } = await supabase
        .from("channels")
        .select("inspiration")
        .eq("id", channelId)
        .eq("user_id", user.id)
        .single();

      const existingInspiration = (existingChannel?.inspiration as Record<string, unknown>) ?? {};

      await supabase
        .from("channels")
        .update({
          inspiration: {
            ...existingInspiration,
            [mode]: result[mode],
          },
        })
        .eq("id", channelId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ mode, ...result });
  } catch (error: unknown) {
    console.error("AI Inspire Error:", error);
    return NextResponse.json({ error: "Failed to generate inspiration" }, { status: 500 });
  }
}
