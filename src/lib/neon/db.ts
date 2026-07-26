import { neon } from "@neondatabase/serverless";

/**
 * Owner-level SQL access. This is the replacement for Supabase's service-role
 * client (`src/lib/supabase/admin.ts`).
 *
 * It connects as the project owner, which bypasses RLS — the same privilege the
 * service role had. Because RLS does NOT apply here, every query must scope
 * rows explicitly (`where user_id = ${userId}`). Use this only in server code:
 * webhooks, cron jobs, and routes that already resolved the user from the
 * session.
 *
 * For anything acting on behalf of a signed-in user in the browser, use
 * `src/lib/neon/client.ts` instead and let RLS do the scoping.
 */

// Lazy: a top-level neon() would throw during `next build` when DATABASE_URL is
// not yet set. Plain function, not a Proxy — Proxy wrappers break libraries that
// introspect the client object.
let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Missing DATABASE_URL");
    }
    _sql = neon(url);
  }
  return _sql;
}

export function isDatabaseConfigured(): boolean {
  return (process.env.DATABASE_URL ?? "").startsWith("postgres");
}
