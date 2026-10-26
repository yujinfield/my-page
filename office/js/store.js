// 데이터 계층. localStorage 읽기/쓰기는 이 파일에서만 합니다.

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

// 저장 형식이 바뀌면 여기서 옛 데이터를 새 형식으로 바꿉니다.
function migrate(data) {
  if (!data || !Array.isArray(data.employees)) return null;
  return { ...emptyData(), ...data, version: VERSION };
}

export function saveData(data) {
  safeSet(DATA_KEY, JSON.stringify(data));
}

// 설정: { apiKey, model, about }
export function loadSettings() {
  const settings = { apiKey: "", model: DEFAULT_MODEL, about: "" };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...settings, ...saved };
  } catch (error) {
    return settings;
  }
}

export function saveSettings(settings) {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
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
