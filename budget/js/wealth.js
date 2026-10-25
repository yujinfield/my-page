// ④ 연간 요약의 "저금액 · 부채" (보기만): 지금 저금액, 지금 남은 부채, 빚 빨리 갚기 코멘트
// 시작 저금액과 부채는 ⚙️ 설정에서 적고, 여기서는 그 뒤 달마다 바뀐 걸 계산해서 보여 줍니다.

import { formatMonth, monthKeyOf, currentSavings, monthKeyFromText } from './calc.js';
import { PREPAY_OPTIONS } from './store.js';
import { debtLines, debtBalanceNow, formatEok } from './forecast.js';
import { openSettings } from './settings.js';

const savingsStatus = document.getElementById('savings-status');
const editButton = document.getElementById('savings-edit');
const debtSummary = document.getElementById('debt-summary');
const debtComments = document.getElementById('debt-comments');

let state = null;

export function setupWealth(appState) {
  state = appState;
  editButton.addEventListener('click', () => openSettings('savings-input'));
}

export function renderWealth() {
  const today = monthKeyOf(new Date());
  const now = currentSavings(state.data, today);
  renderSavingsStatus(now);
  renderDebtSummary(today);
  renderComments(now, today);
}

// 지금 저금액 = ⚙️ 설정의 시작 저금액 + 그 뒤 달마다 쌓인 돈 − 큰돈
function renderSavingsStatus(now) {
  if (!now) {
    savingsStatus.textContent = '⚙️ 설정에서 지금 저금액과 부채를 한 번만 적어 두면, 그 뒤로는 달마다 자동으로 계산해요.';
    return;
  }
  const { savings, savingsAsOf } = state.data.wealth;
  const strong = document.createElement('strong');
  strong.textContent = formatEok(now.amount);
  savingsStatus.replaceChildren(
    `지금 저금액 (${formatMonth(now.key)} 말): `, strong,
    ` · 시작 ${formatEok(savings)}(${formatMonth(savingsAsOf)} 말)에 달마다 쌓인 돈을 더하고 큰돈을 뺐어요.`,
  );
}

// 부채마다 한 줄: 이름 · 지금 남은 금액 · 이율 · 상환 기한 · 중도 상환
function renderDebtSummary(today) {
  const rows = state.data.wealth.debts.map((debt) => {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    name.textContent = debt.name || '이름 없는 부채';
    const balance = debtBalanceNow(debt, today);
    const dueKey = monthKeyFromText(debt.dueMonth);
    const prepay = PREPAY_OPTIONS.find(([value]) => value === debt.prepay);
    const parts = [
      balance === null ? '남은 금액 —' : `지금 남은 ${formatEok(balance)}`,
      debt.rate !== null ? `이율 ${debt.rate}%` : '',
      dueKey ? `기한 ${formatMonth(dueKey)}` : '',
      prepay && prepay[0] ? `중도 상환 ${prepay[1]}${debt.prepay === 'fee' && debt.prepayFee ? ` ${debt.prepayFee}%` : ''}` : '',
    ].filter(Boolean);
    const detail = document.createElement('span');
    detail.className = 'hint';
    detail.textContent = parts.join(' · ');
    item.append(name, detail);
    return item;
  });
  debtSummary.replaceChildren(...rows);
}

function renderComments(now, today) {
  const { wealth, goal } = state.data;
  const lines = debtLines(wealth.debts, now ? now.amount : null, goal.rate, today);
  const title = document.createElement('p');
  title.className = 'forecast-title';
  title.textContent = '빚 빨리 갚기';
  debtComments.replaceChildren(title, ...lines.map((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  }));
}
