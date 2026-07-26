import { NextResponse, type NextRequest } from "next/server";
import { getAuth, isNeonAuthConfigured } from "@/lib/neon/auth";
import {
  checkRateLimit,
  getRouteLimit,
} from "@/lib/security/rate-limit";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
}

function addRateLimitHeaders(
  response: NextResponse,
  result: { limit: number; remaining: number; resetAt: number }
): void {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(result.resetAt / 1000))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rate limiting for API routes ---
  if (pathname.startsWith("/api")) {
    if (!pathname.startsWith("/api/webhooks")) {
      const ip = getClientIp(request);
      const config = getRouteLimit(pathname);
      const key = `${ip}:${pathname.startsWith("/api/auth") ? "auth" : pathname.startsWith("/api/ai") ? "ai" : pathname.startsWith("/api/admin") ? "admin" : "general"}`;
      const result = checkRateLimit(key, config);

      if (!result.allowed) {
        const retryAfter = Math.ceil(
          (result.resetAt - Date.now()) / 1000
        );
        const res = NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
        res.headers.set("Retry-After", String(retryAfter));
        addRateLimitHeaders(res, result);
        addSecurityHeaders(res);
        return res;
      }

      const response = NextResponse.next({ request });
      addRateLimitHeaders(response, result);
      addSecurityHeaders(response);
      return response;
    }

    const response = NextResponse.next({ request });
    addSecurityHeaders(response);
    return response;
  }

  // --- Session refresh & route protection ---

  // If Neon Auth env vars are not yet configured, allow all traffic through
  if (!isNeonAuthConfigured()) {
    const response = NextResponse.next({ request });
    addSecurityHeaders(response);
    return response;
  }

  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/episode") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/channel") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/transcribe") ||
    pathname.startsWith("/memory");

  // Neon's middleware validates the session cookie, refreshes expired tokens and
  // redirects to loginUrl when there is no session. It is applied ONLY to app
  // routes: it has no publicRoutes option, so running it across the whole
  // matcher would lock the landing page and the legal pages behind login.
  if (isAppRoute) {
    const response = await getAuth().middleware({ loginUrl: "/login" })(request);
    addSecurityHeaders(response);
    return response;
  }

  // NOTE: the old "signed-in user visiting /login is bounced to /dashboard"
  // redirect used to live here. It needed a session read on a public route,
  // which this middleware no longer performs. That redirect moves into the
  // /login and /register pages as a server-side auth.getSession() check.

  const response = NextResponse.next({ request });
  addSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
