// ① 월 가계부 위쪽: 요약 카드, "이대로 가면?" 코멘트, 그래프 (원형·막대)
// 표(plan.js)에서 숫자가 바뀔 때마다 renderPlanSummary를 불러 다시 그립니다.

import { formatMoney, formatMonth, diffOf, groupTotals, currentSavings, monthKeyOf, GROUP_COLORS } from './calc.js';
import { showDiff } from './cells.js';
import { donutChart, barChart, seriesColor } from './charts.js';
import { forecastLines } from './forecast.js';

const summaryBox = document.getElementById('plan-summary');
const forecastBox = document.getElementById('plan-forecast');
const chartsBox = document.getElementById('plan-charts');

let state = null;

// totals: summarize() 결과, actualMap: 그 달 실제액 { 항목id: 금액 }
export function renderPlanSummary(appState, totals, actualMap) {
  state = appState;
  renderSummary(totals);
  renderForecast(totals);
  renderCharts(totals, actualMap);
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
  const now = currentSavings(state.data, monthKeyOf(new Date()));
  const lines = forecastLines(state.data.goal, now ? now.amount : null, totals.plan.saving, totals.plan.asset, state.month);
  const items = lines.map((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  });
  const more = document.createElement('p');
  more.className = 'hint';
  more.textContent = '예산 기준이에요. 지금 저금액에서 시작해요. 시작 저금액은 ⚙️ 설정, 부채·목표·수익률은 ④ 연간 요약에서 바꿀 수 있어요.';
  forecastBox.replaceChildren(...items, more);
}

/* ── 그래프 ── */

// 원형 그래프 조각: 구분마다 색을 고정 (월 가계부 줄 색과 같은 --group-* 색)
const SLICES = ['고정지출', '개인지출', '가족', '생활비', '특별비', '저축·투자'];
const LEFT_SLOT = 7; // 남는 돈

function allocation(groups, key, left) {
  const slices = SLICES.map((group) => ({ label: group, value: groups[group][key], color: `var(--group-${GROUP_COLORS[group]})` }));
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

  const rows = SLICES.map((group) => ({
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
