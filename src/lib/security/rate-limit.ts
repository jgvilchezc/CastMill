type WindowEntry = { count: number; resetAt: number };

const store = new Map<string, WindowEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 } as RateLimitConfig,
  ai: { maxRequests: 20, windowMs: 60 * 1000 } as RateLimitConfig,
  admin: { maxRequests: 30, windowMs: 60 * 1000 } as RateLimitConfig,
  general: { maxRequests: 60, windowMs: 60 * 1000 } as RateLimitConfig,
} as const;

export function getRouteLimit(pathname: string): RateLimitConfig {
  if (pathname.startsWith("/api/auth")) return RATE_LIMITS.auth;
  if (pathname.startsWith("/api/ai")) return RATE_LIMITS.ai;
  if (pathname.startsWith("/api/admin")) return RATE_LIMITS.admin;
  if (pathname.startsWith("/api/webhooks")) return RATE_LIMITS.general;
  return RATE_LIMITS.general;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpired();
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  return {
    allowed,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
