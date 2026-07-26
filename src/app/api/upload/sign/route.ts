import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { createUploadUrl, deleteObject } from "@/lib/neon/storage";
import { parseJsonBody } from "@/lib/security/validate";

/**
 * Mints a short-lived presigned PUT so the browser can upload audio directly to
 * Neon Object Storage. Supabase signed the upload client-side from the anon key;
 * S3 credentials must never reach the browser, so this route stands in.
 *
 * The key is derived server-side from the session user, so a client cannot
 * write outside its own prefix.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req, 2048);
  if (bodyError) return bodyError;

  const { filename, contentType } = body as {
    filename?: string;
    contentType?: string;
  };

  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }

  // Strip any path separators so the client cannot escape its own prefix.
  const safeName = filename.replace(/[^\w.\-]/g, "_").slice(-120);
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;

  const uploadUrl = await createUploadUrl(
    storagePath,
    contentType || "application/octet-stream"
  );

  return NextResponse.json({ uploadUrl, storagePath });
}

/**
 * Cleanup for a failed upload. The browser used to call
 * `supabase.storage.remove()` directly; it has no S3 credentials, so the delete
 * has to happen here — scoped to the caller's own prefix.
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storagePath = searchParams.get("path") ?? "";

  if (!storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteObject(storagePath);
  return NextResponse.json({ deleted: true });
}
