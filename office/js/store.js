// 데이터 계층. localStorage·IndexedDB 읽기/쓰기는 이 파일에서만 합니다.

const DATA_KEY = "ai-office-data";
const BACKUP_KEY = "ai-office-data-broken";
const SETTINGS_KEY = "ai-office-settings";
const THEME_KEY = "ai-office-theme";
const VERSION = 1;

export const DEFAULT_MODEL = "gpt-4.1-mini";

function emptyData() {
  return { version: VERSION, employees: [], messages: [], meetings: [], posting: null };
}

export function loadData() {
  let text = null;
  try {
    text = localStorage.getItem(DATA_KEY);
    if (!text) return emptyData();
    const data = migrate(JSON.parse(text));
    if (data) return data;
  } catch (error) {
    console.warn("회사 데이터를 불러오지 못했습니다.", error);
  }
  // 읽을 수 없는 데이터는 덮어쓰기 전에 따로 보관
  if (text) safeSet(BACKUP_KEY, text);
  return emptyData();
}

// 저장 형식이 바뀌면 여기서 옛 데이터를 새 형식으로 바꿉니다. (동기화로 받은 데이터에도 씀)
export function migrate(data) {
  if (!data || !Array.isArray(data.employees)) return null;
  return { ...emptyData(), ...data, version: VERSION };
}

export function saveData(data) {
  safeSet(DATA_KEY, JSON.stringify(data));
}

// 설정: { apiKey, model, imageModel, about, uplikaUrl, serverUrl, serverToken, dataSheets: [{ id, name, url, tabs }] }
export function loadSettings() {
  const settings = { apiKey: "", model: DEFAULT_MODEL, imageModel: "gpt-image-1", about: "", uplikaUrl: "", serverUrl: "", serverToken: "", dataSheets: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    // 예전 "중계 서버 주소"(uplikaProxy)는 사무실 서버 주소로 옮김
    if (saved.uplikaProxy && !saved.serverUrl) saved.serverUrl = saved.uplikaProxy;
    delete saved.uplikaProxy;
    return { ...settings, ...saved };
  } catch (error) {
    return settings;
  }
}

export function saveSettings(settings) {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}

// Uplika 연결 출입증과, 승인 화면에 다녀오는 동안 기억할 값
const UPLIKA_KEY = "ai-office-uplika";
const UPLIKA_PENDING_KEY = "ai-office-uplika-pending";

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function saveJson(key, value) {
  if (value) {
    safeSet(key, JSON.stringify(value));
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("지우지 못했습니다.", error);
  }
}

export function loadUplikaAuth() {
  return loadJson(UPLIKA_KEY);
}

export function saveUplikaAuth(auth) {
  saveJson(UPLIKA_KEY, auth);
}

export function loadUplikaPending() {
  return loadJson(UPLIKA_PENDING_KEY);
}

export function saveUplikaPending(pending) {
  saveJson(UPLIKA_PENDING_KEY, pending);
}

// ☁️ 동기화 설정 (이 기기에만): { token, gistId, key, salt, remoteSavedAt, dirty }
const SYNC_KEY = "ai-office-sync";

export function loadSync() {
  return loadJson(SYNC_KEY);
}

export function saveSync(sync) {
  saveJson(SYNC_KEY, sync);
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

export function saveTheme(theme) {
  safeSet(THEME_KEY, theme);
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn("저장하지 못했습니다.", error);
  }
}

let idCount = 0;
export function newId(prefix) {
  idCount += 1;
  return `${prefix}_${Date.now()}_${idCount}`;
}

// ---- 이미지 (IndexedDB) ----
// 이미지는 커서 localStorage에 못 넣고 IndexedDB에 둡니다. 이 기기에만 있고 동기화되지 않습니다.

const IMAGE_DB = "ai-office-images";
const IMAGE_STORE = "images";

function openImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IMAGE_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// id: 업무 지시 메시지 id, base64: webp 이미지 글자
export async function saveImage(id, base64) {
  const db = await openImageDb();
  await new Promise((resolve, reject) => {
    const request = db.transaction(IMAGE_STORE, "readwrite").objectStore(IMAGE_STORE).put(base64, id);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

// 없으면 null
export async function loadImage(id) {
  try {
    const db = await openImageDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(IMAGE_STORE).objectStore(IMAGE_STORE).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("이미지를 불러오지 못했습니다.", error);
    return null;
  }
}
