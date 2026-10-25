// ① 월 가계부의 결제 수단 고르는 칸 (사람마다 따로): 선택 안 함 / 그 사람 목록 / ＋ 새로 추가…
// 고른 뒤 처리(새로 추가 등)는 plan.js의 choosePayment에서 합니다.

export const ADD_PAYMENT = '__add__'; // "＋ 새로 추가…" 칸의 값
export const PAYMENT_FIELDS = { paymentA: 'a', paymentB: 'b' }; // 칸 이름 → 사람

// 한 사람의 결제 수단 고르는 칸: 선택 안 함 / 그 사람 목록 / ＋ 새로 추가…
export function paymentSelect(data, item, field) {
  const person = PAYMENT_FIELDS[field];
  const personName = data.names[person];
  const select = document.createElement('select');
  select.className = 'cell-input';
  select.dataset.field = field;
  select.setAttribute('aria-label', `${personName} 결제 수단`);

  const names = data.payments[person].slice();
  // 설정에서 목록에서 지웠어도 이 항목에 이미 고른 값은 보여 줌
  if (item[field] && !names.includes(item[field])) names.push(item[field]);
  // 누구 것인지는 열 머리줄("유진 결제")에 있으니 카드 이름만
  const options = [
    ['', '—'],
    ...names.map((name) => [name, name]),
    [ADD_PAYMENT, '＋ 새로 추가…'],
  ];
  for (const [value, text] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
  }
  select.value = item[field];
  return select;
}
