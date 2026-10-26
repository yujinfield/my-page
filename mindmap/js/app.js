// 진입점. 상태를 들고 각 모듈을 연결합니다.

import { loadMap, saveMap, loadTheme } from "./store.js";
import * as model from "./model.js";
import * as geo from "./geometry.js";
import * as render from "./render.js";
import * as history from "./history.js";
import * as viewport from "./viewport.js";
import { setupCanvas } from "./canvas.js";
import { startEditing } from "./edit.js";
import { setupKeyboard } from "./keyboard.js";
import { setupPalette } from "./palette.js";
import * as linking from "./linking.js";
import { applyTheme, toggleTheme } from "./theme.js";
import * as organize from "./organize.js";
import * as playback from "./playback.js";

const canvas = document.getElementById("canvas");
const statusEl = document.getElementById("status");
const emptyHint = document.getElementById("empty-hint");
const undoButton = document.getElementById("btn-undo");
const redoButton = document.getElementById("btn-redo");
const numbersButton = document.getElementById("btn-numbers");

const state = {
  map: loadMap() || model.createMap(),
  selected: null,     // 고른 것 { kind: "node" | "edge", id }
  preview: null,      // 화살표를 잇는 중일 때 점선 { from, x, y }
  connectMode: false, // L 키(→ 연결 버튼)로 연결 모드를 켰는지
  connectFrom: null,  // 연결 모드에서 화살표가 시작하는 주제 id
  play: null,         // 따라가기 재생 중일 때 { order: [주제 id], index }
};

// ---------- 저장·다시 그리기 ----------

let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveMap(state.map), 300);
}

// 데이터가 바뀌면 다시 그리고 저장 (재생 중이었다면 순서가 달라질 수 있으니 재생을 끝냄)
function update() {
  playback.stopPlayback();
  render.renderAll(state);
  numbersButton.setAttribute("aria-pressed", String(Boolean(state.map.showNumbers)));
  emptyHint.hidden = state.map.nodes.length > 0;
  undoButton.disabled = !history.canUndo();
  redoButton.disabled = !history.canRedo();
  scheduleSave();
}

function select(kind, id) {
  state.selected = kind ? { kind, id } : null;
  render.markSelection(state);
}

function selectedNodeId() {
  return state.selected && state.selected.kind === "node" ? state.selected.id : null;
}

function showStatus(text, seconds = 0) {
  statusEl.textContent = text;
  statusEl.hidden = !text;
  if (seconds) setTimeout(() => showStatus(""), seconds * 1000);
}

// ---------- 실행 취소 ----------

function undo() {
  if (history.undo(state.map)) afterHistory();
}

function redo() {
  if (history.redo(state.map)) afterHistory();
}

// 되돌린 뒤 고른 것이 사라졌으면 선택 해제
function afterHistory() {
  const sel = state.selected;
  if (sel) {
    const exists = sel.kind === "node" ? model.findNode(state.map, sel.id) : model.findEdge(state.map, sel.id);
    if (!exists) state.selected = null;
  }
  update();
}

// ---------- 주제 추가·편집·삭제 ----------

function createNodeAt(x, y) {
  history.remember(state.map);
  afterAdd(model.addNode(state.map, x, y));
}

function afterAdd(node) {
  update();
  select("node", node.id);
  viewport.ensureVisible(node.id);
  editNode(node.id, true);
}

function addChild() {
  const parentId = selectedNodeId();
  if (!parentId) {
    // 고른 주제가 없으면 화면 가운데에 새 주제
    const center = viewport.centerPoint();
    createNodeAt(center.x - 60, center.y - 22);
    return;
  }
  const parent = model.findNode(state.map, parentId);
  if (parent.collapsed) {
    // 접힌 주제에 자식을 붙이면 먼저 펼쳐서 자식들 자리를 잼
    parent.collapsed = false;
    update();
  }
  const boxes = render.getBoxes(state.map);
  const childBoxes = model.childrenOf(state.map, parentId).map((id) => boxes[id]);
  // 부모가 할아버지보다 왼쪽에 있으면 자식도 왼쪽으로 뻗음
  const grandId = model.parentOf(state.map, parentId);
  const side = grandId && boxes[parentId].x < boxes[grandId].x ? "left" : "right";
  const pos = geo.childPosition(boxes[parentId], childBoxes, side);
  history.remember(state.map);
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
  history.remember(state.map);
  afterAdd(model.addChild(state.map, parentId, pos.x, pos.y));
}

// isNew: 방금 만든 주제면 글자 입력을 "추가"와 한 번에 되돌리도록 따로 기록하지 않음
function editNode(id, isNew = false) {
  const node = model.findNode(state.map, id);
  const el = render.nodeTextElement(id);
  if (!node || !el) return;
  startEditing(el, node.text, (text, how) => {
    if (text !== node.text && !isNew) history.remember(state.map);
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
    if (text !== (edge.label || "")) history.remember(state.map);
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
  history.remember(state.map);
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

// 방향키로 가까운 주제 고르기
function moveSelection(key) {
  const boxes = render.getBoxes(state.map);
  const current = selectedNodeId();
  const next = current ? geo.findNeighbor(boxes, current, key) : Object.keys(boxes)[0];
  if (!next) return;
  select("node", next);
  viewport.ensureVisible(next);
}

// ---------- 도구 막대 ----------

function onClick(id, action) {
  document.getElementById(id).addEventListener("click", action);
}

onClick("btn-child", addChild);
onClick("btn-sibling", addSibling);
onClick("btn-edit", editSelected);
onClick("btn-connect", () => (state.connectMode ? linking.stopConnectMode() : linking.startConnectMode()));
onClick("btn-decision", organize.toggleDecision);
onClick("btn-layout", organize.autoLayout);
onClick("btn-fold", () => organize.toggleCollapse());
onClick("btn-numbers", organize.toggleNumbers);
onClick("btn-play", () => (state.play ? playback.stopPlayback() : playback.startPlayback()));
onClick("btn-play-prev", playback.previous);
onClick("btn-play-next", playback.next);
onClick("btn-play-stop", playback.stopPlayback);
onClick("btn-delete", deleteSelected);
onClick("btn-undo", undo);
onClick("btn-redo", redo);
onClick("btn-zoom-out", () => viewport.zoomBy(1 / 1.2));
onClick("btn-zoom-in", () => viewport.zoomBy(1.2));
onClick("btn-zoom-reset", viewport.resetZoom);
onClick("btn-fit", viewport.fitAll);
onClick("btn-theme", toggleTheme);

setupPalette(document.getElementById("btn-color"), document.getElementById("color-panel"), {
  canOpen: () => Boolean(organize.needNode()),
  currentColor: organize.currentColor,
  onPick: organize.setColor,
});

// ---------- 시작 ----------

applyTheme(loadTheme());
render.setupRender(
  canvas,
  document.getElementById("world"),
  document.getElementById("nodes"),
  document.getElementById("edges"),
);
viewport.setupViewport(canvas, state, document.getElementById("zoom-label"), scheduleSave);
linking.setupLinking(canvas, state, document.getElementById("btn-connect"), { update, showStatus });
organize.setupOrganize(state, { update, showStatus });
playback.setupPlayback(canvas, state, {
  bar: document.getElementById("play-bar"),
  counter: document.getElementById("play-counter"),
}, { showStatus });
update();
if (state.map.view) viewport.setView(state.map.view);
else viewport.fitAll();

setupKeyboard(canvas, {
  state,
  selectedNodeId,
  select,
  stopConnectMode: linking.stopConnectMode,
  startConnectMode: linking.startConnectMode,
  addChild,
  addSibling,
  editEdge,
  editSelected,
  deleteSelected,
  moveSelection,
  toggleDecision: organize.toggleDecision,
  cycleColor: organize.cycleColor,
  autoLayout: organize.autoLayout,
  toggleCollapse: () => organize.toggleCollapse(),
  toggleNumbers: organize.toggleNumbers,
  startPlayback: playback.startPlayback,
  stopPlayback: playback.stopPlayback,
  nextStep: playback.next,
  previousStep: playback.previous,
  undo,
  redo,
  zoomBy: viewport.zoomBy,
  fitAll: viewport.fitAll,
  resetZoom: viewport.resetZoom,
});

setupCanvas(canvas, {
  state,
  select,
  setView: viewport.setView,
  snapshot: () => history.snapshot(state.map),
  moveNodes(ids, dx, dy) {
    model.moveNodes(state.map, ids, dx, dy);
    render.refreshPositions(state);
  },
  finishMove(before) {
    history.remember(state.map, before);
    update();
  },
  showPreview: linking.showPreview,
  hidePreview: linking.hidePreview,
  connect: linking.connect,
  connectTo: linking.connectTo,
  stopConnectMode: linking.stopConnectMode,
  editNode,
  editEdge,
  createNodeAt,
  toggleCollapse: organize.toggleCollapse,
  jumpTo: playback.jumpTo,
});
