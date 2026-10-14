// 진입점: 상태를 들고 각 모듈을 연결합니다.

import {
  CATEGORIES,
  CATEGORY_KEYS,
  BASIC_FIELDS,
  REVIEW_FIELDS,
  PARTNER_FIELDS,
  createEmptyCommon,
  createEmptyDetail,
} from './categories.js';
import { buildTitles, buildBlocks, buildHashtags, countMissing, renderHtml, renderText, safeLink } from './writer.js';
import { renderFields } from './form.js';
import { loadDraft, saveDraft, loadTheme, saveTheme } from './store.js';

// ---------- 상태 ----------
// 기본 정보·장단점·링크(common)는 종류를 바꿔도 그대로 두고,
// 종류별 상세 정보(details)는 따로 보관합니다.
const draft = createDraft(loadDraft());

function createDraft(saved) {
  const result = {
    category: 'esim',
    common: createEmptyCommon(),
    details: {},
  };
  CATEGORY_KEYS.forEach((key) => {
    result.details[key] = createEmptyDetail(key);
  });

  if (!saved) return result;

  // 저장된 값 중 지금도 있는 항목만 덮어씁니다. (항목이 바뀌어도 안전하게)
  if (CATEGORY_KEYS.includes(saved.category)) result.category = saved.category;
  Object.assign(result.common, pickKnown(result.common, saved.common));
  CATEGORY_KEYS.forEach((key) => {
    Object.assign(result.details[key], pickKnown(result.details[key], saved.details && saved.details[key]));
  });
  return result;
}

function pickKnown(base, saved) {
  const picked = {};
  if (!saved) return picked;
  Object.keys(base).forEach((key) => {
    if (typeof saved[key] === 'string') picked[key] = saved[key];
  });
  return picked;
}

// 지금 종류의 입력값 전체 (공통 + 상세)
function currentValues() {
  return { ...draft.common, ...draft.details[draft.category] };
}

// ---------- 화면 요소 ----------
const tabs = document.getElementById('category-tabs');
const preview = document.getElementById('preview');
const titleList = document.getElementById('title-list');
const missingText = document.getElementById('missing-text');
const toast = document.getElementById('toast');

// ---------- 글 종류 탭 ----------
function renderTabs() {
  tabs.replaceChildren();
  CATEGORY_KEYS.forEach((key) => {
    const category = CATEGORIES[key];
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'category-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(key === draft.category));
    tab.textContent = `${category.emoji} ${category.label}`;
    tab.addEventListener('click', () => selectCategory(key));
    tabs.append(tab);
  });
}

function selectCategory(key) {
  draft.category = key;
  saveDraft(draft);
  renderTabs();
  renderDetail();
  updateResult();
}

// ---------- 입력칸 ----------
function handleChange() {
  saveDraft(draft);
  updateResult();
}

function renderDetail() {
  const category = CATEGORIES[draft.category];
  document.getElementById('detail-title').textContent = `2. ${category.label} 상세 정보`;
  renderFields(document.getElementById('detail-fields'), category.fields, draft.details[draft.category], handleChange);
}

function renderAllFields() {
  renderFields(document.getElementById('basic-fields'), BASIC_FIELDS, draft.common, handleChange);
  renderFields(document.getElementById('review-fields'), REVIEW_FIELDS, draft.common, handleChange);
  renderFields(document.getElementById('partner-fields'), PARTNER_FIELDS, draft.common, handleChange);
  renderDetail();
}

function resetCurrent() {
  const category = CATEGORIES[draft.category];
  const ok = window.confirm(`입력한 내용을 모두 지울까요?\n(기본 정보·장단점·링크와 ${category.label} 상세 정보)`);
  if (!ok) return;
  draft.common = createEmptyCommon();
  draft.details[draft.category] = createEmptyDetail(draft.category);
  saveDraft(draft);
  renderAllFields();
  updateResult();
}

// ---------- 결과 ----------
function updateResult() {
  const values = currentValues();
  const blocks = buildBlocks(draft.category, values);

  // 미리보기: writer.js가 모든 글자를 escapeHtml 한 뒤 만든 HTML입니다.
  preview.innerHTML = renderHtml(blocks);

  titleList.replaceChildren();
  buildTitles(draft.category, values).forEach((title) => {
    const item = document.createElement('li');
    item.className = 'title-item';

    const text = document.createElement('span');
    text.textContent = title;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'small-button';
    button.textContent = '복사';
    button.setAttribute('aria-label', `제목 복사: ${title}`);
    button.addEventListener('click', () => copyText(title, '제목을 복사했어요'));

    item.append(text, button);
    titleList.append(item);
  });

  const warnings = [];
  const missing = countMissing(blocks);
  if (missing > 0) warnings.push(`비어 있는 칸 ${missing}곳이 [입력 필요]로 표시돼요.`);
  if (!safeLink(values.partnerLink)) warnings.push('파트너스 링크가 없거나 https://로 시작하지 않아요.');
  missingText.textContent = warnings.length > 0 ? `⚠️ ${warnings.join(' ')}` : '✅ 모든 칸이 채워졌어요. 복사해서 올리면 돼요!';
  missingText.classList.toggle('is-done', warnings.length === 0);
}

// ---------- 복사 ----------
function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2000);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch (error) {
    showToast('복사하지 못했어요. 직접 선택해서 복사해 주세요.');
  }
}

// 서식(굵게, 표, 버튼 링크)을 살려서 복사합니다.
// 지원하지 않는 브라우저에서는 텍스트로 복사합니다.
async function copyRich() {
  const blocks = buildBlocks(draft.category, currentValues());
  const html = renderHtml(blocks);
  const text = renderText(blocks);

  if (!window.ClipboardItem) {
    copyText(text, '텍스트로 복사했어요');
    return;
  }

  try {
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    });
    await navigator.clipboard.write([item]);
    showToast('서식 그대로 복사했어요. 블로그 편집기에 붙여 넣으세요!');
  } catch (error) {
    copyText(text, '텍스트로 복사했어요');
  }
}

document.getElementById('copy-rich').addEventListener('click', copyRich);
document.getElementById('copy-html').addEventListener('click', () => {
  const html = renderHtml(buildBlocks(draft.category, currentValues()));
  copyText(html, 'HTML을 복사했어요');
});
document.getElementById('copy-text').addEventListener('click', () => {
  const text = renderText(buildBlocks(draft.category, currentValues()));
  copyText(text, '텍스트를 복사했어요');
});
document.getElementById('copy-tags').addEventListener('click', () => {
  const tags = buildHashtags(draft.category, currentValues()).join(' ');
  copyText(tags, '해시태그를 복사했어요');
});
document.getElementById('reset-button').addEventListener('click', resetCurrent);

// ---------- 다크 모드 ----------
const themeButton = document.getElementById('theme-button');

function isDarkNow() {
  const theme = document.documentElement.dataset.theme;
  if (theme) return theme === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  themeButton.textContent = isDarkNow() ? '☀️' : '🌙';
  themeButton.setAttribute('aria-label', isDarkNow() ? '라이트 모드로 전환' : '다크 모드로 전환');
}

themeButton.addEventListener('click', () => {
  const next = isDarkNow() ? 'light' : 'dark';
  saveTheme(next);
  applyTheme(next);
});

// ---------- 시작 ----------
applyTheme(loadTheme());
renderTabs();
renderAllFields();
updateResult();
