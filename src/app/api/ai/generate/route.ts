import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://castmill.com',
    'X-Title': 'Castmill',
  },
});

export async function POST(req: Request) {
  try {
    // Verify Supabase session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { format, transcript, voiceProfile } = await req.json();

    if (!transcript || !format) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (process.env.USE_REAL_AI !== 'true' || !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ 
        error: "Real AI is disabled or missing API keys. Please configure .env" 
      }, { status: 501 });
    }

    const systemPrompt = `You are an expert ghostwriter and content multiplier.
Your job is to transform podcast transcripts into high-quality ${format}.
${voiceProfile ? `You must match this voice profile exactly:
- Tone: ${voiceProfile.tone.join(', ')}
- Vocabulary: ${voiceProfile.vocabulary.join(', ')}
- Pacing: ${voiceProfile.pacing.join(', ')}
- Common hooks: ${voiceProfile.commonHooks.join(', ')}` : 'Write in a professional, engaging, and clear tone.'}
`;

    let formatInstructions = "";
    switch (format) {
      case "blog":
        formatInstructions = "Write a comprehensive, SEO-optimized blog post with a catchy title, H2 headings, bullet points, and a strong conclusion. Minimum 800 words.";
        break;
      case "tweet_thread":
        formatInstructions = "Write an engaging Twitter/X thread. Start with a viral hook. Break down the core concepts into 5-8 tweets. End with a call to action. Use emojis tastefully.";
        break;
      case "linkedin":
        formatInstructions = "Write a professional but highly engaging LinkedIn post. Start with a contrarian or thought-provoking hook. Format with plenty of white space (one sentence per paragraph mostly). End with a question to drive comments.";
        break;
      case "newsletter":
        formatInstructions = "Write an email newsletter issue. Include an engaging subject line, a friendly intro, 3 key takeaways from the episode, and a sign-off.";
        break;
      case "youtube_desc":
        formatInstructions = "Write a YouTube video description. Include an engaging summary, chapter timestamps (guess based on flow if needed), and links/socials placeholders.";
        break;
      default:
        formatInstructions = `Write a ${format} based on the transcript.`;
    }

    const { text } = await generateText({
      model: openrouter('meta-llama/llama-3.3-70b-instruct:free'), // Using a free/cheap model via OpenRouter
      system: systemPrompt,
      prompt: `${formatInstructions}\n\nHere is the raw podcast transcript:\n\n${transcript}`,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return NextResponse.json({ 
      content: text,
      format,
      status: 'completed'
    });

  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate content" }, { status: 500 });
  }
}