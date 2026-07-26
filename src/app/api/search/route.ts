import { NextResponse } from 'next/server';
import { getSessionUser } from "@/lib/neon/auth";
import { getSql } from "@/lib/neon/db";
import { sanitizeString } from '@/lib/security/validate';

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = sanitizeString(searchParams.get("q") ?? "", 500);

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    let data: { episode_id: string; text: string }[];
    try {
      // Uses the transcripts_text_fts GIN index.
      data = (await getSql()`
        select episode_id, text
        from transcripts
        where user_id = ${user.id}
          and to_tsvector('english', text) @@ websearch_to_tsquery('english', ${query})
      `) as { episode_id: string; text: string }[];
    } catch {
      // websearch_to_tsquery rejects some inputs — fall back to a plain scan.
      const fallback = (await getSql()`
        select episode_id, text
        from transcripts
        where user_id = ${user.id}
          and text ilike ${`%${escapeIlike(query)}%`}
      `) as { episode_id: string; text: string }[];

      const results = (fallback ?? []).map(row => {
        const idx = row.text.toLowerCase().indexOf(query.toLowerCase());
        const start = Math.max(0, idx - 80);
        const end = Math.min(row.text.length, idx + query.length + 80);
        const snippet = (start > 0 ? "…" : "") + row.text.slice(start, end) + (end < row.text.length ? "…" : "");
        return { episodeId: row.episode_id, snippet };
      });

      return NextResponse.json({ results });
    }

    const results = (data ?? []).map(row => {
      const idx = row.text.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, idx - 80);
      const end = Math.min(row.text.length, idx + query.length + 80);
      const snippet = (start > 0 ? "…" : "") + row.text.slice(start, end) + (end < row.text.length ? "…" : "");
      return { episodeId: row.episode_id, snippet };
    });

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
