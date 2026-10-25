// ① 월 가계부 표 위 "이번 달 메모": 보고 있는 달마다 따로 저장 (months[달].memo)
// 글을 칠 때마다 저장하고, 칸을 벗어날 때 이력에 남깁니다.

import { formatMonth, monthRecord, ensureMonth } from './calc.js';
import { watchEdits, shown } from './history.js';

const memoLabel = document.getElementById('month-memo-label');
const memoInput = document.getElementById('month-memo');

let state = null;

export function setupMonthMemo(appState, save) {
  state = appState;
  memoInput.addEventListener('input', () => {
    ensureMonth(state.data, state.month).memo = memoInput.value;
    save();
  });
  watchEdits(memoInput.parentElement, () => state.data, (input, before, after) =>
    `[월 가계부] ${formatMonth(state.month)} 메모: ${shown(shortText(before))} → ${shown(shortText(after))}`, save);
}

// 이력에는 메모 앞부분만
function shortText(text) {
  return text.length > 30 ? `${text.slice(0, 30)}…` : text;
}

export function renderMonthMemo(appState) {
  state = appState;
  memoLabel.textContent = `${formatMonth(state.month)} 메모`;
  if (memoInput !== document.activeElement) memoInput.value = monthRecord(state.data, state.month).memo;
}
