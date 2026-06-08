import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns one chunk for short text", () => {
    expect(chunkText("hello world")).toEqual(["hello world"]);
  });

  it("returns empty array for blank input", () => {
    expect(chunkText("   ")).toEqual([]);
  });

  it("splits on paragraph breaks", () => {
    const text = "para one";
    const long = `${text}\n\n${"b".repeat(900)}`;
    const chunks = chunkText(long, 800);
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toBe("para one");
  });

  it("keeps every chunk within the max length", () => {
    const text = Array.from({ length: 50 }, (_, i) => `sentence ${i} text`).join("\n\n");
    const chunks = chunkText(text, 200);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.join(" ")).toContain("sentence 49 text");
  });

  it("hard-splits a single paragraph longer than max", () => {
    const chunks = chunkText("a".repeat(2000), 800);
    expect(chunks.length).toBe(3);
    expect(chunks.every((c) => c.length <= 800)).toBe(true);
  });
});
