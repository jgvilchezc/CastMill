const DEFAULT_MAX_CHARS = 800;

/**
 * Split text into chunks targeting ~maxChars at paragraph boundaries.
 * A paragraph up to 2× maxChars is kept whole to preserve semantic units;
 * only paragraphs exceeding 2× maxChars are hard-split into maxChars-sized pieces.
 */
export function chunkText(text: string, maxChars = DEFAULT_MAX_CHARS): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };

  for (const para of paragraphs) {
    if (para.length > maxChars * 2) {
      pushCurrent();
      for (let i = 0; i < para.length; i += maxChars) {
        chunks.push(para.slice(i, i + maxChars));
      }
      continue;
    }
    if (!current) {
      current = para;
    } else if (current.length + 2 + para.length <= maxChars) {
      current = `${current}\n\n${para}`;
    } else {
      pushCurrent();
      current = para;
    }
  }
  pushCurrent();

  return chunks;
}
