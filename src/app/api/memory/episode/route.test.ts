import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUser, transcriptQuery, saveMemory } = vi.hoisted(() => ({
  getUser: vi.fn(),
  transcriptQuery: vi.fn(),
  saveMemory: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ single: transcriptQuery }),
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/memory/store", () => ({ saveMemory }));

import { POST } from "./route";

beforeEach(() => {
  getUser.mockReset();
  transcriptQuery.mockReset();
  saveMemory.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
});

describe("POST /api/memory/episode", () => {
  it("401 without a user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1" }) }),
    );
    expect(res.status).toBe(401);
  });

  it("404 when transcript not found", async () => {
    transcriptQuery.mockResolvedValue({ data: null, error: null });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1" }) }),
    );
    expect(res.status).toBe(404);
  });

  it("chunks the transcript and saves each chunk", async () => {
    transcriptQuery.mockResolvedValue({
      data: { text: `${"a".repeat(900)}\n\nshort tail` },
      error: null,
    });
    saveMemory.mockResolvedValue({ id: "x" });
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1", title: "Ep 1" }) }),
    );
    expect(res.status).toBe(200);
    expect(saveMemory.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(saveMemory).toHaveBeenCalledWith(
      expect.objectContaining({ source: "episode", sourceId: expect.stringContaining("e1#") }),
    );
  });
});
