// ⑤ 용돈: 사람마다 용돈을 어떻게 쓸지 적는 곳. 각자 비밀번호로 잠가서 서로 못 봐요.
// 잠긴 글만 저장하고(data.allowance), 푼 내용은 화면을 보는 동안 메모리에만 둡니다.
// 탭을 떠나거나 🔒 잠그기를 누르면 다시 잠김. 내용이 비밀이라 변경 이력에는 남기지 않습니다.
//
// 푼 내용의 모양: { months: { "2026-11": { rows: [{ id, name, amount }], memo } } }

import { parseAmount, formatMoney, formatMonth, personAmounts } from './calc.js';
import { newId } from './store.js';
import { textInput, amountInput, deleteButton } from './cells.js';
import { addHistory } from './history.js';
import { canLock, newLock, lockText, unlockBox } from './allowance-lock.js';

const PEOPLE = ['a', 'b'];
const MIN_PASSWORD = 4;

const container = document.getElementById('allowance-people');

let state = null;
let save = null;
// 사람마다 푼 내용: { lock, content, version } / 잠겨 있으면 없음
const opened = {};
// 사람마다 잠금 화면에 보여 줄 안내 (예: "비밀번호가 달라요")
const messages = {};

export function setupAllowance(appState, onSave) {
  state = appState;
  save = onSave;
  container.addEventListener('submit', handleSubmit);
  container.addEventListener('input', handleInput);
  container.addEventListener('click', handleClick);
}

// 모두 잠그기 (탭을 떠날 때, 백업을 불러와 데이터가 바뀌었을 때)
export function lockAllowance() {
  for (const person of PEOPLE) delete opened[person];
}

export function renderAllowance() {
  if (!canLock()) {
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = '이 브라우저 주소(https나 localhost가 아님)에서는 잠금 기능을 쓸 수 없어요.';
    container.replaceChildren(note);
    return;
  }
  container.replaceChildren(...PEOPLE.map(personCard));
  for (const person of PEOPLE) refreshTotal(person);
}

function personCard(person) {
  const card = document.createElement('section');
  card.className = 'allowance-person';
  card.dataset.person = person;
  const title = document.createElement('h3');
  title.className = 'allowance-title';
  title.textContent = `${state.data.names[person]} 용돈`;
  card.append(title);

  if (opened[person]) card.append(...openedView(person));
  else card.append(...lockedView(person));
  return card;
}

/* ── 잠긴 화면: 비밀번호 정하기 / 열기 ── */

function lockedView(person) {
  const name = state.data.names[person];
  const hasBox = state.data.allowance[person] !== null;
  const form = document.createElement('form');
  form.className = 'allowance-lock';
  form.dataset.action = hasBox ? 'open' : 'create';

  const intro = document.createElement('p');
  intro.className = 'hint';
  intro.textContent = hasBox
    ? `🔒 잠겨 있어요. ${name}의 비밀번호를 넣어야 볼 수 있어요.`
    : `아직 비밀번호가 없어요. ${name}만 아는 비밀번호를 정하면 시작해요. 잊으면 되찾을 수 없어요.`;
  form.append(intro, passwordInput('password', hasBox ? '비밀번호' : `새 비밀번호 (${MIN_PASSWORD}자 이상)`, hasBox));
  if (!hasBox) form.append(passwordInput('confirm', '비밀번호 한 번 더', false));

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button button-primary';
  submit.textContent = hasBox ? '열기' : '비밀번호 정하고 시작';
  form.append(submit);

  const message = document.createElement('p');
  message.className = 'allowance-message';
  message.setAttribute('role', 'status');
  message.textContent = messages[person] || '';
  form.append(message);

  const views = [form];
  if (hasBox) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'link-button';
    reset.dataset.action = 'reset';
    reset.textContent = '비밀번호를 잊었어요 (기록 지우고 다시 시작)';
    views.push(reset);
  }
  return views;
}

function passwordInput(name, label, existing) {
  const input = document.createElement('input');
  input.type = 'password';
  input.name = name;
  input.className = 'text-input allowance-password';
  input.placeholder = label;
  input.setAttribute('aria-label', label);
  input.autocomplete = existing ? 'current-password' : 'new-password';
  return input;
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const person = form.closest('[data-person]').dataset.person;
  const password = form.elements.password.value;

  if (form.dataset.action === 'create') {
    if (password.length < MIN_PASSWORD) return showMessage(person, `비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`);
    if (password !== form.elements.confirm.value) return showMessage(person, '두 비밀번호가 달라요.');
    opened[person] = { lock: await newLock(password), content: { months: {} }, version: 0 };
    addHistory(state.data, `[용돈] ${state.data.names[person]} 비밀번호 정함`);
    messages[person] = '';
    await store(person);
    renderAllowance();
    return;
  }

  try {
    const { lock, text } = await unlockBox(state.data.allowance[person], password);
    opened[person] = { lock, content: readContent(text), version: 0 };
    messages[person] = '';
    renderAllowance();
  } catch (error) {
    showMessage(person, '비밀번호가 달라요.');
  }
}

function showMessage(person, text) {
  messages[person] = text;
  renderAllowance();
  const input = container.querySelector(`[data-person="${person}"] input[name="password"]`);
  if (input) input.focus();
}

// 푼 글 → 내용. 모양이 이상하면 빈 내용 (지금 버전에서 쓴 것만 있으니 간단히 확인)
function readContent(text) {
  try {
    const content = JSON.parse(text);
    if (content && typeof content.months === 'object') return content;
  } catch (error) {
    // 아래 빈 내용으로
  }
  return { months: {} };
}

// 지금 내용을 잠가서 저장. 잠그는 데 시간이 걸려서, 그 사이 또 고쳤으면 마지막 것만 저장
async function store(person) {
  const session = opened[person];
  session.version += 1;
  const version = session.version;
  const box = await lockText(session.lock, JSON.stringify(session.content));
  if (version !== session.version) return;
  state.data.allowance[person] = box;
  save();
}

/* ── 푼 화면: 이번 달 쓸 곳 목록과 메모 ── */

// 이번 달 기록 (없으면 만듦)
function monthOf(person) {
  const months = opened[person].content.months;
  if (!months[state.month]) months[state.month] = { rows: [], memo: '' };
  return months[state.month];
}

// ① 월 가계부의 개인지출 중 이 사람 금액 합 (공동 항목은 뺌)
function allowanceBudget(person) {
  let total = 0;
  for (const item of state.data.items) {
    if (item.group === '개인지출' && !item.joint) total += personAmounts(item)[person] || 0;
  }
  return total;
}

function openedView(person) {
  const record = monthOf(person);
  const intro = document.createElement('p');
  intro.className = 'hint';
  intro.textContent = `${formatMonth(state.month)} 용돈을 어디에 쓸지 적어요. 다른 사람은 비밀번호 없이 못 봐요.`;

  const list = document.createElement('ul');
  list.className = 'allowance-rows';
  for (const row of record.rows) {
    const li = document.createElement('li');
    li.className = 'allowance-row';
    li.dataset.rowId = row.id;
    li.append(
      textInput('name', row.name, '쓸 곳', '예: 운동, 친구 모임'),
      amountInput('amount', row.amount, `${row.name || '쓸 곳'} 금액`, '금액'),
      deleteButton('쓸 곳 지우기'),
    );
    list.append(li);
  }

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button';
  add.dataset.action = 'add-row';
  add.textContent = '＋ 쓸 곳 추가';

  const total = document.createElement('p');
  total.className = 'allowance-total';
  total.dataset.cell = 'total';

  const memo = document.createElement('textarea');
  memo.className = 'allowance-memo';
  memo.dataset.field = 'memo';
  memo.rows = 3;
  memo.value = record.memo;
  memo.placeholder = '메모 (예: 이번 달은 아껴서 다음 달 운동화)';
  memo.setAttribute('aria-label', `${state.data.names[person]} 용돈 메모`);

  const lock = document.createElement('button');
  lock.type = 'button';
  lock.className = 'button';
  lock.dataset.action = 'lock';
  lock.textContent = '🔒 잠그기';

  return [intro, list, add, total, memo, lock];
}

// "용돈 예산 30 · 적은 돈 25 · 남는 돈 5"
function refreshTotal(person) {
  const target = container.querySelector(`[data-person="${person}"] [data-cell="total"]`);
  if (!target || !opened[person]) return;
  const budget = allowanceBudget(person);
  const planned = monthOf(person).rows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const left = budget - planned;
  // 예산을 안 적었으면 남는 돈 대신 어디서 적는지 알려 줌
  target.textContent = budget === 0
    ? `적은 돈 ${formatMoney(planned)} (용돈 예산은 ① 월 가계부 개인지출에 적어요)`
    : `용돈 예산 ${formatMoney(budget)} · 적은 돈 ${formatMoney(planned)} · 남는 돈 ${formatMoney(left)}`;
  target.classList.toggle('bad', budget > 0 && left < 0);
}

function handleInput(event) {
  const field = event.target.dataset.field;
  const card = event.target.closest('[data-person]');
  if (!field || !card || !opened[card.dataset.person]) return;
  const person = card.dataset.person;
  const record = monthOf(person);

  if (field === 'memo') {
    record.memo = event.target.value;
  } else {
    const row = record.rows.find((other) => other.id === event.target.closest('[data-row-id]').dataset.rowId);
    if (!row) return;
    if (field === 'name') row.name = event.target.value;
    if (field === 'amount') row.amount = parseAmount(event.target.value);
    refreshTotal(person);
  }
  store(person);
}

function handleClick(event) {
  const button = event.target.closest('[data-action]');
  const card = event.target.closest('[data-person]');
  if (!button || !card || button.tagName === 'FORM') return;
  const person = card.dataset.person;
  const action = button.dataset.action;

  if (action === 'reset') {
    resetPerson(person);
    return;
  }
  if (!opened[person]) return;

  if (action === 'lock') {
    delete opened[person];
    renderAllowance();
    return;
  }
  const record = monthOf(person);
  if (action === 'add-row') {
    const row = { id: newId('u'), name: '', amount: null };
    record.rows.push(row);
    store(person);
    renderAllowance();
    const input = container.querySelector(`[data-row-id="${row.id}"] [data-field="name"]`);
    if (input) input.focus();
    return;
  }
  if (action === 'delete') {
    const rowId = button.closest('[data-row-id]').dataset.rowId;
    record.rows = record.rows.filter((row) => row.id !== rowId);
    store(person);
    renderAllowance();
  }
}

// 비밀번호를 잊었을 때: 잠긴 기록을 지우고 비밀번호를 새로 정할 수 있게
function resetPerson(person) {
  const name = state.data.names[person];
  const ok = window.confirm(`${name}의 용돈 기록을 모두 지우고 비밀번호를 다시 정할까요? 지운 기록은 되돌릴 수 없어요.`);
  if (!ok) return;
  state.data.allowance[person] = null;
  delete opened[person];
  messages[person] = '';
  addHistory(state.data, `[용돈] ${name} 기록 지우고 비밀번호 다시 정하기`);
  save();
  renderAllowance();
}
