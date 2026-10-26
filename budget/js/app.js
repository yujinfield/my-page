// 진입점: 상태를 들고 여섯 화면(월 가계부 / 가계부 작성 / 큰돈 캘린더 / 연간 요약 / 용돈 / 백업·이력)을 연결합니다.

import { loadData, saveData } from './store.js';
import { monthKeyOf, formatMonth, shiftMonth } from './calc.js';
import { setupTheme } from './theme.js';
import { setupPlan, renderPlan } from './plan.js';
import { setupActual, renderActual } from './actual.js';
import { setupEvents, renderEvents } from './events.js';
import { setupAnnual, renderAnnual } from './annual.js';
import { setupAllowance, renderAllowance, lockAllowance } from './allowance.js';
import { setupBackup, renderBackup } from './backup.js';
import { setupSettings, fillSettings } from './settings.js';
import { setupMemo } from './memo.js';
import { setupSync, markChanged } from './sync.js';

// month: 지금 보고 있는 달 ("2026-11"), tab: 지금 보이는 화면
const state = { data: loadData(), month: monthKeyOf(new Date()), tab: 'plan' };

const RENDER = {
  plan: renderPlan, actual: renderActual, events: renderEvents, annual: renderAnnual, allowance: renderAllowance, backup: renderBackup,
};

const saveStatus = document.getElementById('save-status');
const monthLabel = document.getElementById('month-label');

function save() {
  const saved = saveData(state.data);
  saveStatus.textContent = saved ? '' : '저장하지 못했어요. 비공개 모드이거나 저장 공간이 꽉 찼을 수 있어요.';
  markChanged(); // ☁️ 동기화를 연결했으면 잠시 뒤 올림
}

// 데이터를 통째로 바꿈 (☁️ 다른 기기에서 받아 왔을 때). 받아 온 것이라 다시 올리지 않음
function replaceData(data) {
  state.data = data;
  saveData(state.data);
  lockAllowance();
  fillSettings();
  render();
}

function render() {
  monthLabel.textContent = formatMonth(state.month);
  RENDER[state.tab]();
}

/* ── 탭 ── */

const tabButtons = document.querySelectorAll('[role="tab"]');

function showTab(tab) {
  // 용돈 화면을 떠나면 다시 잠금 (다른 사람이 이어서 보지 못하게)
  if (state.tab === 'allowance' && tab !== 'allowance') lockAllowance();
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

setupTheme();
setupPlan(state, save);
setupActual(state, save);
setupEvents(state, save);
setupAnnual(state, save, render);
setupSettings(state, save, render);
setupMemo(state, save);
setupAllowance(state, save);
// 백업 파일을 불러와 데이터가 통째로 바뀌면 설정 칸과 화면을 새로 고침
setupBackup(state, save, () => {
  lockAllowance();
  fillSettings();
  render();
});
showTab('plan');
setupSync(state, replaceData);
