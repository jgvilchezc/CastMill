import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateEmbedding,
  searchSimilarDocuments,
} from "@/lib/rag/embeddings";
import { createChatTools } from "@/lib/chat/tools";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

export const maxDuration = 120;

function buildSystemPrompt(
  contextBlock: string,
  docCounts: { captions: number; comments: number; profile: number }
): string {
  const totalDocs = docCounts.captions + docCounts.comments + docCounts.profile;

  let dataStatus: string;
  if (totalDocs === 0) {
    dataStatus =
      "IMPORTANT: The user has NOT synced their Instagram data yet, or the sync produced no documents. " +
      "You do NOT currently have any Instagram data to reference. " +
      "If they ask about their posts, engagement, or content, tell them to click the 'Data Sync' button (top-right of the chat) " +
      "to sync their Instagram data first. Do NOT pretend to have data or ask them to 'grant access' — " +
      "they just need to press Sync.";
  } else if (docCounts.captions === 0 && docCounts.profile > 0) {
    dataStatus =
      `You have access to the user's Instagram profile data (${docCounts.profile} document), but NO post/caption data. ` +
      "This likely means the Instagram API blocked access to their media. " +
      "You can answer profile-level questions (followers, bio, etc.) but for post-specific questions, " +
      "let the user know their media data is not available yet — they may need to re-sync or check their Meta app permissions.";
  } else {
    dataStatus =
      `You have access to the user's synced Instagram data: ${docCounts.captions} posts/captions, ` +
      `${docCounts.comments} comment groups, ${docCounts.profile} profile document(s) (${totalDocs} total). ` +
      "Use the provided context below to answer their questions with specific data points.";
  }

  return (
    `You are an expert Instagram content strategist, social media analyst, and creative assistant.\n\n` +
    `${dataStatus}\n\n` +
    `You also have powerful tools at your disposal:\n\n` +
    `1. **generate_image** — Generate images on demand. Use this when the user asks to create images, ` +
    `thumbnails, visual posts, artwork, banners, or any visual content. Write detailed, creative prompts ` +
    `that produce high-quality results. Choose the aspect ratio based on the intended use (1:1 for Instagram posts, ` +
    `9:16 for Stories/Reels, 16:9 for landscape/YouTube).\n\n` +
    `2. **publish_to_instagram** — Publish content directly to their Instagram account. Supports IMAGE posts ` +
    `and REEL (video) posts. The mediaUrl MUST be a publicly accessible HTTPS URL. Generated images ` +
    `(base64/data URLs) cannot be published directly — inform the user they need to upload the image to ` +
    `a public host first. Always confirm with the user before publishing and include relevant hashtags in the caption.\n\n` +
    `CRITICAL RULES:\n` +
    `- ONLY reference data that appears in the "CONTEXT FROM USER'S INSTAGRAM DATA" section below. NEVER invent, fabricate, or guess post captions, dates, metrics, or comments.\n` +
    `- If the context does not contain specific information the user asks about, say "I don't have that data in my current context" — do NOT make up examples.\n` +
    `- Quote actual captions and data exactly as they appear in the context.\n\n` +
    `Guidelines:\n` +
    `- When context data is provided below, use it to answer questions accurately and reference specific data points.\n` +
    `- When the user asks to create visual content, use generate_image proactively with a well-crafted prompt.\n` +
    `- Be creative and specific when crafting image prompts — include style, colors, composition, mood, and subject details.\n` +
    `- Always be actionable and practical in your recommendations.\n` +
    `- Respond in the same language the user writes in.` +
    contextBlock
  );
}

async function getDocumentCounts(
  userId: string
): Promise<{ captions: number; comments: number; profile: number }> {
  try {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("rag_documents")
      .select("source")
      .eq("user_id", userId);

    const rows = (data ?? []) as { source: string }[];
    return {
      captions: rows.filter((r) => r.source === "instagram_caption").length,
      comments: rows.filter((r) => r.source === "instagram_comment").length,
      profile: rows.filter((r) => r.source === "instagram_profile").length,
    };
  } catch (err) {
    console.error("[chat] Failed to count rag_documents:", err);
    return { captions: 0, comments: 0, profile: 0 };
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response("AI is not configured", { status: 501 });
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  let contextBlock = "";

  if (lastUserMessage) {
    const queryText =
      lastUserMessage.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ") ?? "";

    if (queryText) {
      try {
        const queryEmbedding = await generateEmbedding(queryText);
        const docs = await searchSimilarDocuments(queryEmbedding, user.id, 8);

        if (docs.length > 0) {
          contextBlock =
            "\n\n--- CONTEXT FROM USER'S INSTAGRAM DATA ---\n" +
            docs
              .map(
                (d, i) =>
                  `[${i + 1}] (${d.source}, similarity: ${d.similarity.toFixed(3)})\n${d.content}`
              )
              .join("\n\n") +
            "\n--- END CONTEXT ---\n";
        }
      } catch (err) {
        console.error("[chat] RAG search failed:", err);
      }
    }
  }

  const docCounts = await getDocumentCounts(user.id);
  const systemPrompt = buildSystemPrompt(contextBlock, docCounts);

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages: modelMessages,
    tools: createChatTools(user.id),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
