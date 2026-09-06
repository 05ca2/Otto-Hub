import { create } from 'zustand';
import { listDocuments } from '../lib/storage';

const SETTINGS_KEY = 'aish:settings';

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch (_e) {
    return {};
  }
}

export const useStore = create((set, get) => ({
  documents: [],
  selectedId: null,
  view: 'library', // 'library' | 'settings'
  activeTab: 'generate', // 'generate' | 'read'
  settings: { model: '', temperature: 0.7, ...loadSettings() },
  modalDocId: null, // For modal document viewer

  init() {
    get().refresh();
    const s = loadSettings();
    set({ settings: { model: s.model || '', temperature: s.temperature ?? 0.7 } });
  },

  async refresh() {
    const docs = await listDocuments();
    set({ documents: docs });
  },

  selectDoc(id) {
    set({ selectedId: id, view: 'library', activeTab: 'generate' });
  },
  openDocModal(id) {
    set({ modalDocId: id });
  },
  closeDocModal() {
    set({ modalDocId: null });
  },
  openLibrary() {
    set({ selectedId: null, view: 'library' });
  },
  openSettings() {
    set({ view: 'settings' });
  },
  setTab(t) {
    set({ activeTab: t });
  },
  setSettings(patch) {
    const next = { ...get().settings, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    set({ settings: next });
  }
}));
