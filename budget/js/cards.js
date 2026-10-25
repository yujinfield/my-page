// 카드 실적 계산 (순수 함수, DOM 사용 안 함)
// ① 월 가계부에서 고른 결제 수단으로, 사람마다 카드별로 얼마를 쓸 계획인지·실제로 썼는지 모읍니다.

import { needsPayment, monthRecord } from './calc.js';

const PAYMENT_FIELD = { a: 'paymentA', b: 'paymentB' };

// → { a: { 신한카드: { plan, actual } }, b: { … } }
// plan: 예산(모든 달 같음), actual: monthKey 달에 그 사람이 ② 실제 사용에 적은 금액
export function cardUsage(data, monthKey) {
  const usage = { a: {}, b: {} };
  const add = (person, card, key, amount) => {
    if (!card || !amount) return;
    if (!usage[person][card]) usage[person][card] = { plan: 0, actual: 0 };
    usage[person][card][key] += amount;
  };
  const record = monthRecord(data, monthKey);

  for (const item of data.items) {
    // 세부 항목이 있으면 세부 항목마다 결제 수단이 따로 있음
    const owners = item.details.length > 0 ? item.details : [item];
    for (const person of ['a', 'b']) {
      const field = PAYMENT_FIELD[person];
      const used = owners.filter((owner) => needsPayment(item, person, owner === item ? undefined : owner));
      for (const owner of used) add(person, owner[field], 'plan', planShare(item, owner, person));

      // 실제액은 항목 단위로만 적으니, 쓰는 칸이 모두 같은 카드일 때만 그 카드로 셈
      const split = record.actualBy[item.id];
      const cards = new Set(used.map((owner) => owner[field]));
      if (split && cards.size === 1 && !cards.has('')) add(person, [...cards][0], 'actual', split[person]);
    }
  }
  return usage;
}

// 이 사람이 내는 몫: 개인 항목은 그 사람 금액,
// 공동 항목은 두 사람 모두 결제 수단을 골랐으면 반씩, 한 사람만 골랐으면 그 사람이 전부
function planShare(item, owner, person) {
  if (!item.joint) return owner[person];
  const otherField = person === 'a' ? 'paymentB' : 'paymentA';
  return owner[otherField] ? (owner.amount || 0) / 2 : owner.amount;
}
