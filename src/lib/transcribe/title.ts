import Groq from "groq-sdk";

const MAX_TITLE_CHARS = 80;
const MAX_INPUT_CHARS = 1200;
const FALLBACK_WORDS = 6;

export function fallbackTitle(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Transcripción";
  return words.slice(0, FALLBACK_WORDS).join(" ").slice(0, MAX_TITLE_CHARS);
}

export async function generateTitle(text: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallbackTitle(text);

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 20,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Generate a short, specific title (max 6 words) for this audio " +
            "transcription. Reply with ONLY the title — no quotes, no prefix — " +
            "in the same language as the text.",
        },
        { role: "user", content: text.slice(0, MAX_INPUT_CHARS) },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!cleaned) return fallbackTitle(text);
    return cleaned.slice(0, MAX_TITLE_CHARS);
  } catch (err) {
    console.error("[transcribe/title] generation failed:", err);
    return fallbackTitle(text);
  }
}
