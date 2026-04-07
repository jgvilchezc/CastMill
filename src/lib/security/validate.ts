import { NextResponse } from "next/server";

const MAX_JSON_BODY_BYTES = 1_048_576; // 1 MB
const MAX_FORMDATA_BODY_BYTES = 104_857_600; // 100 MB (video uploads)
const MAX_STRING_FIELD_LENGTH = 50_000;

const HTML_TAG_RE = /<\/?[^>]+(>|$)/g;

export function stripHtml(input: string): string {
  return input.replace(HTML_TAG_RE, "");
}

export function sanitizeString(
  value: unknown,
  maxLength = MAX_STRING_FIELD_LENGTH
): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

const PRIVATE_IP_PATTERNS = [
  /^https?:\/\/localhost([:\/]|$)/i,
  /^https?:\/\/127\./i,
  /^https?:\/\/10\./i,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i,
  /^https?:\/\/192\.168\./i,
  /^https?:\/\/0\.0\.0\.0/i,
  /^https?:\/\/\[::1\]/i,
  /^https?:\/\/169\.254\./i,
];

export function isValidPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(url)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<{ data: T | null; error: NextResponse | null }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      ),
    };
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return {
      data: null,
      error: NextResponse.json(
        { error: `Payload too large (max ${Math.round(maxBytes / 1024)}KB)` },
        { status: 413 }
      ),
    };
  }

  try {
    const raw = await req.text();
    if (raw.length > maxBytes) {
      return {
        data: null,
        error: NextResponse.json(
          { error: `Payload too large (max ${Math.round(maxBytes / 1024)}KB)` },
          { status: 413 }
        ),
      };
    }
    const parsed = JSON.parse(raw) as T;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {
        data: null,
        error: NextResponse.json(
          { error: "Request body must be a JSON object" },
          { status: 400 }
        ),
      };
    }
    return { data: parsed, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      ),
    };
  }
}

export async function parseFormData(
  req: Request,
  maxBytes = MAX_FORMDATA_BODY_BYTES
): Promise<{ data: FormData | null; error: NextResponse | null }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return {
      data: null,
      error: NextResponse.json(
        { error: `Payload too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)` },
        { status: 413 }
      ),
    };
  }

  try {
    const formData = await req.formData();
    return { data: formData, error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 }
      ),
    };
  }
}
