import { mockEpisodes, Episode } from "../fixtures/episodes";
import { mockTranscripts, Transcript } from "../fixtures/transcripts";
import { mockGenerations, Generation, ContentFormat } from "../fixtures/generations";
import { mockVoiceProfile, VoiceProfile } from "../fixtures/voice-profile";
import { mockChunks, MemoryChunk } from "../fixtures/chunks";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAI = {
  analyzeVoice: async (texts: string[]): Promise<VoiceProfile> => {
    await delay(3000); // 3s analysis
    return mockVoiceProfile;
  },

  transcribeEpisode: async (file: File, onProgress: (progress: number) => void): Promise<Transcript> => {
    // Simulate upload/transcription progress
    for (let i = 0; i <= 100; i += 10) {
      onProgress(i);
      await delay(500); // 5s total
    }
    return mockTranscripts["ep_50"]; // Always return ep_50 transcript for demo
  },

  generateContent: async (episodeId: string, format: ContentFormat): Promise<Generation> => {
    await delay(2000); // 2s generation
    const gen = mockGenerations.find(g => g.episodeId === episodeId && g.format === format);
    if (!gen) {
      throw new Error(`No mock generation found for ${episodeId} ${format}`);
    }
    return gen;
  },

  searchMemory: async (query: string): Promise<MemoryChunk[]> => {
    await delay(1000); // 1s search
    return mockChunks.filter(c => 
      c.text.toLowerCase().includes(query.toLowerCase()) || 
      c.topics.some(t => t.toLowerCase().includes(query.toLowerCase()))
    );
  }
};
