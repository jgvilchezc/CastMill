"use client";

import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "twitter";

export async function signInWithOAuth(provider: OAuthProvider) {
  const supabase = createClient();
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "https://expandcast.com/auth/callback";

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) throw new Error(error.message);
}
