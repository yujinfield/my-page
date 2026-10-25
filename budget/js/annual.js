// ⑤ 연간 요약: 한 해 12달 실적, 월별 그래프, "이대로 가면 N년 뒤 M억"

import {
  parseAmount, formatMoney, formatMonth, shiftMonth, summarize, yearRows, actualAverage, eventTotals,
} from './calc.js';
import { cell, renderHeadRow } from './cells.js';
import { columnChart, seriesColor } from './charts.js';
import { forecastLines, formatEok } from './forecast.js';
import { watchEdits, shown } from './history.js';

const yearLabel = document.getElementById('year-label');
const summaryBox = document.getElementById('annual-summary');
const chartBox = document.getElementById('annual-chart');
const thead = document.getElementById('annual-head');
const tbody = document.getElementById('annual-body');
const tfoot = document.getElementById('annual-foot');
const eventsNote = document.getElementById('annual-events');
const goalForm = document.getElementById('goal-form');
const goalTargetText = document.getElementById('goal-target-text');
const forecastBox = document.getElementById('annual-forecast');

let state = null;
let save = null;
let render = null; // app.js의 화면 다시 그리기 (해를 바꿀 때)

const GOAL_LABELS = { current: '현재 자산', target: '목표 금액', rate: '연 수익률' };

export function setupAnnual(appState, onSave, onRender) {
  state = appState;
  save = onSave;
  render = onRender;

  // 해 이동: 보고 있는 달을 12달 앞뒤로
  document.getElementById('year-prev').addEventListener('click', () => {
    state.month = shiftMonth(state.month, -12);
    render();
  });
  document.getElementById('year-next').addEventListener('click', () => {
    state.month = shiftMonth(state.month, 12);
    render();
  });

  goalForm.addEventListener('input', (event) => {
    const field = event.target.dataset.field;
    if (!field) return;
    const value = parseAmount(event.target.value);
    // 목표 금액·수익률은 비우면 기본값으로
    if (field === 'current') state.data.goal.current = value;
    if (field === 'target') state.data.goal.target = value === null ? 50000 : value;
    if (field === 'rate') state.data.goal.rate = value === null ? 0 : value;
    save();
    renderForecast();
  });
  goalForm.addEventListener('submit', (event) => event.preventDefault());
  watchEdits(goalForm, () => state.data, (input, before, after) =>
    `[목표] ${GOAL_LABELS[input.dataset.field]}: ${shown(before)} → ${shown(after)}`, save);
}

function year() {
  return Number(state.month.slice(0, 4));
}

export function renderAnnual() {
  yearLabel.textContent = `${year()}년`;
  const rows = yearRows(state.data, year());
  const filled = rows.filter((row) => row.hasActual);

  renderSummary(rows, filled);
  renderChart(rows);
  renderTable(rows, filled);
  renderEventsNote();
  fillGoalInputs();
  renderForecast();
}

// 실제액을 적은 달만 더함
function sumActual(rows, key) {
  return rows.reduce((total, row) => total + row.actual[key], 0);
}

function renderSummary(rows, filled) {
  const plan = summarize(state.data.items, {}).plan;
  const cards = [
    ['실제 수입', formatMoney(sumActual(filled, 'income'))],
    ['실제 지출', formatMoney(sumActual(filled, 'spending'))],
    ['실제 저축·투자', formatMoney(sumActual(filled, 'saving'))],
    [`자산으로 쌓인 돈 (${filled.length}개월)`, formatMoney(sumActual(filled, 'asset')), true],
    ['예산대로면 1년에', formatMoney(plan.asset * 12)],
  ];
  summaryBox.replaceChildren(...cards.map(([title, value, main]) => {
    const card = document.createElement('div');
    card.className = main ? 'summary-card summary-main' : 'summary-card';
    const titleText = document.createElement('p');
    titleText.className = 'summary-title';
    titleText.textContent = title;
    const valueText = document.createElement('p');
    valueText.className = 'summary-value';
    valueText.textContent = `${value}만원`;
    card.append(titleText, valueText);
    return card;
  }));
}

// 가로축은 월, 막대는 실제로 쌓인 돈, 점선은 예산(달마다 같음)
function renderChart(rows) {
  const columns = rows.map((row) => ({
    label: `${Number(row.key.slice(5))}월`,
    value: row.hasActual ? row.actual.asset : null,
  }));
  const planAsset = summarize(state.data.items, {}).plan.asset;
  chartBox.replaceChildren(columnChart(
    `${year()}년 달마다 자산으로 쌓인 돈`,
    columns,
    seriesColor(6),
    { value: planAsset, label: `예산 ${formatMoney(planAsset)}` },
  ));
}

function renderTable(rows, filled) {
  renderHeadRow(thead, [
    ['월'], ['수입', true], ['지출', true], ['저축·투자', true], ['남는 돈', true],
    ['자산으로 쌓인 돈', true], ['누적', true], ['입력'],
  ]);

  let cumulative = 0;
  tbody.replaceChildren(...rows.map((row) => {
    const tr = document.createElement('tr');
    if (row.key === state.month) tr.className = 'current-month';
    tr.append(cell(formatMonth(row.key)));
    if (!row.hasActual) {
      for (let i = 0; i < 6; i += 1) tr.append(cell('—', 'num muted'));
      tr.append(cell('아직 없음', 'muted'));
      return tr;
    }
    cumulative += row.actual.asset;
    for (const key of ['income', 'spending', 'saving', 'left', 'asset']) {
      tr.append(cell(formatMoney(row.actual[key]), row.actual[key] < 0 ? 'num bad' : 'num'));
    }
    tr.append(cell(formatMoney(cumulative), 'num'));
    tr.append(cell(row.missing === 0 ? '다 적음' : `${row.missing}개 안 적음`, row.missing === 0 ? '' : 'muted'));
    return tr;
  }));

  const total = document.createElement('tr');
  total.className = 'total-row';
  total.append(cell(`합계 (${filled.length}개월)`));
  for (const key of ['income', 'spending', 'saving', 'left', 'asset']) {
    total.append(cell(formatMoney(sumActual(filled, key)), 'num'));
  }
  total.append(cell(), cell());
  tfoot.replaceChildren(total);
}

// 큰돈 캘린더에서 이 해 것만 합계 ("2027.01"처럼 해로 시작하는 것)
function renderEventsNote() {
  const prefix = String(year());
  const events = state.data.events.filter((event) => event.month.startsWith(prefix));
  if (events.length === 0) {
    eventsNote.textContent = `${prefix}년 큰돈 캘린더에 적은 이벤트가 없어요.`;
    return;
  }
  // 세부 항목이 있는 이벤트는 세부 항목 합계로
  const expected = events.reduce((sum, event) => sum + (eventTotals(event).expected || 0), 0);
  const confirmed = events.reduce((sum, event) => sum + (eventTotals(event).confirmed || 0), 0);
  eventsNote.textContent = `${prefix}년 큰돈 캘린더 ${events.length}건: 예상 ${formatEok(expected)}, 확정 ${formatEok(confirmed)} (월 가계부와 따로 관리)`;
}

/* ── 이대로 가면? ── */

function fillGoalInputs() {
  const { goal } = state.data;
  for (const input of goalForm.querySelectorAll('[data-field]')) {
    // 지금 고치고 있는 칸은 건드리지 않음
    if (input === document.activeElement) continue;
    const value = goal[input.dataset.field];
    input.value = value === null ? '' : String(value);
  }
}

function renderForecast() {
  const { goal } = state.data;
  goalTargetText.textContent = `= ${formatEok(goal.target)}`;

  const plan = summarize(state.data.items, {}).plan;
  const average = actualAverage(state.data, state.month);
  const blocks = [
    ['예산대로 가면', forecastLines(goal, plan.saving, plan.asset, state.month)],
  ];
  if (average) {
    blocks.push([`최근 실적대로 가면 (다 적은 ${average.months}개월 평균)`,
      forecastLines(goal, average.saving, average.asset, state.month)]);
  } else {
    blocks.push(['최근 실적대로 가면', ['한 달 실제액을 모두 적으면 실적 기준으로도 계산해 드려요.']]);
  }

  forecastBox.replaceChildren(...blocks.map(([title, lines]) => {
    const box = document.createElement('div');
    box.className = 'forecast';
    const heading = document.createElement('p');
    heading.className = 'forecast-title';
    heading.textContent = title;
    box.append(heading, ...lines.map((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      return p;
    }));
    return box;
  }));
}
