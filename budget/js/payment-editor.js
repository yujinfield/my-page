// ⚙️ 설정 창의 결제 수단 목록: 사람마다 한 줄씩
// [이름] [☐ 실적] [실적 금액] [✕]   /   ＋ 결제 수단 추가
// 이름을 바꾸면 ① 월 가계부에서 이미 고른 칸과 실적 설정도 같이 바뀝니다.
// 실적: data.cardGoals[사람][카드 이름] = 한 달 실적 금액 (체크만 하고 금액을 안 적었으면 null)

import { parseAmount, formatMoney } from './calc.js';
import { textInput, amountInput, deleteButton } from './cells.js';
import { addHistory } from './history.js';

const box = document.getElementById('payment-editor');
const PAYMENT_FIELD = { a: 'paymentA', b: 'paymentB' };

let state = null;
let save = null;

export function setupPaymentEditor(appState, onSave) {
  state = appState;
  save = onSave;
  box.addEventListener('input', handleInput);
  box.addEventListener('change', handleChange);
  box.addEventListener('click', handleClick);
}

export function renderPaymentEditor() {
  box.replaceChildren(...['a', 'b'].map(personList));
}

function personList(person) {
  const group = document.createElement('div');
  group.className = 'payment-group';
  group.dataset.person = person;
  const title = document.createElement('p');
  title.className = 'payment-group-title';
  title.textContent = `${state.data.names[person]} 결제 수단`;

  const list = document.createElement('ul');
  list.className = 'payment-rows';
  list.append(...state.data.payments[person].map((card) => paymentRow(person, card)));

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button payment-add';
  add.dataset.action = 'add';
  add.textContent = '＋ 결제 수단 추가';
  group.append(title, list, add);
  return group;
}

// card: 저장된 이름 (새로 추가한 줄은 빈 글, 이름을 적고 칸을 벗어나면 목록에 들어감)
function paymentRow(person, card) {
  const goals = state.data.cardGoals[person];
  const hasGoal = card !== '' && card in goals;
  const li = document.createElement('li');
  li.className = 'payment-row';
  li.dataset.card = card;

  const name = textInput('cardName', card, '결제 수단 이름', '예: 신한카드');

  const check = document.createElement('label');
  check.className = 'payment-goal-check';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.field = 'goalOn';
  checkbox.checked = hasGoal;
  checkbox.disabled = card === ''; // 이름을 먼저 적어야 체크할 수 있음
  checkbox.setAttribute('aria-label', `${card || '결제 수단'} 실적 있음`);
  check.append(checkbox, document.createTextNode(' 실적'));

  const goal = amountInput('goal', hasGoal ? goals[card] : null, `${card || '결제 수단'} 한 달 실적 금액`, '실적 금액');
  goal.classList.toggle('is-blank', !hasGoal);

  li.append(name, check, goal, deleteButton('결제 수단 지우기'));
  return li;
}

function personOf(element) {
  return element.closest('[data-person]').dataset.person;
}

function handleInput(event) {
  if (event.target.dataset.field !== 'goal') return;
  const person = personOf(event.target);
  const card = event.target.closest('li').dataset.card;
  state.data.cardGoals[person][card] = parseAmount(event.target.value);
  save();
}

function handleChange(event) {
  const field = event.target.dataset.field;
  const person = personOf(event.target);
  const row = event.target.closest('li');
  const card = row.dataset.card;
  const who = state.data.names[person];

  if (field === 'cardName') {
    renameCard(person, card, event.target);
    return;
  }
  if (field === 'goalOn') {
    const goals = state.data.cardGoals[person];
    if (event.target.checked) goals[card] = null;
    else delete goals[card];
    row.querySelector('[data-field="goal"]').classList.toggle('is-blank', !event.target.checked);
    row.querySelector('[data-field="goal"]').value = '';
    addHistory(state.data, `[설정] ${who} ${card} 실적 ${event.target.checked ? '체크' : '체크 해제'}`);
    save();
    if (event.target.checked) row.querySelector('[data-field="goal"]').focus();
    return;
  }
  if (field === 'goal') {
    const value = state.data.cardGoals[person][card];
    addHistory(state.data, `[설정] ${who} ${card} 실적 금액: ${value === null ? '(빈칸)' : formatMoney(value)}`);
    save();
  }
}

// 이름 고치기·새 줄에 이름 적기 (칸을 벗어날 때)
function renameCard(person, oldName, input) {
  const list = state.data.payments[person];
  const newName = input.value.trim();
  if (newName === oldName) return;
  if (!newName || list.includes(newName)) {
    if (newName) window.alert(`"${newName}"은(는) 이미 있어요.`);
    input.value = oldName; // 빈칸·겹치는 이름이면 원래대로
    return;
  }
  const who = state.data.names[person];
  if (oldName) {
    list[list.indexOf(oldName)] = newName;
    renameReferences(person, oldName, newName);
    addHistory(state.data, `[설정] ${who} 결제 수단 이름: ${oldName} → ${newName}`);
  } else {
    list.push(newName);
    addHistory(state.data, `[설정] ${who} 결제 수단 추가: ${newName}`);
  }
  save();
  input.closest('li').replaceWith(paymentRow(person, newName));
}

// 월 가계부 항목·세부 항목에서 고른 이름과 실적 설정도 새 이름으로
function renameReferences(person, oldName, newName) {
  const field = PAYMENT_FIELD[person];
  for (const item of state.data.items) {
    for (const owner of [item, ...item.details]) {
      if (owner[field] === oldName) owner[field] = newName;
    }
  }
  const goals = state.data.cardGoals[person];
  if (oldName in goals) {
    goals[newName] = goals[oldName];
    delete goals[oldName];
  }
}

function handleClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const person = personOf(button);

  if (button.dataset.action === 'add') {
    const row = paymentRow(person, '');
    button.parentElement.querySelector('.payment-rows').append(row);
    row.querySelector('[data-field="cardName"]').focus();
    return;
  }
  if (button.dataset.action === 'delete') {
    const row = button.closest('li');
    const card = row.dataset.card;
    if (card) {
      // 이미 고른 칸은 그대로 남음 (결제 칸 목록에 계속 보임). 실적 설정만 지움
      state.data.payments[person] = state.data.payments[person].filter((name) => name !== card);
      delete state.data.cardGoals[person][card];
      addHistory(state.data, `[설정] ${state.data.names[person]} 결제 수단 지움: ${card}`);
      save();
    }
    row.remove();
  }
}
