// 변경 이력: 무엇을 언제 어떻게 바꿨는지 한 줄씩 남깁니다.
// 글자를 칠 때마다가 아니라, 칸에서 빠져나갈 때(change) 한 번만 남깁니다.

import { HISTORY_LIMIT } from './store.js';

// text 예: "[월 가계부] 식비 실제액(2026.10): 100 → 130"
export function addHistory(data, text) {
  data.history.push({ time: Date.now(), text });
  if (data.history.length > HISTORY_LIMIT) data.history.splice(0, data.history.length - HISTORY_LIMIT);
}

// 빈칸은 "(빈칸)"으로 보여 줌
export function shown(value) {
  return value === '' || value === null || value === undefined ? '(빈칸)' : String(value);
}

// 표 안의 입력칸을 지켜보다가 값이 바뀌면 describe(input, 전 값, 새 값)로 이력 글을 만들어 남김
// describe가 null을 돌려주면 남기지 않음
export function watchEdits(container, data, describe, onRecord) {
  container.addEventListener('focusin', (event) => {
    const input = event.target;
    if (input.dataset.field) input.dataset.before = valueOf(input);
  });
  container.addEventListener('change', (event) => {
    const input = event.target;
    if (!input.dataset.field) return;
    const before = input.dataset.before === undefined ? '' : input.dataset.before;
    const after = valueOf(input);
    input.dataset.before = after;
    if (before === after) return;
    const text = describe(input, before, after);
    if (!text) return;
    addHistory(data(), text);
    onRecord();
  });
}

function valueOf(input) {
  if (input.type === 'checkbox') return input.checked ? '예' : '아니오';
  return input.value.trim();
}
