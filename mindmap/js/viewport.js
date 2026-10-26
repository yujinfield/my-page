// 화면 이동·확대: 지금 보이는 위치(view)를 바꾸는 함수들

import * as geo from "./geometry.js";
import * as render from "./render.js";

let canvasEl;
let state;
let zoomLabel;
let onChange;

export function setupViewport(canvas, appState, label, changed) {
  canvasEl = canvas;
  state = appState;
  zoomLabel = label;
  onChange = changed;
}

export function canvasSize() {
  const rect = canvasEl.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

export function setView(view) {
  state.map.view = view;
  render.applyView(view);
  zoomLabel.textContent = `${Math.round(view.zoom * 100)}%`;
  onChange();
}

export function zoomBy(factor) {
  const { width, height } = canvasSize();
  const view = state.map.view;
  setView(geo.zoomAt(view, width / 2, height / 2, view.zoom * factor));
}

export function resetZoom() {
  const { width, height } = canvasSize();
  setView(geo.zoomAt(state.map.view, width / 2, height / 2, 1));
}

export function fitAll() {
  const { width, height } = canvasSize();
  const boxes = Object.values(render.getBoxes(state.map));
  if (boxes.length === 0) {
    setView({ x: width / 2, y: height / 2, zoom: 1 });
    return;
  }
  setView(geo.fitView(boxes, width, height));
}

// 주제가 화면 밖에 있으면 화면 가운데로 옮김
export function ensureVisible(id) {
  const box = render.getBoxes(state.map)[id];
  if (!box) return;
  const { width, height } = canvasSize();
  const view = state.map.view;
  const left = box.x * view.zoom + view.x;
  const top = box.y * view.zoom + view.y;
  const right = left + box.w * view.zoom;
  const bottom = top + box.h * view.zoom;
  if (left >= 0 && top >= 0 && right <= width && bottom <= height) return;
  centerOn(id);
}

// 주제를 화면 가운데로
export function centerOn(id) {
  const box = render.getBoxes(state.map)[id];
  if (!box) return;
  const { width, height } = canvasSize();
  const view = state.map.view;
  const center = geo.centerOf(box);
  setView({ ...view, x: width / 2 - center.x * view.zoom, y: height / 2 - center.y * view.zoom });
}

// 화면 가운데의 캔버스 좌표
export function centerPoint() {
  const { width, height } = canvasSize();
  return geo.screenToWorld(state.map.view, width / 2, height / 2);
}
