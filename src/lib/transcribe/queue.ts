// Anything with a name + lastModified can be ordered. File satisfies this.
export interface OrderableFile {
  name: string;
  lastModified: number;
}

// One transcribed audio, ready to be combined.
export interface CombinedBlock {
  filename: string;
  durationSeconds: number; // 0 when unknown
  text: string;
}

export interface CombinedMarkdownMeta {
  date: string; // ISO yyyy-mm-dd
  glossary: string[];
}

// name ascending (localeCompare, numeric-aware), lastModified ascending as tiebreaker
export function compareFiles(a: OrderableFile, b: OrderableFile): number {
  const byName = a.name.localeCompare(b.name, undefined, { numeric: true });
  if (byName !== 0) return byName;
  return a.lastModified - b.lastModified;
}

// returns a NEW sorted array, does not mutate input
export function sortFiles<T extends OrderableFile>(files: T[]): T[] {
  return [...files].sort(compareFiles);
}

function formatDurationPart(durationSeconds: number): string {
  if (durationSeconds <= 0) return "";
  const total = Math.round(durationSeconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return ` (${mins}m${String(secs).padStart(2, "0")}s)`;
}

function blockHeader(block: CombinedBlock, index: number): string {
  return `--- Audio ${index + 1} · ${block.filename}${formatDurationPart(
    block.durationSeconds
  )} ---`;
}

// concatenated text with one header per block
export function buildCombinedText(blocks: CombinedBlock[]): string {
  const sections = blocks.map(
    (block, index) => `${blockHeader(block, index)}\n${block.text}`
  );
  return sections.join("\n\n").trimEnd();
}

// markdown variant, frontmatter consistent with format.ts buildMarkdown style
export function buildCombinedMarkdown(
  blocks: CombinedBlock[],
  meta: CombinedMarkdownMeta
): string {
  const glossaryLine =
    meta.glossary.length > 0
      ? `glossary: [${meta.glossary
          .map((g) => g.trim())
          .filter(Boolean)
          .join(", ")}]`
      : "glossary: []";

  const totalDuration = blocks.reduce(
    (sum, block) => sum + Math.max(0, block.durationSeconds),
    0
  );

  const lines = ["---", "source: audio-batch", `files: ${blocks.length}`];
  if (totalDuration > 0) lines.push(`duration: ${Math.round(totalDuration)}s`);
  lines.push(`date: ${meta.date}`, glossaryLine, "---", "");
  const frontmatter = lines.join("\n");

  return `${frontmatter}\n${buildCombinedText(blocks)}\n`;
}
