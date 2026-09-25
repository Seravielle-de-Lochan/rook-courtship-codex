// Persistence: packs (with image blobs) live in IndexedDB; small settings and
// per-content-pack progress live in localStorage.

const DB_NAME = 'codex-studio';
const DB_VERSION = 1;
let dbPromise;

function openDb() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('visual')) db.createObjectStore('visual', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('content')) db.createObjectStore('content', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Storage transaction aborted (the device may be out of space).'));
  });
}

export const packs = {
  list: (kind) => tx(kind, 'readonly', (s) => s.getAll()),
  get: (kind, id) => tx(kind, 'readonly', (s) => s.get(id)),
  put: (kind, record) => tx(kind, 'readwrite', (s) => s.put(record)),
  remove: (kind, id) => tx(kind, 'readwrite', (s) => s.delete(id)),
};

function readJson(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : { ...fallback };
  } catch {
    return { ...fallback };
  }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
}

const SETTINGS_KEY = 'codexStudio:settings';
export const defaultSettings = {
  visual: 'builtin:tideglass',
  content: 'rook-courtship',
  mode: 'mixed',
  companions: true,
  sound: false,
  uiSound: true, // tap and switch sounds (only while sound is on)
  haptics: true,
  motion: 'full', // full | calm | off
  textSize: 'm', // m | l | xl | xxl
  font: 'look', // look | plain | legible
  spacing: false,
  contrast: false,
  blurbs: false,
  onboarded: false,
};
export const settings = {
  load: () => readJson(SETTINGS_KEY, defaultSettings),
  save: (s) => writeJson(SETTINGS_KEY, s),
};

export const defaultProgress = () => ({ seen: 0, correct: 0, streak: 0, best: 0, discovered: {}, dailyCache: {}, dailyAnswers: {}, unlockedLore: {} });
export const progress = {
  load: (packId) => {
    const p = readJson(`codexStudio:progress:${packId}`, defaultProgress());
    for (const k of ['discovered', 'dailyCache', 'dailyAnswers', 'unlockedLore']) p[k] ||= {};
    return p;
  },
  save: (packId, p) => {
    // Keep the daily cache small: only the last 14 days are ever useful.
    const days = Object.keys(p.dailyCache).sort();
    for (const d of days.slice(0, Math.max(0, days.length - 14))) delete p.dailyCache[d];
    writeJson(`codexStudio:progress:${packId}`, p);
  },
  reset: (packId) => { try { localStorage.removeItem(`codexStudio:progress:${packId}`); } catch {} },
};

export async function storageEstimate() {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { used: e.usage || 0, quota: e.quota || 0 } : null;
  } catch {
    return null;
  }
}

export async function requestPersistence() {
  try { return await navigator.storage?.persist?.(); } catch { return false; }
}
