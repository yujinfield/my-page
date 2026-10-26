// 데이터 계층: localStorage 읽기/쓰기는 이 파일에서만 합니다.
// 키는 모두 "budget-"로 시작해서 다른 앱과 섞이지 않게 합니다.
// 금액 단위는 모두 "만원"입니다.

import { GROUPS, emptyMonth, monthKeyOf } from './calc.js';

const DATA_KEY = 'budget-data';
const THEME_KEY = 'budget-theme';
const SYNC_KEY = 'budget-sync'; // ☁️ 동기화 설정 (이 기기에만, 백업·Gist에는 안 들어감)

// 데이터 형식을 바꾸면 이 숫자를 올리고 loadData()에 옮기는 코드를 추가합니다.
// 1 → 2: 목표(goal), 변경 이력(history), 마지막 백업 시각(lastBackupAt) 추가
// 2 → 3: 사람별 결제 수단 목록(payments.a·b), 항목의 사람별 결제 수단(item.paymentA·B), 큰돈 완료 표시(event.done),
//        카드별 목표 실적(cardGoals.a·b) 추가
// 3 → 4: 큰돈 이벤트의 세부 항목(event.details) 추가
// 4 → 5: 큰돈 이벤트의 누구 것인지(event.owner), 돈 나가는 곳(event.source) 추가. 글로 적던 "마련 방법"(method)은 source로 바꿈
// 5 → 6: 저금액·부채(wealth), 메모(memos) 추가. 목표의 "현재 자산"(goal.current)은 저금액(wealth.savings)으로 옮김
// 6 → 7: 달마다 메모(months[달].memo) 추가 (① 월 가계부 표 위)
// 7 → 8: 월 가계부 항목의 세부 항목(item.details) 추가
// 8 → 9: 구분 "특별지출" → "특별비", 세부 항목의 결제 수단(detail.paymentA·B), 큰돈 분류(event.category·eventCategories),
//        용돈 기록(allowance, 사람마다 비밀번호로 암호화)
// 9 → 10: 실제액을 사람마다 나눠 적기(months[달].actualBy). 예전에 합계로 적은 실제액(actual)은 그대로 둠
// 10 → 11: 공동 몫 나누는 방법(splitRule: half 반반 / income 수입 비율) 추가
// 11 → 12: 큰돈 분류마다 추천 세부 항목 목록(categoryDetails) 추가
// 12 → 13: ② 가계부 작성에서 세부 항목마다 실제액(months[달].detailActual) 추가
// 13 → 14: 큰돈 세부 항목의 결제 수단(detail.payment: "a:신한카드"처럼 사람:이름)
const DATA_VERSION = 14;

// 큰돈이 어디서 나가는지 (연간 요약에서 비상금·저축·성과급으로 낸 것은 자산에서 뺌, calc.js의 assetSpendByMonth)
export const EVENT_SOURCES = [
  ['special', '특별비 적립금'],
  ['savings', '비상금·저축'],
  ['bonus', '성과급'],
];
// 큰돈이 누구 것인지: 공통 / 첫 번째 사람(a) / 두 번째 사람(b)
const EVENT_OWNERS = ['joint', 'a', 'b'];

// 결제 수단 기본 목록 (두 사람 모두 이걸로 시작, 설정에서 사람마다 바꿀 수 있음)
const DEFAULT_PAYMENTS = ['신한카드', '삼성카드', '현금', '계좌이체'];

// 큰돈 분류 기본 목록 (＋ 새로 추가하면 data.eventCategories 끝에 붙음)
const DEFAULT_EVENT_CATEGORIES = ['결혼', '여행', '미용', '사치', '가전·가구', '차·보험·세금', '경조사', '기타'];

// 큰돈 분류마다 추천 세부 항목 (③에서 "✨ 추천 세부 항목"으로 골라 넣음, ⚙️ 설정에서 고침)
const DEFAULT_CATEGORY_DETAILS = {
  결혼: ['예식장 대관·식대', '스드메', '예물·예단', '한복·예복', '청첩장·답례품', '본식 스냅·영상', '웨딩 소품·부케',
    '축가·사회 사례비', '축의금 들어온 돈'],
  여행: ['항공권', '숙소', '현지 교통', '식비', '관광·액티비티', '쇼핑·기념품', '여행자 보험', '환전·로밍·유심'],
  미용: ['헤어', '피부과·시술', '네일', '화장품', '다이어트·운동', '치아 교정·미백'],
  사치: ['명품 가방·지갑', '시계·주얼리', '전자기기', '오마카세·파인다이닝', '취미 장비'],
  '가전·가구': ['큰 가전', '작은 가전', '침대·매트리스', '소파·식탁', '수납장·옷장', '커튼·조명·러그', '설치·배송비'],
  '차·보험·세금': ['자동차 보험', '자동차세', '정비·소모품', '검사비', '재산세', '종합소득세·연말정산', '보험 연납'],
  경조사: ['결혼식 축의금', '장례 조의금', '돌잔치·생일', '명절', '어버이날·부모님 생신', '기념일 선물'],
  기타: ['이사', '병원비', '교육·자격증', '반려동물'],
};

// 이력은 최근 것만 남김 (너무 커지지 않게)
export const HISTORY_LIMIT = 300;

function readJson(key) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}

// 저장되면 true. 저장 공간이 없거나 비공개 모드면 false (화면은 그대로 동작)
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

let idCount = 0;

// 겹치지 않는 id. 예: "i_lq3x2k1"
export function newId(prefix) {
  idCount += 1;
  return `${prefix}_${Date.now().toString(36)}${idCount}`;
}

// 월 가계부 항목의 세부 항목: 공동 항목이면 amount, 개인 항목이면 a·b (예: 식비 → 장보기, 배달)
export function newItemDetail(name, amount, a, b, paymentA, paymentB) {
  return {
    id: newId('d'), name, amount: amount ?? null, a: a ?? null, b: b ?? null, paymentA: paymentA || '', paymentB: paymentB || '',
  };
}

export function newItem(group, name, joint, note) {
  return { id: newId('i'), group, name, a: null, b: null, joint, amount: null, paymentA: '', paymentB: '', note: note || '', details: [] };
}

export function newEvent(month, name, source, category) {
  return {
    id: newId('e'), month, name, owner: 'joint', category: category || '', expected: null, confirmed: null, source: source || '',
    note: '', done: false, details: [],
  };
}

// 큰돈 이벤트의 세부 항목 (예: 여행 → 숙소, 비행기, 경비)
// payment: 누구의 어떤 결제 수단으로 낼지 "a:신한카드" (안 골랐으면 빈 글)
export function newDetail(name, expected, confirmed) {
  return { id: newId('d'), name, expected: expected ?? null, confirmed: confirmed ?? null, payment: '' };
}

// 처음 열었을 때 보여 줄 기본 표 (금액은 비워 둠)
function defaultData() {
  return {
    version: DATA_VERSION,
    names: { a: '유진', b: '남편' },
    payments: { a: DEFAULT_PAYMENTS.slice(), b: DEFAULT_PAYMENTS.slice() },
    cardGoals: { a: {}, b: {} },
    splitRule: 'half',
    items: [
      newItem('수입', '월급', false, '실수령 기준'),
      newItem('고정지출', '주담대 이자', true),
      newItem('고정지출', '신용대출/보험/통신', true),
      newItem('개인지출', '용돈', false, '각자 완전 자율'),
      newItem('가족', '부모님', true),
      newItem('생활비', '식비·배달·장보기', true),
      newItem('생활비', '교통·차량', true),
      newItem('생활비', '관리비·공과금', true),
      newItem('특별비', '여행·경조사·가전', true, '따로 적립 추천'),
      newItem('저축·투자', '비상금', true),
      newItem('저축·투자', 'ISA·연금·ETF 등', true),
    ],
    months: {},
    goal: defaultGoal(),
    wealth: { savings: null, savingsAsOf: null, debts: [] },
    memos: [],
    history: [],
    lastBackupAt: null,
    events: [
      newEvent('2026.11', '결혼 준비', 'savings', '결혼'),
      newEvent('2027.01', '본식·신혼여행', 'bonus', '여행'),
      newEvent('2027.02', '자동차 보험·세금', 'special', '차·보험·세금'),
      newEvent('상시', '가전 교체·집 수리', 'special', '가전·가구'),
    ],
    eventCategories: DEFAULT_EVENT_CATEGORIES.slice(),
    categoryDetails: defaultCategoryDetails(),
    allowance: { a: null, b: null },
  };
}

// 목표: 현재 자산, 목표 금액(만원), 연 수익률(%)
// 목표: 목표 금액(만원), 연 수익률(%). 시작 금액은 저금액(wealth.savings)
function defaultGoal() {
  return { target: 50000, rate: 4 };
}

// 부채 하나: 이름, 남은 금액(만원)과 그 금액을 적은 달, 연 금리(%), 매달 갚는 돈(만원, 원금+이자),
// 상환 기한("2030.08"), 중도 상환(yes 가능 / fee 수수료 있음 / no 불가), 중도상환수수료(%)
export const PREPAY_OPTIONS = [['', '—'], ['yes', '가능 (수수료 없음)'], ['fee', '가능 (수수료 있음)'], ['no', '불가']];

export function newDebt(name) {
  return {
    id: newId('b'), name: name || '', balance: null, balanceAsOf: null, rate: null, payment: null,
    dueMonth: '', prepay: '', prepayFee: null,
  };
}

/* ── 저장된 값 다듬기 (빠지거나 잘못된 값은 기본값으로) ── */

function toAmount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toText(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeItemDetail(saved) {
  return {
    id: toText(saved.id) || newId('d'),
    name: toText(saved.name),
    amount: toAmount(saved.amount),
    a: toAmount(saved.a),
    b: toAmount(saved.b),
    paymentA: toText(saved.paymentA),
    paymentB: toText(saved.paymentB),
  };
}

function normalizeItem(saved) {
  return {
    id: toText(saved.id) || newId('i'),
    // 버전 8까지의 "특별지출"은 "특별비"로
    group: saved.group === '특별지출' ? '특별비' : GROUPS.includes(saved.group) ? saved.group : '생활비',
    name: toText(saved.name),
    a: toAmount(saved.a),
    b: toAmount(saved.b),
    joint: saved.joint === true,
    amount: toAmount(saved.amount),
    paymentA: toText(saved.paymentA),
    paymentB: toText(saved.paymentB),
    note: toText(saved.note),
    details: Array.isArray(saved.details) ? saved.details.filter(isObject).map(normalizeItemDetail) : [],
  };
}

// depositA·depositB는 예전 "공동통장" 화면의 입금 기록. 화면은 없어졌지만 기록이 사라지지 않게 그대로 둠
// { [id]: { a, b } } 다듬기: 둘 다 빈칸이면 뺌
function readSplits(saved) {
  const result = {};
  if (!saved || typeof saved !== 'object') return result;
  for (const id of Object.keys(saved)) {
    const split = saved[id] || {};
    const a = toAmount(split.a);
    const b = toAmount(split.b);
    if (a !== null || b !== null) result[id] = { a, b };
  }
  return result;
}

function normalizeMonth(saved) {
  const month = emptyMonth();
  if (!saved || typeof saved !== 'object') return month;
  if (saved.actual && typeof saved.actual === 'object') {
    for (const id of Object.keys(saved.actual)) {
      const value = toAmount(saved.actual[id]);
      if (value !== null) month.actual[id] = value;
    }
  }
  month.actualBy = readSplits(saved.actualBy);
  month.detailActual = readSplits(saved.detailActual);
  month.depositA = toAmount(saved.depositA);
  month.depositB = toAmount(saved.depositB);
  month.memo = toText(saved.memo);
  return month;
}

// 버전 4까지 글로 적던 "마련 방법"을 돈 나가는 곳으로 바꿈. 알아볼 수 없는 글은 null
function sourceFromMethod(method) {
  if (method.includes('성과급')) return 'bonus';
  if (method.includes('적립') || method.includes('특별비')) return 'special';
  if (method.includes('비상금') || method.includes('저축')) return 'savings';
  return null;
}

function normalizeEvent(saved) {
  let source = EVENT_SOURCES.some(([value]) => value === saved.source) ? saved.source : '';
  let note = toText(saved.note);
  const method = toText(saved.method).trim();
  if (saved.source === undefined && method) {
    // 바꿀 수 없는 글(예: "기존 예산")은 비고 앞에 붙여서 사라지지 않게
    source = sourceFromMethod(method) || '';
    if (!source) note = note ? `${method} · ${note}` : method;
  }
  return {
    id: toText(saved.id) || newId('e'),
    month: toText(saved.month),
    name: toText(saved.name),
    owner: EVENT_OWNERS.includes(saved.owner) ? saved.owner : 'joint',
    category: toText(saved.category),
    expected: toAmount(saved.expected),
    confirmed: toAmount(saved.confirmed),
    source,
    note,
    done: saved.done === true,
    details: Array.isArray(saved.details) ? saved.details.filter(isObject).map(normalizeDetail) : [],
  };
}

function normalizeDetail(saved) {
  return {
    id: toText(saved.id) || newId('d'),
    name: toText(saved.name),
    expected: toAmount(saved.expected),
    confirmed: toAmount(saved.confirmed),
    payment: /^[ab]:./.test(saved.payment) ? saved.payment : '',
  };
}

// 저금액·부채. 버전 5까지는 저금액 대신 목표의 "현재 자산"(goal.current)에 적었으므로 그 값을 가져옴
function normalizeWealth(saved, oldGoal) {
  const wealth = { savings: null, savingsAsOf: null, debts: [] };
  if (isObject(saved)) {
    wealth.savings = toAmount(saved.savings);
    wealth.savingsAsOf = /^\d{4}-\d{2}$/.test(saved.savingsAsOf) ? saved.savingsAsOf : null;
    if (Array.isArray(saved.debts)) wealth.debts = saved.debts.filter(isObject).map(normalizeDebt);
  } else if (isObject(oldGoal) && toAmount(oldGoal.current) !== null) {
    wealth.savings = oldGoal.current;
  }
  // 저금액은 있는데 기준 달이 없으면 이번 달 기준으로
  if (wealth.savings !== null && !wealth.savingsAsOf) wealth.savingsAsOf = monthKeyOf(new Date());
  return wealth;
}

// 메모(📝): 포스트잇 한 장 = 글과 쓴 시각(ms)
export function newMemo(text) {
  return { id: newId('m'), text, time: Date.now() };
}

function normalizeMemos(saved) {
  if (!Array.isArray(saved)) return [];
  return saved
    .filter((memo) => isObject(memo) && typeof memo.text === 'string' && typeof memo.time === 'number')
    .map((memo) => ({ id: toText(memo.id) || newId('m'), text: memo.text, time: memo.time }));
}

function normalizeDebt(saved) {
  return {
    id: toText(saved.id) || newId('b'),
    name: toText(saved.name),
    balance: toAmount(saved.balance),
    // 남은 금액을 적은 달. 없으면 이번 달 (그 뒤 매달 갚는 돈만큼 줄어든 걸로 계산)
    balanceAsOf: /^\d{4}-\d{2}$/.test(saved.balanceAsOf) ? saved.balanceAsOf : monthKeyOf(new Date()),
    rate: toAmount(saved.rate),
    payment: toAmount(saved.payment),
    dueMonth: toText(saved.dueMonth),
    prepay: PREPAY_OPTIONS.some(([value]) => value === saved.prepay) ? saved.prepay : '',
    prepayFee: toAmount(saved.prepayFee),
  };
}

function normalizeGoal(saved) {
  const goal = defaultGoal();
  if (!isObject(saved)) return goal;
  if (toAmount(saved.target) !== null) goal.target = saved.target;
  if (toAmount(saved.rate) !== null) goal.rate = saved.rate;
  return goal;
}

function normalizeHistory(saved) {
  if (!Array.isArray(saved)) return [];
  return saved
    .filter((entry) => isObject(entry) && typeof entry.time === 'number' && typeof entry.text === 'string')
    .slice(-HISTORY_LIMIT)
    .map((entry) => ({ time: entry.time, text: entry.text }));
}

export function loadData() {
  const saved = readJson(DATA_KEY);
  if (!isObject(saved)) return defaultData();
  return normalizeData(saved);
}

// 결제 수단 이름 목록 하나 다듬기: 빈 이름·중복은 빼고, 목록이 없으면 기본 목록
function normalizePaymentList(saved) {
  if (!Array.isArray(saved)) return DEFAULT_PAYMENTS.slice();
  const list = [];
  for (const name of saved) {
    const text = toText(name).trim();
    if (text && !list.includes(text)) list.push(text);
  }
  return list;
}

// 사람별 결제 수단 목록 { a: [...], b: [...] } (예전 데이터에 없으면 둘 다 기본 목록)
function defaultCategoryDetails() {
  const result = {};
  for (const [category, names] of Object.entries(DEFAULT_CATEGORY_DETAILS)) result[category] = names.slice();
  return result;
}

// 분류마다 추천 세부 항목. 버전 11까지는 없어서 기본 목록
function normalizeCategoryDetails(saved) {
  if (!isObject(saved) || Array.isArray(saved)) return defaultCategoryDetails();
  const result = {};
  for (const category of Object.keys(saved)) {
    result[category] = normalizeCategories(Array.isArray(saved[category]) ? saved[category] : []);
  }
  return result;
}

// 큰돈 분류 목록. 버전 8까지는 없어서 기본 목록
function normalizeCategories(saved) {
  if (!Array.isArray(saved)) return DEFAULT_EVENT_CATEGORIES.slice();
  const list = [];
  for (const name of saved) {
    const text = toText(name).trim();
    if (text && !list.includes(text)) list.push(text);
  }
  return list;
}

// 용돈 기록: 사람마다 비밀번호로 잠근 글 { salt, iv, data } (모두 base64 글자). 없으면 null
// 여기서는 모양만 확인하고, 잠그기·풀기는 allowance-lock.js에서 함
function normalizeAllowance(saved) {
  const result = { a: null, b: null };
  if (!isObject(saved)) return result;
  for (const person of ['a', 'b']) {
    const box = saved[person];
    if (isObject(box) && ['salt', 'iv', 'data'].every((key) => typeof box[key] === 'string')) {
      result[person] = { salt: box.salt, iv: box.iv, data: box.data };
    }
  }
  return result;
}

function normalizePayments(saved) {
  const payments = isObject(saved) ? saved : {};
  return { a: normalizePaymentList(payments.a), b: normalizePaymentList(payments.b) };
}

// 카드별 목표 실적 { a: { 신한카드: 30 }, b: {...} } (숫자가 아닌 값은 버림)
// 예전 "카드 실적" 화면의 기록. 화면은 없어졌지만 기록이 사라지지 않게 그대로 둠
function normalizeCardGoals(saved) {
  const goals = { a: {}, b: {} };
  if (!isObject(saved)) return goals;
  for (const person of ['a', 'b']) {
    const list = isObject(saved[person]) ? saved[person] : {};
    for (const card of Object.keys(list)) {
      // null: 실적을 체크했지만 금액은 아직 안 적음
      const value = toAmount(list[card]);
      if (value !== null || list[card] === null) goals[person][card] = value;
    }
  }
  return goals;
}

// 저장된 값(또는 백업 파일)을 지금 형식으로 다듬음. 예전 버전 데이터에 없는 값은 기본값을 채움
export function normalizeData(saved) {
  const months = {};
  if (saved.months && typeof saved.months === 'object') {
    for (const key of Object.keys(saved.months)) {
      if (/^\d{4}-\d{2}$/.test(key)) months[key] = normalizeMonth(saved.months[key]);
    }
  }
  const names = saved.names || {};

  return {
    version: DATA_VERSION,
    names: { a: toText(names.a) || '유진', b: toText(names.b) || '남편' },
    payments: normalizePayments(saved.payments),
    cardGoals: normalizeCardGoals(saved.cardGoals),
    splitRule: saved.splitRule === 'income' ? 'income' : 'half',
    items: Array.isArray(saved.items) ? saved.items.filter(isObject).map(normalizeItem) : [],
    months,
    events: Array.isArray(saved.events) ? saved.events.filter(isObject).map(normalizeEvent) : [],
    eventCategories: normalizeCategories(saved.eventCategories),
    categoryDetails: normalizeCategoryDetails(saved.categoryDetails),
    allowance: normalizeAllowance(saved.allowance),
    goal: normalizeGoal(saved.goal),
    wealth: normalizeWealth(saved.wealth, saved.goal),
    memos: normalizeMemos(saved.memos),
    history: normalizeHistory(saved.history),
    lastBackupAt: typeof saved.lastBackupAt === 'number' ? saved.lastBackupAt : null,
  };
}

// 백업 파일인지 대충 확인 (가계부 데이터의 모양을 갖췄는지)
export function looksLikeBackup(saved) {
  return isObject(saved) && Array.isArray(saved.items) && isObject(saved.months);
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

export function saveData(data) {
  return writeJson(DATA_KEY, data);
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (error) {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    // 저장 못 해도 이번 화면에서는 바뀜
  }
}

/* ── ☁️ 동기화 설정 ── */

// { token, gistId, lock: { salt, key }, remoteSavedAt, dirty } / 연결 안 했으면 null
export function loadSync() {
  const saved = readJson(SYNC_KEY);
  if (!isObject(saved) || typeof saved.token !== 'string' || typeof saved.gistId !== 'string' || !isObject(saved.lock)) return null;
  return {
    token: saved.token,
    gistId: saved.gistId,
    lock: { salt: toText(saved.lock.salt), key: toText(saved.lock.key) },
    remoteSavedAt: typeof saved.remoteSavedAt === 'number' ? saved.remoteSavedAt : 0,
    dirty: saved.dirty === true,
  };
}

export function saveSync(sync) {
  return writeJson(SYNC_KEY, sync);
}

export function clearSync() {
  try {
    localStorage.removeItem(SYNC_KEY);
  } catch (error) {
    // 저장소를 못 쓰면 지울 것도 없음
  }
}
