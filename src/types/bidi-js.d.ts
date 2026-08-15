declare module "bidi-js" {
  export type EmbeddingLevels = {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  };

  export type Bidi = {
    getEmbeddingLevels(text: string, explicitDirection?: "ltr" | "rtl"): EmbeddingLevels;
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels): [number, number][];
  };

  export default function bidiFactory(): Bidi;
}
