export interface VoiceProfile {
  id: string;
  tone: string;
  formality: number; // 1-5
  humorFrequency: string;
  humorStyle: string;
  sentenceLength: string;
  paragraphStyle: string;
  vocabularyLevel: string;
  catchphrases: string[];
  avoids: string[];
  sample: string;
}

export const mockVoiceProfile: VoiceProfile = {
  id: "vp_1",
  tone: "conversational-authoritative",
  formality: 3,
  humorFrequency: "occasional",
  humorStyle: "dry-sarcasm",
  sentenceLength: "mixed-short-bias",
  paragraphStyle: "punchy",
  vocabularyLevel: "accessible-technical",
  catchphrases: ["at the end of the day", "let's be real", "here's the thing"],
  avoids: ["corporate jargon", "passive voice"],
  sample: "Look, everyone wants to talk about growth hacking, but nobody wants to do the boring work. Here's the thing: viral loops are great, but if your product is broken, you're just scaling churn. Let's be real for a second—when was the last time a 'hack' built a billion-dollar company? Exactly."
};
