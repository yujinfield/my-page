// ① 월 가계부 항목의 세부 항목 줄 (예: 식비 → 장보기, 배달, 외식)
// 공동 항목: [이름] [금액] [유진 결제] [남편 결제] [✕] / 개인 항목: [이름] [유진] [남편] [유진 결제] [남편 결제] [✕]
// 줄을 만드는 함수만 모아 둠. 입력·클릭 처리는 plan.js에서 합니다.
// "세부 ▾" 버튼과 세부 항목 찾기는 큰돈 캘린더와 같은 것을 씀 (event-details.js)

import { textInput, amountInput, deleteButton } from './cells.js';
import { paymentSelect } from './payment-select.js';

// data: 전체 데이터 (이름·결제 수단 목록)
export function itemDetailRow(item, data, columnCount) {
  const { names } = data;
  const tr = document.createElement('tr');
  tr.dataset.id = item.id;
  tr.className = 'detail-row';
  const td = document.createElement('td');
  td.colSpan = columnCount;

  const list = document.createElement('ul');
  list.className = 'event-details item-details';
  const head = document.createElement('li');
  head.className = 'detail-item detail-head';
  head.setAttribute('aria-hidden', 'true');
  // 공동 항목은 금액 칸 하나라 칸 수가 하나 적음 (detail-joint)
  if (item.joint) list.classList.add('detail-joint');
  const pays = [`${names.a} 결제`, `${names.b} 결제`];
  const headTexts = item.joint ? ['세부 항목', '금액', ...pays, ''] : ['세부 항목', names.a, names.b, ...pays, ''];
  for (const text of headTexts) {
    const span = document.createElement('span');
    span.textContent = text;
    head.append(span);
  }
  list.append(head);

  for (const detail of item.details) {
    const row = document.createElement('li');
    row.className = 'detail-item';
    row.dataset.detailId = detail.id;
    const label = detail.name || '세부 항목';
    const remove = deleteButton('세부 항목 지우기');
    remove.dataset.action = 'detail-delete';
    // 칸마다 클래스(d-…): 휴대폰에서 줄을 나눠 배치할 때 씀 (table.css)
    const cell = (element, className) => {
      element.classList.add(className);
      return element;
    };
    row.append(cell(textInput('detailName', detail.name, '세부 항목 이름', '예: 장보기'), 'd-name'));
    if (item.joint) {
      row.append(cell(amountInput('detailAmount', detail.amount, `${label} 금액`, '금액'), 'd-amount'));
    } else {
      row.append(
        cell(amountInput('detailA', detail.a, `${label} ${names.a} 금액`, names.a), 'd-a'),
        cell(amountInput('detailB', detail.b, `${label} ${names.b} 금액`, names.b), 'd-b'),
      );
    }
    row.append(
      cell(paymentSelect(data, detail, 'paymentA', `${names.a} —`), 'd-pay-a'),
      cell(paymentSelect(data, detail, 'paymentB', `${names.b} —`), 'd-pay-b'),
      cell(remove, 'd-delete'),
    );
    list.append(row);
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
