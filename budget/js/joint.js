// ② 공동통장: 달마다 두 사람이 얼마 넣었고, 공동지출 뒤 얼마 남아 이월되는지

import {
  parseAmount, formatMoney, formatMonth, jointBudget, incomeShare, jointLedger, jointMonthKeys, ensureMonth,
} from './calc.js';
import { cell, amountInput, computed, setMoney, renderHeadRow } from './cells.js';

const infoBox = document.getElementById('joint-info');
const thead = document.getElementById('joint-head');
const tbody = document.getElementById('joint-body');

let state = null;
let save = null;
let monthKeys = []; // 지금 표에 보이는 달들

export function setupJoint(appState, onSave) {
  state = appState;
  save = onSave;
  tbody.addEventListener('input', handleInput);
}

export function renderJoint() {
  const { names } = state.data;
  renderInfo();
  renderHeadRow(thead, [
    ['월'], ['공동 예산', true], [`${names.a} 입금`, true], [`${names.b} 입금`, true], ['총 입금', true],
    ['실제 공동지출', true], ['잔액', true], ['누적 이월', true],
  ]);

  const recommended = recommendedDeposits();
  monthKeys = jointMonthKeys(state.data, state.month);
  const rows = jointLedger(state.data, monthKeys).map((line) => {
    const tr = document.createElement('tr');
    tr.dataset.month = line.key;
    if (line.key === state.month) tr.className = 'current-month';
    tr.append(
      cell(formatMonth(line.key)),
      cell(computed('budget'), 'num'),
      cell(amountInput('depositA', line.depositA, `${formatMonth(line.key)} ${names.a} 입금`, recommended.a), 'num'),
      cell(amountInput('depositB', line.depositB, `${formatMonth(line.key)} ${names.b} 입금`, recommended.b), 'num'),
      cell(computed('total'), 'num'),
      cell(computed('spent'), 'num'),
      cell(computed('balance'), 'num'),
      cell(computed('carry'), 'num'),
    );
    return tr;
  });
  tbody.replaceChildren(...rows);
  refreshNumbers();
}

// 소득 비율대로 나눈 추천 입금액 (입력칸의 흐린 글자로 보여 줌)
function recommendedDeposits() {
  const budget = jointBudget(state.data.items);
  const share = incomeShare(state.data.items);
  if (!share || budget <= 0) return { a: '', b: '' };
  const a = Math.round(budget * share.a);
  return { a: String(a), b: String(budget - a) };
}

function renderInfo() {
  const { names, items } = state.data;
  const budget = jointBudget(items);
  const share = incomeShare(items);
  const lines = [`공동 예산 (① 월 가계부에서 "공동"에 체크한 항목 합계): ${formatMoney(budget)}만원`];

  if (share) {
    const percentA = Math.round(share.a * 100);
    const recommended = recommendedDeposits();
    lines.push(`소득 비율 ${names.a} ${percentA} : ${names.b} ${100 - percentA}`);
    if (budget > 0) {
      lines.push(`→ 추천 입금: ${names.a} ${formatMoney(Number(recommended.a))}만원, ${names.b} ${formatMoney(Number(recommended.b))}만원`);
    }
  } else {
    lines.push('① 월 가계부의 "수입" 줄에 두 사람 월급을 적으면 소득 비율로 나눈 추천 입금액이 나와요.');
  }

  infoBox.replaceChildren(...lines.map((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  }));
}

function handleInput(event) {
  const field = event.target.dataset.field;
  const row = event.target.closest('tr');
  if (!row || (field !== 'depositA' && field !== 'depositB')) return;
  ensureMonth(state.data, row.dataset.month)[field] = parseAmount(event.target.value);
  save();
  refreshNumbers();
}

// 이월은 앞 달 값에 따라 바뀌므로 모든 줄의 계산 칸을 새로 고침
function refreshNumbers() {
  const ledger = jointLedger(state.data, monthKeys);
  ledger.forEach((line, index) => {
    const row = tbody.rows[index];
    setMoney(row, 'budget', line.budget);
    setMoney(row, 'total', line.total);
    setMoney(row, 'spent', line.spent);
    setMoney(row, 'balance', line.balance);
    setMoney(row, 'carry', line.carry);
    row.querySelector('[data-cell="balance"]').classList.toggle('bad', line.balance < 0);
    row.querySelector('[data-cell="carry"]').classList.toggle('bad', line.carry < 0);
  });
}
