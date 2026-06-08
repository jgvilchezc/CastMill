import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUser, store } = vi.hoisted(() => {
  const getUser = vi.fn();
  const store = {
    saveMemory: vi.fn(),
    listMemories: vi.fn(),
    deleteMemory: vi.fn(),
    togglePin: vi.fn(),
  };
  return { getUser, store };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/memory/store", () => store);

import { GET, POST, PATCH, DELETE } from "./route";

const authed = () => getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
const anon = () => getUser.mockResolvedValue({ data: { user: null } });

beforeEach(() => {
  getUser.mockReset();
  Object.values(store).forEach((f) => f.mockReset());
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
});

describe("GET /api/memory", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await GET(new Request("http://x/api/memory"));
    expect(res.status).toBe(401);
  });

  it("returns memories for the user", async () => {
    authed();
    store.listMemories.mockResolvedValue([{ id: "a" }]);
    const res = await GET(new Request("http://x/api/memory?source=manual"));
    expect(store.listMemories).toHaveBeenCalledWith("u1", { source: "manual" });
    expect(await res.json()).toEqual({ memories: [{ id: "a" }] });
  });
});

describe("POST /api/memory", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ content: "x" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400 when content is empty", async () => {
    authed();
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ content: "   " }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a manual memory", async () => {
    authed();
    store.saveMemory.mockResolvedValue({ id: "mem_1" });
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ title: "Tone", content: "direct", pinned: true }),
      }),
    );
    expect(res.status).toBe(201);
    expect(store.saveMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        source: "manual",
        title: "Tone",
        content: "direct",
        pinned: true,
      }),
    );
  });

  it("accepts source=transcript with a sourceId", async () => {
    authed();
    store.saveMemory.mockResolvedValue({ id: "mem_t" });
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({
          source: "transcript",
          sourceId: "job_1",
          title: "nota.m4a",
          content: "texto transcrito",
        }),
      }),
    );
    expect(res.status).toBe(201);
    expect(store.saveMemory).toHaveBeenCalledWith(
      expect.objectContaining({ source: "transcript", sourceId: "job_1" }),
    );
  });

  it("rejects an unknown source", async () => {
    authed();
    const res = await POST(
      new Request("http://x/api/memory", {
        method: "POST",
        body: JSON.stringify({ source: "hacker", content: "x" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/memory", () => {
  it("toggles pin", async () => {
    authed();
    const res = await PATCH(
      new Request("http://x/api/memory", {
        method: "PATCH",
        body: JSON.stringify({ id: "mem_1", pinned: false }),
      }),
    );
    expect(store.togglePin).toHaveBeenCalledWith("mem_1", "u1", false);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/memory", () => {
  it("deletes by id scoped to user", async () => {
    authed();
    const res = await DELETE(
      new Request("http://x/api/memory", {
        method: "DELETE",
        body: JSON.stringify({ id: "mem_1" }),
      }),
    );
    expect(store.deleteMemory).toHaveBeenCalledWith("mem_1", "u1");
    expect(res.status).toBe(200);
  });
});
