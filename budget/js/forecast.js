// "이대로 가면 N년 뒤 M억" 계산 (순수 함수, DOM 사용 안 함)
// 금액 단위는 만원. 매달 말에 monthly 만큼 넣고, 연 수익률 rate(%)를 달마다 나눠 붙인다고 가정합니다.

import { formatMonth, shiftMonth } from './calc.js';

const MAX_MONTHS = 100 * 12;

function monthlyRate(rate) {
  return Math.pow(1 + (rate || 0) / 100, 1 / 12) - 1;
}

// months 달 뒤 모인 돈
export function valueAfter(start, monthly, rate, months) {
  const r = monthlyRate(rate);
  let balance = start || 0;
  for (let i = 0; i < months; i += 1) balance = balance * (1 + r) + monthly;
  return balance;
}

// 목표까지 걸리는 달 수. 100년 안에 못 모으면 null
export function monthsToGoal(start, monthly, rate, goal) {
  const r = monthlyRate(rate);
  let balance = start || 0;
  if (balance >= goal) return 0;
  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    balance = balance * (1 + r) + monthly;
    if (balance >= goal) return month;
  }
  return null;
}

// 52300 → "5억 2,300만원", 3000 → "3,000만원", 50000 → "5억원"
export function formatEok(manwon) {
  const sign = manwon < 0 ? '-' : '';
  const total = Math.round(Math.abs(manwon));
  const eok = Math.floor(total / 10000);
  const rest = total % 10000;
  if (eok === 0) return `${sign}${rest.toLocaleString('ko-KR')}만원`;
  if (rest === 0) return `${sign}${eok}억원`;
  return `${sign}${eok}억 ${rest.toLocaleString('ko-KR')}만원`;
}

// 86 → "7년 2개월", 8 → "8개월", 36 → "3년"
export function formatPeriod(months) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}개월`;
  if (rest === 0) return `${years}년`;
  return `${years}년 ${rest}개월`;
}

// 코멘트 글 만들기
// goal: { target, rate }, start: 지금 저금액, saving: 매달 저축·투자, asset: 매달 자산으로 쌓이는 돈(저축·투자 + 남는 돈)
// nowKey: 시작하는 달 ("2026-10") → 목표 달성 달을 "2033.12"처럼 알려 줌
export function forecastLines(goal, startAmount, saving, asset, nowKey) {
  const start = startAmount || 0;
  const target = formatEok(goal.target);

  if (start >= goal.target) return [`이미 목표 ${target}을 넘었어요! 🎉 목표를 더 크게 잡아 보세요.`];
  if (!(saving > 0)) {
    return ['저축·투자 금액을 적으면 "이대로 가면 몇 년 뒤 얼마"를 알려 드려요.'];
  }

  const lines = [];
  const months = monthsToGoal(start, saving, goal.rate, goal.target);
  const savingText = `매달 저축·투자 ${formatEok(saving)}씩`;
  if (months === null) {
    lines.push(`${savingText} 모으면 100년 안에 ${target}을 모으기 어려워요. 저축·투자를 늘려 보세요.`);
  } else {
    lines.push(`${savingText} 이대로 가면 ${formatPeriod(months)} 뒤(${formatMonth(shiftMonth(nowKey, months))}) ${target}을 모을 수 있어요.`);
  }
  lines.push(`10년 뒤에는 약 ${formatEok(valueAfter(start, saving, goal.rate, 120))}이 돼요.`);

  // 남는 돈까지 모으면 얼마나 앞당겨지는지
  if (asset > saving) {
    const fasterMonths = monthsToGoal(start, asset, goal.rate, goal.target);
    if (fasterMonths !== null && (months === null || fasterMonths < months)) {
      const sooner = months === null ? '' : `, ${formatPeriod(months - fasterMonths)} 앞당겨져요`;
      lines.push(`남는 돈까지 모두 모으면(매달 ${formatEok(asset)}) ${formatPeriod(fasterMonths)} 걸려요${sooner}.`);
    }
  }
  return lines;
}

/* ── 부채 ── */

// 남은 금액 balance를 연 금리 rate(%)로, 매달 payment씩(원금+이자) 갚을 때
// → { months: 다 갚기까지 달 수, interest: 그동안 내는 이자 합 } / 이자도 못 갚으면 null
export function debtPayoff(balance, rate, payment) {
  const r = (rate || 0) / 100 / 12;
  let left = balance;
  let interest = 0;
  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    const monthInterest = left * r;
    if (payment <= monthInterest) return null;
    interest += monthInterest;
    left = left + monthInterest - payment;
    if (left <= 0) return { months: month, interest };
  }
  return null;
}

// 부채 코멘트: 언제 다 갚는지, 더 갚으면 얼마나 빨라지는지, 무엇부터 갚을지
// debts: [{ name, balance, rate, payment }], savings: 저금액, investRate: 투자 기대 수익률(%)
export function debtLines(debts, savings, investRate, nowKey) {
  const active = debts.filter((debt) => debt.balance > 0);
  if (active.length === 0) return ['부채가 없어요. 👏 지금처럼만 모으면 돼요.'];

  const lines = [];
  for (const debt of active) {
    const name = debt.name || '이름 없는 부채';
    if (!debt.payment) {
      lines.push(`${name}: 매달 갚는 돈(원금+이자)을 적으면 언제 다 갚는지 알려 드려요.`);
      continue;
    }
    const now = debtPayoff(debt.balance, debt.rate, debt.payment);
    if (!now) {
      const monthInterest = Math.ceil((debt.balance * (debt.rate || 0)) / 100 / 12);
      lines.push(`${name}: 매달 ${formatEok(debt.payment)}로는 이자(약 ${formatEok(monthInterest)})만 겨우 내고 원금이 줄지 않아요. `
        + `${formatEok(monthInterest)}보다 더 갚아야 빚이 줄기 시작해요.`);
      continue;
    }
    lines.push(`${name}: 매달 ${formatEok(debt.payment)}씩 갚으면 ${formatPeriod(now.months)} 뒤(${formatMonth(shiftMonth(nowKey, now.months))}) `
      + `다 갚아요. 앞으로 낼 이자는 약 ${formatEok(now.interest)}이에요.`);

    // 매달 조금 더 갚으면 (갚는 돈의 20%쯤, 10만원 단위, 최소 10만원)
    const extra = Math.max(10, Math.round((debt.payment * 0.2) / 10) * 10);
    const faster = debtPayoff(debt.balance, debt.rate, debt.payment + extra);
    if (faster && faster.months < now.months) {
      lines.push(`→ 매달 ${formatEok(extra)}만 더 갚으면 ${formatPeriod(now.months - faster.months)} 빨리 끝나고, `
        + `이자를 약 ${formatEok(now.interest - faster.interest)} 아껴요.`);
    }
  }

  // 금리가 가장 높은 빚부터
  const withRate = active.filter((debt) => debt.rate > 0).sort((x, y) => y.rate - x.rate);
  if (withRate.length > 0) {
    const top = withRate[0];
    const topName = top.name || '이름 없는 부채';
    if (withRate.length > 1) lines.push(`금리가 가장 높은 ${topName}(${top.rate}%)부터 갚으면 이자가 가장 많이 줄어요.`);
    if (top.rate > (investRate || 0)) {
      lines.push(`${topName} 금리(${top.rate}%)가 투자 기대 수익률(${investRate || 0}%)보다 높아요. `
        + `남는 돈은 투자보다 ${topName}부터 먼저 갚는 게 이득이에요.`);
    }
  }

  const total = active.reduce((sum, debt) => sum + debt.balance, 0);
  const net = (savings || 0) - total;
  lines.push(`부채는 모두 ${formatEok(total)}, 저금액에서 빼면 순자산은 ${formatEok(net)}이에요. 조금씩 더 갚을수록 이자가 줄어요 💪`);
  return lines;
}
