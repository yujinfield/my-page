// ③ 카드 실적: 그 달에 카드(결제 수단)마다 얼마 썼는지, 목표 실적을 채웠는지
// 금액은 ② 실제 사용에 적은 실제액을 ① 월 가계부에서 고른 결제 수단으로 나눠서 계산합니다 (calc.js의 cardTotals).

import { parseAmount, formatMoney, formatMonth, cardTotals, monthRecord } from './calc.js';
import { amountInput } from './cells.js';
import { watchEdits, shown } from './history.js';

const listBox = document.getElementById('cards-list');
const noneNote = document.getElementById('cards-none');

let state = null;
let save = null;

export function setupCards(appState, onSave) {
  state = appState;
  save = onSave;
  listBox.addEventListener('input', handleInput);
  watchEdits(listBox, () => state.data, describeEdit, save);
}

// 예: "[카드 실적] 유진 신한카드 목표 실적: (빈칸) → 30"
function describeEdit(input, before, after) {
  const row = input.closest('.card-item');
  const name = state.data.names[row.dataset.person];
  return `[카드 실적] ${name} ${row.dataset.card} 목표 실적: ${shown(before)} → ${shown(after)}`;
}

export function renderCards() {
  const totals = cardTotals(state.data.items, monthRecord(state.data, state.month).actual);

  const sections = ['a', 'b'].map((person) => {
    const section = document.createElement('section');
    section.className = 'card-person';
    const title = document.createElement('h3');
    title.className = 'actual-group-title';
    title.textContent = `${state.data.names[person]} (${formatMonth(state.month)})`;

    // 설정 목록의 카드 + 목록에서 지웠지만 아직 항목에 남아 있는 카드
    const cards = state.data.payments[person].slice();
    for (const card of Object.keys(totals[person])) if (!cards.includes(card)) cards.push(card);

    const list = document.createElement('ul');
    list.className = 'actual-items';
    list.append(...cards.map((card) => buildRow(person, card, totals[person][card])));
    if (cards.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'hint';
      empty.textContent = '⚙️ 설정에서 결제 수단을 추가해 주세요.';
      list.append(empty);
    }
    section.append(title, list);
    return section;
  });
  listBox.replaceChildren(...sections);

  noneNote.textContent = totals.none.actual > 0 || totals.none.plan > 0
    ? `결제 수단을 안 고른 지출: 실제 ${formatMoney(totals.none.actual)}만원 (예산 ${formatMoney(totals.none.plan)}만원). ① 월 가계부의 결제 칸에서 고르면 카드에 더해져요.`
    : '';
}

// 한 줄: [카드 이름 / 쓴 항목들]  [이번 달 사용액]
//        [목표 실적 입력칸]  [진행 막대 · 남은 금액]
function buildRow(person, card, total) {
  const used = total || { plan: 0, actual: 0, items: [] };
  const row = document.createElement('li');
  row.className = 'actual-item card-item';
  row.dataset.person = person;
  row.dataset.card = card;

  const info = document.createElement('div');
  info.className = 'actual-info';
  const name = document.createElement('strong');
  name.textContent = card;
  const detail = document.createElement('span');
  detail.className = 'hint';
  const spent = used.items.map((item) => `${item.name} ${formatMoney(item.actual)}`).join(' · ');
  detail.textContent = `예산 기준 ${formatMoney(used.plan)}` + (spent ? ` · ${spent}` : '');
  info.append(name, detail);

  const amount = document.createElement('strong');
  amount.className = 'card-amount';
  amount.textContent = `${formatMoney(used.actual)}만원`;

  const goalBox = document.createElement('label');
  goalBox.className = 'card-goal';
  goalBox.append('목표 실적', amountInput('goal', state.data.cardGoals[person][card], `${card} 목표 실적`, '없음'), '만원');

  const progress = document.createElement('div');
  progress.className = 'card-progress';

  row.append(info, amount, goalBox, progress);
  renderProgress(progress, used.actual, state.data.cardGoals[person][card]);
  return row;
}

// 목표가 있으면 막대와 "N만원 남음" / "✓ 달성"
function renderProgress(box, actual, goal) {
  if (goal === undefined || goal === null || goal <= 0) {
    box.replaceChildren();
    return;
  }
  const track = document.createElement('div');
  track.className = 'progress-track';
  const fill = document.createElement('div');
  fill.className = actual >= goal ? 'progress-fill is-done' : 'progress-fill';
  fill.style.width = `${Math.min(actual / goal, 1) * 100}%`;
  track.append(fill);

  const text = document.createElement('span');
  text.className = actual >= goal ? 'progress-text good' : 'progress-text';
  text.textContent = actual >= goal ? '✓ 달성' : `${formatMoney(goal - actual)}만원 남음`;
  box.replaceChildren(track, text);
}

function handleInput(event) {
  if (event.target.dataset.field !== 'goal') return;
  const row = event.target.closest('.card-item');
  const { person, card } = row.dataset;
  const value = parseAmount(event.target.value);
  if (value === null) delete state.data.cardGoals[person][card];
  else state.data.cardGoals[person][card] = value;
  save();

  // 입력칸은 그대로 두고 진행 막대만 새로 그림 (커서 유지)
  const totals = cardTotals(state.data.items, monthRecord(state.data, state.month).actual);
  const used = totals[person][card];
  renderProgress(row.querySelector('.card-progress'), used ? used.actual : 0, value);
}
