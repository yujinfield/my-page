// ① 월 가계부 아래 "두 사람 돈 흐름": 계층도로 그린 사람마다 수입·지출·저축·공동 몫·남는 돈과,
// 공동 지출을 따져서 누가 누구에게 얼마 보내야 하는지. (계산은 flow.js)
//
//               [우리집 수입 900]
//            ┌──────────┴──────────┐
//      [유진 수입 500]        [영규 수입 400]
//             │                      │
//       [자기 지출 80           [자기 지출 60
//        공동 몫 150             공동 몫 150
//        남는 돈 220]            남는 돈 190]
//      [ 영규 → 유진 40만원 보내기 ]

import { formatMoney, formatMonth } from './calc.js';
import { moneyFlow, SPLIT_RULES } from './flow.js';
import { selectInput } from './cells.js';
import { addHistory } from './history.js';

const box = document.getElementById('money-flow');

let state = null;
let save = null;

export function setupMoneyFlow(appState, onSave) {
  state = appState;
  save = onSave;
  box.addEventListener('change', (event) => {
    if (event.target.dataset.field !== 'splitRule') return;
    state.data.splitRule = event.target.value;
    const text = SPLIT_RULES.find(([value]) => value === event.target.value)[1];
    addHistory(state.data, `[월 가계부] 공동 몫 나누기: ${text}`);
    save();
    renderMoneyFlow();
  });
}

export function renderMoneyFlow() {
  const { data } = state;
  const flow = moneyFlow(data, state.month, data.splitRule);

  const title = document.createElement('h2');
  title.className = 'section-title';
  title.textContent = '두 사람 돈 흐름';

  const ruleLabel = document.createElement('label');
  ruleLabel.className = 'flow-rule';
  ruleLabel.append('공동 몫 나누기 ', selectInput('splitRule', data.splitRule, '공동 몫 나누는 방법', SPLIT_RULES));

  const top = node(`우리집 수입 ${formatMoney(flow.income)}`, 'flow-top');
  const stem = document.createElement('span');
  stem.className = 'flow-stem';
  stem.setAttribute('aria-hidden', 'true');

  const branches = document.createElement('div');
  branches.className = 'flow-branches';
  branches.append(...['a', 'b'].map((person) => branch(data.names[person], flow.people[person], flow.ratio[person], data.splitRule)));

  const tree = document.createElement('div');
  tree.className = 'flow-tree';
  tree.append(top, stem, branches);

  box.replaceChildren(title, ruleLabel, tree, transferBox(flow, data.names));
}

function node(text, className) {
  const div = document.createElement('div');
  div.className = `flow-node ${className || ''}`;
  div.textContent = text;
  return div;
}

// 한 사람 가지: [유진 수입 500] 아래로 ├ 자기 지출 / 자기 저축 / 공동 몫 / └ 남는 돈
function branch(name, person, ratio, rule) {
  const column = document.createElement('div');
  column.className = 'flow-branch';
  const share = rule === 'income' ? ` ${Math.round(ratio * 100)}%` : '';
  const lines = [
    ['자기 지출', person.ownSpending],
    ['자기 저축·투자', person.ownSaving],
    [`공동 몫${share}`, person.jointShare],
    ['남는 돈', person.left, person.left < 0 ? 'bad' : 'flow-left'],
  ];
  const list = document.createElement('ul');
  list.className = 'flow-list';
  for (const [label, value, className] of lines) {
    const li = document.createElement('li');
    if (className) li.className = className;
    const text = document.createElement('span');
    text.textContent = label;
    const amount = document.createElement('span');
    amount.className = 'num';
    amount.textContent = formatMoney(value);
    li.append(text, amount);
    list.append(li);
  }
  const stem = document.createElement('span');
  stem.className = 'flow-stem';
  stem.setAttribute('aria-hidden', 'true');
  column.append(node(`${name} 수입 ${formatMoney(person.income)}`, 'flow-person'), stem, list);
  return column;
}

// 맨 아래 정산: "영규 → 유진 40만원 보내기" (예산 기준), 실제 기준, 누가 낼지 안 정한 공동 지출 안내
function transferBox(flow, names) {
  const div = document.createElement('div');
  div.className = 'flow-transfer';
  const main = document.createElement('p');
  main.className = 'flow-transfer-main';
  main.textContent = transferText(flow.transfer, names);
  const why = document.createElement('p');
  why.className = 'hint';
  why.textContent = `예산 기준 (① 결제 칸에서 고른 사람이 냄) · 공동 지출 중 내는 돈: `
    + `${names.a} ${formatMoney(flow.people.a.paidJoint)} · ${names.b} ${formatMoney(flow.people.b.paidJoint)}`;
  div.append(main, why);

  if (flow.actualTransfer !== null) {
    const actual = document.createElement('p');
    actual.textContent = `실제 (${formatMonth(state.month)}, ② 실제 사용 기준): ${transferText(flow.actualTransfer, names)}`;
    div.append(actual);
  }
  if (flow.joint.unassigned > 0) {
    const note = document.createElement('p');
    note.className = 'hint';
    note.textContent = `누가 낼지 안 정한 공동 지출 ${formatMoney(flow.joint.unassigned)}만원은 각자 몫을 낸다고 보고 빼고 계산했어요. `
      + '① 결제 칸에서 고르면 정산에 들어가요.';
    div.append(note);
  }
  return div;
}

function transferText(transfer, names) {
  const amount = Math.round(Math.abs(transfer) * 10) / 10;
  if (amount === 0) return '서로 보낼 돈 없음 ✓';
  return transfer > 0
    ? `${names.b} → ${names.a} ${formatMoney(amount)}만원 보내기`
    : `${names.a} → ${names.b} ${formatMoney(amount)}만원 보내기`;
}
