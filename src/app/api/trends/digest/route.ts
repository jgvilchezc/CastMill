import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const CURATED_TRENDS: Record<string, TrendDigest> = {
  business: {
    hashtags: [
      "#entrepreneurship",
      "#businesstips",
      "#startup",
      "#sidehustle",
      "#moneyadvice",
    ],
    sounds: [
      "Motivational background",
      "Lo-fi study beats",
      "Corporate upbeat",
    ],
    formats: [
      "Point-by-point list (3 tips)",
      "Single bold claim + explanation",
      "Before/After transformation",
    ],
    insight:
      "Business content performs 40% better when it opens with a specific dollar amount or percentage.",
  },
  health: {
    hashtags: [
      "#healthtips",
      "#wellness",
      "#mentalhealth",
      "#fitness",
      "#biohacking",
    ],
    sounds: ["Calm ambient", "Upbeat workout", "Nature sounds"],
    formats: [
      "Myth-busting opener",
      "Day-in-my-life format",
      "Expert quote + reaction",
    ],
    insight:
      "Health content with a counter-intuitive hook gets 3× more saves than standard advice.",
  },
  technology: {
    hashtags: [
      "#aitools",
      "#techhacks",
      "#futuretech",
      "#productivity",
      "#coding",
    ],
    sounds: ["Futuristic synth", "Lo-fi hip hop", "Techy notification"],
    formats: [
      "Tool demo (show don't tell)",
      "Reaction to trend",
      "Problem → AI solution",
    ],
    insight:
      "AI tool demos under 45 seconds generate 2× the follower growth vs longer tutorials.",
  },
  finance: {
    hashtags: [
      "#personalfinance",
      "#investing",
      "#passiveincome",
      "#stockmarket",
      "#financialfreedom",
    ],
    sounds: ["Cash register", "Upbeat motivational", "Corporate soft"],
    formats: [
      "'I made X doing Y' opener",
      "Myth bust",
      "Step-by-step breakdown",
    ],
    insight:
      "Finance content with a specific number in the first 2 seconds has 65% higher retention.",
  },
  marketing: {
    hashtags: [
      "#digitalmarketing",
      "#contentcreator",
      "#growthhacking",
      "#socialmedia",
      "#seo",
    ],
    sounds: ["Trendy pop", "Snappy beats", "Upbeat lo-fi"],
    formats: [
      "Case study in 60s",
      "Controversial opinion",
      "Before/after metrics",
    ],
    insight:
      "Marketing myth-bust videos drive 4× more shares than how-to content.",
  },
  "personal development": {
    hashtags: [
      "#selfdevelopment",
      "#mindset",
      "#motivation",
      "#habits",
      "#discipline",
    ],
    sounds: ["Inspirational orchestral", "Calm piano", "Spoken word backing"],
    formats: [
      "1 habit change = big result",
      "Relatable failure → lesson",
      "Daily routine reveal",
    ],
    insight:
      "Personal development hooks starting with 'I used to…' outperform those starting with 'You should…' by 55%.",
  },
  education: {
    hashtags: [
      "#learnontiktok",
      "#didyouknow",
      "#funfacts",
      "#education",
      "#knowledge",
    ],
    sounds: ["Curious background", "Lo-fi study", "Playful notification"],
    formats: ["Did you know? opener", "Explain like I'm 5", "History reveals"],
    insight:
      "Educational content with a quiz-style hook ('Can you guess…?') gets 2× more comments.",
  },
  default: {
    hashtags: [
      "#podcast",
      "#podcastclip",
      "#podcastrecommendation",
      "#learnontiktok",
      "#storytelling",
    ],
    sounds: ["Ambient background", "Upbeat lo-fi", "Motivational backing"],
    formats: ["Quote card", "Reaction reveal", "One key takeaway"],
    insight:
      "Podcast clips under 60 seconds that tease a longer episode get 30% more follows.",
  },
};

interface TrendDigest {
  hashtags: string[];
  sounds: string[];
  formats: string[];
  insight: string;
}

function matchNiche(topics: string[]): string {
  if (!topics || topics.length === 0) return "default";
  const joined = topics.join(" ").toLowerCase();
  const keys = Object.keys(CURATED_TRENDS).filter((k) => k !== "default");
  for (const key of keys) {
    if (joined.includes(key)) return key;
  }
  const keywordMap: Record<string, string> = {
    entrepreneur: "business",
    startup: "business",
    money: "finance",
    invest: "finance",
    crypto: "finance",
    ai: "technology",
    software: "technology",
    code: "technology",
    wellness: "health",
    mental: "health",
    fitness: "health",
    growth: "marketing",
    brand: "marketing",
    mindset: "personal development",
    productivity: "personal development",
    learn: "education",
    science: "education",
  };
  for (const [keyword, niche] of Object.entries(keywordMap)) {
    if (joined.includes(keyword)) return niche;
  }
  return "default";
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!profile || profile.plan !== "pro") {
    return NextResponse.json(
      { error: "Upgrade to Pro to access Trend Digest" },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const rawTopics = searchParams.get("topics") ?? "";
  const topics = rawTopics ? rawTopics.split(",").map((t) => t.trim()) : [];
  const niche = matchNiche(topics);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cached } = await (supabase as any)
    .from("trend_digests")
    .select("data, expires_at")
    .eq("niche", niche)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return NextResponse.json({ niche, digest: cached.data, source: "cache" });
  }

  let digest: TrendDigest | null = null;

  if (process.env.TIKTOK_CC_API_KEY) {
    try {
      const ttRes = await fetch(
        `https://business-api.tiktok.com/open_api/v1.3/creative_center/hashtag/recommend/?hashtag_name=${encodeURIComponent(topics[0] ?? niche)}&region_code=US&count=10`,
        {
          headers: {
            "Access-Token": process.env.TIKTOK_CC_API_KEY,
          },
        },
      );
      if (ttRes.ok) {
        const ttData = await ttRes.json();
        const hashtags = (ttData?.data?.list ?? [])
          .slice(0, 5)
          .map((h: { hashtag_name: string }) => `#${h.hashtag_name}`);
        if (hashtags.length > 0) {
          digest = {
            hashtags,
            sounds:
              CURATED_TRENDS[niche]?.sounds ?? CURATED_TRENDS["default"].sounds,
            formats:
              CURATED_TRENDS[niche]?.formats ??
              CURATED_TRENDS["default"].formats,
            insight:
              CURATED_TRENDS[niche]?.insight ??
              CURATED_TRENDS["default"].insight,
          };
        }
      }
    } catch {
      // fall through to curated data
    }
  }

  if (!digest) {
    digest = CURATED_TRENDS[niche] ?? CURATED_TRENDS["default"];
  }

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("trend_digests")
    .upsert(
      { niche, data: JSON.parse(JSON.stringify(digest)), expires_at: expiresAt },
      { onConflict: "niche" },
    );

  return NextResponse.json({ niche, digest, source: "fresh" });
}
