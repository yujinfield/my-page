// ① 월 가계부: 예산(월 예상액)은 한 번 정해 두고, 달마다 실제액과 차이를 봅니다.

import {
  GROUPS, itemKind, parseAmount, formatMoney, formatDiff, formatMonth, planAmount,
  diffOf, isGoodDiff, sortByGroup, summarize, monthRecord, ensureMonth,
} from './calc.js';
import { newItem } from './store.js';
import { cell, textInput, amountInput, computed, setMoney, deleteButton, renderHeadRow } from './cells.js';

const summaryBox = document.getElementById('plan-summary');
const missingNote = document.getElementById('plan-missing');
const thead = document.getElementById('plan-head');
const tbody = document.getElementById('plan-body');
const tfoot = document.getElementById('plan-foot');
const addButton = document.getElementById('plan-add');

let state = null; // app.js의 상태 { data, month }
let save = null;

export function setupPlan(appState, onSave) {
  state = appState;
  save = onSave;
  tbody.addEventListener('input', handleInput);
  tbody.addEventListener('change', handleChange);
  tbody.addEventListener('click', handleClick);
  addButton.addEventListener('click', addItem);
}

export function renderPlan() {
  const { names } = state.data;
  renderHeadRow(thead, [
    ['구분'], ['항목'], [names.a, true], [names.b, true], ['공동'],
    ['월 예상액', true], [`실제액 (${formatMonth(state.month)})`, true], ['차이', true], ['결제일/메모'], [''],
  ]);

  let lastGroup = null;
  const rows = sortByGroup(state.data.items).map((item) => {
    const row = buildRow(item, item.group !== lastGroup);
    lastGroup = item.group;
    return row;
  });
  tbody.replaceChildren(...rows);
  refreshNumbers();
}

function buildRow(item, isGroupStart) {
  const { names } = state.data;
  const actual = monthRecord(state.data, state.month).actual[item.id];
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  tr.className = `kind-${itemKind(item)}`;
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
  const inputA = amountInput('a', item.joint ? null : item.a, `${names.a} 금액`, item.joint ? '—' : '');
  const inputB = amountInput('b', item.joint ? null : item.b, `${names.b} 금액`, item.joint ? '—' : '');
  inputA.disabled = item.joint;
  inputB.disabled = item.joint;
  const planCell = item.joint ? amountInput('amount', item.amount, '월 예상액') : computed('plan');

  tr.append(
    cell(groupSelect),
    cell(textInput('name', item.name, '항목 이름', '항목 이름')),
    cell(inputA, 'num'),
    cell(inputB, 'num'),
    cell(jointBox, 'center'),
    cell(planCell, 'num'),
    cell(amountInput('actual', actual, '실제액'), 'num'),
    cell(computed('diff'), 'num'),
    cell(textInput('note', item.note, '결제일/메모')),
    cell(deleteButton('항목 지우기')),
  );
  return tr;
}

function findItem(element) {
  const row = element.closest('tr');
  return row ? state.data.items.find((item) => item.id === row.dataset.id) : null;
}

// 글자를 칠 때마다: 값만 바꾸고 계산 칸을 새로 고침 (입력칸은 그대로 둬서 커서 유지)
function handleInput(event) {
  const field = event.target.dataset.field;
  const item = findItem(event.target);
  if (!item || field === 'group' || field === 'joint') return;

  if (field === 'name' || field === 'note') {
    item[field] = event.target.value;
  } else if (field === 'actual') {
    const record = ensureMonth(state.data, state.month);
    const value = parseAmount(event.target.value);
    if (value === null) delete record.actual[item.id];
    else record.actual[item.id] = value;
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
  if (!item || (field !== 'group' && field !== 'joint')) return;

  if (field === 'group') item.group = event.target.value;
  if (field === 'joint') item.joint = event.target.checked;
  save();
  renderPlan();
  focusField(item.id, field);
}

function handleClick(event) {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const item = findItem(button);
  if (!item || !window.confirm(`"${item.name || '이름 없는 항목'}" 항목을 지울까요?`)) return;

  state.data.items = state.data.items.filter((other) => other !== item);
  for (const record of Object.values(state.data.months)) delete record.actual[item.id];
  save();
  renderPlan();
}

function addItem() {
  const item = newItem('생활비', '', true);
  state.data.items.push(item);
  save();
  renderPlan();
  focusField(item.id, 'name');
}

function focusField(id, field) {
  const input = tbody.querySelector(`tr[data-id="${id}"] [data-field="${field}"]`);
  if (input) input.focus();
}

/* ── 계산 칸 ── */

function refreshNumbers() {
  const actualMap = monthRecord(state.data, state.month).actual;

  for (const row of tbody.rows) {
    const item = state.data.items.find((other) => other.id === row.dataset.id);
    const plan = planAmount(item);
    setMoney(row, 'plan', plan);
    showDiff(row.querySelector('[data-cell="diff"]'), itemKind(item), diffOf(plan, actualMap[item.id]));
  }

  const totals = summarize(state.data.items, actualMap);
  renderFoot(totals);
  renderSummary(totals);
  missingNote.textContent = totals.missing > 0
    ? `${formatMonth(state.month)} 실제액을 아직 안 적은 항목이 ${totals.missing}개 있어요. 다 적어야 실제 합계가 정확해요.`
    : `${formatMonth(state.month)} 실제액을 모두 적었어요.`;
}

function showDiff(span, kind, diff) {
  span.textContent = formatDiff(diff);
  span.classList.toggle('good', diff !== null && diff !== 0 && isGoodDiff(kind, diff));
  span.classList.toggle('bad', diff !== null && !isGoodDiff(kind, diff));
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
    const labelCell = cell(label);
    labelCell.colSpan = 5;
    const actual = totals.hasActual ? totals.actual[key] : null;
    const diffSpan = document.createElement('span');
    showDiff(diffSpan, kind, diffOf(totals.plan[key], actual));
    const rest = cell();
    rest.colSpan = 2;
    tr.append(labelCell, cell(formatMoney(totals.plan[key]), 'num'), cell(formatMoney(actual), 'num'), cell(diffSpan, 'num'), rest);
    return tr;
  });
  tfoot.replaceChildren(...rows);
}

// 위쪽 요약 카드: 예상 / 실제
const SUMMARY_CARDS = [
  ['월 수입', 'income', 'income'],
  ['지출', 'spending', 'spending'],
  ['저축·투자', 'saving', 'saving'],
  ['남는 돈', 'left', 'income'],
  ['자산으로 쌓이는 돈', 'asset', 'income'],
];

function renderSummary(totals) {
  const cards = SUMMARY_CARDS.map(([title, key, kind]) => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    if (key === 'asset') card.classList.add('summary-main');

    const titleText = document.createElement('p');
    titleText.className = 'summary-title';
    titleText.textContent = title;

    const planText = document.createElement('p');
    planText.className = 'summary-value';
    planText.textContent = `${formatMoney(totals.plan[key])}만원`;

    const actualText = document.createElement('p');
    actualText.className = 'summary-actual';
    if (totals.hasActual) {
      const diff = diffOf(totals.plan[key], totals.actual[key]);
      const diffSpan = document.createElement('span');
      showDiff(diffSpan, kind, diff);
      actualText.append(`실제 ${formatMoney(totals.actual[key])} (`, diffSpan, ')');
    } else {
      actualText.textContent = '실제 —';
    }

    card.append(titleText, planText, actualText);
    return card;
  });
  summaryBox.replaceChildren(...cards);
}
