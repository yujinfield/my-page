// ③ 연간 큰돈 캘린더: 월 가계부에 섞으면 안 되는 큰돈(결혼, 여행, 보험, 성과급 등)

import { parseAmount, formatMoney } from './calc.js';
import { newEvent } from './store.js';
import { cell, textInput, amountInput, deleteButton, renderHeadRow } from './cells.js';
import { addHistory, watchEdits, shown } from './history.js';

const LABELS = { month: '월', name: '이벤트', expected: '예상 지출', confirmed: '확정 지출', method: '마련 방법', note: '잔액/비고' };

const thead = document.getElementById('events-head');
const tbody = document.getElementById('events-body');
const tfoot = document.getElementById('events-foot');
const addButton = document.getElementById('events-add');

let state = null;
let save = null;

export function setupEvents(appState, onSave) {
  state = appState;
  save = onSave;
  tbody.addEventListener('input', handleInput);
  tbody.addEventListener('click', handleClick);
  addButton.addEventListener('click', addEvent);
  watchEdits(tbody, () => state.data, describeEdit, save);
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
    ['월'], ['이벤트'], ['예상 지출', true], ['확정 지출', true], ['마련 방법'], ['잔액/비고'], [''],
  ]);
  const rows = sortByMonth(state.data.events).map((event) => {
    const tr = document.createElement('tr');
    tr.dataset.id = event.id;
    tr.append(
      cell(textInput('month', event.month, '월', '2027.01 / 상시')),
      cell(textInput('name', event.name, '이벤트', '이벤트')),
      cell(amountInput('expected', event.expected, '예상 지출'), 'num'),
      cell(amountInput('confirmed', event.confirmed, '확정 지출'), 'num'),
      cell(textInput('method', event.method, '마련 방법', '현금/성과급/적립금')),
      cell(textInput('note', event.note, '잔액/비고')),
      cell(deleteButton('이벤트 지우기')),
    );
    return tr;
  });
  tbody.replaceChildren(...rows);
  renderFoot();
}

// "2027.01" 같은 날짜는 빠른 순, "상시"처럼 날짜가 아닌 것은 맨 뒤 (다시 그릴 때만 정렬)
function sortByMonth(events) {
  const isDate = (text) => /^\d{4}/.test(text);
  return events.slice().sort((x, y) => {
    if (isDate(x.month) !== isDate(y.month)) return isDate(x.month) ? -1 : 1;
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
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const item = findEvent(button);
  if (!item || !window.confirm(`"${item.name || '이름 없는 이벤트'}"을(를) 지울까요?`)) return;
  state.data.events = state.data.events.filter((other) => other !== item);
  addHistory(state.data, `[큰돈 캘린더] "${item.name || '이름 없는 이벤트'}" 지움`);
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
  const label = cell('합계');
  label.colSpan = 2;
  const rest = cell();
  rest.colSpan = 3;
  tr.append(label, cell(formatMoney(expected), 'num'), cell(formatMoney(confirmed), 'num'), rest);
  tfoot.replaceChildren(tr);
}
