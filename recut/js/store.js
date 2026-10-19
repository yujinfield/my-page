// 데이터 계층: localStorage 읽기/쓰기는 이 파일에서만 합니다.
// 키는 모두 "recut-"로 시작해서 꼼쥐툰 메이커("kkomjwi-")와 섞이지 않게 합니다.
// 이미지는 저장하지 않습니다. (용량이 커서 메모리에만 두고 내려받기로 저장)

import { normalizeGrid, normalizeNudge } from './grid.js';
import { normalizeImageSettings } from './image-gen.js';

const DRAFT_KEY = 'recut-draft';
const SETTINGS_KEY = 'recut-image-settings';
const LOCKED_KEY = 'recut-image-key-locked';
const THEME_KEY = 'recut-theme';

const DRAFT_VERSION = 1;

function readJson(key) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // 저장 공간이 없거나 비공개 모드면 저장만 건너뜀 (화면은 그대로 동작)
  }
}

function normalizeCut(saved) {
  return {
    nudge: normalizeNudge(saved && saved.nudge),
    text: saved && typeof saved.text === 'string' ? saved.text : '',
    memo: saved && typeof saved.memo === 'string' ? saved.memo : '',
  };
}

export function emptyCut() {
  return normalizeCut(null);
}

// 작업 중인 격자·컷 글
export function loadDraft() {
  const saved = readJson(DRAFT_KEY);
  return {
    version: DRAFT_VERSION,
    grid: normalizeGrid(saved && saved.grid),
    fitMode: saved && saved.fitMode === 'fill' ? 'fill' : 'fit',
    cuts: saved && Array.isArray(saved.cuts) ? saved.cuts.map(normalizeCut) : [],
  };
}

export function saveDraft(draft) {
  writeJson(DRAFT_KEY, draft);
}

// 그림 설정 (모델·크기·품질). API 키는 여기 넣지 않음
export function loadImageSettings() {
  return normalizeImageSettings(readJson(SETTINGS_KEY));
}

export function saveImageSettings(settings) {
  writeJson(SETTINGS_KEY, settings);
}

// 잠금 비밀번호로 암호화한 API 키 (암호문만)
export function loadLockedKey() {
  return readJson(LOCKED_KEY);
}

export function saveLockedKey(record) {
  writeJson(LOCKED_KEY, record);
}

export function clearLockedKey() {
  try {
    localStorage.removeItem(LOCKED_KEY);
  } catch (error) {
    // 지울 수 없으면 그냥 둠
  }
}

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
    // 저장 못 해도 이번 화면에서는 바뀜
  }
}
