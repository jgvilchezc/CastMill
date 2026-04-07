import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GenerationParams } from '@/lib/generation-params';
import { DEFAULT_PARAMS } from '@/lib/generation-params';
import { parseJsonBody, sanitizeString } from '@/lib/security/validate';

export const maxDuration = 60;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", pt: "Portuguese", fr: "French",
  de: "German", it: "Italian", nl: "Dutch", pl: "Polish",
  ru: "Russian", zh: "Chinese", ja: "Japanese", ko: "Korean", ar: "Arabic",
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  brief:    "Be concise. Use the minimum words needed to convey the full value.",
  standard: "Use the standard length appropriate for this format.",
  detailed: "Be thorough and comprehensive. Include context, examples, and depth.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional:   "Use a polished, professional tone.",
  casual:         "Use a relaxed, casual tone — as if writing to a friend.",
  conversational: "Use a warm, conversational tone — approachable and human.",
  bold:           "Use a bold, direct, no-nonsense tone. Make strong statements.",
  educational:    "Use a clear, educational tone. Explain concepts step by step.",
  humorous:       "Incorporate wit and light humour while staying on-message.",
  inspirational:  "Use an uplifting, motivational tone. Inspire the reader to act.",
};

function buildFormatInstructions(format: string, params: GenerationParams): string {
  const opts = params.formatOptions ?? {};

  switch (format) {
    case "blog": {
      const o = (opts.blog ?? DEFAULT_PARAMS.formatOptions.blog)!;
      const extras: string[] = [];
      if (o.seoFocus) extras.push("Optimise for SEO: use keyword-rich headings, and a meta description at the top.");
      if (o.includeTakeaways) extras.push("Include a '## Key Takeaways' section with 3-5 bullet points after the intro.");
      if (o.includeFaq) extras.push("Include an '## FAQ' section with 3 common questions and answers at the end.");
      return [
        "Write a comprehensive blog post with a catchy H1 title, H2 subheadings, and a strong conclusion.",
        params.length === "brief" ? "Target 400–600 words." :
        params.length === "detailed" ? "Target 1200–1800 words." : "Target 700–1000 words.",
        ...extras,
      ].join(" ");
    }

    case "tweet_thread": {
      const o = (opts.tweet_thread ?? DEFAULT_PARAMS.formatOptions.tweet_thread)!;
      return [
        `Write a Twitter/X thread of exactly ${o.tweetCount} tweets.`,
        "Start with a viral hook on tweet 1. Number each tweet as '1/', '2/', etc.",
        `End with a call to action on the last tweet.`,
        o.includeEmojis
          ? "Use emojis tastefully to add visual interest and emotion."
          : "Do NOT use any emojis.",
        "Keep each tweet under 280 characters.",
      ].join(" ");
    }

    case "linkedin": {
      const o = (opts.linkedin ?? DEFAULT_PARAMS.formatOptions.linkedin)!;
      const ctaMap: Record<string, string> = {
        question:  "End with an open question to spark conversation in comments.",
        invite:    "End by inviting readers to share their own experience in comments.",
        challenge: "End with a bold challenge or provocation for the reader.",
        none:      "Do not add a call to action at the end.",
      };
      return [
        "Write a LinkedIn post that starts with a contrarian or thought-provoking hook.",
        "Format with short paragraphs (1–2 sentences each) for mobile readability.",
        "Use line breaks liberally for white space.",
        ctaMap[o.ctaStyle] ?? ctaMap.question,
        params.length === "brief" ? "Keep it under 300 words." :
        params.length === "detailed" ? "Aim for 500–700 words." : "Aim for 300–500 words.",
      ].join(" ");
    }

    case "newsletter": {
      const o = (opts.newsletter ?? DEFAULT_PARAMS.formatOptions.newsletter)!;
      const subjectMap: Record<string, string> = {
        teaser:    "teaser style (build anticipation, hint at the value)",
        question:  "question style (pose a thought-provoking question)",
        statement: "bold statement style (make a strong claim)",
        numbered:  "numbered list style (e.g. '5 things you need to know about…')",
      };
      return [
        `Write a newsletter issue. First line: 'Subject: <subject line in ${subjectMap[o.subjectLineStyle] ?? "teaser style"}>'`,
        "Include a friendly greeting, a brief intro paragraph, 3 key insights from the episode.",
        o.includeQuote ? "Include a highlighted pull quote in a blockquote." : "",
        "End with a warm sign-off and a PS with a teaser for the next episode.",
      ].filter(Boolean).join(" ");
    }

    case "youtube_desc": {
      const o = (opts.youtube_desc ?? DEFAULT_PARAMS.formatOptions.youtube_desc)!;
      return [
        "Write a YouTube video description.",
        "Start with a 2-3 sentence hook that compels viewers to watch.",
        "Follow with a detailed paragraph summarising the episode.",
        o.includeChapters ? "Include a '⏱ Chapters' section with estimated timestamps (HH:MM:SS format) guessed from the transcript flow." : "",
        o.includeKeywords ? "End with a '🔑 Keywords' section of 10-15 relevant SEO keywords, comma-separated." : "",
        "Include placeholder lines for socials and links.",
      ].filter(Boolean).join(" ");
    }

    case "quotes": {
      return [
        "Extract 6-8 of the most impactful, quotable, or thought-provoking statements from this transcript.",
        "Each quote should be standalone (makes sense without context), under 280 characters, and shareable.",
        "Format each quote as:",
        "> [Quote text]",
        "— [Speaker if identifiable, otherwise omit the attribution line]",
        "Put a blank line between each quote block.",
      ].join("\n");
    }

    case "chapters": {
      const o = (opts.chapters ?? DEFAULT_PARAMS.formatOptions.chapters)!;
      const countInstruction = o.chapterCount === "auto"
        ? "Identify between 5 and 10 chapters based on natural topic changes."
        : `Create exactly ${o.chapterCount} chapters.`;
      return [
        "Analyze this podcast transcript and create chapter markers.",
        countInstruction,
        "Each chapter marks a distinct topic or segment shift.",
        "Format each chapter as: MM:SS Title",
        "Start with 00:00 for the first chapter.",
        "Use timestamps that reflect the natural flow of topics in the transcript.",
        o.includeDescriptions ? "Add a one-sentence description after each chapter title." : "",
        "Output ONLY the chapter list, nothing else.",
      ].filter(Boolean).join("\n");
    }

    case "show_notes": {
      const o = (opts.show_notes ?? DEFAULT_PARAMS.formatOptions.show_notes)!;
      const sections: string[] = [
        "Write professional podcast show notes with this structure:",
        "1. **Episode Summary** — 2-3 sentence overview",
        "2. **Key Topics** — bullet list of main topics covered",
      ];
      if (o.includeGuestBio) sections.push("3. **Guest Info** — name and 1-sentence bio if a guest is mentioned");
      if (o.includeResources) sections.push(`${o.includeGuestBio ? "4" : "3"}. **Resources Mentioned** — list of books, links, or tools referenced`);
      if (o.includeTimestamps) sections.push(`${sections.length}. **Timestamps** — 5-8 key moments with approximate times (MM:SS format)`);
      sections.push(`${sections.length}. **Connect** — placeholder section for social links`);
      return sections.join("\n");
    }

    default:
      return `Write a ${format} based on the transcript.`;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: body, error: bodyError } = await parseJsonBody(req);
    if (bodyError) return bodyError;

    const { format, transcript, segments, voiceProfile, params } = body as {
      format: string;
      transcript: string;
      segments?: { text: string; startTime?: number; start?: number; speaker?: string }[];
      voiceProfile?: { tone: string[]; vocabulary: string[]; pacing: string[]; commonHooks: string[] } | null;
      params?: GenerationParams;
    };

    if (!transcript || typeof transcript !== "string" || !format || typeof format !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const safeFormat = sanitizeString(format, 50);

    if (process.env.USE_REAL_AI !== 'true' || !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({
        error: "Real AI is disabled or missing API keys. Please configure .env"
      }, { status: 501 });
    }

    const p: GenerationParams = params ?? DEFAULT_PARAMS;

    const langInstruction = p.language !== "auto" && LANGUAGE_NAMES[p.language]
      ? `IMPORTANT: Write the entire output in ${LANGUAGE_NAMES[p.language]}. Do not use any other language.`
      : "Match the language of the transcript.";

    const toneInstruction = p.tone !== "auto" && TONE_INSTRUCTIONS[p.tone]
      ? TONE_INSTRUCTIONS[p.tone]
      : voiceProfile
        ? `Match this voice profile exactly — Tone: ${voiceProfile.tone.join(", ")}; Vocabulary: ${voiceProfile.vocabulary.join(", ")}; Pacing: ${voiceProfile.pacing.join(", ")}; Common hooks: ${voiceProfile.commonHooks.join(", ")}.`
        : "Write in a professional, engaging, and clear tone.";

    const systemPrompt = [
      "You are an expert ghostwriter and content multiplier.",
      `Your job is to transform podcast transcripts into high-quality ${format}.`,
      langInstruction,
      toneInstruction,
      LENGTH_INSTRUCTIONS[p.length] ?? LENGTH_INSTRUCTIONS.standard,
    ].join("\n");

    const formatInstructions = buildFormatInstructions(safeFormat, p);

    let transcriptContent = `Here is the raw podcast transcript:\n\n${transcript}`;
    if (format === "chapters" && Array.isArray(segments) && segments.length > 0) {
      const segmentLines = segments.map(s => {
        const time = s.startTime ?? s.start ?? 0;
        const mins = Math.floor(time / 60).toString().padStart(2, "0");
        const secs = Math.floor(time % 60).toString().padStart(2, "0");
        return `[${mins}:${secs}] ${s.text}`;
      }).join("\n");
      transcriptContent = `Here is the timestamped podcast transcript:\n\n${segmentLines}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://expandcast.com',
        'X-Title': 'Expandcast',
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
          { role: 'user', content: `${formatInstructions}\n\n${transcriptContent}` },
        ],
        temperature: 0.7,
        max_tokens: p.length === "brief" ? 1200 : p.length === "detailed" ? 3500 : 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("OpenRouter error:", err);
      return NextResponse.json({ error: "OpenRouter request failed" }, { status: 500 });
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ content: text, format: safeFormat, status: 'completed' });

  } catch (error: unknown) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
