// ④ 큰돈 캘린더의 세부 항목 (예: 여행 → 숙소, 비행기, 경비)
// 줄·버튼을 만드는 함수만 모아 둠. 입력·클릭 처리는 events.js에서 합니다.

import { textInput, amountInput, deleteButton } from './cells.js';

// "세부 3 ▾" 버튼: 세부 항목 줄을 펼치고 접음
export function detailToggle(event, open) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'detail-toggle';
  button.dataset.action = 'toggle-details';
  button.textContent = `세부 ${event.details.length || '＋'} ${open ? '▴' : '▾'}`;
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', `세부 항목 ${event.details.length}개 ${open ? '접기' : '펼치기'}`);
  return button;
}

// 이벤트 바로 아래 줄: 세부 항목 목록 [이름] [예상] [확정] [✕] + "＋ 세부 항목 추가"
export function detailRow(event, columnCount) {
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

  td.append(list, add);
  tr.append(td);
  return tr;
}

export function findDetail(item, element) {
  const box = element.closest('[data-detail-id]');
  return box ? item.details.find((detail) => detail.id === box.dataset.detailId) : null;
}
