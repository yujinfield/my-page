// 진입점: 상태를 들고 다섯 화면(월 가계부 / 실제 사용 / 큰돈 캘린더 / 연간 요약 / 백업·이력)을 연결합니다.

import { loadData, saveData, normalizePayments } from './store.js';
import { monthKeyOf, formatMonth, shiftMonth } from './calc.js';
import { setupTheme } from './theme.js';
import { setupPlan, renderPlan } from './plan.js';
import { setupActual, renderActual } from './actual.js';
import { setupEvents, renderEvents } from './events.js';
import { setupAnnual, renderAnnual } from './annual.js';
import { setupBackup, renderBackup } from './backup.js';

// month: 지금 보고 있는 달 ("2026-11"), tab: 지금 보이는 화면
const state = { data: loadData(), month: monthKeyOf(new Date()), tab: 'plan' };

const RENDER = {
  plan: renderPlan, actual: renderActual, events: renderEvents, annual: renderAnnual, backup: renderBackup,
};

const saveStatus = document.getElementById('save-status');
const monthLabel = document.getElementById('month-label');

function save() {
  const saved = saveData(state.data);
  saveStatus.textContent = saved ? '' : '저장하지 못했어요. 비공개 모드이거나 저장 공간이 꽉 찼을 수 있어요.';
}

function render() {
  monthLabel.textContent = formatMonth(state.month);
  RENDER[state.tab]();
}

/* ── 탭 ── */

const tabButtons = document.querySelectorAll('[role="tab"]');

function showTab(tab) {
  state.tab = tab;
  for (const button of tabButtons) {
    const selected = button.dataset.tab === tab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
  }
  render();
}

for (const button of tabButtons) {
  button.addEventListener('click', () => showTab(button.dataset.tab));
  // 좌우 화살표로 탭 이동
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const list = Array.from(tabButtons);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = list[(list.indexOf(button) + step + list.length) % list.length];
    next.focus();
    showTab(next.dataset.tab);
  });
}

/* ── 달 이동 ── */

document.getElementById('month-prev').addEventListener('click', () => {
  state.month = shiftMonth(state.month, -1);
  render();
});
document.getElementById('month-next').addEventListener('click', () => {
  state.month = shiftMonth(state.month, 1);
  render();
});

/* ── 두 사람 이름 ── */

/* ── 결제 수단 목록 (쉼표로 나눠 적음) ── */

const paymentsInput = document.getElementById('payments-input');
paymentsInput.addEventListener('change', () => {
  state.data.payments = normalizePayments(paymentsInput.value.split(','));
  paymentsInput.value = state.data.payments.join(', ');
  save();
  render();
});

const nameInputs = { a: document.getElementById('name-a'), b: document.getElementById('name-b') };
function fillNames() {
  nameInputs.a.value = state.data.names.a;
  nameInputs.b.value = state.data.names.b;
  paymentsInput.value = state.data.payments.join(', ');
}
for (const key of ['a', 'b']) {
  nameInputs[key].addEventListener('input', () => {
    state.data.names[key] = nameInputs[key].value.trim() || (key === 'a' ? '유진' : '남편');
    save();
  });
  // 다 쓰고 나서 표 머리줄에 반영
  nameInputs[key].addEventListener('change', render);
}

setupTheme();
setupPlan(state, save);
setupActual(state, save);
setupEvents(state, save);
setupAnnual(state, save, render);
// 백업 파일을 불러와 데이터가 통째로 바뀌면 이름 칸과 화면을 새로 고침
setupBackup(state, save, () => {
  fillNames();
  render();
});
fillNames();
showTab('plan');
