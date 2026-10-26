// 실행 취소 / 다시 실행 (DOM 사용 안 함)
//
// 지도를 바꾸기 직전의 주제·연결선을 글자(JSON)로 찍어 두었다가 되돌립니다.
// 화면 위치(view)는 기록하지 않습니다.

const LIMIT = 100;
let undoStack = [];
let redoStack = [];

export function snapshot(map) {
  return JSON.stringify({ nodes: map.nodes, edges: map.edges });
}

// 지도를 바꾸기 직전에 부름. 끌기처럼 시작할 때 미리 찍어 둔 것이 있으면 넘김
export function remember(map, saved = snapshot(map)) {
  undoStack.push(saved);
  if (undoStack.length > LIMIT) undoStack.shift();
  redoStack = [];
}

export function undo(map) {
  if (undoStack.length === 0) return false;
  redoStack.push(snapshot(map));
  restore(map, undoStack.pop());
  return true;
}

export function redo(map) {
  if (redoStack.length === 0) return false;
  undoStack.push(snapshot(map));
  restore(map, redoStack.pop());
  return true;
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}

function restore(map, saved) {
  const data = JSON.parse(saved);
  map.nodes = data.nodes;
  map.edges = data.edges;
}
