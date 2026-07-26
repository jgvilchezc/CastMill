import { getAuth } from "@/lib/neon/auth";

/**
 * Catch-all proxy for the Managed Better Auth API: sign in/up, OAuth callbacks,
 * session management, email verification, password reset.
 *
 * Sits alongside the existing static routes in this folder
 * (`/api/auth/instagram`, `/api/auth/tiktok`). Next.js resolves static segments
 * before a catch-all, so those keep winning for their own paths.
 */
const handlers = () => getAuth().handler();

export async function GET(request: Request, ctx: unknown) {
  return handlers().GET(request as never, ctx as never);
}

export async function POST(request: Request, ctx: unknown) {
  return handlers().POST(request as never, ctx as never);
}
