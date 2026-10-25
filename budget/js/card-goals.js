// ① 월 가계부 표 아래 "카드 실적": ⚙️ 설정에서 실적을 체크한 카드마다
// 예산으로 얼마 쓸 계획인지, 실적까지 얼마 더 써야 하는지 보여 줍니다. (계산은 cards.js)

import { formatMoney, formatMonth } from './calc.js';
import { cardUsage } from './cards.js';

const box = document.getElementById('card-goals');

export function renderCardGoals(state) {
  const { data } = state;
  const usage = cardUsage(data, state.month);
  const rows = [];
  for (const person of ['a', 'b']) {
    // 설정의 결제 수단 순서대로, 실적을 체크한 카드만
    for (const card of data.payments[person]) {
      if (card in data.cardGoals[person]) {
        rows.push(goalRow(data.names[person], card, data.cardGoals[person][card], usage[person][card], state.month));
      }
    }
  }

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = '카드 실적';
  if (rows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = '⚙️ 설정의 결제 수단에서 "실적"을 체크하고 금액을 적으면, 예산 기준으로 얼마 더 써야 하는지 여기서 볼 수 있어요.';
    box.replaceChildren(title, empty);
    return;
  }
  const list = document.createElement('ul');
  list.className = 'card-goal-list';
  list.append(...rows);
  box.replaceChildren(title, list);
}

// 카드 한 장: [신한카드 · 유진   실적 30]
//              예산 ███████░░  25 → 5 더 써야 해요
//              실제 ████░░░░░  20 → 10 더
function goalRow(personName, card, goal, used, month) {
  const plan = used ? used.plan : 0;
  const actual = used ? used.actual : 0;
  const li = document.createElement('li');
  li.className = 'card-goal';

  const head = document.createElement('p');
  head.className = 'card-goal-head';
  const name = document.createElement('strong');
  name.textContent = `${card} · ${personName}`;
  const target = document.createElement('span');
  target.textContent = goal === null ? '실적 금액 없음' : `실적 ${formatMoney(goal)}`;
  head.append(name, target);
  li.append(head);

  if (goal === null) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = '⚙️ 설정에서 한 달 실적 금액을 적어 주세요.';
    li.append(hint);
    return li;
  }
  li.append(
    goalBar('예산', plan, goal, 'plan'),
    goalBar(`실제 (${formatMonth(month)})`, actual, goal, 'actual'),
  );
  return li;
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
