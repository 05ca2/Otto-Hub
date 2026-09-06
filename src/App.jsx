import { useEffect } from 'react';
import { useStore } from './state/store';
import Sidebar from './components/Sidebar';
import Library from './components/Library';
import DocumentWorkspace from './components/DocumentWorkspace';
import DocumentModal from './components/DocumentModal';
import Settings from './components/Settings';

export default function App() {
  const { view, selectedId, modalDocId, init } = useStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        {view === 'settings' ? (
          <Settings />
        ) : selectedId ? (
          <DocumentWorkspace docId={selectedId} />
        ) : (
          <Library />
        )}
      </main>
      {modalDocId && <DocumentModal docId={modalDocId} />}
    </div>
  );
}
