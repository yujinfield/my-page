// 입력 화면 그리기
// 질문 목록(fields.js)과 카테고리 상수(categories.js)를 보고 화면을 만듭니다.

import { COMMON_GROUPS, DETAIL_GROUPS } from './fields.js';
import { CATEGORIES, PACKAGE_TYPES, findCategory } from './categories.js';

// 선택지는 { value, label } 또는 문자열(값 = 보이는 글자)입니다.
function optionValue(option) {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel(option) {
  return typeof option === 'string' ? option : option.label;
}

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
    element.value = optionValue(option);
    element.textContent = optionLabel(option);
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
  fillOptions(packageSelect, PACKAGE_TYPES, draft.details.package.packageType, '패키지 유형을 골라 주세요');
  packageSelect.addEventListener('change', () => {
    draft.details.package.packageType = packageSelect.value;
    onChange({});
  });

  updateCategoryPreview(draft);
}

// ---------- 입력칸 만들기 (공통·상세 같이 씀) ----------

function createBadge(className, text) {
  const badge = document.createElement('span');
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

// 제목 옆에 필수 / 🔄 작성일 기준 확인 표시를 붙입니다.
function addBadges(title, field) {
  if (field.required) {
    title.append(' ', createBadge('badge-required', '필수'));
  }
  if (field.volatile) {
    title.append(' ', createBadge('badge-volatile', '🔄 작성일 기준 확인'));
  }
}

function createHelp(field, id) {
  const help = document.createElement('p');
  help.className = 'field-help';
  help.id = `${id}-help`;
  help.textContent = field.help;
  return help;
}

// 여러 개 고르기: 체크박스 묶음. 값은 고른 글자들의 배열입니다.
function createChecks(field, id, values, onInput) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'field choice-group';

  const legend = document.createElement('legend');
  legend.className = 'field-label';
  legend.textContent = field.label;
  addBadges(legend, field);
  fieldset.append(legend);

  if (field.help) {
    fieldset.append(createHelp(field, id));
  }

  field.options.forEach((option) => {
    const value = optionValue(option);
    const label = document.createElement('label');
    label.className = 'choice';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = value;
    box.checked = values.includes(value);
    box.addEventListener('change', () => {
      const checked = fieldset.querySelectorAll('input:checked');
      onInput(Array.from(checked).map((input) => input.value));
    });
    const text = document.createElement('span');
    text.textContent = optionLabel(option);
    label.append(box, text);
    fieldset.append(label);
  });

  return fieldset;
}

// 질문 하나 = 제목 + 설명 + 입력칸
function createField(field, id, value, onInput) {
  if (field.type === 'checks') {
    return createChecks(field, id, value, onInput);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.className = 'field-label';
  label.htmlFor = id;
  label.textContent = field.label;
  addBadges(label, field);
  wrapper.append(label);

  if (field.help) {
    wrapper.append(createHelp(field, id));
  }

  let input;
  if (field.type === 'select') {
    input = document.createElement('select');
    fillOptions(input, field.options, value, field.placeholder);
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

// 묶음마다 카드 하나. values[field.key]를 읽고 고칩니다.
// idPrefix는 입력칸 id가 겹치지 않게 붙이는 앞말입니다. (예: field-common-destination)
function renderGroups(container, groups, values, idPrefix, onChange) {
  container.replaceChildren();

  groups.forEach((group) => {
    const card = document.createElement('fieldset');
    card.className = 'card field-group';
    const legend = document.createElement('legend');
    legend.className = 'card-title';
    legend.textContent = group.title;
    card.append(legend);

    if (group.note) {
      const note = document.createElement('p');
      note.className = 'group-note';
      note.textContent = `⚠️ ${group.note}`;
      card.append(note);
    }

    group.fields.forEach((field) => {
      const id = `field-${idPrefix}-${field.key}`;
      const element = createField(field, id, values[field.key], (value) => {
        values[field.key] = value;
        onChange({});
      });
      card.append(element);
    });

    container.append(card);
  });
}

// ---------- 2. 공통 정보 ----------

export function renderCommonForm(draft, onChange) {
  const container = document.getElementById('common-fields');
  renderGroups(container, COMMON_GROUPS, draft.common, 'common', onChange);
  updateReaderQuestionHint(draft);
}

// "독자가 가장 궁금해할 한 가지"의 예시를 카테고리 핵심 질문으로 바꿉니다.
export function updateReaderQuestionHint(draft) {
  const input = document.getElementById('field-common-readerQuestion');
  if (!input) return;
  const category = findCategory(draft.category);
  input.placeholder = category ? `예) ${category.question}` : '';
}

// ---------- 3. 상세 정보 ----------

function packageTypeLabel(value) {
  const type = PACKAGE_TYPES.find((item) => item.value === value);
  return type ? type.label : '유형 미선택';
}

export function renderDetailStep(draft, onChange) {
  const category = findCategory(draft.category);
  const title = document.getElementById('detail-title');
  const question = document.getElementById('detail-question');
  const list = document.getElementById('detail-cautions');
  const container = document.getElementById('detail-fields');
  list.replaceChildren();
  container.replaceChildren();

  if (!category) {
    title.textContent = '상세 정보';
    question.textContent = '먼저 1단계에서 글 종류를 골라 주세요.';
    return;
  }

  title.textContent = `${category.emoji} ${category.name} 상세 정보`;
  if (category.id === 'package') {
    title.textContent += ` · ${packageTypeLabel(draft.details.package.packageType)}`;
  }
  question.textContent = category.question;
  category.cautions.forEach((caution) => {
    const item = document.createElement('li');
    item.textContent = caution;
    list.append(item);
  });

  renderGroups(container, DETAIL_GROUPS[category.id], draft.details[category.id], category.id, onChange);
}
