"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/neon/auth";

/**
 * Neon Auth supports google, github and vercel only. Twitter/X is NOT among
 * them — it was in the Supabase version's type union, but no button ever
 * rendered for it, so nothing in the UI is lost.
 *
 * The union is inlined rather than exported: this is a "use server" module and
 * every export must be an async function.
 */
export async function signInWithOAuth(
  provider: "google" | "github" | "vercel"
) {
  // Better Auth handles the provider round-trip on its own callback route under
  // /api/auth/callback/:provider, so there is no code-for-session exchange to do
  // here. callbackURL is where the user lands once that completes.
  const { data, error } = await getAuth().signIn.social({
    provider,
    callbackURL: "/dashboard",
  });

  if (error) {
    redirect("/login?error=oauth_failed");
  }

  const url = data?.url;
  if (!url) {
    redirect("/login?error=oauth_failed");
  }

  redirect(url);
}
