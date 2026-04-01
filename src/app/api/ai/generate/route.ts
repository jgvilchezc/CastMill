import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
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

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://castmill.com',
        'X-Title': 'Castmill',
      },
      body: JSON.stringify({
        model: 'stepfun/step-3.5-flash:free',
        models: [
          'stepfun/step-3.5-flash:free',
          'nvidia/nemotron-3-nano-30b-a3b:free',
          'qwen/qwen3.6-plus-preview:free',
        ],
        route: 'fallback',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${formatInstructions}\n\nHere is the raw podcast transcript:\n\n${transcript}` },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("OpenRouter error:", err);
      return NextResponse.json({ error: "OpenRouter request failed" }, { status: 500 });
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({
      content: text,
      format,
      status: 'completed'
    });

  } catch (error: unknown) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
