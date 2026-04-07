import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security/validate';

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = sanitizeString(searchParams.get("q") ?? "", 500);

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const { data, error } = await supabase
      .from("transcripts")
      .select("episode_id, text")
      .eq("user_id", user.id)
      .textSearch("text", query, { type: "websearch" });

    if (error) {
      const { data: fallback } = await supabase
        .from("transcripts")
        .select("episode_id, text")
        .eq("user_id", user.id)
        .ilike("text", `%${escapeIlike(query)}%`);

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
