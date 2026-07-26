import { describe, it, expect, vi, beforeEach } from "vitest";

const sqlMock = vi.fn();
const generateEmbedding = vi.fn();

vi.mock("@/lib/neon/db", () => ({
  getSql: () => sqlMock,
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

/**
 * sql`...${a}...` arrives as (strings, ...values). Assertions target the SQL
 * text and the bound params — the tagged-template equivalent of the old
 * query-builder assertions.
 */
function lastCall() {
  const [strings, ...values] = sqlMock.mock.calls.at(-1) as [
    TemplateStringsArray,
    ...unknown[],
  ];
  return { text: strings.join("?").replace(/\s+/g, " ").trim(), values };
}

beforeEach(() => {
  sqlMock.mockReset();
  generateEmbedding.mockReset();
  generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
});

describe("saveMemory", () => {
  it("embeds content and upserts, returning the id", async () => {
    sqlMock.mockResolvedValue([{ id: "mem_1" }]);

    const res = await saveMemory({
      userId: "u1",
      source: "manual",
      sourceId: "s1",
      content: "my tone is direct",
      pinned: true,
    });

    expect(generateEmbedding).toHaveBeenCalledWith("my tone is direct");

    const { text, values } = lastCall();
    expect(text).toContain("insert into rag_documents");
    expect(text).toContain("on conflict (user_id, source, source_id) do update");
    expect(values).toContain("u1");
    expect(values).toContain("manual");
    expect(values).toContain("s1");
    expect(values).toContain(true);
    expect(values).toContain("[0.1,0.2,0.3]");
    expect(res).toEqual({ id: "mem_1" });
  });

  it("propagates a database error", async () => {
    sqlMock.mockRejectedValue(new Error("boom"));
    await expect(
      saveMemory({ userId: "u1", source: "manual", sourceId: "s1", content: "x" }),
    ).rejects.toThrow("boom");
  });
});

describe("listMemories", () => {
  it("filters by user and orders by created_at", async () => {
    const rows = [{ id: "a" }, { id: "b" }];
    sqlMock.mockResolvedValue(rows);

    const res = await listMemories("u1");

    const { text, values } = lastCall();
    expect(text).toContain("where user_id = ?");
    expect(text).toContain("order by created_at desc");
    expect(values).toEqual(["u1"]);
    expect(res).toEqual(rows);
  });

  it("adds a source filter when provided", async () => {
    sqlMock.mockResolvedValue([]);

    await listMemories("u1", { source: "manual" });

    const { text, values } = lastCall();
    expect(text).toContain("where user_id = ? and source = ?");
    expect(values).toEqual(["u1", "manual"]);
  });
});

describe("deleteMemory", () => {
  it("scopes delete by id and user", async () => {
    sqlMock.mockResolvedValue([]);

    await deleteMemory("mem_1", "u1");

    const { text, values } = lastCall();
    expect(text).toContain("delete from rag_documents");
    expect(text).toContain("where id = ? and user_id = ?");
    expect(values).toEqual(["mem_1", "u1"]);
  });
});

describe("togglePin", () => {
  it("updates pinned scoped by id and user", async () => {
    sqlMock.mockResolvedValue([]);

    await togglePin("mem_1", "u1", true);

    const { text, values } = lastCall();
    expect(text).toContain("update rag_documents set pinned = ?");
    expect(text).toContain("where id = ? and user_id = ?");
    expect(values).toEqual([true, "mem_1", "u1"]);
  });
});

describe("getPinned", () => {
  it("returns only pinned rows for the user", async () => {
    const rows = [{ id: "p1", pinned: true }];
    sqlMock.mockResolvedValue(rows);

    const res = await getPinned("u1");

    const { text, values } = lastCall();
    expect(text).toContain("where user_id = ? and pinned = true");
    expect(values).toEqual(["u1"]);
    expect(res).toEqual(rows);
  });
});
