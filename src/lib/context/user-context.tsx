"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import { VoiceProfile, mockVoiceProfile } from "../fixtures/voice-profile";
import { mockEpisodes, Episode } from "../fixtures/episodes";
import { mockTranscripts, Transcript } from "../fixtures/transcripts";
import { mockGenerations, Generation, ContentFormat } from "../fixtures/generations";
import { mockChunks, MemoryChunk } from "../fixtures/chunks";

interface User {
  id: string;
  name: string;
  email: string;
  plan: "free" | "starter" | "pro";
  credits: number;
  avatarUrl: string;
}

interface UserContextType {
  user: User | null;
  voiceProfile: VoiceProfile | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  updateVoiceProfile: (vp: VoiceProfile) => void;
  upgradePlan: (plan: "starter" | "pro") => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock logged in user for demo purposes, or null to start from landing
      // For MVP demo flow, we might want to start fresh or pre-logged in.
      // Let's start with a pre-configured user but maybe no voice profile if we want to show onboarding.
      // actually, let's simulate a user who just signed up.
      
      setUser({
        id: "usr_1",
        name: "Alex Creator",
        email: "alex@example.com",
        plan: "free",
        credits: 10,
        avatarUrl: "https://github.com/shadcn.png"
      });
      // voiceProfile is null initially
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const login = () => {
     setUser({
        id: "usr_1",
        name: "Alex Creator",
        email: "alex@example.com",
        plan: "free",
        credits: 10,
        avatarUrl: "https://github.com/shadcn.png"
      });
  };

  const logout = () => {
    setUser(null);
    setVoiceProfile(null);
  };

  const updateVoiceProfile = (vp: VoiceProfile) => {
    setVoiceProfile(vp);
  };

  const upgradePlan = (plan: "starter" | "pro") => {
    if (user) {
      setUser({ ...user, plan });
    }
  };

  return (
    <UserContext.Provider value={{ user, voiceProfile, isLoading, login, logout, updateVoiceProfile, upgradePlan }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
