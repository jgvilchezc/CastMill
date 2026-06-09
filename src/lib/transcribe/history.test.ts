import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

function makeClient() {
  return { from: fromMock };
}

/** Chainable Supabase query-builder mock resolving to `result`. */
function queryReturning(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ["insert", "delete", "select", "eq", "order", "limit"]) {
    q[m] = vi.fn(() => q);
  }
  q.single = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return q;
}

import {
  saveTranscription,
  listTranscriptions,
  deleteTranscription,
} from "./history";

beforeEach(() => {
  fromMock.mockReset();
});

describe("saveTranscription", () => {
  it("inserts the row and returns the new id", async () => {
    const q = queryReturning({ data: { id: "t1" }, error: null });
    fromMock.mockReturnValue(q);

    const id = await saveTranscription(makeClient() as never, {
      userId: "u1",
      title: "Reunión",
      text: "contenido",
      language: "es",
      duration: 12.5,
      filename: "audio.m4a",
      provider: "groq",
    });

    expect(fromMock).toHaveBeenCalledWith("transcriptions");
    expect(q.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        title: "Reunión",
        text: "contenido",
        language: "es",
        provider: "groq",
      }),
    );
    expect(id).toBe("t1");
  });

  it("returns null when insert errors", async () => {
    fromMock.mockReturnValue(
      queryReturning({ data: null, error: { message: "boom" } }),
    );
    const id = await saveTranscription(makeClient() as never, {
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
    const rows = [{ id: "a" }];
    const q = queryReturning({ data: rows, error: null });
    fromMock.mockReturnValue(q);

    const items = await listTranscriptions(makeClient() as never, "u1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(q.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(50);
    expect(items).toEqual(rows);
  });
});

describe("deleteTranscription", () => {
  it("scopes delete by id and user", async () => {
    const q = queryReturning({ data: null, error: null });
    fromMock.mockReturnValue(q);
    await deleteTranscription(makeClient() as never, "t1", "u1");
    expect(q.delete).toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("id", "t1");
    expect(q.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});
