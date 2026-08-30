// Text extraction for PDF / DOCX / PPTX / MD / TXT. Returns plain text + a light title guess.
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import officeParser from 'officeparser';

export type ExtractedDoc = { title: string; content: string; mime: string };

export async function extractFromBuffer(
  filename: string,
  mime: string,
  buf: Buffer,
): Promise<ExtractedDoc> {
  const lower = filename.toLowerCase();
  const baseTitle = filename.replace(/\.[^.]+$/, '').slice(0, 200) || 'Untitled';

  // PDF
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) {
    const data = await pdfParse(buf);
    const text = (data.text || '').replace(/\u0000/g, '').trim();
    return { title: baseTitle, content: text, mime: 'application/pdf' };
  }

  // DOCX
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return { title: baseTitle, content: (value || '').trim(), mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  // PPTX / PPT
  if (
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    lower.endsWith('.pptx') ||
    lower.endsWith('.ppt')
  ) {
    const text = await officeParser.parseOfficeAsync(buf);
    return { title: baseTitle, content: (text || '').trim(), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
  }

  // Plain text / markdown
  if (
    mime.startsWith('text/') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.markdown') ||
    lower.endsWith('.rst')
  ) {
    return { title: baseTitle, content: buf.toString('utf8'), mime: mime || 'text/plain' };
  }

  // Fallback: best-effort utf-8
  return { title: baseTitle, content: buf.toString('utf8'), mime: mime || 'application/octet-stream' };
}
