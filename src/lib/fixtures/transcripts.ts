export interface TranscriptSegment {
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface Transcript {
  episodeId: string;
  segments: TranscriptSegment[];
}

export const mockTranscripts: Record<string, Transcript> = {
  "ep_50": {
    episodeId: "ep_50",
    segments: [
      { speaker: "Host", startTime: 0, endTime: 15, text: "Welcome back to The Growth Show. Today we're diving deep into sales strategies for 2026. If you think cold calling is dead, you're in for a surprise." },
      { speaker: "Guest", startTime: 15, endTime: 45, text: "Thanks for having me. Honestly, the biggest shift I've seen isn't about the channel, it's about context. Cold outreach works if the context is relevant." },
      { speaker: "Host", startTime: 45, endTime: 70, text: "Exactly. It's like we talked about back in episode 12—direct sales is fundamentally about solving a problem, not just pitching a feature. But now with AI, everyone is spamming." },
      { speaker: "Guest", startTime: 70, endTime: 95, text: "Right. AI makes it easy to send a thousand emails, but it makes it harder to be human. The winners in 2026 will be the ones who use AI to be *more* human, not less." },
      { speaker: "Host", startTime: 95, endTime: 120, text: "I love that. So let's break down the three pillars of this 'human-first' approach. Number one: hyper-personalization at scale. Is that even possible?" }
    ]
  },
  "ep_12": {
    episodeId: "ep_12",
    segments: [
      { speaker: "Host", startTime: 320, endTime: 350, text: "Direct sales has always been about one thing: trust. If they don't trust you, they won't buy. It doesn't matter how good your script is." },
      { speaker: "Host", startTime: 350, endTime: 380, text: "Think about it. When was the last time you bought something from a stranger who felt fake? Never. So the first rule of direct sales is: be real." }
    ]
  }
};
