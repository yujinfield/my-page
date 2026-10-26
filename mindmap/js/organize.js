// 주제 정리하기: 결정 주제, 색, 자동 정렬, 가지 접기, 순서 번호

import * as model from "./model.js";
import * as geo from "./geometry.js";
import * as render from "./render.js";
import * as history from "./history.js";
import { layoutTree } from "./layout.js";

let state;
let update;
let showStatus;

export function setupOrganize(appState, actions) {
  state = appState;
  update = actions.update;
  showStatus = actions.showStatus;
}

function selectedNodeId() {
  return state.selected && state.selected.kind === "node" ? state.selected.id : null;
}

// 고른 주제 id. 없으면 안내 문구
export function needNode() {
  const id = selectedNodeId();
  if (!id) showStatus("먼저 주제를 고르세요", 2);
  return id;
}

// ---------- 결정 주제 ----------

// 결정(마름모) ↔ 보통 주제. 처음 결정으로 바꾸면 "예"·"아니오" 갈래를 만들어 줌
export function toggleDecision() {
  const id = needNode();
  if (!id) return;
  const node = model.findNode(state.map, id);
  history.remember(state.map);
  if (node.shape === "decision") {
    node.shape = "topic";
    update();
    return;
  }
  node.shape = "decision";
  update(); // 마름모 크기를 재야 갈래 자리를 정할 수 있음
  const hasFlowOut = state.map.edges.some((e) => e.type === "flow" && e.from === id);
  if (!hasFlowOut) {
    const spots = geo.decisionBranchPositions(render.getBoxes(state.map)[id]);
    for (const [label, pos] of [["예", spots.yes], ["아니오", spots.no]]) {
      const branch = model.addNode(state.map, pos.x, pos.y);
      model.addFlow(state.map, id, branch.id).label = label;
    }
    update();
  }
}

// ---------- 색 ----------

export function currentColor() {
  const node = model.findNode(state.map, selectedNodeId());
  return node ? node.color || null : null;
}

export function setColor(color) {
  const node = model.findNode(state.map, selectedNodeId());
  if (!node || (node.color || null) === color) return;
  history.remember(state.map);
  node.color = color;
  update();
}

// C 키: 색을 차례로 바꿈 (없음 → 빨강 → … → 보라 → 없음)
export function cycleColor() {
  if (!needNode()) return;
  const choices = [null, ...model.NODE_COLORS];
  const now = choices.indexOf(currentColor());
  setColor(choices[(now + 1) % choices.length]);
}

// ---------- 자동 정렬 ----------

// 고른 주제가 있으면 그 나무만, 없으면 모든 나무를 정렬
export function autoLayout() {
  const id = selectedNodeId();
  const roots = id
    ? [model.rootOf(state.map, id)]
    : state.map.nodes.filter((node) => !model.parentOf(state.map, node.id)).map((node) => node.id);
  const boxes = render.getBoxes(state.map);
  history.remember(state.map);
  for (const rootId of roots) {
    if (!boxes[rootId]) continue;
    const positions = layoutTree(state.map, rootId, boxes);
    for (const [nodeId, pos] of Object.entries(positions)) {
      const dx = Math.round(pos.x - boxes[nodeId].x);
      const dy = Math.round(pos.y - boxes[nodeId].y);
      // 접힌 주제는 숨은 자손도 같이 옮겨야 펼쳤을 때 제자리에 있음
      const node = model.findNode(state.map, nodeId);
      const ids = node.collapsed ? model.subtreeOf(state.map, nodeId) : [nodeId];
      model.moveNodes(state.map, ids, dx, dy);
    }
  }
  update();
}

// ---------- 가지 접기 ----------

export function toggleCollapse(id = needNode()) {
  if (!id) return;
  if (model.childrenOf(state.map, id).length === 0) {
    showStatus("접을 가지가 없어요", 2);
    return;
  }
  const node = model.findNode(state.map, id);
  history.remember(state.map);
  node.collapsed = !node.collapsed;
  update();
}

// ---------- 순서 번호 ----------

export function toggleNumbers() {
  state.map.showNumbers = !state.map.showNumbers;
  update();
}
