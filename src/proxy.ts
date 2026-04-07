import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are not yet configured, allow all traffic through
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseUrl.startsWith("https://")
  ) {
    const response = NextResponse.next({ request });
    addSecurityHeaders(response);
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session — do NOT remove this block
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/episode") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/channel") ||
    pathname.startsWith("/settings");

  if (isAppRoute && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    addSecurityHeaders(supabaseResponse);
    return NextResponse.redirect(loginUrl);
  }

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  if (isAuthRoute && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    addSecurityHeaders(supabaseResponse);
    return NextResponse.redirect(dashboardUrl);
  }

  addSecurityHeaders(supabaseResponse);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
