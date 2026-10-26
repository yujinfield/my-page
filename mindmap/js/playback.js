// 화살표 따라가기 재생: 화살표 순서대로 주제를 하나씩 강조하며 화면을 옮김

import * as render from "./render.js";
import * as viewport from "./viewport.js";
import { flowOrder } from "./sequence.js";

let canvasEl;
let state;
let bar;
let counter;
let showStatus;

export function setupPlayback(canvas, appState, elements, actions) {
  canvasEl = canvas;
  state = appState;
  bar = elements.bar;
  counter = elements.counter;
  showStatus = actions.showStatus;
}

export function startPlayback() {
  const order = flowOrder(state.map, render.getBoxes(state.map));
  if (order.length === 0) {
    showStatus("화살표로 이어진 주제가 없어요. 화살표로 순서를 이어 주세요", 3);
    return;
  }
  state.play = { order, index: 0 };
  state.selected = null;
  render.markSelection(state);
  canvasEl.classList.add("playing");
  bar.hidden = false;
  show();
}

export function stopPlayback() {
  if (!state.play) return;
  state.play = null;
  canvasEl.classList.remove("playing");
  bar.hidden = true;
  render.markPlayback(state);
}

export function next() {
  if (state.play && state.play.index < state.play.order.length - 1) {
    state.play.index += 1;
    show();
  }
}

export function previous() {
  if (state.play && state.play.index > 0) {
    state.play.index -= 1;
    show();
  }
}

// 재생 중에 주제를 누르면 그 단계로 건너뜀
export function jumpTo(id) {
  const index = state.play ? state.play.order.indexOf(id) : -1;
  if (index >= 0) {
    state.play.index = index;
    show();
  }
}

function show() {
  const { order, index } = state.play;
  counter.textContent = `${index + 1} / ${order.length}`;
  render.markPlayback(state);
  viewport.centerOn(order[index]);
}
