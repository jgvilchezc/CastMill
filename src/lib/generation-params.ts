import type { ContentFormat } from "@/lib/context/episode-context";
export type { ContentFormat };

export const LANGUAGES = [
  { value: "auto",       label: "Auto (detect)" },
  { value: "en",         label: "English" },
  { value: "es",         label: "Español" },
  { value: "pt",         label: "Português" },
  { value: "fr",         label: "Français" },
  { value: "de",         label: "Deutsch" },
  { value: "it",         label: "Italiano" },
  { value: "nl",         label: "Nederlands" },
  { value: "pl",         label: "Polski" },
  { value: "ru",         label: "Русский" },
  { value: "zh",         label: "中文" },
  { value: "ja",         label: "日本語" },
  { value: "ko",         label: "한국어" },
  { value: "ar",         label: "العربية" },
] as const;

export const TONES = [
  { value: "auto",          label: "Auto (match voice)" },
  { value: "professional",  label: "Professional" },
  { value: "casual",        label: "Casual" },
  { value: "conversational",label: "Conversational" },
  { value: "bold",          label: "Bold & Direct" },
  { value: "educational",   label: "Educational" },
  { value: "humorous",      label: "Humorous" },
  { value: "inspirational", label: "Inspirational" },
] as const;

export const LENGTHS = [
  { value: "brief",    label: "Brief" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];
export type Tone     = (typeof TONES)[number]["value"];
export type Length   = (typeof LENGTHS)[number]["value"];

export interface FormatOptions {
  blog: {
    includeTakeaways: boolean;
    includeFaq: boolean;
    seoFocus: boolean;
  };
  tweet_thread: {
    tweetCount: 5 | 7 | 10 | 15;
    includeEmojis: boolean;
  };
  linkedin: {
    ctaStyle: "question" | "invite" | "challenge" | "none";
  };
  newsletter: {
    subjectLineStyle: "question" | "teaser" | "statement" | "numbered";
    includeQuote: boolean;
  };
  youtube_desc: {
    includeChapters: boolean;
    includeKeywords: boolean;
  };
  thumbnail: Record<string, never>;
  chapters: {
    chapterCount: "5" | "7" | "10" | "auto";
    includeDescriptions: boolean;
  };
  quotes: Record<string, never>;
  show_notes: {
    includeGuestBio: boolean;
    includeResources: boolean;
    includeTimestamps: boolean;
  };
}

export interface GenerationParams {
  language: Language;
  tone: Tone;
  length: Length;
  formatOptions: Partial<FormatOptions>;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  blog:         { includeTakeaways: true,  includeFaq: false,  seoFocus: true  },
  tweet_thread: { tweetCount: 7,           includeEmojis: true },
  linkedin:     { ctaStyle: "question" },
  newsletter:   { subjectLineStyle: "teaser", includeQuote: true },
  youtube_desc: { includeChapters: true,   includeKeywords: true },
  thumbnail:    {},
  chapters:     { chapterCount: "auto",    includeDescriptions: false },
  quotes:       {},
  show_notes:   { includeGuestBio: true,   includeResources: true, includeTimestamps: true },
};

export const DEFAULT_PARAMS: GenerationParams = {
  language:      "auto",
  tone:          "auto",
  length:        "standard",
  formatOptions: DEFAULT_FORMAT_OPTIONS,
};

const STORAGE_KEY = "expandcast:gen-params";

export function loadParams(): GenerationParams {
  if (typeof window === "undefined") return DEFAULT_PARAMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PARAMS;
    return { ...DEFAULT_PARAMS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PARAMS;
  }
}

export function saveParams(params: GenerationParams): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
}

export function getFormatOptions<F extends ContentFormat>(
  params: GenerationParams,
  format: F
): FormatOptions[F] {
  return (params.formatOptions[format] ?? DEFAULT_FORMAT_OPTIONS[format]) as FormatOptions[F];
}
