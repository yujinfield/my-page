// 캔버스 조작: 빈 곳 끌기(화면 이동), 휠·핀치(확대), 주제 끌기, 화살표 잇기
//
// 실제로 데이터를 바꾸는 일은 app.js가 넘겨준 api 함수가 합니다.

import * as geo from "./geometry.js";
import { subtreeOf } from "./model.js";

export function setupCanvas(canvas, api) {
  const pointers = new Map(); // 화면에 닿아 있는 손가락·마우스 { id → 점 }
  let drag = null;            // 지금 하고 있는 끌기 { type: "pan" | "node" | "connect" | "pinch", ... }

  // 이벤트 위치를 캔버스 왼쪽 위 기준 화면 좌표로
  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function worldPoint(event) {
    const p = localPoint(event);
    return geo.screenToWorld(api.state.map.view, p.x, p.y);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.target.isContentEditable) return; // 편집 중인 글자 안에서는 커서만 옮김
    if (event.target.closest(".play-bar")) return; // 재생 막대 버튼은 그대로 누르게
    if (event.button !== 0 && event.button !== 1) return;

    // 다른 곳을 누르면 하던 편집을 마침
    if (document.activeElement && document.activeElement.isContentEditable) {
      document.activeElement.blur();
    }
    event.preventDefault();
    canvas.focus({ preventScroll: true });

    pointers.set(event.pointerId, localPoint(event));
    if (pointers.size === 2) {
      startPinch();
      return;
    }
    if (pointers.size > 2) return;

    const world = worldPoint(event);
    const handle = event.target.closest(".node-handle");
    const nodeEl = event.target.closest(".node");
    const edgeEl = event.target.closest("[data-edge-id]");

    if (handle && nodeEl) {
      drag = { type: "connect", from: nodeEl.dataset.id };
      api.showPreview(drag.from, world);
    } else if (nodeEl && api.state.play) {
      api.jumpTo(nodeEl.dataset.id); // 재생 중에는 주제를 눌러 그 단계로
    } else if (nodeEl && event.target.closest(".node-fold")) {
      api.toggleCollapse(nodeEl.dataset.id); // "+숫자"를 누르면 펼침
    } else if (nodeEl) {
      const id = nodeEl.dataset.id;
      if (api.state.connectMode) {
        api.connectTo(id);
        return;
      }
      api.select("node", id);
      // before: 실행 취소용으로 옮기기 전 지도를 찍어 둠
      drag = { type: "node", ids: subtreeOf(api.state.map, id), last: world, moved: false, before: api.snapshot() };
    } else if (edgeEl) {
      if (api.state.connectMode) api.stopConnectMode();
      api.select("edge", edgeEl.dataset.edgeId);
    } else {
      if (api.state.connectMode) api.stopConnectMode();
      api.select(null);
      drag = { type: "pan", last: localPoint(event) };
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, localPoint(event));

    if (!drag) {
      // L 키로 연결 모드일 때는 마우스를 따라 점선
      if (api.state.connectMode && event.target.closest && canvas.contains(event.target)) {
        api.showPreview(api.state.connectFrom, worldPoint(event));
      }
      return;
    }

    if (drag.type === "pinch") {
      movePinch();
    } else if (drag.type === "pan") {
      const p = localPoint(event);
      const view = api.state.map.view;
      api.setView({ ...view, x: view.x + p.x - drag.last.x, y: view.y + p.y - drag.last.y });
      drag.last = p;
    } else if (drag.type === "node") {
      const world = worldPoint(event);
      const dx = world.x - drag.last.x;
      const dy = world.y - drag.last.y;
      if (dx !== 0 || dy !== 0) {
        api.moveNodes(drag.ids, dx, dy);
        drag.last = world;
        drag.moved = true;
      }
    } else if (drag.type === "connect") {
      api.showPreview(drag.from, worldPoint(event));
    }
  });

  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (!drag) return;

    if (drag.type === "connect") {
      // 손을 뗀 곳에 있는 주제와 이음
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const nodeEl = target ? target.closest(".node") : null;
      if (nodeEl) api.connect(drag.from, nodeEl.dataset.id);
      else api.hidePreview();
    } else if (drag.type === "node" && drag.moved) {
      api.finishMove(drag.before);
    }

    if (drag.type !== "pinch" || pointers.size < 2) drag = null;
  }

  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);

  // 두 손가락으로 벌리고 오므려 확대/축소
  function startPinch() {
    const [a, b] = [...pointers.values()];
    drag = {
      type: "pinch",
      startDistance: distance(a, b),
      startMiddle: middle(a, b),
      startView: { ...api.state.map.view },
    };
  }

  function movePinch() {
    const [a, b] = [...pointers.values()];
    const view = drag.startView;
    const anchor = geo.screenToWorld(view, drag.startMiddle.x, drag.startMiddle.y);
    const zoom = geo.clampZoom(view.zoom * distance(a, b) / drag.startDistance);
    const mid = middle(a, b);
    api.setView({ zoom, x: mid.x - anchor.x * zoom, y: mid.y - anchor.y * zoom });
  }

  // 휠: 화면 이동. Ctrl(또는 ⌘)+휠, 트랙패드 핀치: 확대/축소
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : 1; // 줄 단위로 오는 브라우저 대비
    const dx = event.deltaX * unit;
    const dy = event.deltaY * unit;
    const view = api.state.map.view;
    if (event.ctrlKey || event.metaKey) {
      const p = localPoint(event);
      const step = Math.max(-30, Math.min(30, dy)); // 마우스 휠 한 칸에 너무 많이 커지지 않게
      api.setView(geo.zoomAt(view, p.x, p.y, view.zoom * Math.exp(-step * 0.01)));
    } else {
      api.setView({ ...view, x: view.x - dx, y: view.y - dy });
    }
  }, { passive: false });

  // 두 번 누르기: 주제·라벨은 편집, 빈 곳은 새 주제
  canvas.addEventListener("dblclick", (event) => {
    if (event.target.isContentEditable || api.state.play) return;
    const nodeEl = event.target.closest(".node");
    const edgeEl = event.target.closest("[data-edge-id]");
    if (nodeEl) api.editNode(nodeEl.dataset.id);
    else if (edgeEl) api.editEdge(edgeEl.dataset.edgeId);
    else {
      const world = worldPoint(event);
      api.createNodeAt(world.x - 60, world.y - 22);
    }
  });
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) || 1;
}

function middle(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
