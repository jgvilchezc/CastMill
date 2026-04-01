"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logout as serverLogout } from "@/app/actions/auth";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type VoiceProfile = Database["public"]["Tables"]["voice_profiles"]["Row"];

interface User {
  id: string;
  name: string | null;
  email: string | undefined;
  plan: "free" | "starter" | "pro";
  credits: number;
  avatarUrl: string | null;
}

interface UserContextType {
  user: User | null;
  voiceProfile: VoiceProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  updateVoiceProfile: (vp: VoiceProfile) => void;
  upgradePlan: (plan: "starter" | "pro") => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function mapProfileToUser(supabaseUser: SupabaseUser, profile: Profile | null): User {
  return {
    id: supabaseUser.id,
    name: profile?.name ?? supabaseUser.user_metadata?.full_name ?? null,
    email: supabaseUser.email,
    plan: profile?.plan ?? "free",
    credits: profile?.credits ?? 10,
    avatarUrl: profile?.avatar_url ?? supabaseUser.user_metadata?.avatar_url ?? null,
  };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    async function loadUser(supabaseUser: SupabaseUser | null) {
      if (!supabaseUser) {
        setUser(null);
        setVoiceProfile(null);
        setIsLoading(false);
        return;
      }

      const [{ data: profile }, { data: vp }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", supabaseUser.id).single(),
        supabase.from("voice_profiles").select("*").eq("user_id", supabaseUser.id).maybeSingle(),
      ]);

      setUser(mapProfileToUser(supabaseUser, profile));
      setVoiceProfile(vp ?? null);
      setIsLoading(false);
    }

    // Initial load
    supabase.auth.getUser().then(({ data: { user: u } }) => loadUser(u));

    // Listen for session changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await serverLogout();
  };

  const updateVoiceProfile = (vp: VoiceProfile) => {
    setVoiceProfile(vp);
  };

  const upgradePlan = async (plan: "starter" | "pro") => {
    if (!user || !isSupabaseConfigured()) return;
    const { error } = await createClient()
      .from("profiles")
      .update({ plan })
      .eq("id", user.id);
    if (!error) setUser({ ...user, plan });
  };

  return (
    <UserContext.Provider value={{ user, voiceProfile, isLoading, logout, updateVoiceProfile, upgradePlan }}>
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
