// ③ 큰돈 캘린더의 세부 항목 (예: 여행 → 숙소, 비행기, 경비)
// 줄·버튼을 만드는 함수만 모아 둠. 입력·클릭 처리는 events.js에서 합니다.

import { textInput, amountInput, deleteButton } from './cells.js';

// "세부 3 ▾" 버튼: 세부 항목 줄을 펼치고 접음. short면 "3 ▾"처럼 짧게 (칸이 좁은 월 가계부)
export function detailToggle(event, open, short) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'detail-toggle';
  button.dataset.action = 'toggle-details';
  button.textContent = `${short ? '' : '세부 '}${event.details.length || '＋'} ${open ? '▴' : '▾'}`;
  button.title = '세부 항목';
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', `세부 항목 ${event.details.length}개 ${open ? '접기' : '펼치기'}`);
  return button;
}

// 이벤트 바로 아래 줄: 세부 항목 목록 [이름] [예상] [확정] [결제] [✕] + "＋ 세부 항목 추가"
// data: 전체 데이터 (두 사람 이름·결제 수단 목록)
// suggestions: 이 이벤트 분류의 추천 세부 항목 이름들 (있으면 "✨ 추천 세부 항목" 버튼)
// suggestOpen: 추천 목록(체크칸)을 펼쳤는지
export function detailRow(event, data, columnCount, suggestions = [], suggestOpen = false) {
  const tr = document.createElement('tr');
  tr.dataset.id = event.id;
  tr.className = event.done ? 'detail-row is-done' : 'detail-row';
  const td = document.createElement('td');
  td.colSpan = columnCount;

  const list = document.createElement('ul');
  list.className = 'event-details';
  const head = document.createElement('li');
  head.className = 'detail-item detail-head';
  head.setAttribute('aria-hidden', 'true');
  for (const text of ['세부 항목', '예상', '확정', '결제', '']) {
    const span = document.createElement('span');
    span.textContent = text;
    head.append(span);
  }
  list.append(head);

  for (const detail of event.details) {
    const item = document.createElement('li');
    item.className = 'detail-item';
    item.dataset.detailId = detail.id;
    const remove = deleteButton('세부 항목 지우기');
    remove.dataset.action = 'detail-delete';
    // 칸마다 클래스(d-…): 휴대폰에서 줄을 나눠 배치할 때 씀 (table.css)
    const cell = (element, className) => {
      element.classList.add(className);
      return element;
    };
    item.append(
      cell(textInput('detailName', detail.name, '세부 항목 이름', '예: 숙소'), 'd-name'),
      cell(amountInput('detailExpected', detail.expected, `${detail.name || '세부 항목'} 예상`, '예상'), 'd-expected'),
      cell(amountInput('detailConfirmed', detail.confirmed, `${detail.name || '세부 항목'} 확정`, '확정'), 'd-confirmed'),
      cell(eventPaymentSelect(event, detail, data), 'd-pay'),
      cell(remove, 'd-delete'),
    );
    list.append(item);
  }

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'button detail-add';
  add.dataset.action = 'detail-add';
  add.textContent = '＋ 세부 항목 추가';

  const buttons = document.createElement('div');
  buttons.className = 'detail-buttons';
  buttons.append(add);
  if (suggestions.length > 0) {
    const suggest = document.createElement('button');
    suggest.type = 'button';
    suggest.className = 'button detail-add';
    suggest.dataset.action = 'suggest-toggle';
    suggest.setAttribute('aria-expanded', String(suggestOpen));
    suggest.textContent = `✨ 추천 세부 항목 (${event.category})`;
    buttons.append(suggest);
  }

  td.append(list, buttons);
  if (suggestOpen && suggestions.length > 0) td.append(suggestPanel(event, suggestions));
  tr.append(td);
  return tr;
}

// 추천 목록: 필요한 것만 체크하고 "선택한 것 넣기" (이미 있는 이름은 체크할 수 없음)
function suggestPanel(event, suggestions) {
  const panel = document.createElement('div');
  panel.className = 'suggest-panel';
  const list = document.createElement('div');
  list.className = 'suggest-list';
  const existing = event.details.map((detail) => detail.name.trim());
  for (const name of suggestions) {
    const label = document.createElement('label');
    label.className = 'suggest-option';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = name;
    box.className = 'suggest-check';
    const has = existing.includes(name);
    box.disabled = has;
    box.checked = has;
    label.append(box, ` ${name}${has ? ' (있음)' : ''}`);
    list.append(label);
  }
  const addSelected = document.createElement('button');
  addSelected.type = 'button';
  addSelected.className = 'button button-primary';
  addSelected.dataset.action = 'suggest-add';
  addSelected.textContent = '선택한 것 넣기';
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = '금액은 비워서 넣어요. 추천 목록은 ⚙️ 설정에서 고칠 수 있어요.';
  panel.append(list, addSelected, hint);
  return panel;
}

// 큰돈 세부 항목의 결제 수단 고르는 칸: 이벤트 주인이 공통이면 두 사람 것 모두, 한 사람이면 그 사람 것만
// 값은 "a:신한카드"처럼 사람:이름 (사람마다 같은 카드 이름이 있어도 구분되게)
function eventPaymentSelect(event, detail, data) {
  const select = document.createElement('select');
  select.className = 'cell-input';
  select.dataset.field = 'detailPayment';
  select.setAttribute('aria-label', `${detail.name || '세부 항목'} 결제 수단`);
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '결제 —';
  select.append(blank);

  const people = event.owner === 'joint' ? ['a', 'b'] : [event.owner];
  // 이벤트 주인을 바꿨어도 이미 고른 다른 사람 카드는 목록에 남김
  const [savedPerson] = splitPayment(detail.payment);
  if (savedPerson && !people.includes(savedPerson)) people.push(savedPerson);
  const showNames = people.length > 1;
  for (const person of people) {
    const group = document.createElement('optgroup');
    group.label = data.names[person];
    const names = data.payments[person].slice();
    // 설정에서 지웠어도 이미 고른 값은 보여 줌
    const [, savedName] = splitPayment(detail.payment);
    if (savedPerson === person && savedName && !names.includes(savedName)) names.push(savedName);
    for (const name of names) {
      const option = document.createElement('option');
      option.value = `${person}:${name}`;
      option.textContent = showNames ? `${data.names[person]} ${name}` : name;
      group.append(option);
    }
    select.append(group);
  }
  select.value = detail.payment;
  return select;
}

// "a:신한카드" → ["a", "신한카드"]
export function splitPayment(value) {
  const index = (value || '').indexOf(':');
  return index < 0 ? ['', ''] : [value.slice(0, index), value.slice(index + 1)];
}

// 이력·보기용 글자: "a:신한카드" → "유진 신한카드"
export function paymentText(value, names) {
  const [person, name] = splitPayment(value);
  return person ? `${names[person]} ${name}` : '';
}

export function findDetail(item, element) {
  const box = element.closest('[data-detail-id]');
  return box ? item.details.find((detail) => detail.id === box.dataset.detailId) : null;
}
