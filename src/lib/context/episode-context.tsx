"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import { mockEpisodes, Episode } from "../fixtures/episodes";
import { mockTranscripts, Transcript } from "../fixtures/transcripts";
import { mockGenerations, Generation, ContentFormat } from "../fixtures/generations";
import { mockChunks, MemoryChunk } from "../fixtures/chunks";

interface EpisodeContextType {
  episodes: Episode[];
  currentEpisode: Episode | null;
  transcripts: Record<string, Transcript>;
  generations: Generation[];
  chunks: MemoryChunk[];
  
  // Actions
  addEpisode: (ep: Episode) => void;
  selectEpisode: (id: string) => void;
  generateContent: (episodeId: string, format: ContentFormat) => Promise<void>;
  updateTranscript: (id: string, transcript: Transcript) => void;
  searchChunks: (query: string) => MemoryChunk[];
}

const EpisodeContext = createContext<EpisodeContextType | undefined>(undefined);

export const EpisodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [episodes, setEpisodes] = useState<Episode[]>(mockEpisodes);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, Transcript>>(mockTranscripts);
  const [generations, setGenerations] = useState<Generation[]>(mockGenerations);
  const [chunks, setChunks] = useState<MemoryChunk[]>(mockChunks);

  const addEpisode = (ep: Episode) => {
    setEpisodes(prev => [ep, ...prev]);
  };

  const selectEpisode = (id: string) => {
    const ep = episodes.find(e => e.id === id);
    if (ep) {
      setCurrentEpisode(ep);
    }
  };

  const generateContent = async (episodeId: string, format: ContentFormat) => {
    // This will be called by UI components to simulate content generation
    // We can just find the mock generation and verify it exists
    const gen = mockGenerations.find(g => g.episodeId === episodeId && g.format === format);
    if (gen) {
        // Maybe update status or something if we want to simulate state change
        // For now, it's already "ready" in mocks
        console.log(`Generating content for ${episodeId} ${format}`);
    }
  };

  const updateTranscript = (id: string, transcript: Transcript) => {
    setTranscripts(prev => ({ ...prev, [id]: transcript }));
  };

  const searchChunks = (query: string) => {
    return chunks.filter(c => 
      c.text.toLowerCase().includes(query.toLowerCase()) || 
      c.topics.some(t => t.toLowerCase().includes(query.toLowerCase()))
    );
  };

  return (
    <EpisodeContext.Provider value={{ episodes, currentEpisode, transcripts, generations, chunks, addEpisode, selectEpisode, generateContent, updateTranscript, searchChunks }}>
      {children}
    </EpisodeContext.Provider>
  );
};

export const useEpisodes = () => {
  const context = useContext(EpisodeContext);
  if (context === undefined) {
    throw new Error("useEpisodes must be used within a EpisodeProvider");
  }
  return context;
};
