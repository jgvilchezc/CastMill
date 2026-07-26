import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Captures tagged-template calls: sql`...${a}...${b}` arrives as
 * (strings, ...values). Assertions target the SQL text and the bound params,
 * which is the tagged-template equivalent of the old query-builder assertions.
 */
const sqlMock = vi.fn();

vi.mock("@/lib/neon/db", () => ({
  getSql: () => sqlMock,
}));

function lastCall() {
  const [strings, ...values] = sqlMock.mock.calls.at(-1) as [
    TemplateStringsArray,
    ...unknown[],
  ];
  return { text: strings.join("?").replace(/\s+/g, " ").trim(), values };
}

import {
  saveTranscription,
  listTranscriptions,
  deleteTranscription,
} from "./history";

beforeEach(() => {
  sqlMock.mockReset();
});

describe("saveTranscription", () => {
  it("inserts the row and returns the new id", async () => {
    sqlMock.mockResolvedValue([{ id: "t1" }]);

    const id = await saveTranscription({
      userId: "u1",
      title: "Reunión",
      text: "contenido",
      language: "es",
      duration: 12.5,
      filename: "audio.m4a",
      provider: "groq",
    });

    const { text, values } = lastCall();
    expect(text).toContain("insert into transcriptions");
    expect(text).toContain("returning id");
    expect(values).toEqual([
      "u1",
      "Reunión",
      "contenido",
      "es",
      12.5,
      "audio.m4a",
      "groq",
    ]);
    expect(id).toBe("t1");
  });

  it("returns null when insert errors", async () => {
    sqlMock.mockRejectedValue(new Error("boom"));
    const id = await saveTranscription({
      userId: "u1",
      title: "x",
      text: "y",
      language: null,
      duration: 0,
      filename: "a",
      provider: "groq",
    });
    expect(id).toBeNull();
  });
});

describe("listTranscriptions", () => {
  it("scopes by user, orders desc, limits 50", async () => {
    sqlMock.mockResolvedValue([{ id: "a" }]);

    const items = await listTranscriptions("u1");

    const { text, values } = lastCall();
    expect(text).toContain("where user_id = ?");
    expect(text).toContain("order by created_at desc");
    expect(text).toContain("limit ?");
    expect(values).toEqual(["u1", 50]);
    expect(items).toEqual([{ id: "a" }]);
  });
});

describe("deleteTranscription", () => {
  it("scopes delete by id and user", async () => {
    sqlMock.mockResolvedValue([]);

    await deleteTranscription("t1", "u1");

    const { text, values } = lastCall();
    expect(text).toContain("delete from transcriptions");
    expect(text).toContain("where id = ? and user_id = ?");
    expect(values).toEqual(["t1", "u1"]);
  });
});
