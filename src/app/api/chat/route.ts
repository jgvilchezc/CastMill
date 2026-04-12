import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import {
  generateEmbedding,
  searchSimilarDocuments,
} from "@/lib/rag/embeddings";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
});

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert Instagram content strategist and social media analyst. You have access to the user's Instagram data including their posts, captions, comments, profile stats, and AI-generated insights.

Use the provided context to answer questions accurately and specifically about their Instagram account. Reference actual data points, post captions, and metrics when relevant.

If the context doesn't contain enough information to answer a question, say so honestly rather than making up data.

Always be actionable and practical in your recommendations. When discussing engagement or performance, reference specific numbers from their data.

Respond in the same language the user writes in.`;

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

  const systemPrompt = SYSTEM_PROMPT + contextBlock;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
