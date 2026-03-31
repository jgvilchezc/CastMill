export interface Episode {
  id: string;
  title: string;
  date: string;
  duration: number; // seconds
  topics: string[];
  status: "ready" | "processing" | "failed";
  generationCount: number;
  guests: string[];
  description: string;
  thumbnailUrl: string; // Placeholder for now
}

export const mockEpisodes: Episode[] = [
  {
    id: "ep_50",
    title: "Sales Strategies for 2026",
    date: "2026-02-23",
    duration: 1800,
    topics: ["Sales", "AI", "Strategy"],
    status: "ready",
    generationCount: 6,
    guests: ["Sarah Jenkins"],
    description: "Are cold calls dead? Sarah Jenkins joins us to discuss the future of sales in an AI-saturated world.",
    thumbnailUrl: "/placeholder-thumbnail-1.jpg"
  },
  {
    id: "ep_49",
    title: "Building a Remote Team",
    date: "2026-02-16",
    duration: 2400,
    topics: ["Remote Work", "Leadership", "Culture"],
    status: "ready",
    generationCount: 4,
    guests: ["Mike Chen"],
    description: "How to maintain culture when your team is spread across 12 time zones.",
    thumbnailUrl: "/placeholder-thumbnail-2.jpg"
  },
  {
    id: "ep_35",
    title: "Customer Retention Secrets",
    date: "2025-11-10",
    duration: 1500,
    topics: ["Retention", "Churn", "SaaS"],
    status: "ready",
    generationCount: 2,
    guests: [],
    description: "Churn is the silent killer. Here are 3 strategies to stop the bleeding.",
    thumbnailUrl: "/placeholder-thumbnail-3.jpg"
  },
  {
    id: "ep_12",
    title: "Direct Sales Fundamentals",
    date: "2025-06-05",
    duration: 1200,
    topics: ["Sales", "Basics", "Trust"],
    status: "ready",
    generationCount: 0,
    guests: [],
    description: "Back to basics: Why trust is the only currency that matters in direct sales.",
    thumbnailUrl: "/placeholder-thumbnail-4.jpg"
  },
  {
    id: "ep_1",
    title: "Why I Started This Podcast",
    date: "2025-03-01",
    duration: 600,
    topics: ["Intro", "Vision", "Story"],
    status: "ready",
    generationCount: 1,
    guests: [],
    description: "The origin story. Why growth hacking is broken and what we're going to do about it.",
    thumbnailUrl: "/placeholder-thumbnail-5.jpg"
  }
];
