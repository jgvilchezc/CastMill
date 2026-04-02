import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

function buildPrompt(title: string, transcript: string): string {
  const snippet = transcript.slice(0, 600);
  const words = snippet
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 5);
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] ?? 0) + 1;
  const topics = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => w)
    .join(", ");

  return (
    `podcast episode thumbnail artwork, topic: "${title}", keywords: ${topics || "technology, ideas"}, ` +
    `dark moody cinematic background, dramatic rim lighting, professional editorial photography, ` +
    `ultra detailed, 8k, high contrast, bold graphic composition, magazine cover aesthetics, ` +
    `deep blacks, subtle neon green accents, minimalist bold typography space`
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "HUGGINGFACE_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { title = "Podcast Episode", transcript = "" } = await req.json();
  const prompt = buildPrompt(title, transcript);

  const hfRes = await fetch(
    "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width: 1280,
          height: 720,
          num_inference_steps: 4,
          guidance_scale: 0,
        },
      }),
    }
  );

  if (!hfRes.ok) {
    const err = await hfRes.text().catch(() => hfRes.statusText);
    console.error("HuggingFace error:", err);
    return NextResponse.json(
      { error: `Image generation failed: ${hfRes.status}` },
      { status: 502 }
    );
  }

  const buffer = await hfRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType = hfRes.headers.get("content-type") ?? "image/jpeg";
  const dataUrl = `data:${contentType};base64,${base64}`;

  return NextResponse.json({ content: dataUrl });
}
