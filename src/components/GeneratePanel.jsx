import { useState, useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { getArtifacts, saveArtifacts } from '../lib/storage';
import { generate } from '../lib/ai';
import { renderMarkdown } from '../lib/markdown';

const KINDS = [
  { key: 'cheatsheet', label: '速查表 Cheatsheet', icon: '🗂️' },
  { key: 'quiz', label: '练习题', icon: '✍️' },
  { key: 'summary', label: '内容摘要', icon: '📝' }
];

export default function GeneratePanel({ doc }) {
  const { settings } = useStore();
  const [arts, setArts] = useState({});
  const [kind, setKind] = useState('cheatsheet');
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState('');
  const [error, setError] = useState('');
  const outRef = useRef(null);

  useEffect(() => {
    getArtifacts(doc.id).then((a) => setArts(a || {}));
  }, [doc.id]);

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [stream, arts]);

  async function run(k) {
    if (busy) return;
    setKind(k);
    setBusy(true);
    setError('');
    setStream('');
    const text = doc.blocks.map((b) => b.text).join('\n\n');
    try {
      const out = await generate({
        kind: k,
        text,
        model: settings.model,
        temperature: settings.temperature,
        onToken: (t) => setStream((s) => s + t)
      });
      const next = { ...arts, [k]: out };
      setArts(next);
      await saveArtifacts(doc.id, next);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setStream('');
    }
  }

  const result = arts[kind] || '';
  const showing = stream || result;

  return (
    <div className="generate">
      <div className="gen-actions">
        {KINDS.map((k) => (
          <button
            key={k.key}
            className={kind === k.key ? 'gen-btn active' : 'gen-btn'}
            onClick={() => run(k.key)}
            disabled={busy}
          >
            {k.icon} {k.label}
            {arts[k.key] && !busy ? <span className="done">✓</span> : null}
          </button>
        ))}
      </div>

      {busy && <div className="progress">⏳ 正在生成「{KINDS.find((k) => k.key === kind)?.label}」…</div>}
      {error && <div className="error">⚠️ {error}</div>}

      <div className="gen-out" ref={outRef}>
        {!showing && (
          <div className="empty">
            选择上方任意一种生成方式，AI 会基于这份资料产出对应内容并自动保存。
          </div>
        )}
        {showing && (
          <div
            className="md"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(stream || result) }}
          />
        )}
      </div>
    </div>
  );
}
