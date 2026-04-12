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
        percentage: z.number().describe("Estimated % of posts on this theme"),
        recommendation: z.string(),
      })
    )
    .describe("Top content themes/topics found"),
  bestPerforming: z.object({
    pattern: z.string().describe("What the top-performing posts have in common"),
    avgLikes: z.number(),
    suggestion: z.string(),
  }),
  captionStyle: z.object({
    avgLength: z.string(),
    commonPatterns: z.array(z.string()).describe("3-5 caption patterns observed"),
    improvement: z.string(),
  }),
  hashtagStrategy: z.object({
    topHashtags: z.array(z.string()).describe("Most used hashtags extracted from captions"),
    recommendation: z.string(),
  }),
  commentSentiment: z.object({
    overall: z.string().describe("Overall sentiment summary"),
    positiveThemes: z.array(z.string()).describe("2-4 positive themes in comments"),
    negativeThemes: z.array(z.string()).describe("2-4 negative themes or areas to address"),
    suggestion: z.string(),
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

  const { media, comments } = await req.json();

  if (!media || !Array.isArray(media) || media.length === 0) {
    return NextResponse.json(
      { error: "No media data provided" },
      { status: 400 }
    );
  }

  const mediaSummary = media
    .slice(0, 30)
    .map(
      (m: Record<string, unknown>, i: number) =>
        `${i + 1}. [${m.media_type}] "${(m.caption as string)?.slice(0, 120) || "No caption"}" — ` +
        `Likes: ${m.like_count}, Comments: ${m.comments_count}, ` +
        `Posted: ${m.timestamp}`
    )
    .join("\n");

  let commentSummary = "";
  if (comments && Array.isArray(comments) && comments.length > 0) {
    commentSummary =
      "\n\nRecent comments from top posts:\n" +
      comments
        .slice(0, 50)
        .map(
          (c: Record<string, unknown>) =>
            `- @${c.username}: "${(c.text as string)?.slice(0, 100)}"`
        )
        .join("\n");
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      system:
        "You are an expert Instagram content strategist and social media analyst. " +
        "Analyze the creator's post data and comments to provide actionable insights to help them grow. " +
        "Be specific, data-driven, and practical. Reference actual post captions when relevant. " +
        "Pay special attention to hashtag usage patterns and comment sentiment.",
      prompt:
        `Analyze these Instagram posts and provide content strategy insights:\n\n${mediaSummary}${commentSummary}\n\n` +
        "Identify content themes, what performs best, caption and hashtag patterns, comment sentiment, and suggest new content ideas.",
      schema: insightsSchema,
    });

    return NextResponse.json({ insights: object });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[instagram/analyze] AI generation failed:", message);

    const isQuota =
      message.includes("quota") ||
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED");
    return NextResponse.json(
      {
        error: isQuota
          ? "AI quota exceeded. Please try again later or check your Google AI API key."
          : `AI analysis failed: ${message}`,
      },
      { status: isQuota ? 429 : 500 }
    );
  }
}
