export interface WhisperSegment {
  text: string;
  start: number;
  end: number;
}

const PARAGRAPH_GAP_SECONDS = 1.5;

export function formatParagraphs(segments: WhisperSegment[]): string {
  if (segments.length === 0) return "";

  const paragraphs: string[] = [];
  let current: string[] = [];
  let prevEnd = segments[0].start;

  for (const seg of segments) {
    const text = seg.text.trim();
    if (!text) continue;
    const gap = seg.start - prevEnd;
    if (gap >= PARAGRAPH_GAP_SECONDS && current.length > 0) {
      paragraphs.push(current.join(" "));
      current = [];
    }
    current.push(text);
    prevEnd = seg.end;
  }

  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  return paragraphs.join("\n\n");
}

export function inferDuration(segments: WhisperSegment[]): number {
  if (segments.length === 0) return 0;
  return segments[segments.length - 1].end;
}

export interface MarkdownMeta {
  filename: string;
  duration: number;
  language: string;
  date: string;
  glossary: string[];
}

export function buildMarkdown(text: string, meta: MarkdownMeta): string {
  const glossaryLine =
    meta.glossary.length > 0
      ? `glossary: [${meta.glossary.map((g) => g.trim()).filter(Boolean).join(", ")}]`
      : "glossary: []";

  const lines = ["---", "source: audio", `filename: ${meta.filename}`];
  if (meta.duration > 0) lines.push(`duration: ${Math.round(meta.duration)}s`);
  if (meta.language && meta.language !== "unknown")
    lines.push(`language: ${meta.language}`);
  lines.push(`date: ${meta.date}`, glossaryLine, "---", "");
  const frontmatter = lines.join("\n");

  return `${frontmatter}\n${text}\n`;
}

export function parseGlossary(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}
