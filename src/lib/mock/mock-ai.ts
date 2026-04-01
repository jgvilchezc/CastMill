import { mockEpisodes, Episode } from "../fixtures/episodes";
import { mockTranscripts, Transcript } from "../fixtures/transcripts";
import { mockGenerations, Generation, ContentFormat } from "../fixtures/generations";
import { mockVoiceProfile, VoiceProfile } from "../fixtures/voice-profile";
import { mockChunks, MemoryChunk } from "../fixtures/chunks";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAI = {
  analyzeVoice: async (texts: string[]): Promise<VoiceProfile> => {
    // If running in browser and we want to try real AI, we could check an env var here
    // But since process.env is mostly server-side, we'll make the fetch call and fallback if it fails/501s
    try {
      const res = await fetch('/api/ai/analyze-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.profile;
      }
      // If 501 (Not Implemented / No Keys), fallback to mock
    } catch (e) {
      console.log("Falling back to mock voice profile");
    }

    await delay(3000); // 3s analysis
    return mockVoiceProfile;
  },

  transcribeEpisode: async (file: File, onProgress: (progress: number) => void): Promise<Transcript> => {
    try {
      // Simulate initial progress
      onProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        onProgress(90);
        const data = await res.json();
        onProgress(100);
        
        // Construct a transcript object from the real text
        return {
          id: `trans_${Date.now()}`,
          episodeId: `ep_new_${Date.now()}`,
          text: data.text,
          segments: [
            {
              id: 1,
              start: 0,
              end: 999,
              text: data.text,
              speaker: "Speaker 1"
            }
          ] // Mocking segments for now as Whisper basic JSON doesn't do diarization natively
        };
      }
    } catch (e) {
      console.log("Falling back to mock transcription");
    }

    // Simulate upload/transcription progress for mock
    for (let i = 0; i <= 100; i += 10) {
      onProgress(i);
      await delay(500); // 5s total
    }
    return mockTranscripts["ep_50"]; // Always return ep_50 transcript for demo
  },

  generateContent: async (episodeId: string, format: ContentFormat, transcriptText?: string, voiceProfile?: VoiceProfile): Promise<Generation> => {
    try {
      // If we have the transcript text passed in, try the real API
      if (transcriptText) {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format, transcript: transcriptText, voiceProfile })
        });
        
        if (res.ok) {
          const data = await res.json();
          return {
            id: `gen_${Date.now()}`,
            episodeId,
            format,
            content: data.content,
            status: 'completed',
            createdAt: new Date().toISOString()
          };
        }
      }
    } catch (e) {
      console.log("Falling back to mock generation");
    }

    await delay(2000); // 2s generation
    const gen = mockGenerations.find(g => g.episodeId === episodeId && g.format === format);
    if (!gen) {
      // Create a dummy generation if the mock doesn't have it for this specific episode
      return {
        id: `gen_${Date.now()}`,
        episodeId,
        format,
        content: `Mock generated content for ${format}. Real AI integration requires setting up API keys in .env.local`,
        status: 'completed',
        createdAt: new Date().toISOString()
      };
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
