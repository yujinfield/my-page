// 좌표 계산 (DOM 사용 안 함)
//
// 화면 좌표 = 캔버스 좌표 × zoom + (view.x, view.y)
// box는 주제 하나의 자리와 크기: { x, y, w, h } (캔버스 좌표)

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

const GAP_X = 60;            // 부모와 자식 사이 가로 간격
const GAP_Y = 16;            // 형제끼리 세로 간격
const NEW_NODE_WIDTH = 120;  // 아직 그리기 전인 새 주제의 대략적인 너비

export function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function screenToWorld(view, sx, sy) {
  return { x: (sx - view.x) / view.zoom, y: (sy - view.y) / view.zoom };
}

// 화면의 한 점(sx, sy)을 중심으로 확대/축소
export function zoomAt(view, sx, sy, newZoom) {
  const zoom = clampZoom(newZoom);
  const point = screenToWorld(view, sx, sy);
  return { zoom, x: sx - point.x * zoom, y: sy - point.y * zoom };
}

export function centerOf(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

// 여러 상자를 모두 감싸는 상자
export function boundsOf(boxes) {
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

// 모든 상자가 화면(width × height)에 들어오는 view. 100%보다 크게 키우지는 않음
export function fitView(boxes, width, height, padding = 60) {
  const b = boundsOf(boxes);
  const zoom = clampZoom(Math.min((width - padding * 2) / b.w, (height - padding * 2) / b.h, 1));
  const c = centerOf(b);
  return { zoom, x: width / 2 - c.x * zoom, y: height / 2 - c.y * zoom };
}

// 새 자식 자리: 부모 옆(오른쪽 또는 왼쪽), 기존 자식들 아래
export function childPosition(parentBox, childBoxes, side) {
  const x = side === "left"
    ? parentBox.x - GAP_X - NEW_NODE_WIDTH
    : parentBox.x + parentBox.w + GAP_X;
  const y = childBoxes.length > 0
    ? Math.max(...childBoxes.map((b) => b.y + b.h)) + GAP_Y
    : parentBox.y;
  return { x, y };
}

// 새 형제 자리: 지금 주제와 같은 세로줄, 형제들 맨 아래
export function siblingPosition(box, siblingBoxes) {
  return { x: box.x, y: Math.max(...siblingBoxes.map((b) => b.y + b.h)) + GAP_Y };
}

// 가지 선: 부모 옆면 가운데 → 자식 옆면 가운데를 잇는 부드러운 곡선 (SVG path)
export function branchPath(fromBox, toBox) {
  const toRight = centerOf(toBox).x >= centerOf(fromBox).x;
  const sx = toRight ? fromBox.x + fromBox.w : fromBox.x;
  const sy = fromBox.y + fromBox.h / 2;
  const ex = toRight ? toBox.x : toBox.x + toBox.w;
  const ey = toBox.y + toBox.h / 2;
  const bend = (ex - sx) / 2;
  return `M ${sx} ${sy} C ${sx + bend} ${sy}, ${ex - bend} ${ey}, ${ex} ${ey}`;
}

// 상자 가운데에서 target 쪽으로 나갈 때 상자 테두리(+gap)와 만나는 점
export function boxEdgePoint(box, target, gap = 4) {
  const c = centerOf(box);
  const dx = target.x - c.x;
  const dy = target.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const tx = dx === 0 ? Infinity : (box.w / 2 + gap) / Math.abs(dx);
  const ty = dy === 0 ? Infinity : (box.h / 2 + gap) / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

// 화살표: 두 상자의 테두리끼리 잇는 직선
export function flowLine(fromBox, toBox) {
  const start = boxEdgePoint(fromBox, centerOf(toBox));
  const end = boxEdgePoint(toBox, centerOf(fromBox), 6);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

// 방향키 쪽에 있는 가장 가까운 주제 id (옆으로 벗어난 거리는 2배로 침)
export function findNeighbor(boxes, currentId, key) {
  const dir = DIRECTIONS[key];
  const from = centerOf(boxes[currentId]);
  let bestId = null;
  let bestScore = Infinity;
  for (const [id, box] of Object.entries(boxes)) {
    if (id === currentId) continue;
    const c = centerOf(box);
    const dx = c.x - from.x;
    const dy = c.y - from.y;
    const along = dx * dir.x + dy * dir.y;
    if (along <= 0) continue;
    const across = Math.abs(dx * dir.y - dy * dir.x);
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return bestId;
}
