"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { logout as serverLogout } from "@/app/actions/auth";
import { PLANS, canUseFormat as planCanUseFormat } from "@/lib/plans";
import type { PlanId, ContentFormat } from "@/lib/plans";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type VoiceProfile = Database["public"]["Tables"]["voice_profiles"]["Row"];

interface User {
  id: string;
  name: string | null;
  email: string | undefined;
  plan: PlanId;
  credits: number;
  avatarUrl: string | null;
  episodesUsedThisMonth: number;
  billingPeriodStart: string;
}

interface UserContextType {
  user: User | null;
  voiceProfile: VoiceProfile | null;
  isLoading: boolean;
  episodesUsed: number;
  episodesLimit: number;
  canUpload: boolean;
  logout: () => Promise<void>;
  updateVoiceProfile: (vp: VoiceProfile) => void;
  upgradePlan: (plan: "starter" | "pro") => Promise<void>;
  consumeEpisodeCredit: () => Promise<boolean>;
  canUseFormat: (format: ContentFormat) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function isNewBillingPeriod(billingPeriodStart: string): boolean {
  const start = new Date(billingPeriodStart);
  const now = new Date();
  return (
    now.getFullYear() > start.getFullYear() || now.getMonth() > start.getMonth()
  );
}

function mapProfileToUser(
  supabaseUser: SupabaseUser,
  profile: Profile | null,
): User {
  return {
    id: supabaseUser.id,
    name: profile?.name ?? supabaseUser.user_metadata?.full_name ?? null,
    email: supabaseUser.email,
    plan: (profile?.plan ?? "free") as PlanId,
    credits: profile?.credits ?? 10,
    avatarUrl:
      profile?.avatar_url ?? supabaseUser.user_metadata?.avatar_url ?? null,
    episodesUsedThisMonth: profile?.episodes_used_this_month ?? 0,
    billingPeriodStart:
      profile?.billing_period_start ?? new Date().toISOString().split("T")[0],
  };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
        supabase
          .from("profiles")
          .select("*")
          .eq("id", supabaseUser.id)
          .single(),
        supabase
          .from("voice_profiles")
          .select("*")
          .eq("user_id", supabaseUser.id)
          .maybeSingle(),
      ]);

      setUser(mapProfileToUser(supabaseUser, profile));
      setVoiceProfile(vp ?? null);
      setIsLoading(false);
    }

    supabase.auth.getUser().then(({ data: { user: u } }) => loadUser(u));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const episodesUsed = user?.episodesUsedThisMonth ?? 0;
  const episodesLimit = user ? PLANS[user.plan].episodesPerMonth : 0;
  const canUpload = user ? episodesUsed < episodesLimit : false;

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

  const consumeEpisodeCredit = useCallback(async (): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) return false;

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const needsReset = isNewBillingPeriod(user.billingPeriodStart);

    const newUsed = needsReset ? 1 : user.episodesUsedThisMonth + 1;
    const limit = PLANS[user.plan].episodesPerMonth;

    if (!needsReset && user.episodesUsedThisMonth >= limit) {
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        episodes_used_this_month: newUsed,
        billing_period_start: needsReset ? today : user.billingPeriodStart,
      })
      .eq("id", user.id);

    if (error) {
      console.error("consumeEpisodeCredit error:", error.message);
      if (error.message?.includes("billing_period_start") || error.message?.includes("episodes_used_this_month")) {
        console.warn("Migration needed: run ALTER TABLE in Supabase SQL Editor. See supabase/schema.sql");
      }
      return false;
    }

    setUser({
      ...user,
      episodesUsedThisMonth: newUsed,
      billingPeriodStart: needsReset ? today : user.billingPeriodStart,
    });

    return true;
  }, [user]);

  const canUseFormatFn = useCallback(
    (format: ContentFormat): boolean => {
      if (!user) return false;
      return planCanUseFormat(user.plan, format);
    },
    [user],
  );

  return (
    <UserContext.Provider
      value={{
        user,
        voiceProfile,
        isLoading,
        episodesUsed,
        episodesLimit,
        canUpload,
        logout,
        updateVoiceProfile,
        upgradePlan,
        consumeEpisodeCredit,
        canUseFormat: canUseFormatFn,
      }}
    >
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
