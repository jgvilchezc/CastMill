import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUser, transcriptQuery, saveMemory } = vi.hoisted(() => ({
  getUser: vi.fn(),
  transcriptQuery: vi.fn(),
  saveMemory: vi.fn(),
}));

vi.mock("@/lib/neon/auth", () => ({
  getSessionUser: () => getUser(),
}));
// The route now runs SQL directly: getSql() returns the tagged-template fn.
vi.mock("@/lib/neon/db", () => ({
  getSql: () => transcriptQuery,
}));
vi.mock("@/lib/memory/store", () => ({ saveMemory }));

import { POST } from "./route";

beforeEach(() => {
  getUser.mockReset();
  transcriptQuery.mockReset();
  saveMemory.mockReset();
  getUser.mockResolvedValue({ id: "u1", email: "u1@example.com" });
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "k";
});

describe("POST /api/memory/episode", () => {
  it("401 without a user", async () => {
    getUser.mockResolvedValue(null);
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1" }) }),
    );
    expect(res.status).toBe(401);
  });

  it("404 when transcript not found", async () => {
    transcriptQuery.mockResolvedValue([]);
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ episodeId: "e1" }) }),
    );
    expect(res.status).toBe(404);
  });

  it("chunks the transcript and saves each chunk", async () => {
    transcriptQuery.mockResolvedValue([
      { text: `${"a".repeat(900)}\n\nshort tail` },
    ]);
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
