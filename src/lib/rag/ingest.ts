import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "./embeddings";

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  like_count?: number;
  comments_count?: number;
  timestamp: string;
  permalink?: string;
}

interface InstagramComment {
  id: string;
  text: string;
  timestamp: string;
  username: string;
}

interface RagDocument {
  user_id: string;
  source: string;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: string;
}

interface MediaFetchResult {
  media: InstagramMedia[];
  error?: string;
}

async function fetchInstagramMedia(
  accessToken: string,
  limit = 50
): Promise<MediaFetchResult> {
  const allMedia: InstagramMedia[] = [];
  const fields =
    "id,caption,media_type,permalink,timestamp,like_count,comments_count";

  let nextUrl: string | null =
    `https://graph.instagram.com/v21.0/me/media?fields=${fields}&limit=${Math.min(limit, 50)}&access_token=${accessToken}`;

  while (nextUrl && allMedia.length < limit) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message ?? "Unknown error";
      console.error("[rag/ingest] Instagram media fetch failed:", err);
      return {
        media: allMedia,
        error: msg.includes("blocked")
          ? "Instagram API access blocked. Your Meta app may need App Review or Live mode to access media. Profile data was still indexed."
          : `Instagram media fetch failed: ${msg}`,
      };
    }
    const data = await res.json();
    allMedia.push(...(data?.data ?? []));
    nextUrl = data?.paging?.next ?? null;
  }

  return { media: allMedia.slice(0, limit) };
}

async function fetchMediaComments(
  accessToken: string,
  mediaId: string
): Promise<InstagramComment[]> {
  const allComments: InstagramComment[] = [];
  const fields = "id,text,timestamp,username";

  const url = new URL(`https://graph.instagram.com/v21.0/${mediaId}/comments`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", accessToken);

  let fetchUrl: string | null = url.toString();
  let attempts = 0;

  while (fetchUrl && allComments.length < 100 && attempts < 5) {
    attempts++;
    const res: Response = await fetch(fetchUrl);
    const raw = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(
        `[rag/ingest] Comments fetch failed for media ${mediaId} (${res.status}):`,
        JSON.stringify(raw).slice(0, 300)
      );
      break;
    }

    const page = raw?.data ?? [];
    allComments.push(...page);

    if (raw?.paging?.next) {
      fetchUrl = raw.paging.next;
    } else if (page.length === 0 && raw?.paging?.cursors?.after) {
      url.searchParams.set("after", raw.paging.cursors.after);
      fetchUrl = url.toString();
    } else {
      fetchUrl = null;
    }
  }

  console.log(`[rag/ingest] Media ${mediaId}: ${allComments.length} comments (${attempts} requests)`);
  return allComments;
}

function buildCaptionDocument(media: InstagramMedia): string {
  const parts = [
    `[${media.media_type}] Post from ${media.timestamp}`,
    media.caption ? `Caption: "${media.caption}"` : "No caption",
    `Likes: ${media.like_count ?? 0}, Comments: ${media.comments_count ?? 0}`,
  ];
  return parts.join("\n");
}

function buildCommentsDocument(
  media: InstagramMedia,
  comments: InstagramComment[]
): string {
  const header = `Comments on post "${(media.caption ?? "").slice(0, 80)}" (${comments.length} comments):`;
  const lines = comments.map(
    (c) => `@${c.username}: "${c.text}"`
  );
  return [header, ...lines].join("\n");
}

function buildProfileDocument(meta: Record<string, unknown>): string {
  return [
    `Instagram Profile: @${meta.platform_username ?? meta.display_name ?? "unknown"}`,
    meta.display_name ? `Name: ${meta.display_name}` : null,
    meta.bio ? `Bio: ${meta.bio}` : null,
    `Followers: ${meta.follower_count ?? 0}`,
    `Following: ${meta.following_count ?? 0}`,
    `Total posts: ${meta.media_count ?? 0}`,
  ]
    .filter(Boolean)
    .join("\n");
}

interface UpsertResult {
  upserted: number;
  failed: number;
  firstError?: string;
}

async function upsertDocuments(docs: RagDocument[]): Promise<UpsertResult> {
  if (docs.length === 0) return { upserted: 0, failed: 0 };
  const supabase = createAdminClient();
  let upserted = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const doc of docs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("rag_documents")
      .upsert(
        {
          user_id: doc.user_id,
          source: doc.source,
          source_id: doc.source_id,
          content: doc.content,
          metadata: doc.metadata,
          embedding: doc.embedding,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source,source_id" }
      );

    if (error) {
      failed++;
      if (!firstError) firstError = error.message ?? JSON.stringify(error);
      console.error("[rag/ingest] upsert error:", error);
    } else {
      upserted++;
    }
  }

  return { upserted, failed, firstError };
}

export interface IngestResult {
  captions: number;
  comments: number;
  profile: number;
  total: number;
  failed: number;
  warning?: string;
}

export async function ingestInstagramData(
  userId: string
): Promise<IngestResult> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = await (supabase as any)
    .from("connected_accounts")
    .select("access_token, expires_at, platform_username, platform_meta")
    .eq("user_id", userId)
    .eq("platform", "instagram")
    .single();

  if (!account) {
    throw new Error("Instagram account not connected");
  }

  if (account.expires_at && new Date(account.expires_at) < new Date()) {
    throw new Error("Instagram token expired. Please reconnect in Settings.");
  }

  const result: IngestResult = { captions: 0, comments: 0, profile: 0, total: 0, failed: 0 };
  const docs: RagDocument[] = [];

  const { media, error: mediaError } = await fetchInstagramMedia(account.access_token, 50);
  if (mediaError) {
    result.warning = mediaError;
  }

  for (const m of media) {
    const captionText = buildCaptionDocument(m);
    const captionEmbedding = await generateEmbedding(captionText);
    docs.push({
      user_id: userId,
      source: "instagram_caption",
      source_id: m.id,
      content: captionText,
      metadata: {
        media_type: m.media_type,
        like_count: m.like_count,
        comments_count: m.comments_count,
        timestamp: m.timestamp,
        permalink: m.permalink,
      },
      embedding: `[${captionEmbedding.join(",")}]`,
    });
  }

  let commentGroupCount = 0;
  for (const m of media.slice(0, 20)) {
    const comments = await fetchMediaComments(account.access_token, m.id);
    if (comments.length === 0) continue;

    commentGroupCount++;
    const commentsText = buildCommentsDocument(m, comments);
    const commentsEmbedding = await generateEmbedding(commentsText);
    docs.push({
      user_id: userId,
      source: "instagram_comment",
      source_id: m.id,
      content: commentsText,
      metadata: {
        media_id: m.id,
        comment_count: comments.length,
        caption_preview: (m.caption ?? "").slice(0, 100),
      },
      embedding: `[${commentsEmbedding.join(",")}]`,
    });
  }

  const meta = account.platform_meta ?? {};
  if (meta.display_name || meta.follower_count) {
    const profileText = buildProfileDocument({
      ...meta,
      platform_username: account.platform_username,
    });
    const profileEmbedding = await generateEmbedding(profileText);
    docs.push({
      user_id: userId,
      source: "instagram_profile",
      source_id: "profile",
      content: profileText,
      metadata: meta,
      embedding: `[${profileEmbedding.join(",")}]`,
    });
  }

  const upsertResult = await upsertDocuments(docs);

  result.captions = media.length;
  result.comments = commentGroupCount;
  result.profile = meta.display_name || meta.follower_count ? 1 : 0;
  result.total = upsertResult.upserted;
  result.failed = upsertResult.failed;

  if (upsertResult.failed > 0 && upsertResult.upserted === 0) {
    const existingWarning = result.warning ? result.warning + " " : "";
    result.warning =
      existingWarning +
      `Failed to index ${upsertResult.failed} documents to the database. ` +
      `Make sure the rag_documents table and pgvector extension are set up in Supabase. ` +
      (upsertResult.firstError ? `Error: ${upsertResult.firstError}` : "");
  } else if (upsertResult.failed > 0) {
    const existingWarning = result.warning ? result.warning + " " : "";
    result.warning =
      existingWarning +
      `${upsertResult.failed} of ${docs.length} documents failed to index.`;
  }

  return result;
}
