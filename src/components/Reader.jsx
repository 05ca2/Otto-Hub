import { useState, useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { getAnnotations, saveAnnotations } from '../lib/storage';
import ChatPanel from './ChatPanel';

// 找到包含选区/节点的段落块元素
function findBlockEl(node) {
  let el = node && node.nodeType === 3 ? node.parentElement : node;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.blockId) return el;
    el = el.parentElement;
  }
  return null;
}

// 计算某个文本节点偏移量在“块纯文本”中的绝对字符位置（无视已有高亮 span）
function offsetWithin(root, node, offset) {
  let total = 0;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (n === node) return total + offset;
    total += n.nodeValue.length;
  }
  return total + offset;
}

export default function Reader({ doc }) {
  const { settings } = useStore();
  const [anns, setAnns] = useState([]);
  const [popover, setPopover] = useState(null);
  const [citation, setCitation] = useState(null); // { text }
  const paneRef = useRef(null);

  useEffect(() => {
    getAnnotations(doc.id).then(setAnns);
  }, [doc.id]);

  // 监听选区，弹出“提问 / 记笔记”
  useEffect(() => {
    function onMouseUp() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      const blockEl = findBlockEl(range.commonAncestorContainer);
      if (!blockEl) return;
      const blockId = blockEl.dataset.blockId;
      const block = doc.blocks.find((b) => b.id === blockId);
      if (!block) return;
      const start = offsetWithin(blockEl, range.startContainer, range.startOffset);
      const end = offsetWithin(blockEl, range.endContainer, range.endOffset);
      if (end <= start) return;
      const text = block.text.slice(start, end);
      const rect = range.getBoundingClientRect();
      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.top,
        blockId,
        start,
        end,
        text
      });
    }
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [doc]);

  function addAnnotation(note) {
    const a = {
      id: 'a' + Date.now() + Math.random().toString(36).slice(2, 5),
      blockId: popover.blockId,
      start: popover.start,
      end: popover.end,
      text: popover.text,
      note: note || '',
      createdAt: Date.now()
    };
    const next = [...anns, a];
    setAnns(next);
    saveAnnotations(doc.id, next);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  }

  function renderBlock(block) {
    const blockAnns = anns
      .filter((a) => a.blockId === block.id)
      .sort((a, b) => a.start - b.start);
    if (!blockAnns.length) return block.text;

    const nodes = [];
    let cursor = 0;
    blockAnns.forEach((a) => {
      if (a.start < cursor) return; // 跳过重叠
      if (a.start > cursor) nodes.push(block.text.slice(cursor, a.start));
      nodes.push(
        <mark
          key={a.id}
          className="hl"
          title={a.note || '点击引用提问'}
          onClick={() => setCitation({ text: a.text })}
        >
          {block.text.slice(a.start, a.end)}
        </mark>
      );
      cursor = a.end;
    });
    if (cursor < block.text.length) nodes.push(block.text.slice(cursor));
    return nodes;
  }

  return (
    <div className="reader-layout">
      <div className="reader-pane" ref={paneRef}>
        <div className="doc-hint">共 {doc.blocks.length} 段 · 选中文字可“划重点 / 引用提问”</div>
        <article className="doc-text">
          {doc.blocks.map((b) => (
            <p key={b.id} data-block-id={b.id} className="block">
              {renderBlock(b)}
            </p>
          ))}
        </article>
      </div>

      <ChatPanel
        doc={doc}
        citationText={citation?.text || ''}
        onClearCitation={() => setCitation(null)}
      />

      {popover && (
        <div
          className="sel-popover"
          style={{ left: popover.x, top: popover.y - 8 }}
        >
          <button
            onClick={() => {
              setCitation({ text: popover.text });
              setPopover(null);
              window.getSelection()?.removeAllRanges();
            }}
          >
            向 AI 提问
          </button>
          <button
            onClick={() => {
              const note = prompt('给这段笔记写点备注（可留空）：');
              addAnnotation(note);
            }}
          >
            划重点 / 笔记
          </button>
        </div>
      )}
    </div>
  );
}
