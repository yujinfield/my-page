// ⚙️ 설정 창의 부채 목록: 부채마다 카드 한 장
// [이름] [남은 금액] [이율 %] [매달 갚는 돈] [상환 기한] [중도 상환 · 수수료 %] [✕]
// 남은 금액은 적은 달 기준이고, 그 뒤로는 매달 갚는 돈만큼 줄어든 걸로 계산합니다 (forecast.js의 debtBalanceNow).

import { parseAmount, formatMonth, monthKeyOf } from './calc.js';
import { newDebt, PREPAY_OPTIONS } from './store.js';
import { textInput, amountInput, selectInput, deleteButton } from './cells.js';
import { addHistory, watchEdits, shown } from './history.js';

const list = document.getElementById('debt-list');

const LABELS = {
  name: '이름', balance: '남은 금액', rate: '이율', payment: '매달 갚는 돈', dueMonth: '상환 기한',
  prepay: '중도 상환', prepayFee: '중도상환수수료',
};
const AMOUNT_FIELDS = ['balance', 'rate', 'payment', 'prepayFee'];

let state = null;
let save = null;

export function setupDebtEditor(appState, onSave) {
  state = appState;
  save = onSave;
  list.addEventListener('input', handleInput);
  list.addEventListener('click', handleClick);
  watchEdits(list, () => state.data, describeEdit, save);
  document.getElementById('debt-add').addEventListener('click', addDebt);
}

export function renderDebtEditor() {
  list.replaceChildren(...state.data.wealth.debts.map(buildCard));
}

// 이름표가 붙은 칸 하나 (설정 창은 넓지 않아서 칸마다 이름표를 위에 붙임)
function field(labelText, input, className) {
  const label = document.createElement('label');
  label.className = className ? `debt-field ${className}` : 'debt-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  label.append(text, input);
  return label;
}

function buildCard(debt) {
  const card = document.createElement('div');
  card.className = 'debt-card';
  card.dataset.id = debt.id;

  const remove = deleteButton('부채 지우기');
  const asOf = debt.balanceAsOf ? ` (${formatMonth(debt.balanceAsOf)} 기준)` : '';
  const fee = field('수수료 %', amountInput('prepayFee', debt.prepayFee, '중도상환수수료', '예: 1.2'), 'debt-fee');
  fee.hidden = debt.prepay !== 'fee';

  card.append(
    field('이름', textInput('name', debt.name, '부채 이름', '예: 주담대'), 'debt-name'),
    remove,
    field(`남은 금액 (만원)${asOf}`, amountInput('balance', debt.balance, '남은 금액', '0')),
    field('이율 (%)', amountInput('rate', debt.rate, '이율', '예: 4.2')),
    field('매달 갚는 돈 (만원)', amountInput('payment', debt.payment, '매달 갚는 돈', '원금+이자')),
    field('상환 기한', textInput('dueMonth', debt.dueMonth, '상환 기한', '예: 2030.08')),
    field('중도 상환', selectInput('prepay', debt.prepay, '중도 상환', PREPAY_OPTIONS)),
    fee,
  );
  return card;
}

function findDebt(element) {
  const card = element.closest('.debt-card');
  return card ? state.data.wealth.debts.find((debt) => debt.id === card.dataset.id) : null;
}

function handleInput(event) {
  const name = event.target.dataset.field;
  const debt = findDebt(event.target);
  if (!debt || !name) return;
  debt[name] = AMOUNT_FIELDS.includes(name) ? parseAmount(event.target.value) : event.target.value;
  // 남은 금액을 고치면 이번 달 기준으로 다시 시작
  if (name === 'balance') debt.balanceAsOf = monthKeyOf(new Date());
  // 수수료 칸은 "가능 (수수료 있음)"일 때만
  if (name === 'prepay') event.target.closest('.debt-card').querySelector('.debt-fee').hidden = debt.prepay !== 'fee';
  save();
}

function handleClick(event) {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const debt = findDebt(button);
  if (!debt || !window.confirm(`"${debt.name || '이름 없는 부채'}"을(를) 지울까요?`)) return;
  state.data.wealth.debts = state.data.wealth.debts.filter((other) => other !== debt);
  addHistory(state.data, `[설정] 부채 "${debt.name || '이름 없는 부채'}" 지움`);
  save();
  renderDebtEditor();
}

function addDebt() {
  const debt = newDebt('');
  debt.balanceAsOf = monthKeyOf(new Date());
  state.data.wealth.debts.push(debt);
  save();
  renderDebtEditor();
  const input = list.querySelector(`[data-id="${debt.id}"] [data-field="name"]`);
  if (input) input.focus();
}

// 예: "[설정] 부채 주담대 이율: (빈칸) → 4.2"
function describeEdit(input, before, after) {
  const debt = findDebt(input);
  if (!debt) return null;
  const name = (input.dataset.field === 'name' ? before : debt.name) || '이름 없는 부채';
  const text = (value) => {
    if (input.dataset.field !== 'prepay') return shown(value);
    const found = PREPAY_OPTIONS.find(([optionValue]) => optionValue === value);
    return found ? found[1] : shown(value);
  };
  return `[설정] 부채 ${name} ${LABELS[input.dataset.field]}: ${text(before)} → ${text(after)}`;
}
