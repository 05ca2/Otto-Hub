import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

// 渲染 Markdown 并用 DOMPurify 清洗，防止注入
export function renderMarkdown(md) {
  const raw = marked.parse(md || '');
  return DOMPurify.sanitize(raw);
}
