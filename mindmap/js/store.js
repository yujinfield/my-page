// 데이터 계층. localStorage 읽기/쓰기는 이 파일에서만 합니다.

const MAP_KEY = "mindmap-data";
const BACKUP_KEY = "mindmap-data-broken";
const THEME_KEY = "mindmap-theme";
const VERSION = 1;

// 저장된 마인드맵을 불러옴. 없으면 null
export function loadMap() {
  let text = null;
  try {
    text = localStorage.getItem(MAP_KEY);
    if (!text) return null;
    const map = migrate(JSON.parse(text));
    if (map) return map;
  } catch (error) {
    console.warn("마인드맵을 불러오지 못했습니다.", error);
  }
  // 읽을 수 없는 데이터는 새 지도로 덮어쓰기 전에 따로 보관
  if (text) safeSet(BACKUP_KEY, text);
  return null;
}

// 저장 형식이 바뀌면 여기서 옛 데이터를 새 형식으로 바꿉니다.
function migrate(data) {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null;
  if (!data.view) data.view = null;
  data.version = VERSION;
  return data;
}

export function saveMap(map) {
  safeSet(MAP_KEY, JSON.stringify({ ...map, version: VERSION }));
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
