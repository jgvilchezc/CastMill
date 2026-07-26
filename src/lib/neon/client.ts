import { createClient as createNeonClient, SupabaseAuthAdapter } from "@neondatabase/neon-js";

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL ?? "";
const dataApiUrl = process.env.NEXT_PUBLIC_NEON_DATA_API_URL ?? "";

export function isNeonConfigured(): boolean {
  return authUrl.startsWith("https://") && dataApiUrl.startsWith("https://");
}

let _client: ReturnType<typeof createBrowserClient> | null = null;

function createBrowserClient() {
  // SupabaseAuthAdapter is a factory — it must be called. It gives the client a
  // Supabase-compatible surface (auth.signInWithPassword, auth.getUser,
  // from().select()...), so existing call sites keep working.
  //
  // The two-URL object form is required: @neondatabase/neon-js@0.6.2-beta does
  // not yet accept the single-URL form shown in Neon's docs.
  return createNeonClient({
    auth: {
      adapter: SupabaseAuthAdapter(),
      url: authUrl,
    },
    dataApi: {
      url: dataApiUrl,
    },
  });
}

/**
 * Browser client. Queries go through the Neon Data API (PostgREST) carrying the
 * user's JWT, so Row Level Security scopes every row — same trust model the
 * Supabase browser client had.
 */
export function createClient() {
  if (!isNeonConfigured()) {
    throw new Error(
      "Neon is not configured. Add NEXT_PUBLIC_NEON_AUTH_URL and NEXT_PUBLIC_NEON_DATA_API_URL to .env.local"
    );
  }
  if (!_client) {
    _client = createBrowserClient();
  }
  return _client;
}
