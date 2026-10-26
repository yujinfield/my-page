// 주제·연결선을 화면에 그림

import * as geo from "./geometry.js";
import { NODE_COLORS, hiddenIds, subtreeOf } from "./model.js";
import { flowOrder } from "./sequence.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const GRID_SIZE = 24;

let canvasEl;
let worldEl;
let nodesLayer;
let edgesGroup;

const sizes = new Map();     // 주제 id → { w, h } (그린 뒤 잰 크기)
const nodeEls = new Map();   // 주제 id → 주제 요소
const edgeEls = new Map();   // 연결선 id → <g> 요소
const labelEls = new Map();  // 화살표 id → 라벨 요소

export function setupRender(canvas, world, nodes, edges) {
  canvasEl = canvas;
  worldEl = world;
  nodesLayer = nodes;

  // 화살표 머리 모양 (한 번만 만들어 두고 모든 화살표가 같이 씀)
  const defs = svg("defs");
  const marker = svg("marker", {
    id: "arrow-head",
    viewBox: "0 0 10 10",
    refX: "8",
    refY: "5",
    markerWidth: "12",
    markerHeight: "12",
    markerUnits: "userSpaceOnUse",
    orient: "auto",
  });
  marker.append(svg("path", { d: "M 0 0 L 10 5 L 0 10 z", class: "arrow-head" }));
  defs.append(marker);

  edgesGroup = svg("g");
  edges.append(defs, edgesGroup);
}

// 보이는 주제의 자리와 크기 { id: { x, y, w, h, shape } } (접혀서 숨은 주제는 빠짐)
export function getBoxes(map) {
  const hidden = hiddenIds(map);
  const boxes = {};
  for (const node of map.nodes) {
    if (hidden.has(node.id)) continue;
    const size = sizes.get(node.id) || { w: 120, h: 44 };
    boxes[node.id] = { x: node.x, y: node.y, w: size.w, h: size.h, shape: node.shape };
  }
  return boxes;
}

// 전부 새로 그림 (데이터가 바뀌었을 때)
export function renderAll(state) {
  const { map } = state;
  nodesLayer.replaceChildren();
  nodeEls.clear();
  labelEls.clear();

  const hidden = hiddenIds(map);
  for (const node of map.nodes) {
    if (hidden.has(node.id)) continue;
    // 들어오는 선이 하나도 없는 주제는 굵게 (중심 주제)
    const isRoot = !map.edges.some((e) => e.to === node.id);
    const el = createNodeElement(node, isRoot);
    if (node.collapsed) el.append(foldBadge(subtreeOf(map, node.id).length - 1));
    nodeEls.set(node.id, el);
    nodesLayer.append(el);
  }
  measureSizes();
  if (map.showNumbers) addNumbers(map);

  for (const edge of map.edges) {
    if (edge.type !== "flow" || hidden.has(edge.from) || hidden.has(edge.to)) continue;
    const label = document.createElement("div");
    label.className = "edge-label";
    label.dataset.edgeId = edge.id;
    label.textContent = edge.label || "";
    labelEls.set(edge.id, label);
    nodesLayer.append(label);
  }

  drawEdges(state);
}

// 자리만 바뀌었을 때 (끌기 중) 가볍게 다시 그림
export function refreshPositions(state) {
  for (const node of state.map.nodes) {
    const el = nodeEls.get(node.id);
    if (el) placeAt(el, node.x, node.y);
  }
  drawEdges(state);
}

// 편집 중 글자가 바뀌어 크기가 달라졌을 때
export function refreshSizes(state) {
  measureSizes();
  drawEdges(state);
}

export function markSelection(state) {
  const selected = state.selected;
  for (const [id, el] of nodeEls) {
    el.classList.toggle("selected", selected?.kind === "node" && selected.id === id);
  }
  for (const [id, el] of edgeEls) {
    el.classList.toggle("selected", selected?.kind === "edge" && selected.id === id);
  }
  for (const [id, el] of labelEls) {
    el.classList.toggle("selected", selected?.kind === "edge" && selected.id === id);
  }
}

// 따라가기 재생: 지금 주제는 강조, 지나온 주제와 화살표는 그대로, 나머지는 흐리게
export function markPlayback(state) {
  const play = state.play;
  const done = new Set(play ? play.order.slice(0, play.index + 1) : []);
  const current = play ? play.order[play.index] : null;
  for (const [id, el] of nodeEls) {
    el.classList.toggle("play-current", id === current);
    el.classList.toggle("play-done", done.has(id) && id !== current);
  }
  for (const edge of state.map.edges) {
    const reached = edge.type === "flow" && done.has(edge.from) && done.has(edge.to);
    edgeEls.get(edge.id)?.classList.toggle("play-done", reached);
    labelEls.get(edge.id)?.classList.toggle("play-done", reached);
  }
}

export function applyView(view) {
  worldEl.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  // 바탕 점도 함께 움직여서 캔버스가 끝없이 이어져 보이게
  // 많이 축소해도 점이 너무 빽빽해지지 않게 간격을 두 배씩 넓힘
  let grid = GRID_SIZE * view.zoom;
  while (grid < 12) grid *= 2;
  canvasEl.style.backgroundSize = `${grid}px ${grid}px`;
  canvasEl.style.backgroundPosition = `${view.x}px ${view.y}px`;
}

export function nodeTextElement(id) {
  const el = nodeEls.get(id);
  return el ? el.querySelector(".node-text") : null;
}

export function labelElement(id) {
  return labelEls.get(id) || null;
}

function createNodeElement(node, isRoot) {
  const el = document.createElement("div");
  el.className = "node";
  if (isRoot) el.classList.add("node-root");
  if (node.shape === "decision") el.classList.add("node-decision");
  if (NODE_COLORS.includes(node.color)) el.classList.add(`color-${node.color}`);
  el.dataset.id = node.id;
  placeAt(el, node.x, node.y);

  const text = document.createElement("span");
  text.className = "node-text";
  text.textContent = node.text;

  const handle = document.createElement("div");
  handle.className = "node-handle";
  handle.title = "끌어서 다른 주제에 화살표 잇기";

  el.append(text, handle);
  return el;
}

// 접힌 주제 오른쪽의 "+숨은 개수" 표시 (누르면 펼침)
function foldBadge(count) {
  const badge = document.createElement("span");
  badge.className = "node-fold";
  badge.textContent = `+${count}`;
  badge.title = "눌러서 펼치기";
  return badge;
}

// 화살표 순서대로 주제 왼쪽 위에 1, 2, 3… 번호
function addNumbers(map) {
  const order = flowOrder(map, getBoxes(map));
  order.forEach((id, index) => {
    const number = document.createElement("span");
    number.className = "node-number";
    number.textContent = String(index + 1);
    nodeEls.get(id).append(number);
  });
}

function placeAt(el, x, y) {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function measureSizes() {
  for (const [id, el] of nodeEls) {
    sizes.set(id, { w: el.offsetWidth, h: el.offsetHeight });
  }
}

function drawEdges(state) {
  const { map, preview } = state;
  const boxes = getBoxes(map);
  edgesGroup.replaceChildren();
  edgeEls.clear();

  for (const edge of map.edges) {
    const from = boxes[edge.from];
    const to = boxes[edge.to];
    if (!from || !to) continue;

    let d;
    if (edge.type === "flow") {
      const line = geo.flowLine(from, to);
      d = `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`;
      const label = labelEls.get(edge.id);
      if (label) placeAt(label, (line.x1 + line.x2) / 2, (line.y1 + line.y2) / 2);
    } else {
      d = geo.branchPath(from, to);
    }

    const group = svg("g", { class: `edge edge-${edge.type}`, "data-edge-id": edge.id });
    const lineAttrs = { d, class: "edge-line" };
    if (edge.type === "flow") lineAttrs["marker-end"] = "url(#arrow-head)";
    group.append(svg("path", { d, class: "edge-hit" }), svg("path", lineAttrs));
    edgeEls.set(edge.id, group);
    edgesGroup.append(group);
  }

  // 화살표를 잇는 중이면 손가락/마우스까지 점선
  if (preview && boxes[preview.from]) {
    const start = geo.boxEdgePoint(boxes[preview.from], preview);
    edgesGroup.append(svg("path", {
      d: `M ${start.x} ${start.y} L ${preview.x} ${preview.y}`,
      class: "edge-preview",
    }));
  }

  markSelection(state);
  markPlayback(state);
}

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  return el;
}
