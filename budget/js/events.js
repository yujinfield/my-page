// ③ 연간 큰돈 캘린더: 월 가계부에 섞으면 안 되는 큰돈(결혼, 여행, 보험, 성과급 등)

import { parseAmount, formatMoney } from './calc.js';
import { newEvent } from './store.js';
import { areaCell, textInput, amountInput, deleteButton, renderHeadRow } from './cells.js';
import { addHistory, watchEdits, shown } from './history.js';

const LABELS = { month: '월', name: '이벤트', expected: '예상 지출', confirmed: '확정 지출', method: '마련 방법', note: '잔액/비고' };

const thead = document.getElementById('events-head');
const tbody = document.getElementById('events-body');
const tfoot = document.getElementById('events-foot');
const addButton = document.getElementById('events-add');
const showDoneButton = document.getElementById('events-show-done');

let state = null;
let save = null;
let showDone = false; // 완료한 이벤트도 보여 줄지

export function setupEvents(appState, onSave) {
  state = appState;
  save = onSave;
  tbody.addEventListener('input', handleInput);
  tbody.addEventListener('click', handleClick);
  addButton.addEventListener('click', addEvent);
  showDoneButton.addEventListener('click', () => {
    showDone = !showDone;
    renderEvents();
  });
  tbody.addEventListener('change', resortAfterMonthChange);
  watchEdits(tbody, () => state.data, describeEdit, save);
}

// 월을 고치면 바로 다시 정렬. 칸을 벗어나 다음 칸으로 간 뒤에 다시 그리고, 그 칸에 커서를 돌려 놓음
function resortAfterMonthChange(event) {
  if (event.target.dataset.field !== 'month') return;
  setTimeout(() => {
    const active = document.activeElement;
    const row = active && active.closest('#events-body tr');
    const field = active && active.dataset.field;
    renderEvents();
    if (row && field) {
      const again = tbody.querySelector(`tr[data-id="${row.dataset.id}"] [data-field="${field}"]`);
      if (again) again.focus();
    }
  }, 0);
}

// 예: "[큰돈 캘린더] 결혼 준비 예상 지출: (빈칸) → 1500"
function describeEdit(input, before, after) {
  const item = findEvent(input);
  if (!item) return null;
  const eventName = (input.dataset.field === 'name' ? before : item.name) || '이름 없는 이벤트';
  return `[큰돈 캘린더] ${eventName} ${LABELS[input.dataset.field]}: ${shown(before)} → ${shown(after)}`;
}

export function renderEvents() {
  renderHeadRow(thead, [
    ['월'], ['이벤트'], ['예상 지출', true], ['확정 지출', true], ['마련 방법'], ['잔액/비고'], [''], [''],
  ]);
  const visible = state.data.events.filter((event) => showDone || !event.done);
  const rows = sortByMonth(visible).map((event) => {
    const tr = document.createElement('tr');
    tr.dataset.id = event.id;
    if (event.done) tr.className = 'is-done';
    // 휴대폰에서는 카드로 보임 (자리 이름·이름표는 table.css)
    tr.append(
      areaCell('month', '', textInput('month', event.month, '월', '2027.01 / 상시')),
      areaCell('name', '', textInput('name', event.name, '이벤트', '이벤트')),
      areaCell('expected', '예상 지출', amountInput('expected', event.expected, '예상 지출'), 'num'),
      areaCell('confirmed', '확정 지출', amountInput('confirmed', event.confirmed, '확정 지출'), 'num'),
      areaCell('method', '마련 방법', textInput('method', event.method, '마련 방법', '현금/성과급/적립금')),
      areaCell('note', '잔액/비고', textInput('note', event.note, '잔액/비고')),
      areaCell('done', '', doneButton(event)),
      areaCell('delete', '', deleteButton('이벤트 지우기')),
    );
    return tr;
  });
  tbody.replaceChildren(...rows);
  renderFoot();
  renderShowDoneButton();
}

// "✓ 완료" 누르면 숨김, 완료한 것을 보는 중이면 "↩ 되돌리기"
function doneButton(event) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'done-button';
  button.dataset.action = 'done';
  button.textContent = event.done ? '↩ 되돌리기' : '✓ 완료';
  button.setAttribute('aria-label', event.done ? '완료 취소' : '완료로 표시하고 숨기기');
  return button;
}

function renderShowDoneButton() {
  const count = state.data.events.filter((event) => event.done).length;
  showDoneButton.hidden = count === 0 && !showDone;
  showDoneButton.textContent = showDone ? '완료된 이벤트 숨기기' : `완료된 이벤트 ${count}개 보기`;
  showDoneButton.setAttribute('aria-pressed', String(showDone));
}

// "상시"처럼 날짜가 아닌 것이 맨 위, 그 아래는 "2027.01" 같은 날짜가 빠른 순
function sortByMonth(events) {
  const isDate = (text) => /^\d{4}/.test(text);
  return events.slice().sort((x, y) => {
    if (isDate(x.month) !== isDate(y.month)) return isDate(x.month) ? 1 : -1;
    return x.month.localeCompare(y.month);
  });
}

function findEvent(element) {
  const row = element.closest('tr');
  return row ? state.data.events.find((event) => event.id === row.dataset.id) : null;
}

function handleInput(event) {
  const field = event.target.dataset.field;
  const item = findEvent(event.target);
  if (!item || !field) return;
  if (field === 'expected' || field === 'confirmed') item[field] = parseAmount(event.target.value);
  else item[field] = event.target.value;
  save();
  renderFoot();
}

function handleClick(event) {
  const doneClick = event.target.closest('[data-action="done"]');
  if (doneClick) {
    toggleDone(findEvent(doneClick));
    return;
  }
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const item = findEvent(button);
  if (!item || !window.confirm(`"${item.name || '이름 없는 이벤트'}"을(를) 지울까요?`)) return;
  state.data.events = state.data.events.filter((other) => other !== item);
  addHistory(state.data, `[큰돈 캘린더] "${item.name || '이름 없는 이벤트'}" 지움`);
  save();
  renderEvents();
}

function toggleDone(item) {
  if (!item) return;
  item.done = !item.done;
  const name = item.name || '이름 없는 이벤트';
  addHistory(state.data, `[큰돈 캘린더] "${name}" ${item.done ? '완료' : '완료 취소'}`);
  save();
  renderEvents();
}

function addEvent() {
  const item = newEvent('', '', '');
  state.data.events.push(item);
  save();
  renderEvents();
  const input = tbody.querySelector(`tr[data-id="${item.id}"] [data-field="month"]`);
  if (input) input.focus();
}

function renderFoot() {
  let expected = 0;
  let confirmed = 0;
  for (const event of state.data.events) {
    expected += event.expected || 0;
    confirmed += event.confirmed || 0;
  }
  const tr = document.createElement('tr');
  tr.className = 'total-row';
  const label = areaCell('name', '', '합계 (완료 포함)');
  label.colSpan = 2;
  const rest = areaCell('rest', '', '');
  rest.colSpan = 4;
  tr.append(
    label,
    areaCell('expected', '예상 지출', formatMoney(expected), 'num'),
    areaCell('confirmed', '확정 지출', formatMoney(confirmed), 'num'),
    rest,
  );
  tfoot.replaceChildren(tr);
}
