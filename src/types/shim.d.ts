declare module 'pdf-parse' {
  interface PdfData { text: string; numpages: number; numrender: number; info: unknown; metadata: unknown; version: string }
  function pdfParse(data: Buffer, opts?: Record<string, unknown>): Promise<PdfData>;
  export default pdfParse;
}

declare module 'mammoth' {
  export function extractRawText(opts: { buffer: Buffer } | { path: string }): Promise<{ value: string; messages: unknown[] }>;
}
