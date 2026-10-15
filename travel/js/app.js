// 진입점: 상태를 들고 각 모듈을 연결합니다.

import { fillMissing, getProgress } from './fields.js';
import {
  renderCategoryStep,
  renderCommonForm,
  renderDetailStep,
  updateReaderQuestionHint,
} from './form.js';
import { loadDraft, saveDraft, clearDraft, loadTheme, saveTheme } from './store.js';

const STEPS = ['category', 'common', 'detail'];

const draft = fillMissing(loadDraft());
let currentStep = 'category';

// ---------- 화면 요소 ----------
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const saveStatus = document.getElementById('save-status');

// ---------- 입력 변경 ----------
function handleChange(change) {
  draft.updatedAt = Date.now();
  saveDraft(draft);
  saveStatus.textContent = '자동 저장됨';
  updateProgress();
  if (change.categoryChanged) {
    updateReaderQuestionHint(draft);
    updateStepButtons();
  }
}

function updateProgress() {
  const percent = getProgress(draft);
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

// ---------- 단계 이동 ----------
// 글 종류를 고르기 전에는 다음 단계로 갈 수 없습니다.
function updateStepButtons() {
  const hasCategory = draft.category !== '';
  STEPS.forEach((name) => {
    document.getElementById(`tab-${name}`).disabled = name !== 'category' && !hasCategory;
  });

  const index = STEPS.indexOf(currentStep);
  prevButton.disabled = index === 0;
  nextButton.hidden = index === STEPS.length - 1;
  nextButton.disabled = !hasCategory;
}

function showStep(step) {
  currentStep = step;

  STEPS.forEach((name) => {
    document.getElementById(`step-${name}`).hidden = name !== step;
    document.getElementById(`tab-${name}`).setAttribute('aria-selected', String(name === step));
  });

  if (step === 'detail') {
    renderDetailStep(draft);
  }
  updateStepButtons();
  window.scrollTo(0, 0);
}

function moveStep(direction) {
  const index = STEPS.indexOf(currentStep) + direction;
  if (index >= 0 && index < STEPS.length) {
    showStep(STEPS[index]);
  }
}

// ---------- 처음부터 ----------
function resetDraft() {
  const ok = window.confirm('입력한 내용을 모두 지우고 처음부터 쓸까요?');
  if (!ok) return;
  clearDraft();
  window.location.reload(); // 빈 폼으로 다시 시작
}

// ---------- 다크 모드 ----------
const themeButton = document.getElementById('theme-button');

function isDarkNow() {
  const theme = document.documentElement.dataset.theme;
  if (theme) return theme === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateThemeButton() {
  const dark = isDarkNow();
  themeButton.textContent = dark ? '☀️' : '🌙';
  themeButton.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
}

function toggleTheme() {
  const theme = isDarkNow() ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  saveTheme(theme);
  updateThemeButton();
}

// ---------- 시작 ----------
function init() {
  const savedTheme = loadTheme();
  if (savedTheme) {
    document.documentElement.dataset.theme = savedTheme;
  }
  updateThemeButton();
  themeButton.addEventListener('click', toggleTheme);

  STEPS.forEach((name) => {
    document.getElementById(`tab-${name}`).addEventListener('click', () => showStep(name));
  });
  prevButton.addEventListener('click', () => moveStep(-1));
  nextButton.addEventListener('click', () => moveStep(1));
  document.getElementById('reset-button').addEventListener('click', resetDraft);

  renderCategoryStep(draft, handleChange);
  renderCommonForm(draft, handleChange);
  updateProgress();
  showStep('category');
}

init();
