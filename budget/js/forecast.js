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
// goal: { current, target, rate }, saving: 매달 저축·투자, asset: 매달 자산으로 쌓이는 돈(저축·투자 + 남는 돈)
// nowKey: 시작하는 달 ("2026-10") → 목표 달성 달을 "2033.12"처럼 알려 줌
export function forecastLines(goal, saving, asset, nowKey) {
  const start = goal.current || 0;
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
