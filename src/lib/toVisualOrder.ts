import bidiFactory from "bidi-js";

const bidi = bidiFactory();

/**
 * Satori (next/og's ImageResponse renderer) lays out text in raw logical
 * character order with no bidi resolution — Hebrew/Arabic strings render
 * backwards. This precomputes the correct visual order so a plain
 * left-to-right layout displays them correctly.
 */
export function toVisualOrder(text: string): string {
  const embeddingLevels = bidi.getEmbeddingLevels(text);
  const segments = bidi.getReorderSegments(text, embeddingLevels);
  const chars = [...text];
  for (const [start, end] of segments) {
    const reversed = chars.slice(start, end + 1).reverse();
    chars.splice(start, end - start + 1, ...reversed);
  }
  return chars.join("");
}
