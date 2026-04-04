"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";
import type { GenerationParams } from "@/lib/generation-params";

type EpisodeRow = Database["public"]["Tables"]["episodes"]["Row"];
type TranscriptRow = Database["public"]["Tables"]["transcripts"]["Row"];
type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];
type GenerationInsert = Database["public"]["Tables"]["generations"]["Insert"];

export type ContentFormat = "blog" | "tweet_thread" | "linkedin" | "newsletter" | "youtube_desc" | "thumbnail";

// Shape that the rest of the app expects (snake_case → camelCase adapter)
export interface Episode {
  id: string;
  title: string;
  date: string;
  duration: number;
  topics: string[];
  status: "ready" | "processing" | "failed";
  generationCount: number;
  guests: string[];
  description: string | null;
  thumbnailUrl: string | null;
  viralMoments?: unknown | null;
}

export interface Transcript {
  id: string;
  episodeId: string;
  text: string;
  segments: unknown;
}

export interface Generation {
  id: string;
  episodeId: string;
  format: ContentFormat;
  content: string;
  status: "ready" | "generating";
  createdAt: string;
}

function rowToEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    title: row.title,
    date: row.created_at.split("T")[0],
    duration: row.duration,
    topics: row.topics,
    status: row.status,
    generationCount: row.generation_count,
    guests: row.guests,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    viralMoments: row.viral_moments ?? null,
  };
}

function rowToTranscript(row: TranscriptRow): Transcript {
  return {
    id: row.id,
    episodeId: row.episode_id,
    text: row.text,
    segments: row.segments,
  };
}

function rowToGeneration(row: GenerationRow): Generation {
  return {
    id: row.id,
    episodeId: row.episode_id,
    format: row.format,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  };
}

interface EpisodeContextType {
  episodes: Episode[];
  currentEpisode: Episode | null;
  transcripts: Record<string, Transcript>;
  generations: Generation[];
  isLoadingEpisodes: boolean;

  addEpisode: (ep: Omit<Episode, "id" | "date" | "generationCount">) => Promise<Episode>;
  deleteEpisode: (id: string) => Promise<void>;
  selectEpisode: (id: string) => void;
  generateContent: (episodeId: string, format: ContentFormat, params?: GenerationParams) => Promise<void>;
  updateTranscript: (episodeId: string, text: string, segments?: unknown) => Promise<void>;
  refreshEpisode: (episodeId: string) => Promise<void>;
}

const EpisodeContext = createContext<EpisodeContextType | undefined>(undefined);

export const EpisodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = createClient();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, Transcript>>({});
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);

  const loadEpisodes = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEpisodes(data.map(rowToEpisode));
    }
    setIsLoadingEpisodes(false);
  }, [supabase]);

  useEffect(() => {
    // If Supabase is not configured yet, skip DB load
    if (!isSupabaseConfigured()) {
      setIsLoadingEpisodes(false);
      return;
    }

    let userId: string | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userId = user.id;
        loadEpisodes(user.id);
      } else {
        setIsLoadingEpisodes(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && session.user.id !== userId) {
        userId = session.user.id;
        loadEpisodes(session.user.id);
      } else if (!session) {
        setEpisodes([]);
        setTranscripts({});
        setGenerations([]);
        setIsLoadingEpisodes(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addEpisode = async (ep: Omit<Episode, "id" | "date" | "generationCount">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("episodes")
      .insert({
        user_id: user.id,
        title: ep.title,
        description: ep.description ?? "",
        duration: ep.duration,
        topics: ep.topics,
        guests: ep.guests,
        status: "processing",
        thumbnail_url: ep.thumbnailUrl ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create episode");
    const episode = rowToEpisode(data);
    setEpisodes(prev => [episode, ...prev]);
    return episode;
  };

  const deleteEpisode = async (id: string) => {
    const { error } = await supabase.from("episodes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setEpisodes(prev => prev.filter(e => e.id !== id));
    setTranscripts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setGenerations(prev => prev.filter(g => g.episodeId !== id));
    setCurrentEpisode(prev => (prev?.id === id ? null : prev));
  };

  const selectEpisode = (id: string) => {
    const ep = episodes.find(e => e.id === id);
    if (ep) setCurrentEpisode(ep);
  };

  const updateTranscript = async (episodeId: string, text: string, segments: unknown = []) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert transcript (one per episode)
    const { data, error } = await supabase
      .from("transcripts")
      .upsert(
        { episode_id: episodeId, user_id: user.id, text, segments: segments as Database["public"]["Tables"]["transcripts"]["Insert"]["segments"] },
        { onConflict: "episode_id" }
      )
      .select()
      .single();

    if (!error && data) {
      setTranscripts(prev => ({ ...prev, [episodeId]: rowToTranscript(data) }));
    }

    // Mark episode as ready
    await supabase
      .from("episodes")
      .update({ status: "ready" })
      .eq("id", episodeId);

    setEpisodes(prev =>
      prev.map(e => e.id === episodeId ? { ...e, status: "ready" } : e)
    );
  };

  const generateContent = async (episodeId: string, format: ContentFormat, params?: GenerationParams) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistic UI: mark as generating
    const tempId = `temp_${Date.now()}`;
    setGenerations(prev => [
      { id: tempId, episodeId, format, content: "", status: "generating", createdAt: new Date().toISOString() },
      ...prev.filter(g => !(g.episodeId === episodeId && g.format === format)),
    ]);

    try {
      const transcript = transcripts[episodeId];

      // If transcript isn't in local state yet, fetch it from DB
      let transcriptText = transcript?.text;
      if (!transcriptText) {
        const { data } = await supabase
          .from("transcripts")
          .select("text")
          .eq("episode_id", episodeId)
          .maybeSingle();
        transcriptText = data?.text ?? "";
      }

      let content: string;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        let res: Response;
        if (format === "thumbnail") {
          const episode = episodes.find((e) => e.id === episodeId);
          res = await fetch("/api/ai/generate-thumbnail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: episode?.title ?? "", transcript: transcriptText }),
            signal: controller.signal,
          });
        } else {
          res = await fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ format, transcript: transcriptText, params }),
            signal: controller.signal,
          });
        }

        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          content = json.content;
        } else {
          content = `Mock generated ${format} content. Set USE_REAL_AI=true and configure API keys to enable real generation.`;
        }
      } catch {
        content = `Mock generated ${format} content. Set USE_REAL_AI=true and configure API keys to enable real generation.`;
      }

      // Persist to DB
      const insert: GenerationInsert = {
        episode_id: episodeId,
        user_id: user.id,
        format,
        content,
        status: "ready",
      };

      const { data: saved } = await supabase
        .from("generations")
        .upsert(insert, { onConflict: "episode_id,format" })
        .select()
        .single();

      // Replace temp with real row
      setGenerations(prev => [
        ...(saved ? [rowToGeneration(saved)] : [{ id: tempId, episodeId, format, content, status: "ready" as const, createdAt: new Date().toISOString() }]),
        ...prev.filter(g => g.id !== tempId && !(g.episodeId === episodeId && g.format === format)),
      ]);

      await supabase.from("episodes")
        .update({ generation_count: (episodes.find(e => e.id === episodeId)?.generationCount ?? 0) + 1 })
        .eq("id", episodeId);

      setEpisodes(prev =>
        prev.map(e => e.id === episodeId ? { ...e, generationCount: e.generationCount + 1 } : e)
      );

    } catch {
      // Remove temp on error
      setGenerations(prev => prev.filter(g => g.id !== tempId));
    }
  };

  const refreshEpisode = async (episodeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: ep }, { data: trans }, { data: gens }] = await Promise.all([
      supabase.from("episodes").select("*").eq("id", episodeId).single(),
      supabase.from("transcripts").select("*").eq("episode_id", episodeId).maybeSingle(),
      supabase.from("generations").select("*").eq("episode_id", episodeId).order("created_at", { ascending: false }),
    ]);

    if (ep) setEpisodes(prev => prev.map(e => e.id === episodeId ? rowToEpisode(ep) : e));
    if (trans) setTranscripts(prev => ({ ...prev, [episodeId]: rowToTranscript(trans) }));
    if (gens) {
      setGenerations(prev => [
        ...gens.map(rowToGeneration),
        ...prev.filter(g => g.episodeId !== episodeId),
      ]);
    }
  };

  return (
    <EpisodeContext.Provider value={{
      episodes, currentEpisode, transcripts, generations, isLoadingEpisodes,
      addEpisode, deleteEpisode, selectEpisode, generateContent, updateTranscript, refreshEpisode,
    }}>
      {children}
    </EpisodeContext.Provider>
  );
};

export const useEpisodes = () => {
  const context = useContext(EpisodeContext);
  if (context === undefined) {
    throw new Error("useEpisodes must be used within an EpisodeProvider");
  }
  return context;
};
