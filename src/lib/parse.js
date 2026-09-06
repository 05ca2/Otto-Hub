import * as pdfjsLib from 'pdfjs-dist';
// Vite 会把 worker 文件作为静态资源处理并返回 URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// 把大段文本按空行切分成“段落块”，每块有稳定 id，便于阅读器做高亮定位
function splitBlocks(text) {
  const raw = String(text || '').split(/\n{2,}/);
  const blocks = [];
  let i = 0;
  for (const t of raw) {
    const trimmed = t.replace(/\r/g, '').trim();
    if (trimmed) blocks.push({ id: `b${i++}`, text: trimmed });
  }
  return blocks;
}

export async function parsePDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    let lastY = null;
    let line = [];
    for (const it of tc.items) {
      const y = it.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.join(' '));
        line = [];
      }
      if (it.str) line.push(it.str);
      lastY = y;
    }
    if (line.length) lines.push(line.join(' '));
  }
  return splitBlocks(lines.join('\n'));
}

export async function parseDocx(file) {
  const mammoth = (await import('mammoth')).default;
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return splitBlocks(res.value);
}

export async function parseText(file) {
  const text = await file.text();
  return splitBlocks(text);
}

// 图片 OCR（浏览器内运行，无需 Key）；首次使用会从 CDN 下载语言包，需联网
export async function parseImage(file, onProgress) {
  const Tesseract = await import('tesseract.js');
  const { data } = await Tesseract.recognize(file, 'chi_sim+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  return splitBlocks(data.text);
}

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];

export async function parseFile(file, onProgress) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { blocks: await parsePDF(file), type: 'pdf' };
  if (ext === 'docx') return { blocks: await parseDocx(file), type: 'docx' };
  if (IMAGE_EXT.includes(ext)) return { blocks: await parseImage(file, onProgress), type: 'image' };
  // txt / md / 其它文本类一律当纯文本
  return { blocks: await parseText(file), type: ext === 'md' ? 'md' : 'txt' };
}
