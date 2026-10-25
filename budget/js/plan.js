// ① 월 가계부: 예산(월 예상액)을 정하고, 그 달 실제액(② 실제 사용에서 입력)과 차이를 봅니다.

import {
  GROUPS, GROUP_COLORS, itemKind, itemPayment, parseAmount, formatMoney, formatMonth, planAmount, personAmounts,
  diffOf, sortByGroup, summarize, monthRecord, needsPayment,
} from './calc.js';
import { newItem, newItemDetail } from './store.js';
import {
  areaCell, textInput, amountInput, computed, setMoney, showDiff, deleteButton, renderHeadRow,
} from './cells.js';
import { renderPlanSummary } from './plan-summary.js';
import { detailToggle, findDetail } from './event-details.js';
import { itemDetailRow } from './item-details.js';
import { paymentSelect, PAYMENT_FIELDS, ADD_PAYMENT } from './payment-select.js';
import { setupMonthMemo, renderMonthMemo } from './month-memo.js';

const COLUMN_COUNT = 12; // 표 칸 수 (세부 항목 줄이 이만큼 가로로 걸침)
const DETAIL_FIELDS = { detailName: 'name', detailAmount: 'amount', detailA: 'a', detailB: 'b' }; // 칸 이름 → 세부 항목 값
const openIds = new Set(); // 세부 항목을 펼친 항목 id
import { addHistory, watchEdits, shown } from './history.js';

const missingNote = document.getElementById('plan-missing');
const editor = document.getElementById('plan-editor');
const editToggle = document.getElementById('plan-edit-toggle');
const thead = document.getElementById('plan-head');
const tbody = document.getElementById('plan-body');
const tfoot = document.getElementById('plan-foot');

let state = null; // app.js의 상태 { data, month }
let save = null;

export function setupPlan(appState, onSave) {
  state = appState;
  save = onSave;
  tbody.addEventListener('input', handleInput);
  tbody.addEventListener('change', handleChange);
  tbody.addEventListener('click', handleClick);
  watchEdits(tbody, () => state.data, describeEdit, save);
  editToggle.addEventListener('click', toggleEditor);
  document.getElementById('plan-add').addEventListener('click', addItem);

  setupMonthMemo(state, save);
}

// 휴대폰: 평소엔 요약·그래프만, "수정하기"를 누르면 입력칸을 엶 (CSS가 768px 이하에서만 숨김)
function toggleEditor() {
  const open = !editor.classList.contains('is-open');
  editor.classList.toggle('is-open', open);
  editToggle.setAttribute('aria-expanded', String(open));
  editToggle.textContent = open ? '✔️ 수정 완료' : '✏️ 수정하기';
  if (open) editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 이력에 남길 글. 예: "[월 가계부] 식비·배달·장보기 예상액: 100 → 130"
function describeEdit(input, before, after) {
  const item = findItem(input);
  if (!item) return null;
  const { names } = state.data;
  const labels = {
    group: '구분', name: '항목 이름', a: `${names.a} 금액`, b: `${names.b} 금액`, joint: '공동',
    amount: '예상액', paymentA: `${names.a} 결제 수단`, paymentB: `${names.b} 결제 수단`, note: '메모',
  };
  const itemName = (input.dataset.field === 'name' ? before : item.name) || '이름 없는 항목';
  const detail = findDetail(item, input);
  if (detail) {
    const detailLabels = {
      detailName: '이름', detailAmount: '금액', detailA: `${names.a} 금액`, detailB: `${names.b} 금액`,
      paymentA: `${names.a} 결제 수단`, paymentB: `${names.b} 결제 수단`,
    };
    // 결제 수단은 "＋ 새로 추가…"를 고를 수도 있어서 실제로 저장된 값을 남김
    if (input.dataset.field in PAYMENT_FIELDS) {
      after = detail[input.dataset.field];
      if (before === after) return null;
    }
    const detailName = (input.dataset.field === 'detailName' ? before : detail.name) || '세부 항목';
    return `[월 가계부] ${itemName} › ${detailName} ${detailLabels[input.dataset.field]}: ${shown(before)} → ${shown(after)}`;
  }
  // 결제 수단은 "＋ 새로 추가…"를 고를 수도 있어서, 고른 칸 값 대신 실제로 저장된 값을 남김
  if (input.dataset.field in PAYMENT_FIELDS) {
    after = item[input.dataset.field];
    if (before === after) return null;
  }
  return `[월 가계부] ${itemName} ${labels[input.dataset.field]}: ${shown(before)} → ${shown(after)}`;
}

export function renderPlan() {
  const { names } = state.data;
  renderMonthMemo(state);
  renderHeadRow(thead, [
    ['구분'], ['항목'], [names.a, true], [names.b, true], ['공동'],
    ['월 예상액', true], [`실제액 (${formatMonth(state.month)})`, true], ['차이', true], [`${names.a} 결제`], [`${names.b} 결제`], ['결제일/메모'], [''],
  ]);
  // 저장 순서도 구분 순서로 맞춤 (화면·백업 파일이 같은 순서가 되게)
  state.data.items = sortByGroup(state.data.items);

  let lastGroup = null;
  const rows = [];
  for (const item of state.data.items) {
    rows.push(buildRow(item, item.group !== lastGroup));
    if (openIds.has(item.id)) {
      const detailRow = itemDetailRow(item, state.data, COLUMN_COUNT);
      detailRow.classList.add(`g-${GROUP_COLORS[item.group]}`); // 위 항목과 같은 구분 색
      rows.push(detailRow);
    }
    lastGroup = item.group;
  }
  tbody.replaceChildren(...rows);
  refreshNumbers();
}

function buildRow(item, isGroupStart) {
  const { names } = state.data;
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  tr.className = `kind-${itemKind(item)} g-${GROUP_COLORS[item.group]}`;
  if (item.joint) tr.classList.add('is-joint');
  if (isGroupStart) tr.classList.add('group-start');

  const groupSelect = document.createElement('select');
  groupSelect.className = 'cell-input';
  groupSelect.dataset.field = 'group';
  groupSelect.setAttribute('aria-label', '구분');
  for (const group of GROUPS) {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    groupSelect.append(option);
  }
  groupSelect.value = item.group;

  const jointBox = document.createElement('input');
  jointBox.type = 'checkbox';
  jointBox.dataset.field = 'joint';
  jointBox.checked = item.joint;
  jointBox.setAttribute('aria-label', '공동 항목');

  // 공동 항목은 예상액을 직접, 개인 항목은 두 사람 금액을 적으면 합이 예상액
  // 세부 항목이 있으면 금액 칸은 세부 항목 합계(보기만)
  const hasDetails = item.details.length > 0;
  const personCell = (field) => {
    if (hasDetails && !item.joint) return computed(field);
    const input = amountInput(field, item.joint ? null : item[field], `${names[field]} 금액`, item.joint ? '—' : '');
    input.disabled = item.joint;
    return input;
  };
  const inputA = personCell('a');
  const inputB = personCell('b');
  const planCell = item.joint && !hasDetails ? amountInput('amount', item.amount, '월 예상액') : computed('plan');

  const nameBox = document.createElement('div');
  nameBox.className = 'event-name';
  nameBox.append(textInput('name', item.name, '항목 이름', '항목 이름'), detailToggle(item, openIds.has(item.id), true));

  // [자리 이름, 휴대폰 카드에서 보일 이름표, 내용, 클래스]
  // 휴대폰에서는 표 대신 카드로 보여서, 자리 이름(data-area)으로 칸 위치를 정함 (table.css)
  const cells = [
    ['group', '', groupSelect],
    ['name', '', nameBox],
    ['a', names.a, inputA, 'num'],
    ['b', names.b, inputB, 'num'],
    ['joint', '공동', jointBox, 'center'],
    ['plan', '예상', planCell, 'num'],
    // 실제액은 ② 실제 사용에서 적고, 여기서는 보기만 함
    ['actual', `실제 (${formatMonth(state.month)})`, computed('actual'), 'num'],
    ['diff', '차이', computed('diff'), 'num'],
    ['paymentA', `${names.a} 결제`, paymentCell(item, 'paymentA'), ''],
    ['paymentB', `${names.b} 결제`, paymentCell(item, 'paymentB'), ''],
    ['note', '메모', textInput('note', item.note, '결제일/메모')],
    ['delete', '', deleteButton('항목 지우기')],
  ];
  for (const [area, label, content, className] of cells) {
    tr.append(areaCell(area, label, content, className));
  }
  return tr;
}

// 결제 칸: 세부 항목이 있으면 세부 항목들의 결제 수단 요약("신한카드 외")을 보기만, 없으면 고르는 칸
function paymentCell(item, field) {
  if (item.details.length === 0) return paymentSelect(state.data, item, field);
  const text = document.createElement('span');
  text.className = 'computed payment-summary';
  text.textContent = itemPayment(item, field) || '—';
  text.title = '세부 항목에서 고른 결제 수단';
  return text;
}

function findItem(element) {
  const row = element.closest('tr');
  return row ? state.data.items.find((item) => item.id === row.dataset.id) : null;
}

// 글자를 칠 때마다: 값만 바꾸고 계산 칸을 새로 고침 (입력칸은 그대로 둬서 커서 유지)
function handleInput(event) {
  const field = event.target.dataset.field;
  const item = findItem(event.target);
  if (!item || field === 'group' || field === 'joint' || field in PAYMENT_FIELDS) return;

  const detail = findDetail(item, event.target);
  if (detail) {
    const key = DETAIL_FIELDS[field];
    detail[key] = key === 'name' ? event.target.value : parseAmount(event.target.value);
    save();
    refreshNumbers();
    return;
  }

  if (field === 'name' || field === 'note') {
    item[field] = event.target.value;
  } else {
    item[field] = parseAmount(event.target.value);
  }
  save();
  refreshNumbers();
}

// 구분이나 공동 여부가 바뀌면 줄 모양이 달라지므로 표를 다시 그림
function handleChange(event) {
  const field = event.target.dataset.field;
  const item = findItem(event.target);
  if (!item) return;
  if (field in PAYMENT_FIELDS) {
    // 세부 항목의 결제 칸이면 세부 항목에, 아니면 항목에
    choosePayment(findDetail(item, event.target) || item, field, event.target.value, item.id);
    return;
  }
  if (field !== 'group' && field !== 'joint') return;

  if (field === 'group') item.group = event.target.value;
  if (field === 'joint') item.joint = event.target.checked;
  renderPlan(); // 다시 그리면서 구분 순서로 정렬됨
  save();
  focusField(item.id, field);
}

/* ── 결제 수단 (사람마다 따로) ── */

// owner: 결제 수단을 고른 항목 또는 세부 항목, itemId: 다시 그린 뒤 커서를 둘 항목
function choosePayment(owner, field, value, itemId) {
  const person = PAYMENT_FIELDS[field];
  if (value === ADD_PAYMENT) {
    const name = (window.prompt(`${state.data.names[person]}의 새 결제 수단 이름 (예: 현대카드)`) || '').trim();
    if (name) {
      const list = state.data.payments[person];
      if (!list.includes(name)) list.push(name);
      owner[field] = name;
    }
    // 새 이름이 모든 칸의 목록에 들어가도록 다시 그림 (취소했으면 원래 값으로 돌아감)
    renderPlan();
    focusField(itemId, field);
  } else {
    owner[field] = value;
    // 세부 항목의 결제 수단이 바뀌면 위 항목 줄의 요약("신한카드 외")도 바꿈
    if (owner !== findItemById(itemId)) renderPaymentSummary(itemId);
  }
  save();
}

function handleClick(event) {
  const action = event.target.closest('[data-action]');
  if (action && action.dataset.action === 'toggle-details') {
    const item = findItem(action);
    if (openIds.has(item.id)) openIds.delete(item.id);
    else openIds.add(item.id);
    renderPlan();
    focusIn(item.id, '[data-action="toggle-details"]');
    return;
  }
  if (action && action.dataset.action === 'detail-add') {
    addDetail(findItem(action));
    return;
  }
  if (action && action.dataset.action === 'detail-delete') {
    deleteDetail(findItem(action), action);
    return;
  }

  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const item = findItem(button);
  if (!item || !window.confirm(`"${item.name || '이름 없는 항목'}" 항목을 지울까요?`)) return;

  state.data.items = state.data.items.filter((other) => other !== item);
  for (const record of Object.values(state.data.months)) {
    delete record.actual[item.id];
    delete record.actualBy[item.id];
  }
  addHistory(state.data, `[월 가계부] "${item.name || '이름 없는 항목'}" 항목 지움`);
  save();
  renderPlan();
}

function addDetail(item) {
  // 처음 세부 항목을 넣을 때 항목에 적어 둔 금액이 있으면 "기존 금액"으로 옮겨서 사라지지 않게
  const hasValues = item.amount !== null || item.a !== null || item.b !== null || item.paymentA || item.paymentB;
  if (item.details.length === 0 && hasValues) {
    item.details.push(newItemDetail('기존 금액', item.amount, item.a, item.b, item.paymentA, item.paymentB));
    item.amount = null;
    item.a = null;
    item.b = null;
  }
  const detail = newItemDetail('');
  item.details.push(detail);
  openIds.add(item.id);
  save();
  renderPlan();
  focusIn(item.id, `[data-detail-id="${detail.id}"] [data-field="detailName"]`);
}

function deleteDetail(item, button) {
  const detail = findDetail(item, button);
  if (!detail) return;
  item.details = item.details.filter((other) => other !== detail);
  addHistory(state.data, `[월 가계부] ${item.name || '이름 없는 항목'} › "${detail.name || '세부 항목'}" 지움`);
  save();
  renderPlan();
  focusIn(item.id, '[data-action="detail-add"]');
}

function focusIn(itemId, selector) {
  const target = tbody.querySelector(`tr[data-id="${itemId}"] ${selector}`);
  if (target) target.focus();
}

function addItem() {
  const item = newItem('생활비', '', true);
  state.data.items.push(item);
  renderPlan(); // 다시 그리면서 구분 순서로 정렬됨
  save();
  focusField(item.id, 'name');
}

function findItemById(id) {
  return state.data.items.find((item) => item.id === id);
}

function renderPaymentSummary(itemId) {
  const item = findItemById(itemId);
  const row = tbody.querySelector(`tr[data-id="${itemId}"]:not(.detail-row)`);
  for (const field of ['paymentA', 'paymentB']) {
    const summary = row.querySelector(`[data-area="${field}"] .payment-summary`);
    if (summary) summary.textContent = itemPayment(item, field) || '—';
  }
}

// 결제 칸은 필요한 사람만 보여 줌: 수입·특별비·저축·투자는 없음, 개인 항목은 금액을 적은 사람만 (calc.js의 needsPayment)
// 금액을 적는 대로 바로 나타나게, 칸은 만들어 두고 숨기기만 함 (고른 값은 그대로 둠)
function refreshPayments(row, item) {
  for (const [field, person] of Object.entries(PAYMENT_FIELDS)) {
    const td = row.querySelector(`[data-area="${field}"]`);
    const show = needsPayment(item, person);
    td.classList.toggle('is-empty', !show);
    td.firstElementChild.hidden = !show;
  }
  renderPaymentSummary(item.id);
  const detailRow = tbody.querySelector(`tr.detail-row[data-id="${item.id}"]`);
  if (!detailRow) return;
  for (const line of detailRow.querySelectorAll('[data-detail-id]')) {
    const detail = item.details.find((other) => other.id === line.dataset.detailId);
    // 세부 항목 줄은 칸 자리를 남겨 둬야 ✕가 제자리에 있음 (hidden이면 칸이 당겨짐)
    line.querySelector('.d-pay-a').classList.toggle('is-blank', !needsPayment(item, 'a', detail));
    line.querySelector('.d-pay-b').classList.toggle('is-blank', !needsPayment(item, 'b', detail));
  }
}

function focusField(id, field) {
  const input = tbody.querySelector(`tr[data-id="${id}"] [data-field="${field}"]`);
  if (input) input.focus();
}

/* ── 계산 칸 ── */

function refreshNumbers() {
  const actualMap = monthRecord(state.data, state.month).actual;

  for (const row of tbody.querySelectorAll('tr:not(.detail-row)')) {
    const item = state.data.items.find((other) => other.id === row.dataset.id);
    const plan = planAmount(item);
    const person = personAmounts(item);
    setMoney(row, 'a', person.a);
    setMoney(row, 'b', person.b);
    setMoney(row, 'plan', plan);
    setMoney(row, 'actual', actualMap[item.id]);
    showDiff(row.querySelector('[data-cell="diff"]'), itemKind(item), diffOf(plan, actualMap[item.id]));
    refreshPayments(row, item);
  }

  const totals = summarize(state.data.items, actualMap);
  renderFoot(totals);
  renderPlanSummary(state, totals, actualMap);
  missingNote.textContent = totals.missing > 0
    ? `${formatMonth(state.month)} 실제액을 아직 안 적은 항목이 ${totals.missing}개 있어요. ② 실제 사용에서 적어 주세요.`
    : `${formatMonth(state.month)} 실제액을 모두 적었어요.`;
}

const FOOT_ROWS = [
  ['수입 합계', 'income', 'income'],
  ['지출 합계', 'spending', 'spending'],
  ['저축·투자 합계', 'saving', 'saving'],
  ['월 잔여금 (수입 − 지출 − 저축·투자)', 'left', 'income'],
];

function renderFoot(totals) {
  const rows = FOOT_ROWS.map(([label, key, kind]) => {
    const tr = document.createElement('tr');
    if (key === 'left') tr.className = 'total-row';
    const labelCell = areaCell('name', '', label);
    labelCell.colSpan = 5;
    const actual = totals.hasActual ? totals.actual[key] : null;
    const diffSpan = document.createElement('span');
    showDiff(diffSpan, kind, diffOf(totals.plan[key], actual));
    const rest = areaCell('rest', '', '');
    rest.colSpan = 4;
    tr.append(
      labelCell,
      areaCell('plan', '예상', formatMoney(totals.plan[key]), 'num'),
      areaCell('actual', '실제', formatMoney(actual), 'num'),
      areaCell('diff', '차이', diffSpan, 'num'),
      rest,
    );
    return tr;
  });
  tfoot.replaceChildren(...rows);
}
