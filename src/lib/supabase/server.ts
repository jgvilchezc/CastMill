import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // In Server Components, cookies can't be modified.
          // The proxy handles session refresh.
        }
      },
    },
  });
}

export function isSupabaseConfigured(): boolean {
  const validUrl = supabaseUrl.startsWith("https://");
  const validKey = supabaseAnonKey.startsWith("sb_publishable_") || supabaseAnonKey.startsWith("eyJ");
  return validUrl && validKey;
}
