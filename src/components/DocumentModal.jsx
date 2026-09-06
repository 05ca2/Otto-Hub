import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { getDocument } from '../lib/storage';
import GeneratePanel from './GeneratePanel';
import Reader from './Reader';

export default function DocumentModal({ docId }) {
  const { closeDocModal, activeTab, setTab } = useStore();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setDoc(null);
    setError('');
    getDocument(docId)
      .then((d) => (d ? setDoc(d) : setError('找不到该文档，可能已被删除。')))
      .catch((e) => setError(e.message));
  }, [docId]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === 'Escape') closeDocModal();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [closeDocModal]);

  function toggleFullscreen() {
    setIsFullscreen((prev) => !prev);
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={closeDocModal}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="modal-close" onClick={closeDocModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="error">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="modal-overlay" onClick={closeDocModal}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="modal-close" onClick={closeDocModal}>✕</button>
          </div>
          <div className="modal-body">
            <div className="loading">加载中…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={closeDocModal}>
      <div
        className={`modal-container ${isFullscreen ? 'modal-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{doc.name}</h3>
          <div className="modal-tabs">
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
              阅读 & 提问
            </button>
          </div>
          <div className="modal-actions">
            <button className="modal-fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏'}>
              {isFullscreen ? '⊡' : '⛶'}
            </button>
            <button className="modal-close" onClick={closeDocModal}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {activeTab === 'generate' ? (
            <GeneratePanel doc={doc} />
          ) : (
            <Reader doc={doc} />
          )}
        </div>
      </div>
    </div>
  );
}
