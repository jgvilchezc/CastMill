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

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan === "free") {
    return NextResponse.json(
      { error: "Upgrade to Starter or Pro to detect viral moments" },
      { status: 403 }
    );
  }

  const { episodeId, transcript, topics } = await req.json();
  if (!episodeId || !transcript) {
    return NextResponse.json(
      { error: "episodeId and transcript are required" },
      { status: 400 }
    );
  }

  const { data: episode, error: episodeError } = await supabase
    .from("episodes")
    .select("id, viral_moments")
    .eq("id", episodeId)
    .eq("user_id", user.id)
    .single();

  if (episodeError) {
    console.error("detect-moments episode query error:", episodeError.message);
    return NextResponse.json({ error: episodeError.message }, { status: 500 });
  }

  if (!episode) {
    return NextResponse.json({ error: "Episode not found" }, { status: 404 });
  }

  if (episode.viral_moments) {
    return NextResponse.json({ moments: episode.viral_moments });
  }

  const maxMoments = profile.plan === "pro" ? 8 : 3;
  const topicsStr = Array.isArray(topics) && topics.length > 0
    ? topics.join(", ")
    : "general";

  const prompt = `You are a viral short-form content expert specialising in podcasts. Your job is to find moments in a podcast transcript that would perform well as TikTok or Instagram Reels clips (15–90 seconds).

PODCAST TOPICS: ${topicsStr}

TRANSCRIPT:
${transcript.slice(0, 12000)}

Find the ${maxMoments} best moments for short-form video. Prioritise:
1. Counter-intuitive or surprising statements
2. Emotional peaks (passion, frustration, humour)
3. Concrete, actionable advice with a clear takeaway
4. Controversy or strong opinion
5. Storytelling with a clear arc

Return ONLY valid JSON with no markdown:
{
  "moments": [
    {
      "id": "<unique id like moment-1>",
      "quote": "<exact or near-exact quote from the transcript, 1-3 sentences>",
      "startTimecode": "<HH:MM:SS approximate position in transcript>",
      "durationSeconds": <estimated clip duration 15-90>,
      "viralScore": <1-10>,
      "reason": "<one sentence explaining why this will perform well>",
      "category": "counter-intuitive|actionable|emotional|controversial|story",
      "suggestedHook": "<a punchy 8-12 word opening hook for this clip>"
    }
  ]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

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
          "nvidia/nemotron-3-nano-30b-a3b:free",
        ],
        route: "fallback",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error && err.name === "AbortError"
      ? "Moment detection timed out — please try again"
      : "Could not reach AI service — check your connection";
    console.error("detect-moments fetch error:", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  clearTimeout(timeout);

  if (!orRes.ok) {
    let detail = `OpenRouter ${orRes.status}`;
    try {
      const body = await orRes.json();
      detail = body?.error?.message ?? body?.error ?? detail;
    } catch { /* ignore */ }
    console.error("detect-moments OpenRouter error:", detail);
    return NextResponse.json(
      { error: `AI detection failed: ${detail}` },
      { status: 502 }
    );
  }

  const orData = await orRes.json();
  const text: string = orData.choices?.[0]?.message?.content ?? "";

  let moments;
  try {
    const stripped = text
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
    moments = parsed.moments;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 }
    );
  }

  const { error: saveError } = await supabase
    .from("episodes")
    .update({ viral_moments: moments })
    .eq("id", episodeId);

  if (saveError) {
    console.error("detect-moments: failed to persist viral_moments:", saveError.message);
    return NextResponse.json(
      { error: "Moments detected but failed to save — please try again" },
      { status: 500 }
    );
  }

  return NextResponse.json({ moments });
}
