// 두 사람 돈 흐름 계산 (순수 함수, DOM 사용 안 함)
// 사람마다 수입·자기 지출·자기 저축·공동 몫·남는 돈, 그리고 공동 지출을 누가 냈는지 따져서 누가 누구에게 얼마 보낼지.
//
// 공동 몫: 공동 항목(지출·저축)을 나누는 비율 rule — half(반반) / income(수입 비율)
// 정산: 공동 지출 중 "누가 냈는지" 알 수 있는 것만 셈
//   예산 기준 — ① 결제 칸에서 고른 사람 (두 사람 다 골랐으면 반씩)
//   실제 기준 — ② 실제 사용에 사람마다 적은 금액
//   누가 낼지 안 정한 공동 지출과 공동 저축은 각자 자기 몫을 직접 낸다고 보고 정산에서 뺌

import { itemKind, personAmounts, planAmount, monthRecord, needsPayment } from './calc.js';

export const SPLIT_RULES = [['half', '반반'], ['income', '수입 비율']];

const PEOPLE = ['a', 'b'];

// → { income, ratio, people: { a: { income, ownSpending, ownSaving, jointShare, paidJoint, left }, b },
//     joint: { spending, saving, unassigned }, transfer, actualTransfer }
// transfer: 양수면 b가 a에게, 음수면 a가 b에게 보낼 돈 (예산 기준). actualTransfer는 실제 기준(적은 게 없으면 null)
export function moneyFlow(data, monthKey, rule) {
  const people = {};
  for (const person of PEOPLE) {
    people[person] = { income: 0, ownSpending: 0, ownSaving: 0, jointShare: 0, paidJoint: 0, left: 0 };
  }
  const joint = { spending: 0, saving: 0, unassigned: 0, income: 0 };
  const paidItems = []; // 누가 냈는지 아는 공동 지출 { amount, paid: { a, b } }

  for (const item of data.items) {
    const kind = itemKind(item);
    if (item.joint) {
      const amount = planAmount(item) || 0;
      if (kind === 'income') joint.income += amount;
      if (kind === 'saving') joint.saving += amount;
      if (kind === 'spending') {
        joint.spending += amount;
        const paid = jointPaid(item);
        if (paid) paidItems.push({ amount, paid });
        else joint.unassigned += amount;
      }
      continue;
    }
    const amounts = personAmounts(item);
    for (const person of PEOPLE) {
      const value = amounts[person] || 0;
      if (kind === 'income') people[person].income += value;
      if (kind === 'spending') people[person].ownSpending += value;
      if (kind === 'saving') people[person].ownSaving += value;
    }
  }
  // 공동 수입(드묾)은 반씩
  for (const person of PEOPLE) people[person].income += joint.income / 2;

  const totalIncome = people.a.income + people.b.income;
  const ratio = { a: 0.5, b: 0.5 };
  if (rule === 'income' && totalIncome > 0) {
    ratio.a = people.a.income / totalIncome;
    ratio.b = people.b.income / totalIncome;
  }

  let transfer = 0;
  for (const { amount, paid } of paidItems) {
    for (const person of PEOPLE) people[person].paidJoint += paid[person] * amount;
    // a가 자기 몫보다 많이 냈으면 그만큼 b가 a에게
    transfer += paid.a * amount - ratio.a * amount;
  }
  for (const person of PEOPLE) {
    const p = people[person];
    p.jointShare = (joint.spending + joint.saving) * ratio[person];
    p.left = p.income - p.ownSpending - p.ownSaving - p.jointShare;
  }

  return {
    income: totalIncome, ratio, people, joint, transfer,
    actualTransfer: actualTransfer(data, monthKey, ratio),
  };
}

// 예산 기준으로 공동 지출을 누가 내는지: ① 결제 칸 기준. 세부 항목이 있으면 세부 항목마다
// → { a: 0~1, b: 0~1 } (금액 중 각자 내는 비율) / 누가 낼지 모르는 부분이 있으면 null
function jointPaid(item) {
  if (!needsPayment(item, 'a')) return null; // 결제 칸이 없는 구분(특별비 등)
  const owners = item.details.length > 0 ? item.details : [item];
  const total = planAmount(item) || 0;
  if (total === 0) return null;
  const paid = { a: 0, b: 0 };
  for (const owner of owners) {
    const amount = owner.amount || 0;
    if (amount === 0) continue;
    if (owner.paymentA && owner.paymentB) {
      paid.a += amount / 2;
      paid.b += amount / 2;
    } else if (owner.paymentA) paid.a += amount;
    else if (owner.paymentB) paid.b += amount;
    else return null;
  }
  return { a: paid.a / total, b: paid.b / total };
}

// 실제 기준: 이번 달 ② 실제 사용에 공동 지출을 사람마다 적은 금액으로 정산
function actualTransfer(data, monthKey, ratio) {
  const record = monthRecord(data, monthKey);
  let transfer = 0;
  let found = false;
  for (const item of data.items) {
    if (!item.joint || itemKind(item) !== 'spending') continue;
    const split = record.actualBy[item.id];
    if (!split) continue;
    found = true;
    const a = split.a || 0;
    const b = split.b || 0;
    transfer += a - ratio.a * (a + b);
  }
  return found ? transfer : null;
}
