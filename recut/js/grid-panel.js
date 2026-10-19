// 격자 설정 입력칸, 원본 위에 자르는 선 겹쳐 그리기

import { normalizeGrid, cutLabel } from './grid.js';

const el = {};

// 입력칸 → 저장된 격자 값 채우기
export function fillGridInputs(grid, fitMode) {
  el.rows.value = grid.rows;
  el.cols.value = grid.cols;
  el.margin.value = grid.margin;
  el.gap.value = grid.gap;
  el.fitRadios.forEach((radio) => { radio.checked = radio.value === fitMode; });
  el.mode.textContent = grid.xLines ? '자동 맞춘 경계선 사용 중' : '균등 분할 사용 중';
}

// onGridChange(새 격자) / onFitChange("fit" | "fill") / onAuto() / onEven()
export function setupGridPanel({ getGrid, onGridChange, onFitChange, onAuto, onEven }) {
  el.rows = document.getElementById('grid-rows');
  el.cols = document.getElementById('grid-cols');
  el.margin = document.getElementById('grid-margin');
  el.gap = document.getElementById('grid-gap');
  el.mode = document.getElementById('grid-mode');
  el.fitRadios = document.querySelectorAll('input[name="fit-mode"]');
  el.canvas = document.getElementById('grid-preview');
  el.empty = document.getElementById('grid-empty');

  [el.rows, el.cols, el.margin, el.gap].forEach((input) => {
    input.addEventListener('change', () => {
      const old = getGrid();
      const grid = normalizeGrid({
        ...old,
        rows: el.rows.value,
        cols: el.cols.value,
        margin: el.margin.value,
        gap: el.gap.value,
      });
      // 행·열 수가 바뀌면 자동으로 찾은 경계선은 더 이상 맞지 않으니 버림
      if (grid.rows !== old.rows || grid.cols !== old.cols) {
        grid.xLines = null;
        grid.yLines = null;
      }
      onGridChange(grid);
    });
  });

  el.fitRadios.forEach((radio) => {
    radio.addEventListener('change', () => onFitChange(radio.value));
  });

  document.getElementById('auto-grid-button').addEventListener('click', onAuto);
  document.getElementById('even-grid-button').addEventListener('click', onEven);
}

// 원본을 화면 폭에 맞게 그리고, 컷 사각형과 번호를 겹쳐 그림
export function drawGridPreview(image, rects) {
  const canvas = el.canvas;
  if (!image) {
    canvas.hidden = true;
    el.empty.hidden = false;
    return;
  }
  canvas.hidden = false;
  el.empty.hidden = true;

  // 캔버스는 원본 픽셀 크기 그대로 두고, 화면 크기는 CSS가 줄여 줌
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const lineWidth = Math.max(2, Math.round(image.naturalWidth / 300));
  const fontSize = Math.max(14, Math.round(image.naturalWidth / 30));
  context.lineWidth = lineWidth;
  context.strokeStyle = accent;
  context.font = `bold ${fontSize}px sans-serif`;
  context.textBaseline = 'top';

  rects.forEach((rect, index) => {
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    const label = cutLabel(index);
    const padding = lineWidth * 2;
    const labelWidth = context.measureText(label).width + padding * 2;
    context.fillStyle = accent;
    context.fillRect(rect.x, rect.y, labelWidth, fontSize + padding * 2);
    context.fillStyle = '#ffffff';
    context.fillText(label, rect.x + padding, rect.y + padding);
  });
}
