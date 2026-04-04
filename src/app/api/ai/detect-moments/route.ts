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

  const { episodeId, transcript, segments, topics, force } = await req.json();
  if (!episodeId || !transcript) {
    return NextResponse.json(
      { error: "episodeId and transcript are required" },
      { status: 400 }
    );
  }

  interface Segment { speaker?: string; text: string; startTime: number; endTime: number }
  const hasSegments = Array.isArray(segments) && segments.length > 0;

  function formatTimestamp(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  let timedTranscript: string;
  if (hasSegments) {
    timedTranscript = (segments as Segment[])
      .map((seg) => `[${formatTimestamp(seg.startTime)}] ${seg.text}`)
      .join("\n");
  } else {
    timedTranscript = transcript;
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

  if (episode.viral_moments && !force) {
    return NextResponse.json({ moments: episode.viral_moments });
  }

  const maxMoments = profile.plan === "pro" ? 8 : 3;
  const topicsStr = Array.isArray(topics) && topics.length > 0
    ? topics.join(", ")
    : "general";

  const timestampInstructions = hasSegments
    ? `IMPORTANT: The transcript below has EXACT timestamps in [HH:MM:SS] format. You MUST use these real timestamps for startTimecode — do NOT guess or approximate. For durationSeconds, calculate the exact difference between the start timestamp and the timestamp of the last line you include in the moment.`
    : `Note: This transcript has no timestamps. Estimate startTimecode as best you can based on average speaking pace (~150 words/minute).`;

  const prompt = `You are a viral short-form content expert specialising in podcasts. Your job is to find moments in a podcast transcript that would perform well as TikTok or Instagram Reels clips (15–90 seconds).

PODCAST TOPICS: ${topicsStr}

${timestampInstructions}

TRANSCRIPT:
${timedTranscript.slice(0, 15000)}

Find the ${maxMoments} best moments for short-form video. Each moment should be a COMPLETE thought — never cut a sentence or idea mid-way. Include 1-2 seconds of buffer before and after.

Prioritise:
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
      "startTimecode": "<HH:MM:SS — must match a real timestamp from the transcript>",
      "endTimecode": "<HH:MM:SS — the timestamp where this moment ends>",
      "durationSeconds": <exact seconds between startTimecode and endTimecode>,
      "viralScore": <1-10>,
      "reason": "<one sentence explaining why this will perform well>",
      "category": "counter-intuitive|actionable|emotional|controversial|story",
      "suggestedHook": "<a punchy 8-12 word opening hook for this clip>"
    }
  ]
}`;

  const modelSets = [
    [
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3.6-plus-preview:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
    ],
    [
      "stepfun/step-3.5-flash:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "qwen/qwen3.6-plus-preview:free",
    ],
  ];

  const basePayload = {
    route: "fallback",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 4000,
  };

  let text = "";
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < modelSets.length; attempt++) {
    const models = modelSets[attempt];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    try {
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://expandcast.com",
          "X-Title": "Expandcast",
        },
        body: JSON.stringify({ ...basePayload, model: models[0], models }),
      });
      clearTimeout(timeout);

      if (!orRes.ok) {
        let detail = `OpenRouter ${orRes.status}`;
        try {
          const body = await orRes.json();
          detail = body?.error?.message ?? body?.error ?? detail;
        } catch { /* ignore */ }
        lastErr = detail;
        console.error(`detect-moments attempt ${attempt + 1} failed:`, detail);
      } else {
        const orData = await orRes.json();
        text = orData.choices?.[0]?.message?.content ?? "";

        if (text.trim().length > 10) break;

        console.error(`detect-moments attempt ${attempt + 1}: empty AI response, model: ${orData.model ?? "unknown"}`);
        lastErr = "AI returned empty response";
      }
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      console.error(`detect-moments attempt ${attempt + 1} error:`, err);
    }

    if (attempt < modelSets.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!text || text.trim().length < 10) {
    const isTimeout = lastErr instanceof Error && lastErr.name === "AbortError";
    const detail = isTimeout
      ? "Detection timed out — please try again"
      : typeof lastErr === "string"
        ? `Detection failed: ${lastErr}`
        : "All AI providers returned empty responses — please try again in a moment";
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  function tcToSec(tc: string): number {
    const parts = tc.split(":").map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  let moments;
  try {
    const stripped = text
      .replace(/```(?:json)?\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);

    const rawMoments = Array.isArray(parsed.moments) ? parsed.moments : Array.isArray(parsed) ? parsed : [];
    if (rawMoments.length === 0) {
      console.error("detect-moments: no moments array in response. Keys:", Object.keys(parsed), "raw:", text.slice(0, 500));
      return NextResponse.json({ error: "AI returned no moments — please try again" }, { status: 500 });
    }

    moments = rawMoments.map((m: Record<string, unknown>) => {
      const startTC = typeof m.startTimecode === "string" ? m.startTimecode : "00:00:00";
      const endTC = typeof m.endTimecode === "string" ? m.endTimecode : "";
      const start = tcToSec(startTC);
      const end = endTC ? tcToSec(endTC) : 0;
      const aiDuration = typeof m.durationSeconds === "number" ? m.durationSeconds : 30;
      const calculatedDuration = end > start ? end - start : aiDuration;
      const duration = Math.max(15, Math.min(120, calculatedDuration));

      return {
        ...m,
        startTimecode: startTC,
        endTimecode: endTC || undefined,
        durationSeconds: duration,
      };
    });
  } catch (parseErr) {
    console.error("detect-moments parse error:", parseErr, "\nRaw AI text:", text.slice(0, 1000));
    return NextResponse.json(
      { error: "Failed to parse AI response — please try again" },
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
