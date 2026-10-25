// 표 칸을 만드는 작은 도우미 (세 화면이 함께 씀)

import { formatMoney, formatDiff, isGoodDiff } from './calc.js';

// <td> 하나. className이 "num"이면 숫자 칸(오른쪽 정렬)
export function cell(content, className) {
  const td = document.createElement('td');
  if (className) td.className = className;
  if (content instanceof Node) td.append(content);
  else if (content !== undefined) td.textContent = content;
  return td;
}

// 휴대폰 카드용 칸: area는 카드 안 자리 이름(table.css), label은 카드에서 보일 이름표
export function areaCell(area, label, content, className) {
  const td = cell(content, className);
  td.dataset.area = area;
  if (label) td.dataset.label = label;
  return td;
}

// 글자 입력칸. field는 어느 값을 고치는지 알려 주는 이름
export function textInput(field, value, label, placeholder) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cell-input';
  input.dataset.field = field;
  input.value = value;
  input.setAttribute('aria-label', label);
  if (placeholder) input.placeholder = placeholder;
  return input;
}

// 고르는 칸. options: [[값, 보이는 글자], ...]
export function selectInput(field, value, label, options) {
  const select = document.createElement('select');
  select.className = 'cell-input';
  select.dataset.field = field;
  select.setAttribute('aria-label', label);
  for (const [optionValue, text] of options) {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = text;
    select.append(option);
  }
  select.value = value;
  return select;
}

// 금액 입력칸 (휴대폰에서 숫자 키패드)
export function amountInput(field, value, label, placeholder) {
  const input = textInput(field, value === null || value === undefined ? '' : String(value), label, placeholder);
  input.classList.add('cell-amount');
  input.inputMode = 'decimal';
  return input;
}

// 계산 결과를 보여 주는 칸 (data-cell 이름으로 나중에 값만 바꿈)
export function computed(name) {
  const span = document.createElement('span');
  span.className = 'computed';
  span.dataset.cell = name;
  return span;
}

export function setMoney(row, name, value) {
  const span = row.querySelector(`[data-cell="${name}"]`);
  if (span) span.textContent = formatMoney(value);
}

// 차이 글자와 색: 좋으면 초록(good), 나쁘면 빨강(bad)
export function showDiff(span, kind, diff) {
  span.textContent = formatDiff(diff);
  span.classList.toggle('good', diff !== null && diff !== 0 && isGoodDiff(kind, diff));
  span.classList.toggle('bad', diff !== null && !isGoodDiff(kind, diff));
}

export function deleteButton(label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'delete-button';
  button.dataset.action = 'delete';
  button.textContent = '✕';
  button.setAttribute('aria-label', label);
  return button;
}

// 표 머리줄 다시 그리기. columns: [글자, 숫자칸이면 true]
export function renderHeadRow(thead, columns) {
  const tr = document.createElement('tr');
  for (const [text, isNumber] of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = text;
    if (isNumber) th.className = 'num';
    tr.append(th);
  }
  thead.replaceChildren(tr);
}
