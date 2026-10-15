// 진입점: 상태를 들고 각 모듈을 연결합니다.

import { createEmptyForm, fillMissing, getProgress } from './fields.js';
import { classifyForm, checkForm } from './classify.js';
import { buildPrompt } from './prompt.js';
import { renderForm } from './form.js';
import { initCutEditor, renderCuts } from './cuts.js';
import { initMaterialPanel, renderMaterialPanel, resetMaterialPanel } from './material-panel.js';
import { loadDraft, saveDraft, clearDraft, loadTheme, saveTheme } from './store.js';

const STEPS = ['part1', 'part2', 'part3', 'result', 'cuts'];
const TYPE_NAMES = { story: '스토리형', info: '정보형' };
const PROMPT_NAMES = { story: '스토리형 V1', info: '정보형 V2' };

let form = fillMissing(loadDraft());
let currentStep = 'part1';

// ---------- 화면 요소 ----------
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const toast = document.getElementById('toast');

// ---------- 입력 변경 ----------
function handleChange() {
  saveDraft(form);
  updateProgress();
  renderMaterialPanel();
  if (currentStep === 'result') {
    updateResult();
  }
}

function updateProgress() {
  const percent = getProgress(form);
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

// ---------- 단계 이동 ----------
function showStep(step) {
  currentStep = step;

  STEPS.forEach((name) => {
    document.getElementById(`step-${name}`).hidden = name !== step;
    const tab = document.getElementById(`tab-${name}`);
    tab.setAttribute('aria-selected', String(name === step));
  });

  const index = STEPS.indexOf(step);
  prevButton.disabled = index === 0;
  nextButton.hidden = index === STEPS.length - 1;
  const nextLabels = { part3: '요청문 만들기', result: '컷 편집' };
  nextButton.textContent = nextLabels[step] || '다음';

  if (step === 'result') {
    updateResult();
  }
  if (step === 'cuts') {
    renderCuts();
  }
  window.scrollTo(0, 0);
}

function moveStep(direction) {
  const index = STEPS.indexOf(currentStep) + direction;
  if (index >= 0 && index < STEPS.length) {
    showStep(STEPS[index]);
  }
}

// ---------- 결과 ----------
// 실제로 쓸 유형: 직접 고른 값이 있으면 그것, 아니면 자동 판단 결과
function getFinalType() {
  if (form.typeChoice === 'story' || form.typeChoice === 'info') {
    return form.typeChoice;
  }
  return classifyForm(form).type;
}

function fillList(listElement, items) {
  listElement.replaceChildren();
  items.forEach((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    listElement.append(item);
  });
}

function updateResult() {
  const verdict = classifyForm(form);
  const finalType = getFinalType();

  document.getElementById('verdict-type').textContent = TYPE_NAMES[verdict.type];
  document.getElementById('verdict-score').textContent =
    `스토리형 ${verdict.storyScore}점 · 정보형 ${verdict.infoScore}점`;
  fillList(document.getElementById('verdict-reasons'), verdict.reasons);

  const warnings = checkForm(form);
  document.getElementById('warnings-box').hidden = warnings.length === 0;
  fillList(document.getElementById('warnings'), warnings);

  document.getElementById('prompt-title').textContent =
    `${PROMPT_NAMES[finalType]} 마스터 프롬프트 + 입력 내용`;
  document.getElementById('prompt-output').value = buildPrompt(form, finalType);
}

function setTypeChoiceRadios() {
  document.querySelectorAll('input[name="typeChoice"]').forEach((radio) => {
    radio.checked = radio.value === form.typeChoice;
  });
}

// ---------- 복사 ----------
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 2000);
}

// 클립보드 복사. 권한이 막혀 있으면 화면에 글을 띄워 직접 복사하게 합니다.
async function copyText(text, message = '복사했어요!') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch (error) {
    const box = document.getElementById('copy-fallback');
    const output = document.getElementById('copy-fallback-text');
    output.value = text;
    box.hidden = false;
    output.focus();
    output.select();
    showToast('자동 복사가 막혀 있어요. 선택된 글을 직접 복사해 주세요.');
  }
}

function copyPrompt() {
  copyText(buildPrompt(form, getFinalType()), '복사했어요! claude.ai 꼼쥐 프로젝트에 붙여 넣으세요.');
}

// ---------- 처음부터 ----------
function resetForm() {
  if (!confirm('입력한 내용을 모두 지울까요?')) return;
  clearDraft();
  form = createEmptyForm();
  renderForm(form, handleChange);
  resetMaterialPanel();
  setTypeChoiceRadios();
  updateProgress();
  showStep('part1');
}

// ---------- 테마 ----------
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  }
}

function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const nextTheme = isDark ? 'light' : 'dark';
  applyTheme(nextTheme);
  saveTheme(nextTheme);
}

// ---------- 시작 ----------
function init() {
  applyTheme(loadTheme());
  initCutEditor({
    getForm: () => form,
    getType: getFinalType,
    onChange: () => saveDraft(form),
    copyText,
  });
  renderForm(form, handleChange);
  initMaterialPanel({
    getForm: () => form,
    onChange: () => saveDraft(form),
    copyText,
  });
  setTypeChoiceRadios();
  updateProgress();
  showStep('part1');

  STEPS.forEach((name) => {
    document.getElementById(`tab-${name}`).addEventListener('click', () => showStep(name));
  });
  prevButton.addEventListener('click', () => moveStep(-1));
  nextButton.addEventListener('click', () => moveStep(1));

  document.getElementById('make-button').addEventListener('click', () => showStep('result'));
  document.getElementById('copy-from-form-button').addEventListener('click', copyPrompt);
  document.getElementById('copy-button').addEventListener('click', copyPrompt);
  document.getElementById('reset-button').addEventListener('click', resetForm);
  document.getElementById('theme-button').addEventListener('click', toggleTheme);
  document.getElementById('go-cuts-button').addEventListener('click', () => showStep('cuts'));
  document.getElementById('copy-fallback-close').addEventListener('click', () => {
    document.getElementById('copy-fallback').hidden = true;
  });

  document.querySelectorAll('input[name="typeChoice"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      form.typeChoice = radio.value;
      handleChange();
    });
  });
}

init();
