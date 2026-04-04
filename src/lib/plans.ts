import type { Database } from "@/lib/supabase/types";

export type PlanId = Database["public"]["Tables"]["profiles"]["Row"]["plan"];

export type ContentFormat =
  | "blog"
  | "tweet_thread"
  | "linkedin"
  | "newsletter"
  | "youtube_desc"
  | "thumbnail";

export interface PlanConfig {
  name: string;
  episodesPerMonth: number;
  formats: readonly ContentFormat[];
  channelLimit: number;
  channelOptimizer: boolean;
  viralMoments: boolean;
  voiceProfile: boolean;
  clipsEnabled: boolean;
  clipsPerEpisode: number;
  trendDigest: boolean;
  publishDirect: boolean;
  monthlyPrice: number;
  annualPrice: number;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    name: "Free",
    episodesPerMonth: 2,
    formats: ["blog", "tweet_thread", "linkedin"],
    channelLimit: 1,
    channelOptimizer: false,
    viralMoments: false,
    voiceProfile: false,
    clipsEnabled: false,
    clipsPerEpisode: 0,
    trendDigest: false,
    publishDirect: false,
    monthlyPrice: 0,
    annualPrice: 0,
  },
  starter: {
    name: "Starter",
    episodesPerMonth: 8,
    formats: [
      "blog",
      "tweet_thread",
      "linkedin",
      "newsletter",
      "youtube_desc",
      "thumbnail",
    ],
    channelLimit: 2,
    channelOptimizer: false,
    viralMoments: false,
    voiceProfile: true,
    clipsEnabled: true,
    clipsPerEpisode: 3,
    trendDigest: false,
    publishDirect: false,
    monthlyPrice: 19,
    annualPrice: 15,
  },
  pro: {
    name: "Pro",
    episodesPerMonth: 25,
    formats: [
      "blog",
      "tweet_thread",
      "linkedin",
      "newsletter",
      "youtube_desc",
      "thumbnail",
    ],
    channelLimit: 5,
    channelOptimizer: true,
    viralMoments: true,
    voiceProfile: true,
    clipsEnabled: true,
    clipsPerEpisode: 8,
    trendDigest: true,
    publishDirect: true,
    monthlyPrice: 49,
    annualPrice: 39,
  },
} as const;

export const ALL_FORMATS: ContentFormat[] = [
  "blog",
  "tweet_thread",
  "linkedin",
  "newsletter",
  "youtube_desc",
  "thumbnail",
];

export function getPlan(plan: PlanId): PlanConfig {
  return PLANS[plan];
}

export function canUseFormat(plan: PlanId, format: ContentFormat): boolean {
  return (PLANS[plan].formats as readonly string[]).includes(format);
}

export function getUpgradePlan(current: PlanId): PlanId | null {
  if (current === "free") return "starter";
  if (current === "starter") return "pro";
  return null;
}
