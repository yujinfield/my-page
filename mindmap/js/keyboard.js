// 키보드 단축키. 실제 동작은 app.js가 넘겨준 api 함수가 합니다.
//
// 편집 중에는 동작하지 않고, 버튼에 초점이 있을 때 Tab·Enter·Space는 브라우저 기본 동작으로 둡니다.

export function setupKeyboard(canvas, api) {
  document.addEventListener("keydown", (event) => {
    if (event.target.isContentEditable) return; // 편집 중에는 브라우저의 글자 되돌리기 사용

    // 따라가기 재생 중: 다음/이전/끝내기만
    if (api.state.play) {
      // 재생 막대 버튼에 초점이 있으면 Enter·Space는 버튼 누르기로 둠
      const onButton = event.target.closest && event.target.closest("button");
      if (onButton && (event.key === "Enter" || event.key === " ")) return;
      const playKeys = {
        ArrowRight: api.nextStep, ArrowDown: api.nextStep, " ": api.nextStep, Enter: api.nextStep,
        ArrowLeft: api.previousStep, ArrowUp: api.previousStep, Escape: api.stopPlayback,
      };
      if (playKeys[event.key]) {
        event.preventDefault();
        playKeys[event.key]();
      }
      return;
    }

    // Ctrl/⌘+Z 되돌리기, Ctrl/⌘+Shift+Z 또는 Ctrl+Y 다시 실행
    if ((event.ctrlKey || event.metaKey) && (event.code === "KeyZ" || event.code === "KeyY")) {
      event.preventDefault();
      if (event.code === "KeyZ" && !event.shiftKey) api.undo();
      else api.redo();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Escape") {
      if (api.state.connectMode) api.stopConnectMode();
      else api.select(null);
      return;
    }
    // 도구 막대 버튼에 초점이 있을 때 Tab·Enter·Space는 브라우저 기본 동작(초점 이동, 버튼 누르기)으로 둠
    const key = event.key;
    const onButton = event.target !== canvas && event.target !== document.body;
    if (onButton && (key === "Tab" || key === "Enter" || key === " ")) return;

    if (key === "Tab") {
      // 고른 주제가 없으면 Tab은 원래대로 다음 버튼으로 초점 이동
      if (!api.selectedNodeId()) return;
      event.preventDefault();
      api.addChild();
    } else if (key === "Enter") {
      event.preventDefault();
      if (api.state.selected && api.state.selected.kind === "edge") api.editEdge(api.state.selected.id);
      else api.addSibling();
    } else if (key === " " || key === "F2") {
      event.preventDefault();
      api.editSelected();
    } else if (key === "Delete" || key === "Backspace") {
      event.preventDefault();
      api.deleteSelected();
    } else if (key.startsWith("Arrow")) {
      event.preventDefault();
      api.moveSelection(key);
    } else if (event.code === "KeyL") {
      api.startConnectMode();
    } else if (event.code === "KeyD") {
      api.toggleDecision();
    } else if (event.code === "KeyC") {
      api.cycleColor();
    } else if (event.code === "KeyA") {
      api.autoLayout();
    } else if (event.code === "KeyF") {
      api.toggleCollapse();
    } else if (event.code === "KeyN") {
      api.toggleNumbers();
    } else if (event.code === "KeyP") {
      api.startPlayback();
    } else if (key === "+" || key === "=") {
      api.zoomBy(1.2);
    } else if (key === "-") {
      api.zoomBy(1 / 1.2);
    } else if (key === "0") {
      api.fitAll();
    } else if (key === "1") {
      api.resetZoom();
    }
  });
}
