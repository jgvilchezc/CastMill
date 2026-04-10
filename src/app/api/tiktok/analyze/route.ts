import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

export const maxDuration = 60;

const insightsSchema = z.object({
  contentThemes: z
    .array(
      z.object({
        theme: z.string(),
        percentage: z.number().describe("Estimated % of videos on this theme"),
        recommendation: z.string(),
      })
    )
    .describe("Top content themes/topics found"),
  bestPerforming: z.object({
    pattern: z.string().describe("What the top-performing videos have in common"),
    avgViews: z.number(),
    suggestion: z.string(),
  }),
  captionStyle: z.object({
    avgLength: z.string(),
    commonPatterns: z.array(z.string()).describe("3-5 caption patterns observed"),
    improvement: z.string(),
  }),
  postingRecommendations: z.array(z.string()).describe("3-5 actionable recommendations"),
  contentIdeas: z
    .array(
      z.object({
        idea: z.string(),
        reasoning: z.string(),
      })
    )
    .describe("5 new content ideas based on what performs well"),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (
    process.env.USE_REAL_AI !== "true" ||
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ) {
    return NextResponse.json(
      { error: "AI is not configured" },
      { status: 501 }
    );
  }

  const { videos } = await req.json();

  if (!videos || !Array.isArray(videos) || videos.length === 0) {
    return NextResponse.json(
      { error: "No video data provided" },
      { status: 400 }
    );
  }

  const videoSummary = videos
    .slice(0, 30)
    .map(
      (v: Record<string, unknown>, i: number) =>
        `${i + 1}. "${v.title || v.video_description || "No title"}" — ` +
        `Views: ${v.view_count}, Likes: ${v.like_count}, Comments: ${v.comment_count}, ` +
        `Shares: ${v.share_count}, Duration: ${v.duration}s`
    )
    .join("\n");

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      system:
        "You are an expert TikTok content strategist and social media analyst. " +
        "Analyze the creator's video data and provide actionable insights to help them grow. " +
        "Be specific, data-driven, and practical. Reference actual video titles when relevant.",
      prompt:
        `Analyze these TikTok videos and provide content strategy insights:\n\n${videoSummary}\n\n` +
        "Identify content themes, what performs best, caption patterns, and suggest new content ideas.",
      schema: insightsSchema,
    });

    return NextResponse.json({ insights: object });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[tiktok/analyze] AI generation failed:", message);

    const isQuota = message.includes("quota") || message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
    return NextResponse.json(
      { error: isQuota ? "AI quota exceeded. Please try again later or check your Google AI API key." : `AI analysis failed: ${message}` },
      { status: isQuota ? 429 : 500 }
    );
  }
}
