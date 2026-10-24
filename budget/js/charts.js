// 그래프 그리기 (외부 라이브러리 없이 SVG·HTML로 직접)
// 색은 base.css의 --series-1 ~ 7 변수를 씁니다. 색만으로 구분하지 않도록 범례에 이름·금액·비율을 함께 적습니다.

import { formatMoney } from './calc.js';

const SVG = 'http://www.w3.org/2000/svg';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function swatch(color) {
  const dot = element('span', 'swatch');
  dot.style.background = color;
  return dot;
}

/* ── 원형(도넛) 그래프 ── */

// slices: [{ label, value, color }]  (0 이하인 값은 빼고 그림)
// centerText: 가운데 큰 글자, centerLabel: 그 아래 작은 글자
export function donutChart(title, slices, centerText, centerLabel) {
  const box = element('figure', 'chart donut');
  box.append(element('figcaption', 'chart-title', title));

  const shown = slices.filter((slice) => slice.value > 0);
  const total = shown.reduce((sum, slice) => sum + slice.value, 0);

  const ring = element('div', 'donut-ring');
  // 둘레가 100인 원(반지름 15.915)을 쓰면 비율(%)을 그대로 선 길이로 쓸 수 있음
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(circle('var(--surface-soft)', 100, 0));

  const GAP = shown.length > 1 ? 0.6 : 0; // 조각 사이 틈
  let start = 0;
  for (const slice of shown) {
    const percent = (slice.value / total) * 100;
    const arc = circle(slice.color, Math.max(percent - GAP, 0.1), start);
    const tip = document.createElementNS(SVG, 'title');
    tip.textContent = `${slice.label}: ${formatMoney(slice.value)}만원 (${Math.round(percent)}%)`;
    arc.append(tip);
    svg.append(arc);
    start += percent;
  }

  const center = element('div', 'donut-center');
  center.append(element('strong', '', centerText), element('span', '', centerLabel));
  ring.append(svg, center);

  // 범례 = 표: 색 / 이름 / 금액 / 비율
  const legend = element('ul', 'legend');
  for (const slice of shown) {
    const item = element('li');
    const percent = Math.round((slice.value / total) * 100);
    item.append(
      swatch(slice.color),
      element('span', 'legend-label', slice.label),
      element('span', 'legend-value', `${formatMoney(slice.value)}만원`),
      element('span', 'legend-percent', `${percent}%`),
    );
    legend.append(item);
  }
  if (shown.length === 0) legend.append(element('li', 'hint', '아직 금액이 없어요.'));

  box.append(ring, legend);
  return box;
}

// 12시 방향에서 시작해 시계 방향으로 length(%)만큼 그리는 원호
function circle(color, length, start) {
  const node = document.createElementNS(SVG, 'circle');
  node.setAttribute('cx', '21');
  node.setAttribute('cy', '21');
  node.setAttribute('r', '15.915');
  node.setAttribute('fill', 'none');
  node.setAttribute('stroke', color);
  node.setAttribute('stroke-width', '6');
  node.setAttribute('stroke-dasharray', `${length} ${100 - length}`);
  node.setAttribute('stroke-dashoffset', String(25 - start));
  return node;
}

/* ── 가로 막대 그래프 ── */

// rows: [{ label, values: [숫자 또는 null, ...] }]
// series: [{ name, color }]  (values 순서와 같음)
export function barChart(title, rows, series) {
  const box = element('figure', 'chart bars');
  box.append(element('figcaption', 'chart-title', title));

  // 범례 (두 계열 이상일 때)
  if (series.length > 1) {
    const legend = element('ul', 'legend legend-inline');
    for (const one of series) {
      const item = element('li');
      item.append(swatch(one.color), element('span', 'legend-label', one.name));
      legend.append(item);
    }
    box.append(legend);
  }

  let max = 0;
  for (const row of rows) for (const value of row.values) max = Math.max(max, value || 0);

  const list = element('div', 'bar-rows');
  for (const row of rows) {
    const line = element('div', 'bar-row');
    const bars = element('div', 'bar-group');
    row.values.forEach((value, index) => {
      const bar = element('div', 'bar-line');
      const track = element('div', 'bar-track');
      const fill = element('div', 'bar-fill');
      fill.style.background = series[index].color;
      fill.style.width = max > 0 && value > 0 ? `${(value / max) * 100}%` : '0';
      track.append(fill);
      const label = value === null ? '—' : formatMoney(value);
      const number = element('span', value !== null && value < 0 ? 'bar-value bad' : 'bar-value', label);
      bar.title = `${row.label} ${series[index].name}: ${label}${value === null ? '' : '만원'}`;
      bar.append(track, number);
      bars.append(bar);
    });
    line.append(element('span', 'bar-label', row.label), bars);
    list.append(line);
  }
  box.append(list);
  return box;
}

// 그래프 색 (구분마다 고정, 순서를 바꾸지 않음)
export function seriesColor(slot) {
  return `var(--series-${slot})`;
}
