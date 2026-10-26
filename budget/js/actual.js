// ② 가계부 작성: 그 달에 실제로 받은·쓴 금액을 항목마다 두 사람이 나눠 적습니다.
// 예산(월 예상액)은 ① 월 가계부에서 정하고, 여기서는 실제액만 적어요.
// 두 사람 금액은 months[달].actualBy에, 그 합은 months[달].actual에 저장 (다른 화면은 합계만 씀)
// 세부 항목이 있는 항목은 세부 항목마다 적고(months[달].detailActual), 그 합이 항목의 actualBy가 됨

import {
  GROUPS, itemKind, parseAmount, formatMoney, formatMonth, planAmount, diffOf, summarize,
  monthRecord, ensureMonth, itemPayment, personAmounts,
} from './calc.js';
import { amountInput, showDiff } from './cells.js';
import { watchEdits, shown } from './history.js';

const summaryBox = document.getElementById('actual-summary');
const progressNote = document.getElementById('actual-progress');
const listBox = document.getElementById('actual-list');

const PERSON_FIELDS = { actualA: 'a', actualB: 'b' }; // 입력칸 이름 → 사람
const DETAIL_FIELDS = { detailA: 'a', detailB: 'b' }; // 세부 항목 입력칸 이름 → 사람

let state = null;
let save = null;

export function setupActual(appState, onSave) {
  state = appState;
  save = onSave;
  listBox.addEventListener('input', handleInput);
  watchEdits(listBox, () => state.data, describeEdit, save);
}

// 예: "[가계부 작성] 식비·배달·장보기 유진 (2026.10): 100 → 130", 세부 항목이면 "식비 › 배달 유진 …"
function describeEdit(input, before, after) {
  const item = findItem(input);
  if (!item) return null;
  const field = input.dataset.field;
  const personName = state.data.names[PERSON_FIELDS[field] || DETAIL_FIELDS[field]];
  const detail = findDetail(item, input);
  const name = `${item.name || '이름 없는 항목'}${detail ? ` › ${detail.name || '세부 항목'}` : ''}`;
  return `[가계부 작성] ${name} ${personName} (${formatMonth(state.month)}): ${shown(before)} → ${shown(after)}`;
}

function findItem(element) {
  const row = element.closest('.actual-item');
  return row ? state.data.items.find((item) => item.id === row.dataset.id) : null;
}

function findDetail(item, element) {
  const line = element.closest('[data-detail-id]');
  return line ? item.details.find((detail) => detail.id === line.dataset.detailId) : null;
}

export function renderActual() {
  const record = monthRecord(state.data, state.month);

  // 구분마다 묶어서 보여 줌 (항목이 없는 구분은 건너뜀)
  const sections = [];
  for (const group of GROUPS) {
    const items = state.data.items.filter((item) => item.group === group);
    if (items.length === 0) continue;

    const section = document.createElement('section');
    section.className = 'actual-group';
    const title = document.createElement('h3');
    title.className = 'actual-group-title';
    title.textContent = group;
    const list = document.createElement('ul');
    list.className = 'actual-items';
    list.append(...items.map((item) => buildRow(item, record)));
    section.append(title, list);
    sections.push(section);
  }

  if (sections.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = '① 월 가계부에서 항목을 먼저 추가해 주세요.';
    sections.push(empty);
  }
  listBox.replaceChildren(...sections);
  refreshNumbers();
}

// 한 줄: [항목 이름 / 예산 · 메모]  [유진 입력칸] [남편 입력칸] / [합계 · 차이]
// 세부 항목이 있으면 두 사람 칸은 합계(보기만)이고, 아래에 세부 항목마다 [이름] [유진] [남편] 입력칸
// record: 이 달 기록 (actualBy·detailActual)
function buildRow(item, record) {
  const split = record.actualBy[item.id];
  const hasDetails = item.details.length > 0;
  const row = document.createElement('li');
  row.className = 'actual-item';
  row.dataset.id = item.id;

  const info = document.createElement('div');
  info.className = 'actual-info';
  const name = document.createElement('strong');
  name.textContent = item.name || '이름 없는 항목';
  const plan = document.createElement('span');
  plan.className = 'hint';
  // "예산 100 · 유진 신한카드 · 남편 삼성카드 · 메모" (결제 수단·메모는 있을 때만)
  const { names } = state.data;
  const parts = [
    `예산 ${formatMoney(planAmount(item)) || '—'}`,
    itemPayment(item, 'paymentA') && `${names.a} ${itemPayment(item, 'paymentA')}`,
    itemPayment(item, 'paymentB') && `${names.b} ${itemPayment(item, 'paymentB')}`,
    item.note,
  ].filter(Boolean);
  plan.textContent = parts.join(' · ');
  // 예전에 합계로만 적은 실제액이 있으면 알려 줌 (나눠 적으면 두 사람 합으로 바뀜)
  const legacy = document.createElement('span');
  legacy.className = 'hint actual-legacy';
  legacy.dataset.cell = 'legacy';
  info.append(name, plan, legacy);

  const inputBox = document.createElement('div');
  inputBox.className = 'actual-input';
  const people = document.createElement('div');
  people.className = 'actual-people';
  // 개인 항목은 칸 안에 그 사람 예산을 흐리게 보여 줌 (예: "예산 50")
  const budget = item.joint ? {} : personAmounts(item);
  for (const [field, person] of Object.entries(PERSON_FIELDS)) {
    const label = document.createElement('label');
    label.className = 'actual-person';
    const personName = document.createElement('span');
    personName.textContent = names[person];
    if (hasDetails) {
      // 세부 항목 합계 (보기만, refreshNumbers에서 채움)
      const sum = document.createElement('span');
      sum.className = 'actual-sum';
      sum.dataset.cell = `sum-${person}`;
      label.append(personName, sum);
    } else {
      const value = split ? split[person] : null;
      const placeholder = budget[person] ? `예산 ${formatMoney(budget[person])}` : '';
      const input = amountInput(field, value, `${item.name || '이름 없는 항목'} ${names[person]} 실제 금액`, placeholder);
      label.append(personName, input);
    }
    people.append(label);
  }
  const diff = document.createElement('span');
  diff.className = 'actual-diff';
  diff.dataset.cell = 'diff';
  inputBox.append(people, diff);

  row.append(info, inputBox);
  if (hasDetails) {
    row.classList.add('has-details');
    row.append(detailList(item, record));
  }
  return row;
}

// 세부 항목마다 한 줄: [이름 / 예산] [유진 입력칸] [남편 입력칸]
function detailList(item, record) {
  const { names } = state.data;
  const list = document.createElement('ul');
  list.className = 'actual-details';
  for (const detail of item.details) {
    const line = document.createElement('li');
    line.className = 'actual-detail';
    line.dataset.detailId = detail.id;
    const name = document.createElement('span');
    name.className = 'actual-detail-name';
    name.textContent = detail.name || '세부 항목';
    const plan = document.createElement('span');
    plan.className = 'hint';
    const budget = item.joint ? detail.amount : (detail.a || 0) + (detail.b || 0);
    plan.textContent = `예산 ${formatMoney(budget) || '—'}`;
    const info = document.createElement('div');
    info.className = 'actual-detail-info';
    info.append(name, plan);

    const split = record.detailActual[detail.id];
    const inputs = document.createElement('div');
    inputs.className = 'actual-people';
    for (const [field, person] of Object.entries(DETAIL_FIELDS)) {
      inputs.append(amountInput(field, split ? split[person] : null,
        `${item.name || '이름 없는 항목'} ${detail.name || '세부 항목'} ${names[person]} 실제 금액`, ''));
    }
    line.append(info, inputs);
    refreshDetailPlaceholders(line, item, detail, split);
    list.append(line);
  }
  return list;
}

// 세부 항목 칸의 흐린 글자: 개인 항목은 그 사람 세부 예산("예산 30"),
// 아니면 두 칸 다 비었을 때만 이름. 한 사람이라도 적었으면 안 적은 칸은 그냥 빈칸
function refreshDetailPlaceholders(line, item, detail, split) {
  const hasBudget = !item.joint && (detail.a || detail.b);
  const empty = !hasBudget && (!split || (split.a === null && split.b === null));
  for (const [field, person] of Object.entries(DETAIL_FIELDS)) {
    const input = line.querySelector(`[data-field="${field}"]`);
    if (!item.joint && detail[person]) input.placeholder = `예산 ${formatMoney(detail[person])}`;
    else input.placeholder = empty ? state.data.names[person] : '';
  }
}

// 세부 항목들에 적은 실제액의 합 → { a, b } (아무것도 안 적었으면 null)
function sumDetails(item, record) {
  let found = false;
  const sum = { a: 0, b: 0 };
  for (const detail of item.details) {
    const split = record.detailActual[detail.id];
    if (!split) continue;
    found = true;
    sum.a += split.a || 0;
    sum.b += split.b || 0;
  }
  return found ? sum : null;
}

function handleInput(event) {
  const field = event.target.dataset.field;
  const item = findItem(event.target);
  if (!item) return;
  const record = ensureMonth(state.data, state.month);

  // 세부 항목 칸: 세부 항목에 적고, 그 합을 항목의 실제액으로
  if (DETAIL_FIELDS[field]) {
    const detail = findDetail(item, event.target);
    const detailSplit = record.detailActual[detail.id] || { a: null, b: null };
    detailSplit[DETAIL_FIELDS[field]] = parseAmount(event.target.value);
    if (detailSplit.a === null && detailSplit.b === null) delete record.detailActual[detail.id];
    else record.detailActual[detail.id] = detailSplit;
    refreshDetailPlaceholders(event.target.closest('[data-detail-id]'), item, detail, record.detailActual[detail.id]);
    setItemActual(item, record, sumDetails(item, record));
    save();
    refreshNumbers();
    return;
  }

  const person = PERSON_FIELDS[field];
  if (!person) return;
  const split = record.actualBy[item.id] || { a: null, b: null };
  split[person] = parseAmount(event.target.value);
  setItemActual(item, record, split);
  save();
  refreshNumbers();
}

// 항목의 실제액: 사람마다 금액(actualBy)과 그 합(actual). 둘 다 빈칸이면 지움
function setItemActual(item, record, split) {
  if (!split || (split.a === null && split.b === null)) {
    delete record.actualBy[item.id];
    delete record.actual[item.id];
  } else {
    record.actualBy[item.id] = split;
    record.actual[item.id] = (split.a || 0) + (split.b || 0);
  }
}

function refreshNumbers() {
  const record = monthRecord(state.data, state.month);
  const actualMap = record.actual;
  const spent = { a: 0, b: 0 }; // 사람마다 쓴 돈 (지출 항목만)

  for (const row of listBox.querySelectorAll('.actual-item')) {
    const item = state.data.items.find((other) => other.id === row.dataset.id);
    const actual = actualMap[item.id];
    const split = record.actualBy[item.id];
    const diffBox = row.querySelector('[data-cell="diff"]');
    showDiff(diffBox, itemKind(item), diffOf(planAmount(item), actual));
    // 차이 앞에 합계: "합계 130 · +10"
    if (actual !== undefined && actual !== null) diffBox.textContent = `합계 ${formatMoney(actual)} · ${diffBox.textContent}`;
    const legacy = row.querySelector('[data-cell="legacy"]');
    legacy.textContent = legacyText(item, record, actual, split);
    for (const person of ['a', 'b']) {
      const sum = row.querySelector(`[data-cell="sum-${person}"]`);
      if (sum) sum.textContent = split && split[person] !== null ? formatMoney(split[person]) : '—';
    }
    if (split && itemKind(item) === 'spending') {
      spent.a += split.a || 0;
      spent.b += split.b || 0;
    }
  }

  const totals = summarize(state.data.items, actualMap);
  renderSummary(totals);
  const done = state.data.items.length - totals.missing;
  const { names } = state.data;
  progressNote.textContent = `${formatMonth(state.month)}: ${state.data.items.length}개 중 ${done}개 적었어요. `
    + `쓴 돈 ${names.a} ${formatMoney(spent.a)} · ${names.b} ${formatMoney(spent.b)}`;
}

// 예전에 적은 방식이 지금과 다를 때 안내 (새로 적으면 바뀐다는 것)
function legacyText(item, record, actual, split) {
  if (actual !== undefined && !split) return `예전에 합계로 적은 금액 ${formatMoney(actual)} · 나눠 적으면 두 사람 합으로 바뀌어요`;
  if (split && item.details.length > 0 && !sumDetails(item, record)) {
    return '항목 전체로 적은 금액이에요 · 세부 항목에 적으면 그 합으로 바뀌어요';
  }
  return '';
}

// 위쪽 요약: 남은 지출 예산(크게) + 수입·지출·저축 실제/예산
function renderSummary(totals) {
  const left = totals.plan.spending - totals.actual.spending;
  const cards = [
    [left >= 0 ? '남은 지출 예산' : '지출 예산 초과', `${formatMoney(Math.abs(left))}만원`, true, left < 0],
    ['수입', `${formatMoney(totals.actual.income)} / ${formatMoney(totals.plan.income)}`],
    ['지출', `${formatMoney(totals.actual.spending)} / ${formatMoney(totals.plan.spending)}`],
    ['저축·투자', `${formatMoney(totals.actual.saving)} / ${formatMoney(totals.plan.saving)}`],
  ];
  summaryBox.replaceChildren(...cards.map(([title, value, main, over]) => {
    const card = document.createElement('div');
    card.className = main ? 'summary-card summary-main' : 'summary-card';
    const titleText = document.createElement('p');
    titleText.className = 'summary-title';
    titleText.textContent = main ? title : `${title} (실제 / 예산)`;
    const valueText = document.createElement('p');
    valueText.className = over ? 'summary-value bad' : 'summary-value';
    valueText.textContent = value;
    card.append(titleText, valueText);
    return card;
  }));
}
