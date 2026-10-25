// ④ 연간 요약의 "저금액 · 부채": 지금 저금액(누적의 시작점)과 부채 목록, 빨리 갚기 코멘트

import { parseAmount, formatMonth, monthKeyOf } from './calc.js';
import { newDebt } from './store.js';
import { textInput, amountInput, deleteButton } from './cells.js';
import { debtLines } from './forecast.js';
import { addHistory, watchEdits, shown } from './history.js';

const savingsInput = document.getElementById('savings-input');
const asOfNote = document.getElementById('savings-asof');
const debtList = document.getElementById('debt-list');
const debtComments = document.getElementById('debt-comments');

const LABELS = { name: '이름', balance: '남은 금액', rate: '금리', payment: '매달 갚는 돈' };

let state = null;
let save = null;
let onChange = null; // 저금액이 바뀌면 연간 요약 숫자(누적·예측)를 다시 그림

export function setupWealth(appState, onSave, onSavingsChange) {
  state = appState;
  save = onSave;
  onChange = onSavingsChange;

  // 저금액은 적은 달 말 기준 (그 뒤 달부터 쌓인 돈을 더해 감)
  savingsInput.addEventListener('input', () => {
    const wealth = state.data.wealth;
    wealth.savings = parseAmount(savingsInput.value);
    wealth.savingsAsOf = wealth.savings === null ? null : monthKeyOf(new Date());
    save();
    renderAsOf();
    renderComments();
    onChange();
  });
  watchEdits(savingsInput.parentElement, () => state.data,
    (input, before, after) => `[저금액·부채] 현재 저금액: ${shown(before)} → ${shown(after)}`, save);

  debtList.addEventListener('input', handleDebtInput);
  debtList.addEventListener('click', handleDebtClick);
  watchEdits(debtList, () => state.data, describeDebtEdit, save);
  document.getElementById('debt-add').addEventListener('click', addDebt);
}

export function renderWealth() {
  // 지금 고치고 있는 칸은 건드리지 않음
  if (savingsInput !== document.activeElement) {
    const { savings } = state.data.wealth;
    savingsInput.value = savings === null ? '' : String(savings);
  }
  renderAsOf();
  renderDebts();
  renderComments();
}

function renderAsOf() {
  const { savings, savingsAsOf } = state.data.wealth;
  asOfNote.textContent = savings === null
    ? '적으면 위 표의 누적이 이 금액에서 시작해요.'
    : `${formatMonth(savingsAsOf)} 말 기준 · 그 뒤 달마다 쌓인 돈을 더해 위 표 "저금액" 칸에 보여 줘요.`;
}

/* ── 부채 목록: [이름] [남은 금액] [금리 %] [매달 갚는 돈] [✕] ── */

function renderDebts() {
  const head = document.createElement('li');
  head.className = 'debt-item debt-head';
  head.setAttribute('aria-hidden', 'true');
  for (const text of ['부채', '남은 금액', '금리 %', '매달 갚는 돈', '']) {
    const span = document.createElement('span');
    span.textContent = text;
    head.append(span);
  }

  const rows = state.data.wealth.debts.map((debt) => {
    const item = document.createElement('li');
    item.className = 'debt-item';
    item.dataset.id = debt.id;
    item.append(
      textInput('name', debt.name, '부채 이름', '예: 주담대'),
      amountInput('balance', debt.balance, `${debt.name || '부채'} 남은 금액`, '남은 금액'),
      amountInput('rate', debt.rate, `${debt.name || '부채'} 금리`, '금리'),
      amountInput('payment', debt.payment, `${debt.name || '부채'} 매달 갚는 돈`, '원금+이자'),
      deleteButton('부채 지우기'),
    );
    return item;
  });
  debtList.replaceChildren(...(rows.length > 0 ? [head, ...rows] : []));
}

function renderComments() {
  const { wealth, goal } = state.data;
  const lines = debtLines(wealth.debts, wealth.savings, goal.rate, monthKeyOf(new Date()));
  const title = document.createElement('p');
  title.className = 'forecast-title';
  title.textContent = '빚 빨리 갚기';
  debtComments.replaceChildren(title, ...lines.map((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  }));
}

function findDebt(element) {
  const row = element.closest('.debt-item');
  return row ? state.data.wealth.debts.find((debt) => debt.id === row.dataset.id) : null;
}

function handleDebtInput(event) {
  const field = event.target.dataset.field;
  const debt = findDebt(event.target);
  if (!debt || !field) return;
  debt[field] = field === 'name' ? event.target.value : parseAmount(event.target.value);
  save();
  renderComments();
}

function handleDebtClick(event) {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const debt = findDebt(button);
  if (!debt || !window.confirm(`"${debt.name || '이름 없는 부채'}"을(를) 지울까요?`)) return;
  state.data.wealth.debts = state.data.wealth.debts.filter((other) => other !== debt);
  addHistory(state.data, `[저금액·부채] "${debt.name || '이름 없는 부채'}" 지움`);
  save();
  renderDebts();
  renderComments();
}

function addDebt() {
  const debt = newDebt('');
  state.data.wealth.debts.push(debt);
  save();
  renderDebts();
  renderComments();
  const input = debtList.querySelector(`[data-id="${debt.id}"] [data-field="name"]`);
  if (input) input.focus();
}

// 예: "[저금액·부채] 주담대 매달 갚는 돈: (빈칸) → 150"
function describeDebtEdit(input, before, after) {
  const debt = findDebt(input);
  if (!debt) return null;
  const name = (input.dataset.field === 'name' ? before : debt.name) || '이름 없는 부채';
  return `[저금액·부채] ${name} ${LABELS[input.dataset.field]}: ${shown(before)} → ${shown(after)}`;
}
