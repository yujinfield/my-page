// 작업 기록(로그)과 콘티 스냅샷
// 화면(DOM)은 건드리지 않습니다. 보여 주기는 history-panel.js에서 합니다.

import { loadHistory, saveHistory } from './store.js';

const MAX_ENTRIES = 100;   // 기록은 최근 100개까지
const MAX_SNAPSHOTS = 10;  // 되돌리기용 콘티 스냅샷은 최근 10개까지

const listeners = [];
let idCounter = 0;

// 지금 콘티 상태를 복사해 둠
export function makeSnapshot(form) {
  return JSON.parse(JSON.stringify({ cuts: form.cuts, caption: form.caption, review: form.review }));
}

// 기록 남기기. snapshot이 있으면 그 시점의 콘티로 되돌릴 수 있어요.
export function addLog(action, detail = '', snapshot = null) {
  idCounter += 1;
  const entry = { id: `h_${Date.now()}_${idCounter}`, time: Date.now(), action, detail };
  if (snapshot) entry.snapshot = snapshot;

  let list = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);

  // 오래된 스냅샷은 지우고 기록 줄만 남김
  let snapshots = 0;
  list = list.map((item) => {
    if (!item.snapshot) return item;
    snapshots += 1;
    if (snapshots <= MAX_SNAPSHOTS) return item;
    const { snapshot: _removed, ...rest } = item;
    return rest;
  });

  // 저장 공간이 모자라면 최신 하나만 빼고 스냅샷을 모두 지우고 다시 시도
  if (!saveHistory(list)) {
    list = list.map((item, index) => {
      if (index === 0 || !item.snapshot) return item;
      const { snapshot: _removed, ...rest } = item;
      return rest;
    });
    saveHistory(list);
  }
  listeners.forEach((listener) => listener());
}

export function getLogs() {
  return loadHistory();
}

export function findSnapshot(id) {
  const entry = loadHistory().find((item) => item.id === id);
  return entry && entry.snapshot ? entry.snapshot : null;
}

export function clearLogs() {
  saveHistory([]);
  listeners.forEach((listener) => listener());
}

export function onHistoryChange(listener) {
  listeners.push(listener);
}

// 10/15 14:32
export function formatTime(ms) {
  const date = new Date(ms);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
