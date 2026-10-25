// ① 월 가계부 표 아래 "카드 실적": ⚙️ 설정에서 실적을 체크한 카드마다
// 예산으로 얼마 쓸 계획인지, 실적까지 얼마 더 써야 하는지 보여 줍니다. (계산은 cards.js)

import { formatMoney, formatMonth } from './calc.js';
import { cardUsage } from './cards.js';

const box = document.getElementById('card-goals');

const openCards = new Set(); // "쓰기로 한 것" 목록을 펼친 카드 ("a:신한카드"). 금액을 칠 때마다 다시 그려도 펼친 채로

export function renderCardGoals(state) {
  const { data } = state;
  const usage = cardUsage(data, state.month);
  let count = 0;
  // 유진 | 영규 두 열. 설정의 결제 수단 순서대로, 실적을 체크한 카드만
  const columns = ['a', 'b'].map((person) => {
    const column = document.createElement('section');
    column.className = 'card-goal-column';
    const name = document.createElement('h3');
    name.className = 'card-goal-person';
    name.textContent = data.names[person];
    const list = document.createElement('ul');
    list.className = 'card-goal-list';
    for (const card of data.payments[person]) {
      if (!(card in data.cardGoals[person])) continue;
      list.append(goalRow(person, card, data.cardGoals[person][card], usage[person][card], state.month));
      count += 1;
    }
    if (list.children.length === 0) {
      const none = document.createElement('p');
      none.className = 'hint';
      none.textContent = '실적을 체크한 카드가 없어요.';
      column.append(name, none);
    } else {
      column.append(name, list);
    }
    return column;
  });

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = '카드 실적';
  if (count === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = '⚙️ 설정의 결제 수단에서 "실적"을 체크하고 금액을 적으면, 예산 기준으로 얼마 더 써야 하는지 여기서 볼 수 있어요.';
    box.replaceChildren(title, empty);
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'card-goal-columns';
  grid.append(...columns);
  box.replaceChildren(title, grid);
}

// 카드 한 장: [신한카드          실적 30]
//              예산 ███████░░  25 → 5 더 써야 해요
//              실제 ████░░░░░  20 → 10 더
//              ▸ 쓰기로 한 것 3개 (펼치면 식비 120, 용돈 › 운동 30 …)
function goalRow(person, card, goal, used, month) {
  const plan = used ? used.plan : 0;
  const actual = used ? used.actual : 0;
  const li = document.createElement('li');
  li.className = 'card-goal';

  const head = document.createElement('p');
  head.className = 'card-goal-head';
  const name = document.createElement('strong');
  name.textContent = card;
  const target = document.createElement('span');
  target.textContent = goal === null ? '실적 금액 없음' : `실적 ${formatMoney(goal)}`;
  head.append(name, target);
  li.append(head);

  if (goal === null) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = '⚙️ 설정에서 한 달 실적 금액을 적어 주세요.';
    li.append(hint);
  } else {
    li.append(
      goalBar('예산', plan, goal, 'plan'),
      goalBar(`실제 (${formatMonth(month)})`, actual, goal, 'actual'),
    );
  }
  li.append(plannedList(`${person}:${card}`, used ? used.items : []));
  return li;
}

// 펼치는 목록: 이 카드로 쓰기로 한 항목들 (금액이 큰 순)
function plannedList(key, items) {
  const details = document.createElement('details');
  details.className = 'card-goal-items';
  details.open = openCards.has(key);
  details.addEventListener('toggle', () => {
    if (details.open) openCards.add(key);
    else openCards.delete(key);
  });
  const summary = document.createElement('summary');
  summary.textContent = `쓰기로 한 것 ${items.length}개`;
  details.append(summary);

  if (items.length === 0) {
    const none = document.createElement('p');
    none.className = 'hint';
    none.textContent = '① 월 가계부 결제 칸에서 이 카드를 고른 항목이 없어요.';
    details.append(none);
    return details;
  }
  const list = document.createElement('ul');
  for (const entry of items.slice().sort((x, y) => y.amount - x.amount)) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = entry.name;
    const amount = document.createElement('span');
    amount.className = 'num';
    amount.textContent = formatMoney(entry.amount);
    li.append(name, amount);
    list.append(li);
  }
  details.append(list);
  return details;
}

function goalBar(label, value, goal, kind) {
  const line = document.createElement('div');
  line.className = `card-goal-line ${kind}`;
  const text = document.createElement('span');
  text.className = 'card-goal-label';
  text.textContent = label;

  const track = document.createElement('span');
  track.className = 'card-goal-track';
  const fill = document.createElement('span');
  fill.className = 'card-goal-fill';
  fill.style.width = goal > 0 ? `${Math.min(value / goal, 1) * 100}%` : '100%';
  track.append(fill);

  const left = goal - value;
  const result = document.createElement('span');
  result.className = left > 0 ? 'card-goal-result' : 'card-goal-result good';
  result.textContent = left > 0
    ? `${formatMoney(value)} → ${formatMoney(left)} 더 써야 해요`
    : `${formatMoney(value)} → 채워요 ✓`;
  line.append(text, track, result);
  return line;
}
