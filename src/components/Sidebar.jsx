import { useStore } from '../state/store';

export default function Sidebar() {
  const { view, openLibrary, openSettings, documents, selectDoc, selectedId } = useStore();

  return (
    <aside className="sidebar">
      <div className="brand">📚 AI 助学中心</div>

      <nav className="nav">
        <button
          className={view === 'library' ? 'nav-btn active' : 'nav-btn'}
          onClick={openLibrary}
        >
          文档库
        </button>
        <button
          className={view === 'settings' ? 'nav-btn active' : 'nav-btn'}
          onClick={openSettings}
        >
          设置
        </button>
      </nav>

      <div className="doc-mini-list">
        <div className="doc-mini-title">我的资料</div>
        {documents.length === 0 && <div className="doc-mini-empty">还没有上传资料</div>}
        {documents.map((d) => (
          <button
            key={d.id}
            className={d.id === selectedId ? 'doc-mini active' : 'doc-mini'}
            onClick={() => selectDoc(d.id)}
            title={d.name}
          >
            <span className="doc-mini-name">{d.name}</span>
            <span className="doc-mini-type">{d.type}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-hint">
        把资料丢进来 → AI 生成速查表 / 题目 → 在阅读中划重点、引用提问。
      </div>
    </aside>
  );
}
