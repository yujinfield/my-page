// 입력폼 화면 그리기
// 질문 목록(fields.js)을 보고 입력칸을 만듭니다.

import { BASIC_FIELDS, POINT_FIELDS, CTA_FIELDS, CTA_TYPES, MATERIAL_TYPES } from './fields.js';

const CIRCLES = ['①', '②', '③'];

// 질문 하나 = 제목 + 설명 + 입력칸
function createField(field, id, value, onInput) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.className = 'field-label';
  label.htmlFor = id;
  label.textContent = field.label;

  const help = document.createElement('p');
  help.className = 'field-help';
  help.id = `${id}-help`;
  help.textContent = field.help;

  const input = document.createElement(field.multiline ? 'textarea' : 'input');
  if (field.multiline) {
    input.rows = 3;
  } else {
    input.type = 'text';
  }
  input.id = id;
  input.className = 'field-input';
  input.placeholder = field.placeholder;
  input.value = value;
  input.setAttribute('aria-describedby', help.id);
  input.addEventListener('input', () => onInput(input.value));

  wrapper.append(label, help, input);
  return wrapper;
}

function renderBasic(form, onChange) {
  const container = document.getElementById('part1-fields');
  container.replaceChildren();

  BASIC_FIELDS.forEach((field) => {
    const element = createField(field, `field-${field.key}`, form[field.key], (value) => {
      form[field.key] = value;
      onChange();
    });
    container.append(element);
  });
}

function renderPoints(form, onChange) {
  const container = document.getElementById('part2-fields');
  container.replaceChildren();

  form.points.forEach((point, i) => {
    const card = document.createElement('div');
    card.className = 'point-card';

    const heading = document.createElement('h3');
    heading.className = 'point-title';
    heading.textContent = `핵심 정보 ${CIRCLES[i]}`;
    card.append(heading);

    POINT_FIELDS.forEach((field) => {
      const element = createField(field, `point${i}-${field.key}`, point[field.key], (value) => {
        point[field.key] = value;
        onChange();
      });
      card.append(element);
    });

    container.append(card);
  });
}

// 라디오 버튼 묶음: 고르면 onSelect(value)
function createRadioGroup(legendText, name, options, currentValue, onSelect) {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'choice-group';
  const legend = document.createElement('legend');
  legend.className = 'field-label';
  legend.textContent = legendText;
  fieldset.append(legend);

  options.forEach((option) => {
    const label = document.createElement('label');
    label.className = 'choice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = option.value;
    radio.checked = currentValue === option.value;
    radio.addEventListener('change', () => onSelect(option.value));
    const text = document.createElement('span');
    text.textContent = option.label;
    label.append(radio, text);
    fieldset.append(label);
  });
  return fieldset;
}

function renderCta(form, onChange) {
  const container = document.getElementById('part3-fields');
  container.replaceChildren();

  container.append(createRadioGroup('CTA 방식', 'ctaType', CTA_TYPES, form.ctaType, (value) => {
    form.ctaType = value;
    onChange();
  }));

  CTA_FIELDS.forEach((field) => {
    // 추가 정보 칸 바로 위에 자료 종류 선택
    if (field.key === 'extraInfo') {
      container.append(createRadioGroup('댓글로 보낼 자료 종류', 'materialType', MATERIAL_TYPES, form.materialType, (value) => {
        form.materialType = value;
        onChange();
      }));
    }
    const element = createField(field, `field-${field.key}`, form[field.key], (value) => {
      form[field.key] = value;
      onChange();
    });
    container.append(element);
  });
}

// 입력값이 바뀔 때마다 onChange()를 부릅니다.
export function renderForm(form, onChange) {
  renderBasic(form, onChange);
  renderPoints(form, onChange);
  renderCta(form, onChange);
}
