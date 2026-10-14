// 컷 편집기 화면
// 컷 추가·삭제·순서 변경, 템플릿별 문구 칸, 연출, 컷별 이미지 프롬프트

import { TEMPLATES, CHARACTERS, EXPRESSIONS, BACKGROUNDS, findOption } from './guide.js';
import { createCut, changeTemplate, buildDefaultCuts } from './cut-plan.js';
import { buildImagePrompt, buildAllImagePrompts } from './prompt.js';
import { checkCuts } from './checks.js';

// app.js에서 넘겨받는 함수들
let options = {
  getForm: null,   // 지금 입력폼
  getType: null,   // 'story' | 'info'
  onChange: null,  // 저장
  copyText: null,  // 클립보드 복사
};

// ---------- 작은 도우미 ----------

function cutLabel(index) {
  return `CUT ${String(index + 1).padStart(2, '0')}`;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeButton(text, ariaLabel, onClick, className = 'button button-small') {
  const button = makeElement('button', className, text);
  button.type = 'button';
  button.setAttribute('aria-label', ariaLabel);
  button.addEventListener('click', onClick);
  return button;
}

// 라벨 + 입력칸 (textarea 또는 input)
function makeTextField(id, labelText, value, rows, placeholder, onInput) {
  const wrapper = makeElement('div', 'field field-compact');
  const label = makeElement('label', 'field-label', labelText);
  label.htmlFor = id;

  const input = document.createElement(rows > 1 ? 'textarea' : 'input');
  if (rows > 1) {
    input.rows = rows;
  } else {
    input.type = 'text';
  }
  input.id = id;
  input.className = 'field-input';
  input.placeholder = placeholder || '';
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));

  wrapper.append(label, input);
  return wrapper;
}

function makeSelect(id, labelText, list, value, onChange) {
  const wrapper = makeElement('div', 'field field-compact');
  const label = makeElement('label', 'field-label', labelText);
  label.htmlFor = id;

  const select = makeElement('select', 'field-input');
  select.id = id;
  list.forEach((item) => {
    const option = makeElement('option', '', item.label);
    option.value = item.value;
    option.selected = item.value === value;
    select.append(option);
  });
  select.addEventListener('change', () => onChange(select.value));

  wrapper.append(label, select);
  return wrapper;
}

// ---------- 저장 + 결과 갱신 ----------

function cuts() {
  return options.getForm().cuts;
}

function setCuts(newCuts) {
  options.getForm().cuts = newCuts;
}

// 글자만 바뀌었을 때: 입력칸은 그대로 두고 프롬프트·경고만 새로 씁니다.
function handleTextChange(index) {
  options.onChange();
  const output = document.getElementById(`cut-prompt-${index}`);
  if (output) output.value = buildImagePrompt(cuts()[index], index);
  updateWarnings();
}

// 컷 구조가 바뀌었을 때: 전부 다시 그립니다.
function handleStructureChange() {
  options.onChange();
  renderCuts();
}

function updateWarnings() {
  const warnings = checkCuts(cuts(), options.getForm());

  const globalList = document.getElementById('cut-warnings');
  const globalItems = warnings.filter((warning) => warning.cutIndex === null);
  globalList.replaceChildren(...globalItems.map((warning) => makeElement('li', '', warning.message)));

  const problemCount = new Set(warnings.filter((w) => w.cutIndex !== null).map((w) => w.cutIndex)).size;
  document.getElementById('cut-summary').textContent =
    `${cuts().length}컷 · 확인할 컷 ${problemCount}개`;
  document.getElementById('cut-warnings-box').hidden = globalItems.length === 0;

  cuts().forEach((cut, index) => {
    const list = document.getElementById(`cut-warnings-${index}`);
    if (!list) return;
    const items = warnings.filter((warning) => warning.cutIndex === index);
    list.replaceChildren(...items.map((warning) => makeElement('li', '', warning.message)));
    list.hidden = items.length === 0;
  });
}

// ---------- 컷 카드 ----------

function moveCut(index, direction) {
  const list = [...cuts()];
  const target = index + direction;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  setCuts(list);
  handleStructureChange();
  // 옮긴 컷의 같은 버튼으로 포커스 유지 (키보드 사용자용)
  const buttonId = direction < 0 ? `cut-up-${target}` : `cut-down-${target}`;
  const button = document.getElementById(buttonId);
  if (button && !button.disabled) button.focus();
}

function deleteCut(index) {
  if (!confirm(`${cutLabel(index)}을 삭제할까요?`)) return;
  setCuts(cuts().filter((_, i) => i !== index));
  handleStructureChange();
}

function renderCutHead(cut, index, total) {
  const head = makeElement('div', 'cut-head');
  const title = makeElement('h3', 'cut-title', cutLabel(index));
  const badge = makeElement('span', 'cut-badge', findOption(TEMPLATES, cut.template).label);
  title.append(' ', badge);

  const tools = makeElement('div', 'cut-tools');
  const up = makeButton('↑', `${cutLabel(index)} 위로`, () => moveCut(index, -1));
  up.id = `cut-up-${index}`;
  up.disabled = index === 0;
  const down = makeButton('↓', `${cutLabel(index)} 아래로`, () => moveCut(index, 1));
  down.id = `cut-down-${index}`;
  down.disabled = index === total - 1;
  const remove = makeButton('삭제', `${cutLabel(index)} 삭제`, () => deleteCut(index));
  tools.append(up, down, remove);

  head.append(title, tools);
  return head;
}

function renderTemplatePart(cut, index) {
  const part = makeElement('div', 'cut-section');
  const template = findOption(TEMPLATES, cut.template);

  part.append(makeSelect(`cut-${index}-template`, '템플릿', TEMPLATES, cut.template, (value) => {
    cuts()[index] = changeTemplate(cut, value);
    handleStructureChange();
  }));

  const help = makeElement('p', 'field-help', template.help);
  const link = makeElement('a', '', ' 레퍼런스 보기');
  link.href = `references/${template.reference}`;
  link.target = '_blank';
  link.rel = 'noopener';
  help.append(link);
  part.append(help);

  part.append(makeTextField(`cut-${index}-message`, '핵심 메시지 (1개)', cut.message, 1,
    '이 컷에서 전달할 내용', (value) => {
      cut.message = value;
      handleTextChange(index);
    }));

  template.texts.forEach((field) => {
    part.append(makeTextField(`cut-${index}-${field.key}`, field.label, cut.texts[field.key] || '',
      field.lines, field.placeholder, (value) => {
        cut.texts[field.key] = value;
        handleTextChange(index);
      }));
  });
  return part;
}

function renderDirectionPart(cut, index) {
  const details = makeElement('details', 'cut-section cut-direction');
  details.append(makeElement('summary', '', '그림 연출 (캐릭터·표정·배경·장면)'));

  // 등장 캐릭터
  const fieldset = makeElement('fieldset', 'choice-group');
  fieldset.append(makeElement('legend', 'field-label', '등장 캐릭터'));
  CHARACTERS.forEach((character) => {
    const label = makeElement('label', 'choice');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = cut.characters.includes(character.value);
    checkbox.addEventListener('change', () => {
      cut.characters = CHARACTERS
        .map((item) => item.value)
        .filter((value) => (value === character.value ? checkbox.checked : cut.characters.includes(value)));
      handleTextChange(index);
    });
    label.append(checkbox, makeElement('span', '', character.label));
    fieldset.append(label);
  });
  details.append(fieldset);

  const row = makeElement('div', 'field-row');
  row.append(makeSelect(`cut-${index}-expression`, '꼼쥐 표정', EXPRESSIONS, cut.expression, (value) => {
    cut.expression = value;
    handleTextChange(index);
  }));
  row.append(makeSelect(`cut-${index}-background`, '배경', BACKGROUNDS, cut.background, (value) => {
    cut.background = value;
    handleTextChange(index);
  }));
  details.append(row);

  details.append(makeTextField(`cut-${index}-scene`, '그림 장면·소품·포즈', cut.scene, 2,
    '예) 노트북으로 드레스 후기를 검색하는 꼼쥐 (로고 없는 노트북)', (value) => {
      cut.scene = value;
      handleTextChange(index);
    }));
  details.append(makeTextField(`cut-${index}-direction`, '연출 메모 (카메라 거리, 말풍선 위치)', cut.direction, 1,
    '예) 표정 클로즈업, 말풍선은 오른쪽 위', (value) => {
      cut.direction = value;
      handleTextChange(index);
    }));
  return details;
}

function renderPromptPart(cut, index) {
  const part = makeElement('div', 'cut-section');
  const head = makeElement('div', 'prompt-head');
  const label = makeElement('label', 'field-label', '이미지 생성 프롬프트');
  label.htmlFor = `cut-prompt-${index}`;
  head.append(label, makeButton('복사', `${cutLabel(index)} 프롬프트 복사`, () => {
    options.copyText(buildImagePrompt(cuts()[index], index), `${cutLabel(index)} 프롬프트를 복사했어요!`);
  }, 'button button-primary button-small'));

  const output = makeElement('textarea', 'prompt-output prompt-output-small');
  output.id = `cut-prompt-${index}`;
  output.rows = 6;
  output.readOnly = true;
  output.value = buildImagePrompt(cut, index);

  part.append(head, output);
  return part;
}

function renderCutCard(cut, index, total) {
  const card = makeElement('article', 'cut-card');
  card.setAttribute('aria-label', cutLabel(index));

  const warningList = makeElement('ul', 'cut-warning-list');
  warningList.id = `cut-warnings-${index}`;
  warningList.hidden = true;

  card.append(
    renderCutHead(cut, index, total),
    warningList,
    renderTemplatePart(cut, index),
    renderDirectionPart(cut, index),
    renderPromptPart(cut, index),
  );
  return card;
}

// ---------- 전체 ----------

export function renderCuts() {
  const list = document.getElementById('cut-list');
  const hasCuts = cuts().length > 0;

  document.getElementById('cut-empty').hidden = hasCuts;
  document.getElementById('cut-toolbar').hidden = !hasCuts;

  list.replaceChildren(...cuts().map((cut, index) => renderCutCard(cut, index, cuts().length)));
  updateWarnings();
}

function startFromForm() {
  if (cuts().length > 0 &&
      !confirm('지금 컷을 지우고 입력 내용으로 기본 구성을 다시 만들까요?')) {
    return;
  }
  setCuts(buildDefaultCuts(options.getForm(), options.getType()));
  handleStructureChange();
}

function addCut() {
  setCuts([...cuts(), createCut('story')]);
  handleStructureChange();
  const lastIndex = cuts().length - 1;
  const select = document.getElementById(`cut-${lastIndex}-template`);
  if (select) select.focus();
}

export function initCutEditor(newOptions) {
  options = newOptions;

  document.getElementById('cut-start').addEventListener('click', startFromForm);
  document.getElementById('cut-rebuild').addEventListener('click', startFromForm);
  document.getElementById('cut-add').addEventListener('click', addCut);
  document.getElementById('cut-add-bottom').addEventListener('click', addCut);
  document.getElementById('cut-copy-all').addEventListener('click', () => {
    options.copyText(buildAllImagePrompts(cuts()), `${cuts().length}컷 프롬프트를 모두 복사했어요!`);
  });
}
