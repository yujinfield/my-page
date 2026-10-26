// 진입점. 상태를 들고 각 모듈을 연결합니다.

import { loadMap, saveMap, loadTheme, saveTheme } from "./store.js";
import * as model from "./model.js";
import * as geo from "./geometry.js";
import * as render from "./render.js";
import { setupCanvas } from "./canvas.js";
import { startEditing } from "./edit.js";
import { setupKeyboard } from "./keyboard.js";

const canvas = document.getElementById("canvas");
const zoomLabel = document.getElementById("zoom-label");
const statusEl = document.getElementById("status");
const emptyHint = document.getElementById("empty-hint");
const connectButton = document.getElementById("btn-connect");

const state = {
  map: loadMap() || model.createMap(),
  selected: null,     // 고른 것 { kind: "node" | "edge", id }
  preview: null,      // 화살표를 잇는 중일 때 점선 { from, x, y }
  connectMode: false, // L 키(→ 연결 버튼)로 연결 모드를 켰는지
  connectFrom: null,  // 연결 모드에서 화살표가 시작하는 주제 id
};

// ---------- 저장·다시 그리기 ----------

let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveMap(state.map), 300);
}

// 데이터가 바뀌면 다시 그리고 저장
function update() {
  render.renderAll(state);
  emptyHint.hidden = state.map.nodes.length > 0;
  scheduleSave();
}

function setView(view) {
  state.map.view = view;
  render.applyView(view);
  zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
  scheduleSave();
}

function select(kind, id) {
  state.selected = kind ? { kind, id } : null;
  render.markSelection(state);
}

function selectedNodeId() {
  return state.selected && state.selected.kind === "node" ? state.selected.id : null;
}

function showStatus(text) {
  statusEl.textContent = text;
  statusEl.hidden = !text;
}

// ---------- 주제 추가·편집·삭제 ----------

function canvasSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function createNodeAt(x, y) {
  afterAdd(model.addNode(state.map, x, y));
}

function afterAdd(node) {
  update();
  select("node", node.id);
  ensureVisible(node.id);
  editNode(node.id);
}

function addChild() {
  const parentId = selectedNodeId();
  if (!parentId) {
    // 고른 주제가 없으면 화면 가운데에 새 주제
    const { width, height } = canvasSize();
    const center = geo.screenToWorld(state.map.view, width / 2, height / 2);
    createNodeAt(center.x - 60, center.y - 22);
    return;
  }
  const boxes = render.getBoxes(state.map);
  const childBoxes = model.childrenOf(state.map, parentId).map((id) => boxes[id]);
  // 부모가 할아버지보다 왼쪽에 있으면 자식도 왼쪽으로 뻗음
  const grandId = model.parentOf(state.map, parentId);
  const side = grandId && boxes[parentId].x < boxes[grandId].x ? "left" : "right";
  const pos = geo.childPosition(boxes[parentId], childBoxes, side);
  afterAdd(model.addChild(state.map, parentId, pos.x, pos.y));
}

function addSibling() {
  const id = selectedNodeId();
  const parentId = id ? model.parentOf(state.map, id) : null;
  if (!parentId) {
    // 가장 위 주제에는 형제 대신 자식을 붙임
    addChild();
    return;
  }
  const boxes = render.getBoxes(state.map);
  const siblingBoxes = model.childrenOf(state.map, parentId).map((childId) => boxes[childId]);
  const pos = geo.siblingPosition(boxes[id], siblingBoxes);
  afterAdd(model.addChild(state.map, parentId, pos.x, pos.y));
}

function editNode(id) {
  const node = model.findNode(state.map, id);
  const el = render.nodeTextElement(id);
  if (!node || !el) return;
  startEditing(el, node.text, (text, how) => {
    node.text = text;
    update();
    canvas.focus({ preventScroll: true });
    if (how === "tab") addChild();
  }, () => render.refreshSizes(state));
}

function editEdge(id) {
  const edge = model.findEdge(state.map, id);
  const el = render.labelElement(id);
  if (!edge || !el) return; // 가지 선에는 라벨이 없음
  select("edge", id);
  startEditing(el, edge.label || "", (text) => {
    edge.label = text;
    update();
    canvas.focus({ preventScroll: true });
  });
}

function editSelected() {
  if (!state.selected) return;
  if (state.selected.kind === "node") editNode(state.selected.id);
  else editEdge(state.selected.id);
}

function deleteSelected() {
  if (!state.selected) return;
  const { kind, id } = state.selected;
  let next = null;
  if (kind === "node") {
    next = model.parentOf(state.map, id);
    model.removeNodes(state.map, model.subtreeOf(state.map, id));
  } else {
    model.removeEdge(state.map, id);
  }
  state.selected = next ? { kind: "node", id: next } : null;
  update();
}

// ---------- 화살표 잇기 ----------

function startConnectMode() {
  const id = selectedNodeId();
  if (!id) {
    showStatus("먼저 화살표가 시작할 주제를 고르세요");
    setTimeout(() => showStatus(""), 2000);
    return;
  }
  state.connectMode = true;
  state.connectFrom = id;
  canvas.classList.add("connecting");
  connectButton.setAttribute("aria-pressed", "true");
  showStatus("화살표를 이을 주제를 누르세요 (Esc 취소)");
}

function stopConnectMode() {
  state.connectMode = false;
  state.connectFrom = null;
  canvas.classList.remove("connecting");
  connectButton.removeAttribute("aria-pressed");
  showStatus("");
  hidePreview();
}

function connect(from, to) {
  state.preview = null;
  const edge = model.addFlow(state.map, from, to);
  if (!edge) {
    render.refreshPositions(state);
    return;
  }
  state.selected = { kind: "edge", id: edge.id };
  update();
}

function showPreview(from, point) {
  if (!from) return;
  state.preview = { from, x: point.x, y: point.y };
  render.refreshPositions(state);
}

function hidePreview() {
  state.preview = null;
  render.refreshPositions(state);
}

// ---------- 화면 이동·확대 ----------

function zoomBy(factor) {
  const { width, height } = canvasSize();
  const view = state.map.view;
  setView(geo.zoomAt(view, width / 2, height / 2, view.zoom * factor));
}

function resetZoom() {
  const { width, height } = canvasSize();
  setView(geo.zoomAt(state.map.view, width / 2, height / 2, 1));
}

function fitAll() {
  const { width, height } = canvasSize();
  const boxes = Object.values(render.getBoxes(state.map));
  if (boxes.length === 0) {
    setView({ x: width / 2, y: height / 2, zoom: 1 });
    return;
  }
  setView(geo.fitView(boxes, width, height));
}

// 주제가 화면 밖에 있으면 화면 가운데로 옮김
function ensureVisible(id) {
  const box = render.getBoxes(state.map)[id];
  if (!box) return;
  const { width, height } = canvasSize();
  const view = state.map.view;
  const left = box.x * view.zoom + view.x;
  const top = box.y * view.zoom + view.y;
  const right = left + box.w * view.zoom;
  const bottom = top + box.h * view.zoom;
  if (left >= 0 && top >= 0 && right <= width && bottom <= height) return;
  const center = geo.centerOf(box);
  setView({ ...view, x: width / 2 - center.x * view.zoom, y: height / 2 - center.y * view.zoom });
}

// 방향키로 가까운 주제 고르기
function moveSelection(key) {
  const boxes = render.getBoxes(state.map);
  const current = selectedNodeId();
  const next = current ? geo.findNeighbor(boxes, current, key) : Object.keys(boxes)[0];
  if (!next) return;
  select("node", next);
  ensureVisible(next);
}

// ---------- 테마 ----------

function applyTheme(theme) {
  if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme
    || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  saveTheme(next);
}

// ---------- 도구 막대 ----------

function onClick(id, action) {
  document.getElementById(id).addEventListener("click", action);
}

onClick("btn-child", addChild);
onClick("btn-sibling", addSibling);
onClick("btn-edit", editSelected);
onClick("btn-connect", () => (state.connectMode ? stopConnectMode() : startConnectMode()));
onClick("btn-delete", deleteSelected);
onClick("btn-zoom-out", () => zoomBy(1 / 1.2));
onClick("btn-zoom-in", () => zoomBy(1.2));
onClick("btn-zoom-reset", resetZoom);
onClick("btn-fit", fitAll);
onClick("btn-theme", toggleTheme);

// ---------- 시작 ----------

applyTheme(loadTheme());
render.setupRender(
  canvas,
  document.getElementById("world"),
  document.getElementById("nodes"),
  document.getElementById("edges"),
);
update();
if (state.map.view) setView(state.map.view);
else fitAll();

setupKeyboard(canvas, {
  state,
  selectedNodeId,
  select,
  stopConnectMode,
  startConnectMode,
  addChild,
  addSibling,
  editEdge,
  editSelected,
  deleteSelected,
  moveSelection,
  zoomBy,
  fitAll,
  resetZoom,
});

setupCanvas(canvas, {
  state,
  select,
  setView,
  moveNodes(ids, dx, dy) {
    model.moveNodes(state.map, ids, dx, dy);
    render.refreshPositions(state);
  },
  finishMove: scheduleSave,
  showPreview,
  hidePreview,
  connect,
  connectTo(id) {
    connect(state.connectFrom, id);
    stopConnectMode();
  },
  stopConnectMode,
  editNode,
  editEdge,
  createNodeAt,
});
