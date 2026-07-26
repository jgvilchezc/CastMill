import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/neon/auth";
import { getSql } from "@/lib/neon/db";
import { YoutubeTranscript } from "youtube-transcript";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { videoId, channelVideoId, manualText } = body;
  if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

  if (manualText) {
    const transcript = { text: manualText.trim(), segments: [] };
    if (channelVideoId) {
      await getSql()`
        update channel_videos set transcript = ${JSON.stringify(transcript)}::jsonb
        where id = ${channelVideoId} and user_id = ${user.id}
      `;
    }
    return NextResponse.json({ transcript });
  }

  const langCandidates = ["es", "en", "pt", "fr", "de", "auto"];

  for (const lang of langCandidates) {
    try {
      const opts = lang === "auto" ? undefined : [{ lang }];
      const segments = await YoutubeTranscript.fetchTranscript(videoId, opts as Parameters<typeof YoutubeTranscript.fetchTranscript>[1]);
      if (!segments?.length) continue;

      const fullText = segments.map((s) => s.text).join(" ");
      const transcript = {
        text: fullText,
        segments: segments.map((s) => ({ text: s.text, offset: s.offset, duration: s.duration })),
      };

      if (channelVideoId) {
        await getSql()`
          update channel_videos set transcript = ${JSON.stringify(transcript)}::jsonb
          where id = ${channelVideoId} and user_id = ${user.id}
        `;
      }

      return NextResponse.json({ transcript });
    } catch {
      continue;
    }
  }

  console.error("Transcript fetch: no captions found for videoId", videoId);
  return NextResponse.json({ error: "no_captions" }, { status: 404 });
}
