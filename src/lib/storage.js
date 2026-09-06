import { get, set, del, keys, createStore } from 'idb-keyval';

// 所有文档与生成产物都存在浏览器 IndexedDB 里，本地优先、隐私友好
const store = createStore('aish-db', 'aish-store');

const docKey = (id) => `doc:${id}`;
const artKey = (id) => `art:${id}`;
const annKey = (id) => `ann:${id}`;
const chatKey = (id) => `chat:${id}`;

export async function saveDocument(doc) {
  await set(docKey(doc.id), doc, store);
}

export async function getDocument(id) {
  return get(docKey(id), store);
}

export async function deleteDocument(id) {
  await del(docKey(id), store);
  await del(artKey(id), store);
  await del(annKey(id), store);
  await del(chatKey(id), store);
}

export async function listDocuments() {
  const ks = await keys(store);
  const docs = [];
  for (const k of ks) {
    if (typeof k === 'string' && k.startsWith('doc:')) {
      const d = await get(k, store);
      docs.push({
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size,
        createdAt: d.createdAt,
        blocksCount: d.blocks?.length || 0
      });
    }
  }
  return docs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveArtifacts(id, arts) {
  await set(artKey(id), arts, store);
}
export async function getArtifacts(id) {
  return (await get(artKey(id), store)) || {};
}

export async function saveAnnotations(id, anns) {
  await set(annKey(id), anns, store);
}
export async function getAnnotations(id) {
  return (await get(annKey(id), store)) || [];
}

export async function saveChat(id, msgs) {
  await set(chatKey(id), msgs, store);
}
export async function getChat(id) {
  return (await get(chatKey(id), store)) || [];
}
