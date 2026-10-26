// 화살표 잇기: 연결 모드(L 키, → 연결 버튼), 잇는 중 점선, 화살표 만들기

import * as model from "./model.js";
import * as render from "./render.js";
import * as history from "./history.js";

let canvasEl;
let state;
let connectButton;
let update;
let showStatus;

export function setupLinking(canvas, appState, button, actions) {
  canvasEl = canvas;
  state = appState;
  connectButton = button;
  update = actions.update;
  showStatus = actions.showStatus;
}

export function startConnectMode() {
  const id = state.selected && state.selected.kind === "node" ? state.selected.id : null;
  if (!id) {
    showStatus("먼저 화살표가 시작할 주제를 고르세요", 2);
    return;
  }
  state.connectMode = true;
  state.connectFrom = id;
  canvasEl.classList.add("connecting");
  connectButton.setAttribute("aria-pressed", "true");
  showStatus("화살표를 이을 주제를 누르세요 (Esc 취소)");
}

export function stopConnectMode() {
  state.connectMode = false;
  state.connectFrom = null;
  canvasEl.classList.remove("connecting");
  connectButton.removeAttribute("aria-pressed");
  showStatus("");
  hidePreview();
}

// 연결 모드에서 주제를 눌렀을 때
export function connectTo(id) {
  connect(state.connectFrom, id);
  stopConnectMode();
}

export function connect(from, to) {
  state.preview = null;
  const before = history.snapshot(state.map);
  const count = state.map.edges.length;
  // 결정 주제에서 나가는 화살표는 "예", "아니오" 라벨을 차례로 붙여 줌
  const label = model.findNode(state.map, from)?.shape === "decision"
    ? model.nextDecisionLabel(state.map, from)
    : "";
  const edge = model.addFlow(state.map, from, to);
  if (!edge || state.map.edges.length === count) {
    render.refreshPositions(state); // 자기 자신이거나 이미 있는 화살표
    return;
  }
  edge.label = label;
  history.remember(state.map, before);
  state.selected = { kind: "edge", id: edge.id };
  update();
}

export function showPreview(from, point) {
  if (!from) return;
  state.preview = { from, x: point.x, y: point.y };
  render.refreshPositions(state);
}

export function hidePreview() {
  state.preview = null;
  render.refreshPositions(state);
}
