import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUser, listTranscriptions, deleteTranscription } = vi.hoisted(() => ({
  getUser: vi.fn(),
  listTranscriptions: vi.fn(),
  deleteTranscription: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/transcribe/history", () => ({
  listTranscriptions,
  deleteTranscription,
}));

import { GET, DELETE } from "./route";

const authed = () => getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
const anon = () => getUser.mockResolvedValue({ data: { user: null } });

beforeEach(() => {
  getUser.mockReset();
  listTranscriptions.mockReset();
  deleteTranscription.mockReset();
});

describe("GET /api/tools/transcribe/history", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's items", async () => {
    authed();
    listTranscriptions.mockResolvedValue([{ id: "a" }]);
    const res = await GET();
    expect(listTranscriptions).toHaveBeenCalledWith(expect.anything(), "u1");
    expect(await res.json()).toEqual({ items: [{ id: "a" }] });
  });
});

describe("DELETE /api/tools/transcribe/history", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await DELETE(
      new Request("http://x", { method: "DELETE", body: JSON.stringify({ id: "t1" }) }),
    );
    expect(res.status).toBe(401);
  });

  it("400 when id missing", async () => {
    authed();
    const res = await DELETE(
      new Request("http://x", { method: "DELETE", body: JSON.stringify({}) }),
    );
    expect(res.status).toBe(400);
  });

  it("deletes scoped to the user", async () => {
    authed();
    const res = await DELETE(
      new Request("http://x", { method: "DELETE", body: JSON.stringify({ id: "t1" }) }),
    );
    expect(deleteTranscription).toHaveBeenCalledWith(expect.anything(), "t1", "u1");
    expect(res.status).toBe(200);
  });
});
