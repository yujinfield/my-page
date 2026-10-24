// 표 칸을 만드는 작은 도우미 (세 화면이 함께 씀)

import { formatMoney } from './calc.js';

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
