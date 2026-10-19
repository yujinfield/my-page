// 격자 → 컷 사각형 좌표 계산 (순수 함수, DOM 없음)
// 좌표는 모두 원본 이미지 픽셀 기준입니다.

export const DEFAULT_GRID = {
  rows: 3,
  cols: 4,
  margin: 0,     // 바깥 여백(px). 균등 분할일 때만 씀
  gap: 0,        // 컷 사이 간격(px). 경계선 양쪽으로 반씩 잘라 냄
  xLines: null,  // 자동 맞추기로 찾은 세로 경계선 (cols + 1개). null이면 균등 분할
  yLines: null,  // 가로 경계선 (rows + 1개)
};

export const EMPTY_NUDGE = { top: 0, right: 0, bottom: 0, left: 0 };

function toInt(value, min, max, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function isLineList(lines, length) {
  return Array.isArray(lines) && lines.length === length && lines.every((n) => Number.isFinite(n));
}

// 저장된 격자의 빈 칸·잘못된 값을 기본값으로
export function normalizeGrid(saved) {
  const grid = { ...DEFAULT_GRID };
  if (!saved) return grid;
  grid.rows = toInt(saved.rows, 1, 10, grid.rows);
  grid.cols = toInt(saved.cols, 1, 10, grid.cols);
  grid.margin = toInt(saved.margin, 0, 500, 0);
  grid.gap = toInt(saved.gap, 0, 200, 0);
  if (isLineList(saved.xLines, grid.cols + 1)) grid.xLines = saved.xLines.slice();
  if (isLineList(saved.yLines, grid.rows + 1)) grid.yLines = saved.yLines.slice();
  return grid;
}

export function normalizeNudge(saved) {
  const nudge = { ...EMPTY_NUDGE };
  if (!saved) return nudge;
  Object.keys(nudge).forEach((side) => { nudge[side] = toInt(saved[side], -500, 500, 0); });
  return nudge;
}

export function cutCount(grid) {
  return grid.rows * grid.cols;
}

// 01, 02 … 처럼 두 자리 번호
export function cutLabel(index) {
  return String(index + 1).padStart(2, '0');
}

// 균등 분할 경계선: [시작, …, 끝]
function evenLines(length, count, margin, gap) {
  const inner = length - margin * 2;
  const lines = [];
  for (let i = 0; i <= count; i += 1) {
    lines.push(margin + (inner * i) / count);
  }
  // 바깥 여백이 있으면 첫·마지막 선에는 간격을 적용하지 않도록 반 간격만큼 밀어 둠
  lines[0] -= gap / 2;
  lines[count] += gap / 2;
  return lines;
}

// 컷 사각형 목록 (왼쪽 → 오른쪽, 위 → 아래)
export function computeCutRects(width, height, grid) {
  const xLines = grid.xLines || evenLines(width, grid.cols, grid.margin, grid.gap);
  const yLines = grid.yLines || evenLines(height, grid.rows, grid.margin, grid.gap);
  const half = grid.gap / 2;
  const rects = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const left = Math.max(0, xLines[col] + half);
      const top = Math.max(0, yLines[row] + half);
      const right = Math.min(width, xLines[col + 1] - half);
      const bottom = Math.min(height, yLines[row + 1] - half);
      rects.push({
        x: Math.round(left),
        y: Math.round(top),
        width: Math.max(1, Math.round(right - left)),
        height: Math.max(1, Math.round(bottom - top)),
      });
    }
  }
  return rects;
}

// 미세 조정: 양수면 그쪽 가장자리를 바깥으로 넓힘, 음수면 안쪽으로 좁힘
export function applyNudge(rect, nudge, width, height) {
  const left = Math.min(width - 1, Math.max(0, rect.x - nudge.left));
  const top = Math.min(height - 1, Math.max(0, rect.y - nudge.top));
  const right = Math.min(width, Math.max(left + 1, rect.x + rect.width + nudge.right));
  const bottom = Math.min(height, Math.max(top + 1, rect.y + rect.height + nudge.bottom));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

// 자동 맞추기: 밝기 목록(열 또는 행마다 평균 밝기)에서 컷 사이 간격(가장 밝은 줄)을 찾음
// 균등하게 나눈 위치 근처(칸 크기의 ±15%)에서 가장 밝은 줄을 경계선으로 고릅니다.
export function findLines(brightness, count) {
  const length = brightness.length;
  const cellSize = length / count;
  const range = Math.max(1, Math.round(cellSize * 0.15));
  const lines = [0];
  for (let i = 1; i < count; i += 1) {
    const expected = Math.round(cellSize * i);
    let best = expected;
    for (let k = expected - range; k <= expected + range; k += 1) {
      if (k > 0 && k < length && brightness[k] > brightness[best]) best = k;
    }
    lines.push(best);
  }
  lines.push(length);
  return lines;
}
