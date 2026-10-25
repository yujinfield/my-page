// ③ 연간 큰돈 캘린더: 월 가계부에 섞으면 안 되는 큰돈(결혼, 여행, 보험, 성과급 등)

import { parseAmount, formatMoney, eventTotals } from './calc.js';
import { newEvent, newDetail, EVENT_SOURCES } from './store.js';
import {
  areaCell, textInput, amountInput, selectInput, computed, setMoney, deleteButton, renderHeadRow,
} from './cells.js';
import { addHistory, watchEdits, shown } from './history.js';
import { detailToggle, detailRow, findDetail } from './event-details.js';

const LABELS = {
  month: '월', owner: '누구', category: '분류', name: '이벤트', expected: '예상 지출', confirmed: '확정 지출', source: '돈 나가는 곳',
  note: '잔액/비고',
  detailName: '이름', detailExpected: '예상', detailConfirmed: '확정',
};
const COLUMN_COUNT = 10; // 표 칸 수 (세부 항목 줄이 이만큼 가로로 걸침)
const SOURCE_OPTIONS = [['', '—'], ...EVENT_SOURCES];
const ADD_CATEGORY = '__add__'; // 분류 칸의 "＋ 새로 추가…" 값

// 분류 고르는 칸의 목록: 선택 안 함 / 분류 목록 / ＋ 새로 추가…
// 목록에 없는 분류(예: 백업에서 불러온 것)도 이 이벤트에 고른 값이면 보여 줌
function categoryOptions(event) {
  const names = state.data.eventCategories.slice();
  if (event.category && !names.includes(event.category)) names.push(event.category);
  return [['', '—'], ...names.map((name) => [name, name]), [ADD_CATEGORY, '＋ 새로 추가…']];
}

// 누구 것인지 고르는 칸의 목록: 공통 / 유진 / 남편 (이름은 ⚙️ 설정에서)
function ownerOptions() {
  return [['joint', '공통'], ['a', state.data.names.a], ['b', state.data.names.b]];
}

// 고르는 칸은 이력에 값(joint, savings…) 대신 보이는 글자로 남김
function optionText(field, value) {
  const options = field === 'owner' ? ownerOptions() : field === 'source' ? SOURCE_OPTIONS : null;
  if (!options) return value;
  const found = options.find(([optionValue]) => optionValue === value);
  return found ? found[1] : value;
}

const thead = document.getElementById('events-head');
const tbody = document.getElementById('events-body');
const tfoot = document.getElementById('events-foot');
const addButton = document.getElementById('events-add');
const showDoneButton = document.getElementById('events-show-done');

let state = null;
let save = null;
let showDone = false; // 완료한 이벤트도 보여 줄지
const openIds = new Set(); // 세부 항목을 펼친 이벤트 id

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
    const detail = active && active.closest('[data-detail-id]');
    renderEvents();
    if (row && field) {
      const inDetail = detail ? `[data-detail-id="${detail.dataset.detailId}"] ` : '';
      const again = tbody.querySelector(`tr[data-id="${row.dataset.id}"] ${inDetail}[data-field="${field}"]`);
      if (again) again.focus();
    }
  }, 0);
}

// 예: "[큰돈 캘린더] 결혼 준비 예상 지출: (빈칸) → 1500"
function describeEdit(input, before, after) {
  const item = findEvent(input);
  if (!item) return null;
  const eventName = (input.dataset.field === 'name' ? before : item.name) || '이름 없는 이벤트';
  const detail = findDetail(item, input);
  if (detail) {
    const detailName = (input.dataset.field === 'detailName' ? before : detail.name) || '세부 항목';
    return `[큰돈 캘린더] ${eventName} › ${detailName} ${LABELS[input.dataset.field]}: ${shown(before)} → ${shown(after)}`;
  }
  const field = input.dataset.field;
  return `[큰돈 캘린더] ${eventName} ${LABELS[field]}: ${shown(optionText(field, before))} → ${shown(optionText(field, after))}`;
}

export function renderEvents() {
  renderHeadRow(thead, [
    ['월'], ['누구'], ['분류'], ['이벤트'], ['예상 지출', true], ['확정 지출', true], ['돈 나가는 곳'], ['잔액/비고'], [''], [''],
  ]);
  const visible = state.data.events.filter((event) => showDone || !event.done);
  const rows = [];
  for (const event of sortByMonth(visible)) {
    rows.push(eventRow(event));
    if (openIds.has(event.id)) rows.push(detailRow(event, COLUMN_COUNT));
  }
  tbody.replaceChildren(...rows);
  renderFoot();
  renderShowDoneButton();
}

function eventRow(event) {
  const tr = document.createElement('tr');
  tr.dataset.id = event.id;
  tr.className = `owner-${event.owner}`;
  if (event.done) tr.classList.add('is-done');

  // 세부 항목이 있으면 예상·확정은 세부 항목 합계(보기만), 없으면 직접 적음
  const hasDetails = event.details.length > 0;
  const expected = hasDetails ? computed('expected') : amountInput('expected', event.expected, '예상 지출');
  const confirmed = hasDetails ? computed('confirmed') : amountInput('confirmed', event.confirmed, '확정 지출');

  const nameBox = document.createElement('div');
  nameBox.className = 'event-name';
  nameBox.append(textInput('name', event.name, '이벤트', '이벤트'), detailToggle(event, openIds.has(event.id)));

  // 휴대폰에서는 카드로 보임 (자리 이름·이름표는 table.css)
  tr.append(
    areaCell('month', '', textInput('month', event.month, '월', '2027.01 / 상시')),
    areaCell('owner', '', selectInput('owner', event.owner, '누구 것인지', ownerOptions())),
    areaCell('category', '분류', selectInput('category', event.category, '분류', categoryOptions(event))),
    areaCell('name', '', nameBox),
    areaCell('expected', '예상 지출', expected, 'num'),
    areaCell('confirmed', '확정 지출', confirmed, 'num'),
    areaCell('source', '돈 나가는 곳', selectInput('source', event.source, '돈 나가는 곳', SOURCE_OPTIONS)),
    areaCell('note', '잔액/비고', textInput('note', event.note, '잔액/비고')),
    areaCell('done', '', doneButton(event)),
    areaCell('delete', '', deleteButton('이벤트 지우기')),
  );
  if (hasDetails) refreshTotals(tr, event);
  return tr;
}

// 이벤트 줄의 예상·확정(세부 항목 합계)만 새로 고침 (입력칸은 그대로 둬서 커서 유지)
function refreshTotals(tr, event) {
  const totals = eventTotals(event);
  setMoney(tr, 'expected', totals.expected);
  setMoney(tr, 'confirmed', totals.confirmed);
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

  const detail = findDetail(item, event.target);
  if (detail) {
    if (field === 'detailName') detail.name = event.target.value;
    if (field === 'detailExpected') detail.expected = parseAmount(event.target.value);
    if (field === 'detailConfirmed') detail.confirmed = parseAmount(event.target.value);
    save();
    refreshTotals(tbody.querySelector(`tr[data-id="${item.id}"]:not(.detail-row)`), item);
    renderFoot();
    return;
  }

  if (field === 'category' && event.target.value === ADD_CATEGORY) {
    addCategory(item);
    return;
  }
  if (field === 'expected' || field === 'confirmed') item[field] = parseAmount(event.target.value);
  else item[field] = event.target.value;
  // 누구 것인지 바꾸면 줄 왼쪽 색 표시도 바꿈
  if (field === 'owner') {
    const row = event.target.closest('tr');
    row.classList.remove('owner-joint', 'owner-a', 'owner-b');
    row.classList.add(`owner-${item.owner}`);
  }
  save();
  renderFoot();
}

function handleClick(event) {
  const action = event.target.closest('[data-action]');
  if (action && action.dataset.action === 'toggle-details') {
    const item = findEvent(action);
    if (openIds.has(item.id)) openIds.delete(item.id);
    else openIds.add(item.id);
    renderEvents();
    focusIn(item.id, '[data-action="toggle-details"]');
    return;
  }
  if (action && action.dataset.action === 'detail-add') {
    addDetail(findEvent(action));
    return;
  }
  if (action && action.dataset.action === 'detail-delete') {
    deleteDetail(findEvent(action), action);
    return;
  }

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

// "＋ 새로 추가…": 이름을 물어서 분류 목록에 넣고 이 이벤트에 고름 (다음부터 다른 이벤트에서도 고를 수 있음)
function addCategory(item) {
  const name = (window.prompt('새 분류 이름 (예: 이사, 명품, 취미)') || '').trim();
  if (name) {
    const list = state.data.eventCategories;
    if (!list.includes(name)) list.push(name);
    const before = item.category;
    item.category = name;
    // 칸을 다시 그려서 change 이력이 안 남으므로 여기서 남김
    addHistory(state.data, `[큰돈 캘린더] ${item.name || '이름 없는 이벤트'} 분류: ${shown(before)} → ${name}`);
    save();
  }
  // 새 분류가 모든 칸의 목록에 들어가도록 다시 그림 (취소했으면 원래 값으로 돌아감)
  renderEvents();
  focusIn(item.id, '[data-field="category"]');
}

function addDetail(item) {
  // 처음 세부 항목을 넣을 때 이벤트에 적어 둔 금액이 있으면 "기존 금액"으로 옮겨서 사라지지 않게
  if (item.details.length === 0 && (item.expected !== null || item.confirmed !== null)) {
    item.details.push(newDetail('기존 금액', item.expected, item.confirmed));
    item.expected = null;
    item.confirmed = null;
  }
  const detail = newDetail('', null, null);
  item.details.push(detail);
  openIds.add(item.id);
  save();
  renderEvents();
  focusIn(item.id, `[data-detail-id="${detail.id}"] [data-field="detailName"]`);
}

function deleteDetail(item, button) {
  const detail = findDetail(item, button);
  if (!detail) return;
  item.details = item.details.filter((other) => other !== detail);
  addHistory(state.data, `[큰돈 캘린더] ${item.name || '이름 없는 이벤트'} › "${detail.name || '세부 항목'}" 지움`);
  save();
  renderEvents();
  focusIn(item.id, '[data-action="detail-add"]');
}

function focusIn(eventId, selector) {
  const target = tbody.querySelector(`tr[data-id="${eventId}"] ${selector}`);
  if (target) target.focus();
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

// 합계 줄 + 누구별 합계 줄 (완료한 것도 포함)
function renderFoot() {
  const total = { expected: 0, confirmed: 0 };
  const byOwner = { joint: { expected: 0, confirmed: 0 }, a: { expected: 0, confirmed: 0 }, b: { expected: 0, confirmed: 0 } };
  for (const event of state.data.events) {
    const totals = eventTotals(event);
    for (const sum of [total, byOwner[event.owner]]) {
      sum.expected += totals.expected || 0;
      sum.confirmed += totals.confirmed || 0;
    }
  }
  const rows = [['합계 (완료 포함)', total, 'total-row']];
  for (const [owner, name] of ownerOptions()) rows.push([name, byOwner[owner], `owner-${owner}`]);

  tfoot.replaceChildren(...rows.map(([labelText, sum, className]) => {
    const tr = document.createElement('tr');
    tr.className = className;
    const label = areaCell('name', '', labelText);
    label.colSpan = 4;
    const rest = areaCell('rest', '', '');
    rest.colSpan = 4;
    tr.append(
      label,
      areaCell('expected', '예상 지출', formatMoney(sum.expected), 'num'),
      areaCell('confirmed', '확정 지출', formatMoney(sum.confirmed), 'num'),
      rest,
    );
    return tr;
  }));
}
