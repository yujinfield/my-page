// 주제·연결선을 화면에 그림

import * as geo from "./geometry.js";
import { parentOf } from "./model.js";

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

// 각 주제의 자리와 크기 { id: { x, y, w, h } }
export function getBoxes(map) {
  const boxes = {};
  for (const node of map.nodes) {
    const size = sizes.get(node.id) || { w: 120, h: 44 };
    boxes[node.id] = { x: node.x, y: node.y, w: size.w, h: size.h };
  }
  return boxes;
}

// 전부 새로 그림 (데이터가 바뀌었을 때)
export function renderAll(state) {
  const { map } = state;
  nodesLayer.replaceChildren();
  nodeEls.clear();
  labelEls.clear();

  for (const node of map.nodes) {
    const isRoot = parentOf(map, node.id) === null;
    const el = createNodeElement(node, isRoot);
    nodeEls.set(node.id, el);
    nodesLayer.append(el);
  }
  measureSizes();

  for (const edge of map.edges) {
    if (edge.type !== "flow") continue;
    const label = document.createElement("div");
    label.className = "edge-label";
    label.dataset.edgeId = edge.id;
    label.textContent = edge.label || "";
    labelEls.set(edge.id, label);
    nodesLayer.append(label);
  }

  drawEdges(state);
  markSelection(state);
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

export function applyView(view) {
  worldEl.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
  // 바탕 점도 함께 움직여서 캔버스가 끝없이 이어져 보이게
  const grid = GRID_SIZE * view.zoom;
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
  el.className = isRoot ? "node node-root" : "node";
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
}

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  return el;
}
