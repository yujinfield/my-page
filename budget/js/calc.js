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

// 개인 항목의 두 사람 금액. 세부 항목이 있으면 세부 항목들의 합
export function personAmounts(item) {
  const details = item.details || [];
  if (details.length === 0) return { a: item.a, b: item.b };
  let a = 0;
  let b = 0;
  for (const detail of details) {
    a += detail.a || 0;
    b += detail.b || 0;
  }
  return { a, b };
}

// 항목의 월 예상액: 공동이면 직접 적은 금액, 아니면 두 사람 금액의 합 (세부 항목이 있으면 세부 항목 합)
export function planAmount(item) {
  const details = item.details || [];
  if (item.joint) {
    if (details.length === 0) return item.amount;
    return details.reduce((sum, detail) => sum + (detail.amount || 0), 0);
  }
  const { a, b } = personAmounts(item);
  if (a === null && b === null) return null;
  return (a || 0) + (b || 0);
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

/* ── 월 ── */

export function emptyMonth() {
  return { actual: {}, depositA: null, depositB: null, memo: '' };
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

/* ── 큰돈 캘린더 ── */

// 이벤트의 예상·확정 지출. 세부 항목이 있으면 세부 항목의 합, 없으면 이벤트에 직접 적은 금액
export function eventTotals(event) {
  if (event.details.length === 0) return { expected: event.expected, confirmed: event.confirmed };
  let expected = 0;
  let confirmed = 0;
  for (const detail of event.details) {
    expected += detail.expected || 0;
    confirmed += detail.confirmed || 0;
  }
  return { expected, confirmed };
}

// 자산에서 빼는 돈 나가는 곳: 비상금·저축, 성과급 (성과급은 월 가계부에 수입으로 적어서 이미 자산에 쌓여 있음)
// 특별비 적립금은 매달 지출로 이미 빠졌으니 다시 빼지 않음
const ASSET_SOURCES = ['savings', 'bonus'];

// 한 해 동안 쌓인 자산에서 나간 큰돈(확정 지출)을 달마다: { "2026-11": 1500 }
// 월이 "2026.11"처럼 날짜인 것만 셈 ("상시"는 언제 나갔는지 몰라서 뺌)
export function assetSpendByMonth(events, year) {
  const result = {};
  for (const event of events) {
    if (!ASSET_SOURCES.includes(event.source)) continue;
    const match = event.month.match(/^(\d{4})\D(\d{1,2})/);
    if (!match || Number(match[1]) !== year) continue;
    const confirmed = eventTotals(event).confirmed;
    if (!confirmed) continue;
    const key = `${match[1]}-${match[2].padStart(2, '0')}`;
    result[key] = (result[key] || 0) + confirmed;
  }
  return result;
}

/* ── 저금액 ── */

// 기준 달(asOf) 말의 저금액에서 시작해, 그 뒤 달마다 "자산으로 쌓인 돈 − 자산에서 나간 큰돈"을 더한 달 말 저금액
// keys: ["2026-01", …] → { "2026-10": 5000, "2026-11": 5370, … } (기준 달보다 앞선 달은 넣지 않음)
// 실제액을 안 적은 달은 0으로 셈 (아직 안 지난 달이라고 봄)
export function savingsTrack(data, savings, asOf, keys) {
  const result = {};
  if (savings === null || !asOf || keys.length === 0) return result;
  const last = keys.slice().sort()[keys.length - 1];
  const spendByYear = {};

  let balance = savings;
  for (let key = asOf; key <= last; key = shiftMonth(key, 1)) {
    if (key !== asOf) {
      const year = Number(key.slice(0, 4));
      if (!spendByYear[year]) spendByYear[year] = assetSpendByMonth(data.events, year);
      const total = summarize(data.items, monthRecord(data, key).actual);
      balance += (total.hasActual ? total.actual.asset : 0) - (spendByYear[year][key] || 0);
    }
    if (keys.includes(key)) result[key] = balance;
  }
  return result;
}

// 지금 저금액: ⚙️ 설정의 시작 저금액에 그 뒤 달마다 쌓인 돈을 더한 이번 달 말 저금액
// → { amount, key: "2026-11" } / 시작 저금액이 없으면 null
export function currentSavings(data, todayKey) {
  const { savings, savingsAsOf } = data.wealth;
  if (savings === null || !savingsAsOf) return null;
  const key = todayKey < savingsAsOf ? savingsAsOf : todayKey;
  return { amount: savingsTrack(data, savings, savingsAsOf, [key])[key], key };
}

// "2026-10"부터 "2027-01"까지 몇 달 (3). 뒤가 앞이면 음수
export function monthsBetween(fromKey, toKey) {
  const [fromYear, fromMonth] = fromKey.split('-').map(Number);
  const [toYear, toMonth] = toKey.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

// "2030.08", "2030-8" 같은 글 → "2030-08". 날짜가 아니면 null
export function monthKeyFromText(text) {
  const match = String(text || '').match(/^(\d{4})\D(\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, '0')}` : null;
}
