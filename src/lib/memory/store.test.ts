import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
const generateEmbedding = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/rag/embeddings", () => ({
  generateEmbedding: (t: string) => generateEmbedding(t),
}));

import {
  saveMemory,
  listMemories,
  deleteMemory,
  togglePin,
  getPinned,
} from "./store";

/** Chainable Supabase query-builder mock that resolves to `result`. */
function queryReturning(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ["upsert", "update", "delete", "select", "eq", "order"]) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return q;
}

beforeEach(() => {
  fromMock.mockReset();
  generateEmbedding.mockReset();
  generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
});

describe("saveMemory", () => {
  it("embeds content and upserts, returning the id", async () => {
    const q = queryReturning({ data: { id: "mem_1" }, error: null });
    fromMock.mockReturnValue(q);

    const res = await saveMemory({
      userId: "u1",
      source: "manual",
      sourceId: "s1",
      content: "my tone is direct",
      pinned: true,
    });

    expect(generateEmbedding).toHaveBeenCalledWith("my tone is direct");
    expect(fromMock).toHaveBeenCalledWith("rag_documents");
    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        source: "manual",
        source_id: "s1",
        pinned: true,
        embedding: "[0.1,0.2,0.3]",
      }),
      { onConflict: "user_id,source,source_id" },
    );
    expect(res).toEqual({ id: "mem_1" });
  });

  it("throws on supabase error", async () => {
    fromMock.mockReturnValue(
      queryReturning({ data: null, error: { message: "boom" } }),
    );
    await expect(
      saveMemory({ userId: "u1", source: "manual", sourceId: "s1", content: "x" }),
    ).rejects.toThrow("boom");
  });
});

describe("listMemories", () => {
  it("filters by user and orders by created_at", async () => {
    const rows = [{ id: "a" }, { id: "b" }];
    const q = queryReturning({ data: rows, error: null });
    fromMock.mockReturnValue(q);

    const res = await listMemories("u1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(res).toEqual(rows);
  });

  it("adds a source filter when provided", async () => {
    const q = queryReturning({ data: [], error: null });
    fromMock.mockReturnValue(q);
    await listMemories("u1", { source: "manual" });
    expect(q.eq).toHaveBeenCalledWith("source", "manual");
  });
});

describe("deleteMemory", () => {
  it("scopes delete by id and user", async () => {
    const q = queryReturning({ data: null, error: null });
    fromMock.mockReturnValue(q);
    await deleteMemory("mem_1", "u1");
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("id", "mem_1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});

describe("togglePin", () => {
  it("updates pinned scoped by id and user", async () => {
    const q = queryReturning({ data: null, error: null });
    fromMock.mockReturnValue(q);
    await togglePin("mem_1", "u1", true);
    expect(q.update).toHaveBeenCalledWith({ pinned: true });
    expect(q.eq).toHaveBeenCalledWith("id", "mem_1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});

describe("getPinned", () => {
  it("returns only pinned rows for the user", async () => {
    const rows = [{ id: "p1", pinned: true }];
    const q = queryReturning({ data: rows, error: null });
    fromMock.mockReturnValue(q);
    const res = await getPinned("u1");
    expect(q.eq).toHaveBeenCalledWith("pinned", true);
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(res).toEqual(rows);
  });
});
