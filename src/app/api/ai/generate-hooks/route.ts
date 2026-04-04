import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return NextResponse.json(
      { error: "Upgrade to Starter or Pro to use the Hook Lab" },
      { status: 403 }
    );
  }

  const { quote, category, episodeTitle, topics, episodeId, momentId } = await req.json();
  if (!quote) {
    return NextResponse.json({ error: "quote is required" }, { status: 400 });
  }

  const topicsStr = Array.isArray(topics) && topics.length > 0
    ? topics.join(", ")
    : "general";

  const prompt = `You are a viral short-form content copywriter who specialises in writing TikTok hooks for podcasters.

EPISODE: "${episodeTitle ?? "Podcast Episode"}"
TOPICS: ${topicsStr}
MOMENT CATEGORY: ${category ?? "general"}
QUOTE: "${quote}"

Write 3 distinct hook variants for this moment. Each hook is the opening line of a TikTok caption or spoken intro overlay (8–15 words max). They must make someone stop scrolling instantly.

Hook styles:
1. CURIOSITY — create a knowledge gap. ("Nobody talks about why…", "The real reason X happens is…")
2. CONTROVERSY — state a strong opinion or counter-narrative. ("Hot take: X is completely wrong…", "Stop doing X. Here's why…")
3. ACTIONABLE — lead with the outcome. ("Do this one thing and X will happen…", "In 60 seconds you'll understand…")

Return ONLY valid JSON with no markdown:
{
  "hooks": [
    { "style": "curiosity", "text": "<hook text>", "caption": "<2-3 sentence TikTok caption to pair with this hook>" },
    { "style": "controversy", "text": "<hook text>", "caption": "<2-3 sentence TikTok caption to pair with this hook>" },
    { "style": "actionable", "text": "<hook text>", "caption": "<2-3 sentence TikTok caption to pair with this hook>" }
  ]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let orRes: Response;
  try {
    orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        ],
        route: "fallback",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Hook generation timed out — please try again"
      : "Could not reach AI service — check your connection";
    console.error("generate-hooks fetch error:", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  clearTimeout(timeout);

  if (!orRes.ok) {
    let detail = `OpenRouter ${orRes.status}`;
    try {
      const body = await orRes.json();
      detail = body?.error?.message ?? body?.error ?? detail;
    } catch { /* ignore */ }
    console.error("generate-hooks OpenRouter error:", detail);
    return NextResponse.json(
      { error: `Hook generation failed: ${detail}` },
      { status: 502 }
    );
  }

  const orData = await orRes.json();
  const text: string = orData.choices?.[0]?.message?.content ?? "";

  let hooks;
  try {
    const stripped = text
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
    hooks = parsed.hooks;
  } catch {
    console.error("generate-hooks parse error, raw text:", text.slice(0, 500));
    return NextResponse.json(
      { error: "Failed to parse AI response — please try again" },
      { status: 500 }
    );
  }

  if (episodeId && momentId) {
    const { data: ep } = await supabase
      .from("episodes")
      .select("viral_moments")
      .eq("id", episodeId)
      .eq("user_id", user.id)
      .single();

    if (ep?.viral_moments && Array.isArray(ep.viral_moments)) {
      const updated = (ep.viral_moments as { id?: string; [key: string]: unknown }[]).map((m) =>
        m.id === momentId ? { ...m, hooks } : m
      );
      const { error: updateErr } = await supabase
        .from("episodes")
        .update({ viral_moments: updated as unknown as Database["public"]["Tables"]["episodes"]["Update"]["viral_moments"] })
        .eq("id", episodeId);

      if (updateErr) {
        console.error("generate-hooks: failed to persist hooks:", updateErr.message);
      }
    }
  }

  return NextResponse.json({ hooks });
}
