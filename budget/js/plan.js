// ① 월 가계부: 예산(월 예상액)을 정하고, 그 달 실제액(② 실제 사용에서 입력)과 차이를 봅니다.

import {
  GROUPS, itemKind, parseAmount, formatMoney, formatMonth, planAmount,
  diffOf, sortByGroup, summarize, monthRecord, groupTotals,
} from './calc.js';
import { newItem } from './store.js';
import {
  areaCell, textInput, amountInput, computed, setMoney, showDiff, deleteButton, renderHeadRow,
} from './cells.js';
import { donutChart, barChart, seriesColor } from './charts.js';
import { forecastLines } from './forecast.js';
import { addHistory, watchEdits, shown } from './history.js';

const summaryBox = document.getElementById('plan-summary');
const missingNote = document.getElementById('plan-missing');
const forecastBox = document.getElementById('plan-forecast');
const editor = document.getElementById('plan-editor');
const editToggle = document.getElementById('plan-edit-toggle');
const chartsBox = document.getElementById('plan-charts');
const thead = document.getElementById('plan-head');
const tbody = document.getElementById('plan-body');
const tfoot = document.getElementById('plan-foot');

let state = null; // app.js의 상태 { data, month }
let save = null;

export function setupPlan(appState, onSave) {
  state = appState;
  save = onSave;
  tbody.addEventListener('input', handleInput);
  tbody.addEventListener('change', handleChange);
  tbody.addEventListener('click', handleClick);
  watchEdits(tbody, () => state.data, describeEdit, save);
  editToggle.addEventListener('click', toggleEditor);
  document.getElementById('plan-add').addEventListener('click', addItem);
}

// 휴대폰: 평소엔 요약·그래프만, "수정하기"를 누르면 입력칸을 엶 (CSS가 768px 이하에서만 숨김)
function toggleEditor() {
  const open = !editor.classList.contains('is-open');
  editor.classList.toggle('is-open', open);
  editToggle.setAttribute('aria-expanded', String(open));
  editToggle.textContent = open ? '✔️ 수정 완료' : '✏️ 수정하기';
  if (open) editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 이력에 남길 글. 예: "[월 가계부] 식비·배달·장보기 예상액: 100 → 130"
function describeEdit(input, before, after) {
  const item = findItem(input);
  if (!item) return null;
  const { names } = state.data;
  const labels = {
    group: '구분', name: '항목 이름', a: `${names.a} 금액`, b: `${names.b} 금액`, joint: '공동',
    amount: '예상액', paymentA: `${names.a} 결제 수단`, paymentB: `${names.b} 결제 수단`, note: '메모',
  };
  const itemName = (input.dataset.field === 'name' ? before : item.name) || '이름 없는 항목';
  // 결제 수단은 "＋ 새로 추가…"를 고를 수도 있어서, 고른 칸 값 대신 실제로 저장된 값을 남김
  if (input.dataset.field in PAYMENT_FIELDS) {
    after = item[input.dataset.field];
    if (before === after) return null;
  }
  return `[월 가계부] ${itemName} ${labels[input.dataset.field]}: ${shown(before)} → ${shown(after)}`;
}

export function renderPlan() {
  const { names } = state.data;
  renderHeadRow(thead, [
    ['구분'], ['항목'], [names.a, true], [names.b, true], ['공동'],
    ['월 예상액', true], [`실제액 (${formatMonth(state.month)})`, true], ['차이', true], [`결제 (${names.a} · ${names.b})`], ['결제일/메모'], [''],
  ]);
  // 저장 순서도 구분 순서로 맞춤 (화면·백업 파일이 같은 순서가 되게)
  state.data.items = sortByGroup(state.data.items);

  let lastGroup = null;
  const rows = state.data.items.map((item) => {
    const row = buildRow(item, item.group !== lastGroup);
    lastGroup = item.group;
    return row;
  });
  tbody.replaceChildren(...rows);
  refreshNumbers();
}

function buildRow(item, isGroupStart) {
  const { names } = state.data;
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  tr.className = `kind-${itemKind(item)}`;
  if (item.joint) tr.classList.add('is-joint');
  if (isGroupStart) tr.classList.add('group-start');

  const groupSelect = document.createElement('select');
  groupSelect.className = 'cell-input';
  groupSelect.dataset.field = 'group';
  groupSelect.setAttribute('aria-label', '구분');
  for (const group of GROUPS) {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = group;
    groupSelect.append(option);
  }
  groupSelect.value = item.group;

  const jointBox = document.createElement('input');
  jointBox.type = 'checkbox';
  jointBox.dataset.field = 'joint';
  jointBox.checked = item.joint;
  jointBox.setAttribute('aria-label', '공동 항목');

  // 공동 항목은 예상액을 직접, 개인 항목은 두 사람 금액을 적으면 합이 예상액
  const inputA = amountInput('a', item.joint ? null : item.a, `${names.a} 금액`, item.joint ? '—' : '');
  const inputB = amountInput('b', item.joint ? null : item.b, `${names.b} 금액`, item.joint ? '—' : '');
  inputA.disabled = item.joint;
  inputB.disabled = item.joint;
  const planCell = item.joint ? amountInput('amount', item.amount, '월 예상액') : computed('plan');

  // [자리 이름, 휴대폰 카드에서 보일 이름표, 내용, 클래스]
  // 휴대폰에서는 표 대신 카드로 보여서, 자리 이름(data-area)으로 칸 위치를 정함 (table.css)
  const cells = [
    ['group', '', groupSelect],
    ['name', '', textInput('name', item.name, '항목 이름', '항목 이름')],
    ['a', names.a, inputA, 'num'],
    ['b', names.b, inputB, 'num'],
    ['joint', '공동', jointBox, 'center'],
    ['plan', '예상', planCell, 'num'],
    // 실제액은 ② 실제 사용에서 적고, 여기서는 보기만 함
    ['actual', `실제 (${formatMonth(state.month)})`, computed('actual'), 'num'],
    ['diff', '차이', computed('diff'), 'num'],
    ['payment', `결제 ${names.a}·${names.b}`, paymentPair(item), ''],
    ['note', '메모', textInput('note', item.note, '결제일/메모')],
    ['delete', '', deleteButton('항목 지우기')],
  ];
  for (const [area, label, content, className] of cells) {
    tr.append(areaCell(area, label, content, className));
  }
  return tr;
}

function findItem(element) {
  const row = element.closest('tr');
  return row ? state.data.items.find((item) => item.id === row.dataset.id) : null;
}

// 글자를 칠 때마다: 값만 바꾸고 계산 칸을 새로 고침 (입력칸은 그대로 둬서 커서 유지)
function handleInput(event) {
  const field = event.target.dataset.field;
  const item = findItem(event.target);
  if (!item || field === 'group' || field === 'joint' || field in PAYMENT_FIELDS) return;

  if (field === 'name' || field === 'note') {
    item[field] = event.target.value;
  } else {
    item[field] = parseAmount(event.target.value);
  }
  save();
  refreshNumbers();
}

// 구분이나 공동 여부가 바뀌면 줄 모양이 달라지므로 표를 다시 그림
function handleChange(event) {
  const field = event.target.dataset.field;
  const item = findItem(event.target);
  if (!item) return;
  if (field in PAYMENT_FIELDS) {
    choosePayment(item, field, event.target.value);
    return;
  }
  if (field !== 'group' && field !== 'joint') return;

  if (field === 'group') item.group = event.target.value;
  if (field === 'joint') item.joint = event.target.checked;
  renderPlan(); // 다시 그리면서 구분 순서로 정렬됨
  save();
  focusField(item.id, field);
}

/* ── 결제 수단 (사람마다 따로) ── */

const ADD_PAYMENT = '__add__'; // "＋ 새로 추가…" 칸의 값
const PAYMENT_FIELDS = { paymentA: 'a', paymentB: 'b' }; // 칸 이름 → 사람

// 두 사람의 결제 수단 고르는 칸을 나란히: [유진 ▾] [남편 ▾]
function paymentPair(item) {
  const pair = document.createElement('div');
  pair.className = 'payment-pair';
  pair.append(paymentSelect(item, 'paymentA'), paymentSelect(item, 'paymentB'));
  return pair;
}

// 한 사람의 결제 수단 고르는 칸: 선택 안 함 / 그 사람 목록 / ＋ 새로 추가…
function paymentSelect(item, field) {
  const person = PAYMENT_FIELDS[field];
  const personName = state.data.names[person];
  const select = document.createElement('select');
  select.className = 'cell-input';
  select.dataset.field = field;
  select.setAttribute('aria-label', `${personName} 결제 수단`);

  const names = state.data.payments[person].slice();
  // 설정에서 목록에서 지웠어도 이 항목에 이미 고른 값은 보여 줌
  if (item[field] && !names.includes(item[field])) names.push(item[field]);
  const options = [
    ['', `${personName} —`],
    // 고른 뒤에는 카드 이름만 (누구 것인지는 머리줄과 칸 순서로: 왼쪽 첫 번째 사람, 오른쪽 두 번째 사람)
    ...names.map((name) => [name, name]),
    [ADD_PAYMENT, '＋ 새로 추가…'],
  ];
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  select.value = item[field];
  return select;
}

function choosePayment(item, field, value) {
  const person = PAYMENT_FIELDS[field];
  if (value === ADD_PAYMENT) {
    const name = (window.prompt(`${state.data.names[person]}의 새 결제 수단 이름 (예: 현대카드)`) || '').trim();
    if (name) {
      const list = state.data.payments[person];
      if (!list.includes(name)) list.push(name);
      item[field] = name;
    }
    // 새 이름이 모든 칸의 목록에 들어가도록 다시 그림 (취소했으면 원래 값으로 돌아감)
    renderPlan();
    focusField(item.id, field);
  } else {
    item[field] = value;
  }
  save();
}

function handleClick(event) {
  const button = event.target.closest('[data-action="delete"]');
  if (!button) return;
  const item = findItem(button);
  if (!item || !window.confirm(`"${item.name || '이름 없는 항목'}" 항목을 지울까요?`)) return;

  state.data.items = state.data.items.filter((other) => other !== item);
  for (const record of Object.values(state.data.months)) delete record.actual[item.id];
  addHistory(state.data, `[월 가계부] "${item.name || '이름 없는 항목'}" 항목 지움`);
  save();
  renderPlan();
}

function addItem() {
  const item = newItem('생활비', '', true);
  state.data.items.push(item);
  renderPlan(); // 다시 그리면서 구분 순서로 정렬됨
  save();
  focusField(item.id, 'name');
}

function focusField(id, field) {
  const input = tbody.querySelector(`tr[data-id="${id}"] [data-field="${field}"]`);
  if (input) input.focus();
}

/* ── 계산 칸 ── */

function refreshNumbers() {
  const actualMap = monthRecord(state.data, state.month).actual;

  for (const row of tbody.rows) {
    const item = state.data.items.find((other) => other.id === row.dataset.id);
    const plan = planAmount(item);
    setMoney(row, 'plan', plan);
    setMoney(row, 'actual', actualMap[item.id]);
    showDiff(row.querySelector('[data-cell="diff"]'), itemKind(item), diffOf(plan, actualMap[item.id]));
  }

  const totals = summarize(state.data.items, actualMap);
  renderFoot(totals);
  renderSummary(totals);
  renderForecast(totals);
  renderCharts(totals, actualMap);
  missingNote.textContent = totals.missing > 0
    ? `${formatMonth(state.month)} 실제액을 아직 안 적은 항목이 ${totals.missing}개 있어요. ② 실제 사용에서 적어 주세요.`
    : `${formatMonth(state.month)} 실제액을 모두 적었어요.`;
}

const FOOT_ROWS = [
  ['수입 합계', 'income', 'income'],
  ['지출 합계', 'spending', 'spending'],
  ['저축·투자 합계', 'saving', 'saving'],
  ['월 잔여금 (수입 − 지출 − 저축·투자)', 'left', 'income'],
];

function renderFoot(totals) {
  const rows = FOOT_ROWS.map(([label, key, kind]) => {
    const tr = document.createElement('tr');
    if (key === 'left') tr.className = 'total-row';
    const labelCell = areaCell('name', '', label);
    labelCell.colSpan = 5;
    const actual = totals.hasActual ? totals.actual[key] : null;
    const diffSpan = document.createElement('span');
    showDiff(diffSpan, kind, diffOf(totals.plan[key], actual));
    const rest = areaCell('rest', '', '');
    rest.colSpan = 3;
    tr.append(
      labelCell,
      areaCell('plan', '예상', formatMoney(totals.plan[key]), 'num'),
      areaCell('actual', '실제', formatMoney(actual), 'num'),
      areaCell('diff', '차이', diffSpan, 'num'),
      rest,
    );
    return tr;
  });
  tfoot.replaceChildren(...rows);
}

// 위쪽 요약 카드: 예상 / 실제
const SUMMARY_CARDS = [
  ['월 수입', 'income', 'income'],
  ['지출', 'spending', 'spending'],
  ['저축·투자', 'saving', 'saving'],
  ['남는 돈', 'left', 'income'],
  ['자산으로 쌓이는 돈', 'asset', 'income'],
];

function renderSummary(totals) {
  const cards = SUMMARY_CARDS.map(([title, key, kind]) => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    if (key === 'asset') card.classList.add('summary-main');

    const titleText = document.createElement('p');
    titleText.className = 'summary-title';
    titleText.textContent = title;

    const planText = document.createElement('p');
    planText.className = 'summary-value';
    planText.textContent = `${formatMoney(totals.plan[key])}만원`;

    const actualText = document.createElement('p');
    actualText.className = 'summary-actual';
    if (totals.hasActual) {
      const diff = diffOf(totals.plan[key], totals.actual[key]);
      const diffSpan = document.createElement('span');
      showDiff(diffSpan, kind, diff);
      actualText.append(`실제 ${formatMoney(totals.actual[key])} (`, diffSpan, ')');
    } else {
      actualText.textContent = '실제 —';
    }

    card.append(titleText, planText, actualText);
    return card;
  });
  summaryBox.replaceChildren(...cards);
}

/* ── 이대로 가면? (예산 기준) ── */

function renderForecast(totals) {
  const lines = forecastLines(state.data.goal, totals.plan.saving, totals.plan.asset, state.month);
  const items = lines.map((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  });
  const more = document.createElement('p');
  more.className = 'hint';
  more.textContent = '예산 기준이에요. 현재 자산·목표·수익률은 ④ 연간 요약에서 바꿀 수 있어요.';
  forecastBox.replaceChildren(...items, more);
}

/* ── 그래프 ── */

// 원형 그래프 조각: 구분마다 색을 고정 (예산·실제 그래프에서 같은 색)
const SLICES = [
  ['고정지출', 1], ['개인지출', 2], ['가족', 3], ['생활비', 4], ['특별지출', 5], ['저축·투자', 6],
];
const LEFT_SLOT = 7; // 남는 돈

function allocation(groups, key, left) {
  const slices = SLICES.map(([group, slot]) => ({ label: group, value: groups[group][key], color: seriesColor(slot) }));
  slices.push({ label: '남는 돈', value: left, color: seriesColor(LEFT_SLOT) });
  return slices;
}

function renderCharts(totals, actualMap) {
  const groups = groupTotals(state.data.items, actualMap);
  const month = formatMonth(state.month);
  const charts = [
    donutChart('예산: 수입이 어디로 가나', allocation(groups, 'plan', totals.plan.left),
      `${formatMoney(totals.plan.income)}만원`, '월 수입'),
  ];

  if (totals.hasActual) {
    charts.push(donutChart(`실제 (${month}): 수입이 어디로 갔나`, allocation(groups, 'actual', totals.actual.left),
      `${formatMoney(totals.actual.income)}만원`, '실제 수입'));
  } else {
    const empty = document.createElement('figure');
    empty.className = 'chart chart-empty';
    empty.textContent = `${month} 실제액을 적으면 실제 원형 그래프가 나와요.`;
    charts.push(empty);
  }

  const rows = SLICES.map(([group]) => ({
    label: group,
    values: [groups[group].plan, groups[group].hasActual ? groups[group].actual : null],
  }));
  const bars = barChart(`구분별 예산 vs 실제 (${month})`, rows, [
    { name: '예산', color: 'var(--series-plan)' },
    { name: '실제', color: seriesColor(1) },
  ]);
  bars.classList.add('chart-wide');
  charts.push(bars);

  const warnings = [];
  if (totals.plan.left < 0) warnings.push(`예산이 수입보다 ${formatMoney(-totals.plan.left)}만원 많아요.`);
  if (totals.hasActual && totals.missing === 0 && totals.actual.left < 0) {
    warnings.push(`${month}에는 수입보다 ${formatMoney(-totals.actual.left)}만원 더 썼어요.`);
  }
  for (const text of warnings) {
    const p = document.createElement('p');
    p.className = 'chart-warning bad';
    p.textContent = text;
    charts.push(p);
  }
  chartsBox.replaceChildren(...charts);
}
