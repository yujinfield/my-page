// 데이터 계층: localStorage 읽기/쓰기는 이 파일에서만 합니다.

const DRAFT_KEY = 'kkomjwi-draft';
const THEME_KEY = 'kkomjwi-theme';
// 버전 기록
// 1: 통합 입력폼
// 2: 컷 편집기 추가 (form.cuts). 1번 데이터는 cuts만 빈 목록으로 채워 그대로 씁니다.
const DRAFT_VERSION = 2;
const READABLE_VERSIONS = [1, 2];

// 작성 중인 입력폼 불러오기 (없거나 읽을 수 없으면 null)
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!READABLE_VERSIONS.includes(data.version)) return null;
    return migrate(data);
  } catch (error) {
    return null;
  }
}

// 예전 버전 데이터를 지금 형식으로 바꿉니다. (빠진 칸은 fields.js의 fillMissing이 채움)
function migrate(data) {
  const form = data.form || {};
  if (data.version === 1) {
    form.cuts = [];
  }
  return form;
}

export function saveDraft(form) {
  try {
    const data = { version: DRAFT_VERSION, form };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch (error) {
    // 저장 공간이 막혀 있어도 화면은 계속 쓸 수 있게 둡니다.
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    // 무시
  }
}

// 테마: 'light' | 'dark' | null(시스템 설정 따름)
export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    // 무시
  }
}

// ---------- 그림 생성 설정 (GPT API 키 포함) ----------
// API 키는 이 브라우저에만 저장되고, 저장소(GitHub)에는 절대 올라가지 않습니다.

const IMAGE_SETTINGS_KEY = 'kkomjwi-image-settings';

export function loadImageSettings() {
  try {
    const raw = localStorage.getItem(IMAGE_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function saveImageSettings(settings) {
  try {
    localStorage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    // 저장이 막혀 있어도 이번 화면에서는 쓸 수 있게 둡니다.
  }
}
