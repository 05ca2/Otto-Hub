import { useState, useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { getChat, saveChat } from '../lib/storage';
import { streamChat, TUTOR_SYS } from '../lib/ai';
import { renderMarkdown } from '../lib/markdown';

export default function ChatPanel({ doc, citationText, onClearCitation }) {
  const { settings } = useStore();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [localCitation, setLocalCitation] = useState(citationText);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getChat(doc.id).then(setMsgs);
  }, [doc.id]);

  // 外部（阅读器高亮/选区）传入新的引用时，同步到输入框上方并聚焦
  useEffect(() => {
    setLocalCitation(citationText);
    if (citationText) inputRef.current?.focus();
  }, [citationText]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, busy]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setError('');

    const userContent = localCitation
      ? `【资料引用】\n> ${localCitation}\n\n【我的问题】${q}`
      : q;

    const history = msgs.map((m) => ({ role: m.role, content: m.content }));
    const apiMessages = [
      { role: 'system', content: TUTOR_SYS },
      ...history,
      { role: 'user', content: userContent }
    ];

    const next = [...msgs, { role: 'user', content: userContent }];
    setMsgs([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setLocalCitation('');
    onClearCitation?.();
    setBusy(true);

    let acc = '';
    try {
      await streamChat(apiMessages, {
        model: settings.model,
        temperature: settings.temperature,
        onToken: (_, full) => {
          acc = full;
          setMsgs((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', content: acc };
            return copy;
          });
        }
      });
    } catch (e) {
      setError(e.message);
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: '⚠️ ' + e.message };
        return copy;
      });
    } finally {
      setBusy(false);
      await saveChat(doc.id, [
        ...next,
        { role: 'assistant', content: acc || '⚠️ 未获得回复' }
      ]);
    }
  }

  function clearChat() {
    if (!confirm('清空这份资料的对话记录？')) return;
    setMsgs([]);
    saveChat(doc.id, []);
  }

  return (
    <div className="chat-panel">
      <div className="chat-head">
        <span>💬 引用提问</span>
        {msgs.length > 0 && (
          <button className="chat-clear" onClick={clearChat}>
            清空
          </button>
        )}
      </div>

      <div className="chat-list" ref={listRef}>
        {msgs.length === 0 && (
          <div className="chat-empty">
            在阅读区选中文字 → 点“向 AI 提问”，或直接在下面输入问题。AI 会结合资料上下文作答。
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'msg user' : 'msg ai'}>
            <div className="msg-role">{m.role === 'user' ? '你' : 'AI'}</div>
            {m.role === 'user' ? (
              <div className="msg-body">{m.content}</div>
            ) : (
              <div
                className="md msg-body"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
              />
            )}
          </div>
        ))}
        {busy && <div className="msg ai typing">AI 正在思考…</div>}
      </div>

      {error && <div className="error small">{error}</div>}

      {localCitation && (
        <div className="cite-chip">
          <span className="cite-label">引用</span>
          <span className="cite-text">{localCitation}</span>
          <button onClick={() => setLocalCitation('')}>✕</button>
        </div>
      )}

      <div className="chat-input">
        <textarea
          ref={inputRef}
          value={input}
          placeholder="输入你的问题…（可先选中资料中的文字引用）"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="send-btn" onClick={send} disabled={busy || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}
