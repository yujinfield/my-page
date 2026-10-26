// 자동 정렬: 가지(부모 → 자식) 나무를 겹치지 않게 다시 놓을 자리 계산 (DOM 사용 안 함)
//
// - 뿌리(가장 위 주제)는 그 자리에 둠
// - 뿌리의 자식은 지금 뿌리 왼쪽에 있으면 왼쪽, 아니면 오른쪽으로 뻗음. 손자부터는 부모 쪽을 따름
// - 자식들은 세로로 쌓고, 그 묶음의 가운데를 부모 가운데에 맞춤
// - 접힌 주제의 자식은 계산하지 않음

import { childrenOf, findNode } from "./model.js";

const GAP_X = 60;
const GAP_Y = 16;

// rootId 나무의 새 자리 { id: { x, y } }
export function layoutTree(map, rootId, boxes) {
  const positions = {};
  const heights = new Map();

  function kids(id) {
    if (findNode(map, id).collapsed) return [];
    return childrenOf(map, id).filter((childId) => boxes[childId]);
  }

  // 이 주제와 자손이 차지하는 세로 길이
  function height(id) {
    if (heights.has(id)) return heights.get(id);
    const children = kids(id);
    const stacked = children.reduce((sum, childId) => sum + height(childId), 0)
      + GAP_Y * Math.max(0, children.length - 1);
    const result = Math.max(boxes[id].h, stacked);
    heights.set(id, result);
    return result;
  }

  // 자식 묶음을 parentId 옆에 세로로 쌓음
  function placeChildren(parentId, children, side) {
    const parent = positions[parentId];
    const box = boxes[parentId];
    const total = children.reduce((sum, id) => sum + height(id), 0) + GAP_Y * (children.length - 1);
    let top = parent.y + box.h / 2 - total / 2;
    for (const id of children) {
      const h = height(id);
      const centerY = top + h / 2;
      const x = side === "left" ? parent.x - GAP_X - boxes[id].w : parent.x + box.w + GAP_X;
      positions[id] = { x, y: centerY - boxes[id].h / 2 };
      placeChildren(id, kids(id), side);
      top += h + GAP_Y;
    }
  }

  const root = boxes[rootId];
  positions[rootId] = { x: root.x, y: root.y };
  const rootCenterX = root.x + root.w / 2;
  const children = kids(rootId);
  const left = children.filter((id) => boxes[id].x + boxes[id].w / 2 < rootCenterX);
  const right = children.filter((id) => !left.includes(id));
  if (right.length > 0) placeChildren(rootId, right, "right");
  if (left.length > 0) placeChildren(rootId, left, "left");
  return positions;
}
