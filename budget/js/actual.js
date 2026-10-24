// ② 실제 사용: 그 달에 실제로 받은·쓴 금액을 항목마다 적습니다.
// 예산(월 예상액)은 ① 월 가계부에서 정하고, 여기서는 실제액만 적어요.

import {
  GROUPS, itemKind, parseAmount, formatMoney, formatMonth, planAmount, diffOf, summarize,
  monthRecord, ensureMonth,
} from './calc.js';
import { amountInput, showDiff } from './cells.js';
import { watchEdits, shown } from './history.js';

const summaryBox = document.getElementById('actual-summary');
const progressNote = document.getElementById('actual-progress');
const listBox = document.getElementById('actual-list');

let state = null;
let save = null;

export function setupActual(appState, onSave) {
  state = appState;
  save = onSave;
  listBox.addEventListener('input', handleInput);
  watchEdits(listBox, () => state.data, describeEdit, save);
}

// 예: "[실제 사용] 식비·배달·장보기 (2026.10): 100 → 130"
function describeEdit(input, before, after) {
  const item = findItem(input);
  if (!item) return null;
  return `[실제 사용] ${item.name || '이름 없는 항목'} (${formatMonth(state.month)}): ${shown(before)} → ${shown(after)}`;
}

function findItem(element) {
  const row = element.closest('li');
  return row ? state.data.items.find((item) => item.id === row.dataset.id) : null;
}

export function renderActual() {
  const actualMap = monthRecord(state.data, state.month).actual;

  // 구분마다 묶어서 보여 줌 (항목이 없는 구분은 건너뜀)
  const sections = [];
  for (const group of GROUPS) {
    const items = state.data.items.filter((item) => item.group === group);
    if (items.length === 0) continue;

    const section = document.createElement('section');
    section.className = 'actual-group';
    const title = document.createElement('h3');
    title.className = 'actual-group-title';
    title.textContent = group;
    const list = document.createElement('ul');
    list.className = 'actual-items';
    list.append(...items.map((item) => buildRow(item, actualMap[item.id])));
    section.append(title, list);
    sections.push(section);
  }

  if (sections.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = '① 월 가계부에서 항목을 먼저 추가해 주세요.';
    sections.push(empty);
  }
  listBox.replaceChildren(...sections);
  refreshNumbers();
}

// 한 줄: [항목 이름 / 예산 · 메모]  [실제 입력칸 / 차이]
function buildRow(item, actual) {
  const row = document.createElement('li');
  row.className = 'actual-item';
  row.dataset.id = item.id;

  const info = document.createElement('div');
  info.className = 'actual-info';
  const name = document.createElement('strong');
  name.textContent = item.name || '이름 없는 항목';
  const plan = document.createElement('span');
  plan.className = 'hint';
  // "예산 100 · 신한카드 · 메모" (결제 수단·메모는 있을 때만)
  const parts = [`예산 ${formatMoney(planAmount(item)) || '—'}`, item.payment, item.note].filter(Boolean);
  plan.textContent = parts.join(' · ');
  info.append(name, plan);

  const inputBox = document.createElement('div');
  inputBox.className = 'actual-input';
  const input = amountInput('actual', actual, `${item.name || '이름 없는 항목'} 실제 금액`);
  const diff = document.createElement('span');
  diff.className = 'actual-diff';
  diff.dataset.cell = 'diff';
  inputBox.append(input, diff);

  row.append(info, inputBox);
  return row;
}

function handleInput(event) {
  if (event.target.dataset.field !== 'actual') return;
  const item = findItem(event.target);
  if (!item) return;

  const record = ensureMonth(state.data, state.month);
  const value = parseAmount(event.target.value);
  if (value === null) delete record.actual[item.id];
  else record.actual[item.id] = value;
  save();
  refreshNumbers();
}

function refreshNumbers() {
  const actualMap = monthRecord(state.data, state.month).actual;

  for (const row of listBox.querySelectorAll('.actual-item')) {
    const item = state.data.items.find((other) => other.id === row.dataset.id);
    const diff = diffOf(planAmount(item), actualMap[item.id]);
    showDiff(row.querySelector('[data-cell="diff"]'), itemKind(item), diff);
  }

  const totals = summarize(state.data.items, actualMap);
  renderSummary(totals);
  const done = state.data.items.length - totals.missing;
  progressNote.textContent = `${formatMonth(state.month)}: ${state.data.items.length}개 중 ${done}개 적었어요.`;
}

// 위쪽 요약: 남은 지출 예산(크게) + 수입·지출·저축 실제/예산
function renderSummary(totals) {
  const left = totals.plan.spending - totals.actual.spending;
  const cards = [
    [left >= 0 ? '남은 지출 예산' : '지출 예산 초과', `${formatMoney(Math.abs(left))}만원`, true, left < 0],
    ['수입', `${formatMoney(totals.actual.income)} / ${formatMoney(totals.plan.income)}`],
    ['지출', `${formatMoney(totals.actual.spending)} / ${formatMoney(totals.plan.spending)}`],
    ['저축·투자', `${formatMoney(totals.actual.saving)} / ${formatMoney(totals.plan.saving)}`],
  ];
  summaryBox.replaceChildren(...cards.map(([title, value, main, over]) => {
    const card = document.createElement('div');
    card.className = main ? 'summary-card summary-main' : 'summary-card';
    const titleText = document.createElement('p');
    titleText.className = 'summary-title';
    titleText.textContent = main ? title : `${title} (실제 / 예산)`;
    const valueText = document.createElement('p');
    valueText.className = over ? 'summary-value bad' : 'summary-value';
    valueText.textContent = value;
    card.append(titleText, valueText);
    return card;
  }));
}
