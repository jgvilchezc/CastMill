import { createNeonAuth } from "@neondatabase/auth/next/server";

export function isNeonAuthConfigured(): boolean {
  return (
    (process.env.NEON_AUTH_BASE_URL ?? "").startsWith("https://") &&
    (process.env.NEON_AUTH_COOKIE_SECRET ?? "").length >= 32
  );
}

/**
 * Server-side auth instance. Replaces the Supabase server client's `auth.*`
 * surface (`src/lib/supabase/server.ts`).
 *
 * Sessions live in a signed, HTTP-only cookie; user rows live in the
 * `neon_auth` schema of the same database.
 *
 * Lazy on purpose: a module-level createNeonAuth() would run during `next build`
 * and blow up when the env vars aren't set yet.
 */
let _auth: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    if (!isNeonAuthConfigured()) {
      throw new Error(
        "Neon Auth is not configured. Add NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET (32+ chars) to .env.local"
      );
    }
    _auth = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      },
    });
  }
  return _auth;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

/**
 * Drop-in shape for the old `supabase.auth.getUser()` call sites: returns the
 * user or null instead of throwing.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const { data: session } = await getAuth().getSession();
  const user = session?.user;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
  };
}

/** Same, but throws — for route handlers that already return 401 on null. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Gate for the /admin routes. Ported from the Supabase admin client; the check
 * is unchanged — match the session email against ADMIN_EMAIL.
 */
export async function requireAdmin(): Promise<{ email: string; id: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL not configured");
  }

  const user = await getSessionUser();

  const normalizedAdmin = adminEmail.toLowerCase().trim();
  const normalizedUser = user?.email?.toLowerCase().trim() ?? "";

  if (!user || normalizedUser !== normalizedAdmin) {
    throw new Error("Unauthorized");
  }

  return { email: user.email, id: user.id };
}
