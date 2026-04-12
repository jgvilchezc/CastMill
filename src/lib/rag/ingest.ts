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
  like_count?: number;
}

interface RagDocument {
  user_id: string;
  source: string;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: string;
}

async function fetchInstagramMedia(
  accessToken: string,
  limit = 50
): Promise<InstagramMedia[]> {
  const allMedia: InstagramMedia[] = [];
  const fields =
    "id,caption,media_type,permalink,timestamp,like_count,comments_count";

  let nextUrl: string | null =
    `https://graph.instagram.com/v21.0/me/media?fields=${fields}&limit=${Math.min(limit, 50)}&access_token=${accessToken}`;

  while (nextUrl && allMedia.length < limit) {
    const res: Response = await fetch(nextUrl);
    if (!res.ok) break;
    const data = await res.json();
    allMedia.push(...(data?.data ?? []));
    nextUrl = data?.paging?.next ?? null;
  }

  return allMedia.slice(0, limit);
}

async function fetchMediaComments(
  accessToken: string,
  mediaId: string
): Promise<InstagramComment[]> {
  const fields = "id,text,timestamp,username,like_count";
  const url = `https://graph.instagram.com/v21.0/${mediaId}/comments?fields=${fields}&limit=50&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data ?? [];
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
    (c) => `@${c.username}: "${c.text}" (likes: ${c.like_count ?? 0})`
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

async function upsertDocuments(docs: RagDocument[]): Promise<number> {
  if (docs.length === 0) return 0;
  const supabase = createAdminClient();
  let upserted = 0;

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
      console.error("[rag/ingest] upsert error:", error);
    } else {
      upserted++;
    }
  }

  return upserted;
}

export interface IngestResult {
  captions: number;
  comments: number;
  profile: number;
  total: number;
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

  const result: IngestResult = { captions: 0, comments: 0, profile: 0, total: 0 };
  const docs: RagDocument[] = [];

  const media = await fetchInstagramMedia(account.access_token, 50);

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

  const topPosts = [...media]
    .sort((a, b) => (b.comments_count ?? 0) - (a.comments_count ?? 0))
    .slice(0, 10)
    .filter((m) => (m.comments_count ?? 0) > 0);

  for (const m of topPosts) {
    const comments = await fetchMediaComments(account.access_token, m.id);
    if (comments.length === 0) continue;

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

  const upserted = await upsertDocuments(docs);

  result.captions = media.length;
  result.comments = topPosts.length;
  result.profile = meta.display_name || meta.follower_count ? 1 : 0;
  result.total = upserted;

  return result;
}
