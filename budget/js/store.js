// 데이터 계층: localStorage 읽기/쓰기는 이 파일에서만 합니다.
// 키는 모두 "budget-"로 시작해서 다른 앱과 섞이지 않게 합니다.
// 금액 단위는 모두 "만원"입니다.

import { GROUPS, emptyMonth } from './calc.js';

const DATA_KEY = 'budget-data';
const THEME_KEY = 'budget-theme';

// 데이터 형식을 바꾸면 이 숫자를 올리고 loadData()에 옮기는 코드를 추가합니다.
const DATA_VERSION = 1;

function readJson(key) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}

// 저장되면 true. 저장 공간이 없거나 비공개 모드면 false (화면은 그대로 동작)
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

let idCount = 0;

// 겹치지 않는 id. 예: "i_lq3x2k1"
export function newId(prefix) {
  idCount += 1;
  return `${prefix}_${Date.now().toString(36)}${idCount}`;
}

export function newItem(group, name, joint, note) {
  return { id: newId('i'), group, name, a: null, b: null, joint, amount: null, note: note || '' };
}

export function newEvent(month, name, method) {
  return { id: newId('e'), month, name, expected: null, confirmed: null, method: method || '', note: '' };
}

// 처음 열었을 때 보여 줄 기본 표 (금액은 비워 둠)
function defaultData() {
  return {
    version: DATA_VERSION,
    names: { a: '유진', b: '남편' },
    items: [
      newItem('수입', '월급', false, '실수령 기준'),
      newItem('고정지출', '주담대 이자', true),
      newItem('고정지출', '신용대출/보험/통신', true),
      newItem('개인지출', '용돈', false, '각자 완전 자율'),
      newItem('가족', '부모님', true),
      newItem('생활비', '식비·배달·장보기', true),
      newItem('생활비', '교통·차량', true),
      newItem('생활비', '관리비·공과금', true),
      newItem('특별지출', '여행·경조사·가전', true, '따로 적립 추천'),
      newItem('저축·투자', '비상금', true),
      newItem('저축·투자', 'ISA·연금·ETF 등', true),
    ],
    months: {},
    events: [
      newEvent('2026.11', '결혼 준비', '기존 예산'),
      newEvent('2027.01', '본식·신혼여행', '현금/성과급'),
      newEvent('2027.02', '자동차 보험·세금', '월 적립금'),
      newEvent('상시', '가전 교체·집 수리', '특별비 통장'),
    ],
  };
}

/* ── 저장된 값 다듬기 (빠지거나 잘못된 값은 기본값으로) ── */

function toAmount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toText(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeItem(saved) {
  return {
    id: toText(saved.id) || newId('i'),
    group: GROUPS.includes(saved.group) ? saved.group : '생활비',
    name: toText(saved.name),
    a: toAmount(saved.a),
    b: toAmount(saved.b),
    joint: saved.joint === true,
    amount: toAmount(saved.amount),
    note: toText(saved.note),
  };
}

function normalizeMonth(saved) {
  const month = emptyMonth();
  if (!saved || typeof saved !== 'object') return month;
  if (saved.actual && typeof saved.actual === 'object') {
    for (const id of Object.keys(saved.actual)) {
      const value = toAmount(saved.actual[id]);
      if (value !== null) month.actual[id] = value;
    }
  }
  month.depositA = toAmount(saved.depositA);
  month.depositB = toAmount(saved.depositB);
  return month;
}

function normalizeEvent(saved) {
  return {
    id: toText(saved.id) || newId('e'),
    month: toText(saved.month),
    name: toText(saved.name),
    expected: toAmount(saved.expected),
    confirmed: toAmount(saved.confirmed),
    method: toText(saved.method),
    note: toText(saved.note),
  };
}

export function loadData() {
  const saved = readJson(DATA_KEY);
  if (!saved || typeof saved !== 'object') return defaultData();

  const months = {};
  if (saved.months && typeof saved.months === 'object') {
    for (const key of Object.keys(saved.months)) {
      if (/^\d{4}-\d{2}$/.test(key)) months[key] = normalizeMonth(saved.months[key]);
    }
  }
  const names = saved.names || {};

  return {
    version: DATA_VERSION,
    names: { a: toText(names.a) || '유진', b: toText(names.b) || '남편' },
    items: Array.isArray(saved.items) ? saved.items.filter(isObject).map(normalizeItem) : [],
    months,
    events: Array.isArray(saved.events) ? saved.events.filter(isObject).map(normalizeEvent) : [],
  };
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

export function saveData(data) {
  return writeJson(DATA_KEY, data);
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
