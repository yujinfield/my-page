// 금액 계산 (순수 함수, DOM 사용 안 함)
// 금액 단위는 모두 "만원"이고, 비어 있는 칸은 null 입니다.

export const GROUPS = ['수입', '고정지출', '개인지출', '가족', '생활비', '특별지출', '저축·투자'];

const INCOME = '수입';
const SAVING = '저축·투자';

// 항목 종류: 수입(income) / 저축·투자(saving) / 나머지 지출(spending)
export function itemKind(item) {
  if (item.group === INCOME) return 'income';
  if (item.group === SAVING) return 'saving';
  return 'spending';
}

// 입력칸 글자 → 숫자. "1,200" 처럼 쉼표가 있어도 됨. 비었거나 숫자가 아니면 null
export function parseAmount(text) {
  const cleaned = String(text).replace(/[,\s]/g, '');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

// 숫자 → "1,234" (소수는 한 자리까지). null이면 빈 글자
export function formatMoney(value) {
  if (value === null || value === undefined) return '';
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}

// 차이 → "+12" / "-5" / "0"
export function formatDiff(value) {
  if (value === null) return '';
  if (value > 0) return '+' + formatMoney(value);
  return formatMoney(value);
}

// 항목의 월 예상액: 공동이면 직접 적은 금액, 아니면 두 사람 금액의 합
export function planAmount(item) {
  if (item.joint) return item.amount;
  if (item.a === null && item.b === null) return null;
  return (item.a || 0) + (item.b || 0);
}

// 차이 = 실제 - 예상. 실제를 안 적었으면 null
export function diffOf(plan, actual) {
  if (actual === null || actual === undefined) return null;
  return actual - (plan || 0);
}

// 차이가 좋은 쪽인지: 지출은 적을수록, 수입·저축은 많을수록 좋음
export function isGoodDiff(kind, diff) {
  return kind === 'spending' ? diff <= 0 : diff >= 0;
}

// 구분 순서대로 정렬 (같은 구분 안에서는 적은 순서 유지)
export function sortByGroup(items) {
  return items.slice().sort((x, y) => GROUPS.indexOf(x.group) - GROUPS.indexOf(y.group));
}

// 한 달 합계: 수입 / 지출 / 저축·투자 / 남는 돈 / 자산으로 쌓이는 돈
// actualMap: { 항목id: 실제액 }
export function summarize(items, actualMap) {
  const plan = { income: 0, spending: 0, saving: 0 };
  const actual = { income: 0, spending: 0, saving: 0 };
  let missing = 0;

  for (const item of items) {
    const kind = itemKind(item);
    plan[kind] += planAmount(item) || 0;
    const value = actualMap[item.id];
    if (value === undefined || value === null) {
      missing += 1;
    } else {
      actual[kind] += value;
    }
  }

  return {
    plan: withLeft(plan),
    actual: withLeft(actual),
    missing,
    hasActual: missing < items.length,
  };
}

// 남는 돈 = 수입 - 지출 - 저축·투자, 자산 = 저축·투자 + 남는 돈
function withLeft(total) {
  const left = total.income - total.spending - total.saving;
  return { ...total, left, asset: total.saving + left };
}

/* ── 공동통장 ── */

// 공동 예산: "공동"에 체크한 지출·저축 항목의 예상액 합
export function jointBudget(items) {
  let total = 0;
  for (const item of items) {
    if (item.joint && itemKind(item) !== 'income') total += planAmount(item) || 0;
  }
  return total;
}

// 실제 공동지출: "공동" 항목의 실제액 합
export function jointActual(items, actualMap) {
  let total = 0;
  for (const item of items) {
    if (item.joint && itemKind(item) !== 'income') total += actualMap[item.id] || 0;
  }
  return total;
}

// 소득 비율 (수입 항목의 두 사람 금액 기준). 수입이 없으면 null
export function incomeShare(items) {
  let a = 0;
  let b = 0;
  for (const item of items) {
    if (itemKind(item) === 'income' && !item.joint) {
      a += item.a || 0;
      b += item.b || 0;
    }
  }
  if (a + b <= 0) return null;
  return { a: a / (a + b), b: b / (a + b) };
}

// 월별 공동통장 장부. 잔액 = 총 입금 - 실제 공동지출, 이월 = 지금까지 잔액의 누적
export function jointLedger(data, monthKeys) {
  const budget = jointBudget(data.items);
  let carry = 0;
  return monthKeys.map((key) => {
    const record = monthRecord(data, key);
    const total = (record.depositA || 0) + (record.depositB || 0);
    const spent = jointActual(data.items, record.actual);
    const balance = total - spent;
    carry += balance;
    return { key, budget, depositA: record.depositA, depositB: record.depositB, total, spent, balance, carry };
  });
}

// 공동통장 표에 보여 줄 달: 입금이나 공동 실제액을 적은 달 + 지금 보고 있는 달
export function jointMonthKeys(data, selectedKey) {
  const keys = Object.keys(data.months).filter((key) => {
    const record = data.months[key];
    if (record.depositA !== null || record.depositB !== null) return true;
    return jointActual(data.items, record.actual) !== 0;
  });
  if (!keys.includes(selectedKey)) keys.push(selectedKey);
  return keys.sort();
}

/* ── 월 ── */

export function emptyMonth() {
  return { actual: {}, depositA: null, depositB: null };
}

// 읽기만 할 때: 없는 달이면 빈 기록 (저장하지 않음)
export function monthRecord(data, key) {
  return data.months[key] || emptyMonth();
}

// 쓸 때: 없는 달이면 만들어서 돌려줌
export function ensureMonth(data, key) {
  if (!data.months[key]) data.months[key] = emptyMonth();
  return data.months[key];
}

// Date → "2026-11"
export function monthKeyOf(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

// "2026-11" → "2026.11"
export function formatMonth(key) {
  return key.replace('-', '.');
}

// "2026-11" 에서 delta 달만큼 이동 (-1이면 지난달)
export function shiftMonth(key, delta) {
  const [year, month] = key.split('-').map(Number);
  return monthKeyOf(new Date(year, month - 1 + delta, 1));
}

/* ── 그래프·연간 요약 ── */

// 구분별 합계: { 고정지출: { plan, actual, hasActual }, ... }
export function groupTotals(items, actualMap) {
  const totals = {};
  for (const group of GROUPS) totals[group] = { plan: 0, actual: 0, hasActual: false };
  for (const item of items) {
    const total = totals[item.group];
    total.plan += planAmount(item) || 0;
    const value = actualMap[item.id];
    if (value !== undefined && value !== null) {
      total.actual += value;
      total.hasActual = true;
    }
  }
  return totals;
}

// 한 해 12달의 합계. year: 2026 → [{ key: "2026-01", plan, actual, missing, hasActual }, ...]
export function yearRows(data, year) {
  const rows = [];
  for (let month = 1; month <= 12; month += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    rows.push({ key, ...summarize(data.items, monthRecord(data, key).actual) });
  }
  return rows;
}

// 실적 평균: untilKey까지 실제액을 "모두" 적은 달 중 최근 12달의 평균. 그런 달이 없으면 null
// (일부만 적은 달을 섞으면 평균이 틀어지므로 뺌)
export function actualAverage(data, untilKey) {
  const totals = Object.keys(data.months)
    .filter((key) => key <= untilKey)
    .sort()
    .map((key) => summarize(data.items, data.months[key].actual))
    .filter((total) => total.missing === 0 && data.items.length > 0)
    .slice(-12);
  if (totals.length === 0) return null;

  let saving = 0;
  let asset = 0;
  for (const total of totals) {
    saving += total.actual.saving;
    asset += total.actual.asset;
  }
  return { months: totals.length, saving: saving / totals.length, asset: asset / totals.length };
}
