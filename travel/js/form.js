// 입력 화면 그리기
// 질문 목록(fields.js)과 카테고리 상수(categories.js)를 보고 화면을 만듭니다.

import { COMMON_GROUPS } from './fields.js';
import { CATEGORIES, PACKAGE_TYPES, findCategory } from './categories.js';

// <select>에 선택지를 채웁니다. placeholder가 있으면 맨 위에 빈 선택지를 둡니다.
function fillOptions(select, options, value, placeholder) {
  select.replaceChildren();
  if (placeholder) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    select.append(empty);
  }
  options.forEach((option) => {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  });
  select.value = value;
}

// ---------- 1. 글 종류 ----------

const CATEGORY_OPTIONS = CATEGORIES.map((category) => ({
  value: category.id,
  label: `${category.emoji} ${category.name}`,
}));

// 고른 카테고리의 설명 카드와 패키지 유형 칸을 갱신합니다.
export function updateCategoryPreview(draft) {
  const category = findCategory(draft.category);
  document.getElementById('category-preview').hidden = !category;
  document.getElementById('package-type-field').hidden = draft.category !== 'package';
  if (!category) return;

  document.getElementById('preview-name').textContent = `${category.emoji} ${category.name}`;
  document.getElementById('preview-summary').textContent = category.summary;
  document.getElementById('preview-question').textContent = category.question;
}

export function renderCategoryStep(draft, onChange) {
  const categorySelect = document.getElementById('category-select');
  fillOptions(categorySelect, CATEGORY_OPTIONS, draft.category, '어떤 글을 쓸까요? 선택해 주세요');
  categorySelect.addEventListener('change', () => {
    draft.category = categorySelect.value;
    updateCategoryPreview(draft);
    onChange({ categoryChanged: true });
  });

  const packageSelect = document.getElementById('package-type-select');
  fillOptions(packageSelect, PACKAGE_TYPES, draft.details.package.packageType || '', '패키지 유형을 골라 주세요');
  packageSelect.addEventListener('change', () => {
    draft.details.package.packageType = packageSelect.value;
    onChange({});
  });

  updateCategoryPreview(draft);
}

// ---------- 2. 공통 정보 ----------

// 질문 하나 = 제목 + 설명 + 입력칸
function createField(field, value, onInput) {
  const id = `field-${field.key}`;
  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.className = 'field-label';
  label.htmlFor = id;
  label.textContent = field.label;
  if (field.required) {
    const mark = document.createElement('span');
    mark.className = 'badge badge-required';
    mark.textContent = '필수';
    label.append(' ', mark);
  }
  if (field.volatile) {
    const mark = document.createElement('span');
    mark.className = 'badge badge-volatile';
    mark.textContent = '🔄 작성일 기준 확인';
    label.append(' ', mark);
  }
  wrapper.append(label);

  if (field.help) {
    const help = document.createElement('p');
    help.className = 'field-help';
    help.id = `${id}-help`;
    help.textContent = field.help;
    wrapper.append(help);
  }

  let input;
  if (field.type === 'select') {
    input = document.createElement('select');
    fillOptions(input, field.options, value);
    input.addEventListener('change', () => onInput(input.value));
  } else {
    input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
    if (field.type === 'textarea') {
      input.rows = 3;
    } else {
      input.type = field.type;
    }
    input.placeholder = field.placeholder || '';
    input.value = value;
    input.addEventListener('input', () => onInput(input.value));
  }
  input.id = id;
  input.className = 'field-input';
  if (field.help) {
    input.setAttribute('aria-describedby', `${id}-help`);
  }

  wrapper.append(input);
  return wrapper;
}

export function renderCommonForm(draft, onChange) {
  const container = document.getElementById('common-fields');
  container.replaceChildren();

  COMMON_GROUPS.forEach((group) => {
    const card = document.createElement('fieldset');
    card.className = 'card field-group';
    const legend = document.createElement('legend');
    legend.className = 'card-title';
    legend.textContent = group.title;
    card.append(legend);

    group.fields.forEach((field) => {
      const element = createField(field, draft.common[field.key], (value) => {
        draft.common[field.key] = value;
        onChange({});
      });
      card.append(element);
    });

    container.append(card);
  });

  updateReaderQuestionHint(draft);
}

// "독자가 가장 궁금해할 한 가지"의 예시를 카테고리 핵심 질문으로 바꿉니다.
export function updateReaderQuestionHint(draft) {
  const input = document.getElementById('field-readerQuestion');
  if (!input) return;
  const category = findCategory(draft.category);
  input.placeholder = category ? `예) ${category.question}` : '';
}

// ---------- 3. 상세 정보 ----------

export function renderDetailStep(draft) {
  const category = findCategory(draft.category);
  const title = document.getElementById('detail-title');
  const question = document.getElementById('detail-question');
  const list = document.getElementById('detail-cautions');
  list.replaceChildren();

  if (!category) {
    title.textContent = '상세 정보';
    question.textContent = '먼저 1단계에서 글 종류를 골라 주세요.';
    return;
  }

  title.textContent = `${category.emoji} ${category.name} 상세 정보`;
  question.textContent = category.question;
  category.cautions.forEach((caution) => {
    const item = document.createElement('li');
    item.textContent = caution;
    list.append(item);
  });
}
