import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getUser,
  listTranscriptions,
  deleteTranscription,
  saveTranscription,
  generateTitle,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  listTranscriptions: vi.fn(),
  deleteTranscription: vi.fn(),
  saveTranscription: vi.fn(),
  generateTitle: vi.fn(),
}));

vi.mock("@/lib/neon/auth", () => ({
  getSessionUser: () => getUser(),
}));
vi.mock("@/lib/transcribe/history", () => ({
  listTranscriptions,
  deleteTranscription,
  saveTranscription,
}));
vi.mock("@/lib/transcribe/title", () => ({
  generateTitle,
}));

import { GET, POST, DELETE } from "./route";

const authed = () => getUser.mockResolvedValue({ id: "u1", email: "u1@example.com" });
const anon = () => getUser.mockResolvedValue(null);

const postReq = (body: unknown) =>
  new Request("http://x", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  getUser.mockReset();
  listTranscriptions.mockReset();
  deleteTranscription.mockReset();
  saveTranscription.mockReset();
  generateTitle.mockReset();
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
    expect(listTranscriptions).toHaveBeenCalledWith("u1");
    expect(await res.json()).toEqual({ items: [{ id: "a" }] });
  });
});

describe("POST /api/tools/transcribe/history", () => {
  it("401 when unauthenticated", async () => {
    anon();
    const res = await POST(postReq({ text: "hola" }));
    expect(res.status).toBe(401);
    expect(saveTranscription).not.toHaveBeenCalled();
  });

  it("400 when text is missing", async () => {
    authed();
    const res = await POST(postReq({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "text required" });
    expect(saveTranscription).not.toHaveBeenCalled();
  });

  it("saves a combined entry and returns { id, title }", async () => {
    authed();
    saveTranscription.mockResolvedValue("row-1");
    const res = await POST(
      postReq({
        text: "audio uno. audio dos.",
        title: "Charla con Ana",
        language: "es",
        duration: 42,
        fileCount: 2,
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "row-1", title: "Charla con Ana" });
    expect(generateTitle).not.toHaveBeenCalled();
    expect(saveTranscription).toHaveBeenCalledWith(expect.objectContaining({
        userId: "u1",
        title: "Charla con Ana",
        text: "audio uno. audio dos.",
        language: "es",
        duration: 42,
        provider: "groq",
      }),
    );
  });

  it("generates a title when none is provided", async () => {
    authed();
    generateTitle.mockResolvedValue("Título generado");
    saveTranscription.mockResolvedValue("row-2");
    const res = await POST(postReq({ text: "texto sin titulo", fileCount: 3 }));
    expect(generateTitle).toHaveBeenCalledWith("texto sin titulo");
    expect(await res.json()).toEqual({ id: "row-2", title: "Título generado" });
    expect(saveTranscription).toHaveBeenCalledWith(expect.objectContaining({
        title: "Título generado",
        filename: "Conversación (3 audios)",
        language: null,
        duration: 0,
        provider: "groq",
      }),
    );
  });

  it("500 when save fails", async () => {
    authed();
    generateTitle.mockResolvedValue("t");
    saveTranscription.mockResolvedValue(null);
    const res = await POST(postReq({ text: "algo" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "save failed" });
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
    expect(deleteTranscription).toHaveBeenCalledWith("t1", "u1");
    expect(res.status).toBe(200);
  });
});
