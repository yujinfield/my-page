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

// 이벤트 바로 아래 줄: 세부 항목 목록 [이름] [예상] [확정] [✕] + "＋ 세부 항목 추가"
// suggestions: 이 이벤트 분류의 추천 세부 항목 이름들 (큰돈 캘린더만, 있으면 "✨ 추천 세부 항목" 버튼)
// suggestOpen: 추천 목록(체크칸)을 펼쳤는지
export function detailRow(event, columnCount, suggestions = [], suggestOpen = false) {
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
  for (const text of ['세부 항목', '예상', '확정', '']) {
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
    item.append(
      textInput('detailName', detail.name, '세부 항목 이름', '예: 숙소'),
      amountInput('detailExpected', detail.expected, `${detail.name || '세부 항목'} 예상`, '예상'),
      amountInput('detailConfirmed', detail.confirmed, `${detail.name || '세부 항목'} 확정`, '확정'),
      remove,
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

export function findDetail(item, element) {
  const box = element.closest('[data-detail-id]');
  return box ? item.details.find((detail) => detail.id === box.dataset.detailId) : null;
}
