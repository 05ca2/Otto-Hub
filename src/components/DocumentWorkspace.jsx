import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { getDocument } from '../lib/storage';
import GeneratePanel from './GeneratePanel';
import Reader from './Reader';

export default function DocumentWorkspace({ docId }) {
  const { activeTab, setTab, openLibrary } = useStore();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setDoc(null);
    setError('');
    getDocument(docId)
      .then((d) => (d ? setDoc(d) : setError('找不到该文档，可能已被删除。')))
      .catch((e) => setError(e.message));
  }, [docId]);

  if (error) {
    return (
      <div className="workspace">
        <div className="error">{error}</div>
        <button className="back" onClick={openLibrary}>← 返回文档库</button>
      </div>
    );
  }
  if (!doc) return <div className="loading">加载中…</div>;

  return (
    <div className="workspace">
      <header className="ws-header">
        <button className="back" onClick={openLibrary}>← 文档库</button>
        <h2 className="ws-title">{doc.name}</h2>
        <div className="tabs">
          <button
            className={activeTab === 'generate' ? 'tab active' : 'tab'}
            onClick={() => setTab('generate')}
          >
            AI 生成
          </button>
          <button
            className={activeTab === 'read' ? 'tab active' : 'tab'}
            onClick={() => setTab('read')}
          >
            阅读 &amp; 提问
          </button>
        </div>
      </header>

      {activeTab === 'generate' ? (
        <GeneratePanel doc={doc} />
      ) : (
        <Reader doc={doc} />
      )}
    </div>
  );
}
