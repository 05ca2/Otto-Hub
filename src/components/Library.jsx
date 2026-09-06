import { useState, useRef } from 'react';
import { useStore } from '../state/store';
import { parseFile } from '../lib/parse';
import { saveDocument, deleteDocument } from '../lib/storage';

function formatSize(n) {
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}

export default function Library() {
  const { documents, refresh, openDocModal } = useStore();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [fileQueue, setFileQueue] = useState([]);
  const inputRef = useRef(null);

  function addToQueue(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setFileQueue((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const newFiles = files.filter((f) => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFromQueue(index) {
    setFileQueue((prev) => prev.filter((_, i) => i !== index));
  }

  function clearQueue() {
    setFileQueue([]);
  }

  async function uploadQueue() {
    if (!fileQueue.length || busy) return;
    setError('');
    setBusy(true);
    for (const file of fileQueue) {
      try {
        setProgress(`正在解析：${file.name} …`);
        const { blocks, type } = await parseFile(file, (p) =>
          setProgress(`OCR 识别 ${file.name} ${p}%`)
        );
        if (!blocks.length) {
          setError(`未能从 ${file.name} 中提取到文本，请确认文件内容。`);
          continue;
        }
        const id = 'd' + Date.now() + Math.random().toString(36).slice(2, 7);
        await saveDocument({
          id,
          name: file.name,
          type,
          size: file.size,
          blocks,
          createdAt: Date.now()
        });
      } catch (e) {
        setError(`解析 ${file.name} 失败：${e.message}`);
      }
    }
    setBusy(false);
    setProgress('');
    setFileQueue([]);
    await refresh();
  }

  async function onDelete(id, name, e) {
    e.stopPropagation();
    if (!confirm(`确定删除「${name}」及其所有生成内容、标注与对话？`)) return;
    await deleteDocument(id);
    await refresh();
  }

  return (
    <div className="library">
      <header className="page-head">
        <h1>文档库</h1>
        <p className="sub">支持 PDF / Word(docx) / 图片(自动OCR) / Markdown / TXT。资料只存在你的浏览器本地。</p>
      </header>

      <div
        className={drag ? 'dropzone drag' : 'dropzone'}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addToQueue(e.dataTransfer.files);
        }}
      >
        <div className="dropzone-icon">⬆️</div>
        <div className="dropzone-text">点击或拖拽文件到此处</div>
        <div className="dropzone-sub">可多次选择文件，选好后点击上传</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.bmp,.webp"
          style={{ display: 'none' }}
          onChange={(e) => addToQueue(e.target.files)}
        />
      </div>

      {fileQueue.length > 0 && (
        <div className="file-queue">
          <div className="queue-header">
            <span className="queue-title">待上传文件 ({fileQueue.length})</span>
            <button className="queue-clear" onClick={clearQueue}>清空</button>
          </div>
          <div className="queue-list">
            {fileQueue.map((f, i) => (
              <div key={`${f.name}-${i}`} className="queue-item">
                <span className="queue-item-name">{f.name}</span>
                <span className="queue-item-size">{formatSize(f.size)}</span>
                <button className="queue-item-remove" onClick={() => removeFromQueue(i)}>✕</button>
              </div>
            ))}
          </div>
          <button className="upload-btn" onClick={uploadQueue} disabled={busy}>
            {busy ? '上传中…' : `上传 ${fileQueue.length} 个文件`}
          </button>
        </div>
      )}

      {busy && <div className="progress">⏳ {progress}</div>}
      {error && <div className="error">⚠️ {error}</div>}

      <div className="doc-grid">
        {documents.length === 0 && !busy && fileQueue.length === 0 && (
          <div className="empty">还没有资料，先丢一个文件进来吧。</div>
        )}
        {documents.map((d) => (
          <div key={d.id} className="doc-card" onClick={() => openDocModal(d.id)}>
            <div className="doc-card-top">
              <span className={`badge badge-${d.type}`}>{d.type}</span>
              <button
                className="doc-del"
                title="删除"
                onClick={(e) => onDelete(d.id, d.name, e)}
              >
                ✕
              </button>
            </div>
            <div className="doc-card-name">{d.name}</div>
            <div className="doc-card-meta">
              {d.blocksCount} 段 · {formatSize(d.size)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
