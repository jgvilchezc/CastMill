import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Neon Object Storage — S3-compatible, branch-scoped.
 *
 * Replaces Supabase Storage. Credentials, endpoint and region come from the
 * AWS-standard env vars Neon injects (`neon env pull`):
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
 *
 * Server-only: the browser never sees these credentials. It uploads through a
 * presigned PUT minted by /api/upload/sign.
 */

export const STORAGE_BUCKET = "episode-audio";

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    if (!process.env.AWS_ENDPOINT_URL_S3) {
      throw new Error(
        "Neon Object Storage is not configured. Run `neon env pull` to get AWS_* vars."
      );
    }
    // forcePathStyle is required — Neon uses path-style addressing.
    _s3 = new S3Client({ forcePathStyle: true });
  }
  return _s3;
}

export function isStorageConfigured(): boolean {
  return !!process.env.AWS_ENDPOINT_URL_S3 && !!process.env.AWS_ACCESS_KEY_ID;
}

/** Presigned PUT so the browser can upload straight to the bucket. */
export async function createUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900
): Promise<string> {
  return getSignedUrl(
    getS3(),
    new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

/**
 * Returns a standalone ArrayBuffer rather than the SDK's Uint8Array: the latter
 * is typed `Uint8Array<ArrayBufferLike>`, which TypeScript refuses to accept as
 * a `BlobPart` when constructing a File.
 */
export async function downloadObject(key: string): Promise<ArrayBuffer> {
  const res = await getS3().send(
    new GetObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) {
    throw new Error(`Empty object at ${key}`);
  }
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

/** Best-effort delete — callers use this for cleanup and ignore failures. */
export async function deleteObject(key: string): Promise<void> {
  try {
    await getS3().send(
      new DeleteObjectCommand({ Bucket: STORAGE_BUCKET, Key: key })
    );
  } catch (error) {
    console.error("[neon/storage] delete failed:", key, error);
  }
}
