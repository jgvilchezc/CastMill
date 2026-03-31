export interface MemoryChunk {
  id: string;
  episodeId: string;
  text: string;
  relevanceScore: number; // 0-1
  timestamp: string;
  topics: string[];
}

export const mockChunks: MemoryChunk[] = [
  {
    id: "chunk_50_1",
    episodeId: "ep_50",
    text: "AI makes it easy to send a thousand emails, but it makes it harder to be human.",
    relevanceScore: 0.95,
    timestamp: "01:10",
    topics: ["AI", "Sales"]
  },
  {
    id: "chunk_12_1",
    episodeId: "ep_12",
    text: "Direct sales has always been about one thing: trust. If they don't trust you, they won't buy.",
    relevanceScore: 0.88,
    timestamp: "05:20",
    topics: ["Sales", "Trust"]
  },
  {
    id: "chunk_35_1",
    episodeId: "ep_35",
    text: "Churn is the silent killer. If you can't retain customers, you don't have a business.",
    relevanceScore: 0.72,
    timestamp: "12:15",
    topics: ["Retention", "SaaS"]
  },
  {
    id: "chunk_49_1",
    episodeId: "ep_49",
    text: "Culture isn't about ping pong tables. It's about how you treat people when nobody is looking.",
    relevanceScore: 0.65,
    timestamp: "08:45",
    topics: ["Culture", "Leadership"]
  }
];
