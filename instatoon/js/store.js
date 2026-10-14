// 데이터 계층: localStorage 읽기/쓰기는 이 파일에서만 합니다.

const DRAFT_KEY = 'kkomjwi-draft';
const THEME_KEY = 'kkomjwi-theme';
const DRAFT_VERSION = 1;

// 작성 중인 입력폼 불러오기 (없거나 읽을 수 없으면 null)
export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== DRAFT_VERSION) return null;
    return data.form;
  } catch (error) {
    return null;
  }
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
