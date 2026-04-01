import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    // Verify Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { texts } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({ error: "Missing required texts for analysis" }, { status: 400 });
    }

    if (process.env.USE_REAL_AI !== 'true' || !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ 
        error: "Real AI is disabled or missing API keys. Please configure .env" 
      }, { status: 501 });
    }

    // We use Gemini Flash for context analysis because of its large context window and it's free/fast
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      system: `You are an expert linguist and copywriter. Analyze the provided text samples from a creator and determine their "Voice Profile". Extract their core tone, vocabulary style, pacing, and how they typically hook their audience.`,
      prompt: `Analyze the following texts and generate a voice profile:\n\n${texts.join('\n\n---\n\n')}`,
      schema: z.object({
        tone: z.array(z.string()).describe("3-5 adjectives describing the emotional tone (e.g., 'casual', 'authoritative')"),
        vocabulary: z.array(z.string()).describe("3-5 descriptors of the words they use (e.g., 'jargon-heavy', 'simple', 'slang')"),
        pacing: z.array(z.string()).describe("3-5 descriptors of sentence structure (e.g., 'short punchy sentences', 'long flowing paragraphs')"),
        commonHooks: z.array(z.string()).describe("2-3 ways they start their content or grab attention (e.g., 'Starts with a controversial statement')")
      }),
    });

    return NextResponse.json({ profile: object });

  } catch (error: any) {
    console.error("Voice Analysis Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze voice" }, { status: 500 });
  }
}