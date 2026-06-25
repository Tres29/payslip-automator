declare module "html-pdf-node" {
  interface PdfOptions {
    format?: string;
    printBackground?: boolean;
    margin?: { top?: string; bottom?: string; left?: string; right?: string };
  }

  interface PdfFile {
    content?: string;
    url?: string;
  }

  export function generatePdf(file: PdfFile, options: PdfOptions, callback: (error: Error | null, buffer: Buffer) => void): void;
  export function generatePdf(file: PdfFile, options: PdfOptions): Promise<Buffer>;
  export default { generatePdf };
}
