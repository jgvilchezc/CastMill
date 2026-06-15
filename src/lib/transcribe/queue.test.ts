import { describe, it, expect } from "vitest";
import {
  compareFiles,
  sortFiles,
  buildCombinedText,
  buildCombinedMarkdown,
  type OrderableFile,
  type CombinedBlock,
} from "./queue";

describe("compareFiles", () => {
  it("orders by name ascending (numeric-aware)", () => {
    const a: OrderableFile = {
      name: "PTT-20240615-WA0001.opus",
      lastModified: 100,
    };
    const b: OrderableFile = {
      name: "PTT-20240615-WA0002.opus",
      lastModified: 100,
    };
    expect(compareFiles(a, b)).toBeLessThan(0);
    expect(compareFiles(b, a)).toBeGreaterThan(0);
  });

  it("treats numbers numerically, not lexically", () => {
    const a: OrderableFile = { name: "WA0002.opus", lastModified: 0 };
    const b: OrderableFile = { name: "WA0010.opus", lastModified: 0 };
    // Lexical sort would still agree here, so verify a multi-digit jump
    const nine: OrderableFile = { name: "audio9.opus", lastModified: 0 };
    const ten: OrderableFile = { name: "audio10.opus", lastModified: 0 };
    expect(compareFiles(a, b)).toBeLessThan(0);
    expect(compareFiles(nine, ten)).toBeLessThan(0);
  });

  it("uses lastModified ascending as tiebreaker when names are equal", () => {
    const a: OrderableFile = { name: "same.opus", lastModified: 100 };
    const b: OrderableFile = { name: "same.opus", lastModified: 200 };
    expect(compareFiles(a, b)).toBeLessThan(0);
    expect(compareFiles(b, a)).toBeGreaterThan(0);
    expect(compareFiles(a, { ...a })).toBe(0);
  });
});

describe("sortFiles", () => {
  it("returns a new sorted array and does not mutate the input", () => {
    const files: OrderableFile[] = [
      { name: "PTT-20240615-WA0002.opus", lastModified: 100 },
      { name: "PTT-20240615-WA0001.opus", lastModified: 100 },
    ];
    const original = [...files];
    const sorted = sortFiles(files);

    expect(sorted).not.toBe(files);
    expect(files).toEqual(original); // input unchanged
    expect(sorted.map((f) => f.name)).toEqual([
      "PTT-20240615-WA0001.opus",
      "PTT-20240615-WA0002.opus",
    ]);
  });

  it("orders numeric WhatsApp names chronologically", () => {
    const files: OrderableFile[] = [
      { name: "PTT-20240615-WA0010.opus", lastModified: 0 },
      { name: "PTT-20240615-WA0002.opus", lastModified: 0 },
      { name: "PTT-20240615-WA0001.opus", lastModified: 0 },
    ];
    expect(sortFiles(files).map((f) => f.name)).toEqual([
      "PTT-20240615-WA0001.opus",
      "PTT-20240615-WA0002.opus",
      "PTT-20240615-WA0010.opus",
    ]);
  });

  it("breaks ties by lastModified ascending", () => {
    const files: OrderableFile[] = [
      { name: "note.opus", lastModified: 300 },
      { name: "note.opus", lastModified: 100 },
      { name: "note.opus", lastModified: 200 },
    ];
    expect(sortFiles(files).map((f) => f.lastModified)).toEqual([100, 200, 300]);
  });
});

describe("buildCombinedText", () => {
  it("returns an empty string for an empty array", () => {
    expect(buildCombinedText([])).toBe("");
  });

  it("renders a single block with a header and the text", () => {
    const blocks: CombinedBlock[] = [
      {
        filename: "PTT-20240615-WA0001.opus",
        durationSeconds: 42,
        text: "Hola que tal.",
      },
    ];
    expect(buildCombinedText(blocks)).toBe(
      "--- Audio 1 · PTT-20240615-WA0001.opus (0m42s) ---\nHola que tal."
    );
  });

  it("omits the duration part when durationSeconds is 0", () => {
    const blocks: CombinedBlock[] = [
      { filename: "unknown.opus", durationSeconds: 0, text: "Sin duracion." },
    ];
    expect(buildCombinedText(blocks)).toBe(
      "--- Audio 1 · unknown.opus ---\nSin duracion."
    );
  });

  it("zero-pads seconds to two digits", () => {
    const blocks: CombinedBlock[] = [
      { filename: "a.opus", durationSeconds: 65, text: "uno" },
      { filename: "b.opus", durationSeconds: 5, text: "dos" },
    ];
    const out = buildCombinedText(blocks);
    expect(out).toContain("--- Audio 1 · a.opus (1m05s) ---");
    expect(out).toContain("--- Audio 2 · b.opus (0m05s) ---");
  });

  it("separates multiple blocks with a blank line and numbers them 1-based", () => {
    const blocks: CombinedBlock[] = [
      { filename: "a.opus", durationSeconds: 42, text: "uno" },
      { filename: "b.opus", durationSeconds: 0, text: "dos" },
    ];
    expect(buildCombinedText(blocks)).toBe(
      [
        "--- Audio 1 · a.opus (0m42s) ---",
        "uno",
        "",
        "--- Audio 2 · b.opus ---",
        "dos",
      ].join("\n")
    );
  });

  it("trims trailing whitespace overall", () => {
    const blocks: CombinedBlock[] = [
      { filename: "a.opus", durationSeconds: 0, text: "texto\n\n  " },
    ];
    expect(buildCombinedText(blocks)).toBe("--- Audio 1 · a.opus ---\ntexto");
  });
});

describe("buildCombinedMarkdown", () => {
  it("returns just frontmatter with files: 0 for an empty array", () => {
    const md = buildCombinedMarkdown([], { date: "2026-06-15", glossary: [] });
    expect(md).toBe(
      [
        "---",
        "source: audio-batch",
        "files: 0",
        "date: 2026-06-15",
        "glossary: []",
        "---",
        "",
        "",
        "",
      ].join("\n")
    );
  });

  it("omits duration when the total is 0", () => {
    const md = buildCombinedMarkdown(
      [{ filename: "a.opus", durationSeconds: 0, text: "hola" }],
      { date: "2026-06-15", glossary: [] }
    );
    expect(md).not.toContain("duration:");
    expect(md).toContain("files: 1");
  });

  it("sums durations and rounds the total", () => {
    const blocks: CombinedBlock[] = [
      { filename: "a.opus", durationSeconds: 42.4, text: "uno" },
      { filename: "b.opus", durationSeconds: 18.4, text: "dos" },
    ];
    const md = buildCombinedMarkdown(blocks, {
      date: "2026-06-15",
      glossary: [],
    });
    expect(md).toContain("duration: 61s");
    expect(md).toContain("files: 2");
  });

  it("renders the glossary comma-joined inside brackets", () => {
    const md = buildCombinedMarkdown(
      [{ filename: "a.opus", durationSeconds: 10, text: "hola" }],
      { date: "2026-06-15", glossary: [" Castmill ", "Groq", ""] }
    );
    expect(md).toContain("glossary: [Castmill, Groq]");
  });

  it("includes the combined text after the frontmatter", () => {
    const blocks: CombinedBlock[] = [
      { filename: "a.opus", durationSeconds: 42, text: "uno" },
    ];
    const md = buildCombinedMarkdown(blocks, {
      date: "2026-06-15",
      glossary: [],
    });
    expect(md).toBe(
      [
        "---",
        "source: audio-batch",
        "files: 1",
        "duration: 42s",
        "date: 2026-06-15",
        "glossary: []",
        "---",
        "",
        "--- Audio 1 · a.opus (0m42s) ---",
        "uno",
        "",
      ].join("\n")
    );
  });
});
