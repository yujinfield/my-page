// 컷 목록 화면: 컷 카드(원본 4:5 미리보기 + 다시 그린 그림), 문구·수정 메모, 미세 조정, 버튼
// 사용자가 쓴 글은 항상 value / textContent로 넣습니다.

import { cutLabel } from './grid.js';

const NUDGE_SIDES = [
  { key: 'top', label: '위' },
  { key: 'bottom', label: '아래' },
  { key: 'left', label: '왼쪽' },
  { key: 'right', label: '오른쪽' },
];

let cards = [];

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function makeButton(text, ariaLabel, onClick) {
  const button = make('button', 'button', text);
  button.type = 'button';
  button.setAttribute('aria-label', ariaLabel);
  button.addEventListener('click', onClick);
  return button;
}

function makeTextarea(labelText, value, rows, onInput) {
  const label = make('label', 'field', labelText);
  const textarea = document.createElement('textarea');
  textarea.rows = rows;
  textarea.value = value;
  textarea.addEventListener('input', () => onInput(textarea.value));
  label.append(textarea);
  return { label, textarea };
}

function makeNudgeBox(index, cut, onNudge) {
  const details = make('details', 'nudge');
  details.append(make('summary', '', '위치 미세 조정 (px)'));
  const row = make('div', 'nudge-row');
  const inputs = {};
  NUDGE_SIDES.forEach((side) => {
    const label = make('label', 'field', side.label);
    const input = document.createElement('input');
    input.type = 'number';
    input.value = cut.nudge[side.key];
    input.setAttribute('aria-label', `${cutLabel(index)}컷 ${side.label} 가장자리 (양수는 넓힘, 음수는 좁힘)`);
    input.addEventListener('change', () => {
      const nudge = {};
      NUDGE_SIDES.forEach((s) => { nudge[s.key] = Number(inputs[s.key].value) || 0; });
      onNudge(index, nudge);
    });
    inputs[side.key] = input;
    label.append(input);
    row.append(label);
  });
  details.append(row, make('p', 'hint', '양수는 그쪽으로 넓히고, 음수는 안쪽으로 좁혀요.'));
  return details;
}

function makeCard(index, cut, handlers) {
  const label = cutLabel(index);
  const card = make('article', 'cut-card');
  card.setAttribute('aria-label', `${label}컷`);
  card.append(make('h3', 'cut-title', `${label}컷`));

  const pair = make('div', 'cut-pair');
  const original = make('figure', 'cut-figure');
  const originalBox = make('div', 'cut-frame');
  original.append(originalBox, make('figcaption', '', '원본 (4:5)'));

  const redraw = make('figure', 'cut-figure');
  const redrawBox = make('div', 'cut-frame');
  const redrawImage = make('img', 'cut-image');
  redrawImage.alt = `${label}컷 다시 그린 그림`;
  redrawImage.hidden = true;
  const redrawEmpty = make('p', 'cut-placeholder', '아직 다시 그리지 않았어요');
  redrawBox.append(redrawImage, redrawEmpty);
  redraw.append(redrawBox, make('figcaption', '', '다시 그린 그림'));
  pair.append(original, redraw);

  const nav = make('div', 'row redraw-nav');
  const prevButton = makeButton('◀ 이전', `${label}컷 이전 그림 보기`, () => handlers.onMoveRedraw(index, -1));
  const counter = make('span', 'hint');
  const nextButton = makeButton('다음 ▶', `${label}컷 다음 그림 보기`, () => handlers.onMoveRedraw(index, 1));
  nav.append(prevButton, counter, nextButton);
  nav.hidden = true;

  const text = makeTextarea('컷 내용 (그림 속 문구·그림 설명)', cut.text, 5, (value) => handlers.onText(index, 'text', value));
  const memo = makeTextarea('수정 메모 (다시 그릴 때 바꿀 점)', cut.memo, 2, (value) => handlers.onText(index, 'memo', value));

  const actions = make('div', 'row');
  const downloadButton = makeButton('⬇️ 4:5 원본', `${label}컷 4:5 원본 내려받기`, () => handlers.onDownload(index));
  const redrawButton = makeButton('🎨 다시 그리기', `${label}컷 GPT로 다시 그리기`, () => handlers.onRedraw(index));
  redrawButton.classList.add('button-primary');
  const reviseButton = makeButton('✏️ 이 그림 고치기', `${label}컷 지금 그림을 수정 메모대로 고치기`, () => handlers.onRevise(index));
  const downloadRedrawButton = makeButton('⬇️ 다시 그린 그림', `${label}컷 다시 그린 그림 내려받기`, () => handlers.onDownloadRedraw(index));
  reviseButton.hidden = true;
  downloadRedrawButton.hidden = true;
  actions.append(downloadButton, redrawButton, reviseButton, downloadRedrawButton);

  const status = make('p', 'status');
  status.setAttribute('role', 'status');

  card.append(pair, nav, text.label, memo.label, makeNudgeBox(index, cut, handlers.onNudge), actions, status);

  return {
    card, originalBox, redrawImage, redrawEmpty, nav, counter, prevButton, nextButton,
    textArea: text.textarea, redrawButton, reviseButton, downloadRedrawButton, status,
  };
}

// 컷 카드 전체를 새로 그림 (격자가 바뀌었을 때)
export function renderCuts(container, cuts, handlers) {
  container.replaceChildren();
  cards = cuts.map((cut, index) => makeCard(index, cut, handlers));
  cards.forEach((parts) => container.append(parts.card));
}

// 원본 4:5 미리보기만 바꿈 (미세 조정·맞추는 방법이 바뀌었을 때)
export function updatePreview(index, canvas) {
  const parts = cards[index];
  if (!parts) return;
  canvas.className = 'cut-image';
  canvas.setAttribute('aria-label', `${cutLabel(index)}컷 원본 4:5 미리보기`);
  parts.originalBox.replaceChildren(canvas);
}

// 예시 대본을 불러왔을 때 글 칸 채우기
export function setCutText(index, text) {
  if (cards[index]) cards[index].textArea.value = text;
}

// redraw: { images: ['data:...'], current: 0 }
export function showRedraw(index, redraw) {
  const parts = cards[index];
  if (!parts) return;
  const hasImage = redraw && redraw.images.length > 0;
  parts.redrawImage.hidden = !hasImage;
  parts.redrawEmpty.hidden = hasImage;
  parts.reviseButton.hidden = !hasImage;
  parts.downloadRedrawButton.hidden = !hasImage;
  parts.nav.hidden = !hasImage || redraw.images.length < 2;
  if (!hasImage) return;
  parts.redrawImage.src = redraw.images[redraw.current];
  parts.counter.textContent = `${redraw.current + 1} / ${redraw.images.length}`;
  parts.prevButton.disabled = redraw.current === 0;
  parts.nextButton.disabled = redraw.current === redraw.images.length - 1;
}

export function setCutStatus(index, text) {
  if (cards[index]) cards[index].status.textContent = text;
}

// 그리는 중에는 그 컷의 그리기 버튼을 막음
export function setCutBusy(index, busy) {
  const parts = cards[index];
  if (!parts) return;
  parts.redrawButton.disabled = busy;
  parts.reviseButton.disabled = busy;
  parts.card.classList.toggle('is-busy', busy);
}

export function scrollToCut(index) {
  if (cards[index]) cards[index].card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
