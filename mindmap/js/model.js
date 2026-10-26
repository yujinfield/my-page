// 마인드맵 데이터(주제·연결선)를 다루는 함수 (DOM 사용 안 함)
//
// 연결선 종류
//   branch: 마인드맵 가지 (부모 → 자식). 주제마다 부모는 하나뿐
//   flow:   논리·순서 화살표 (아무 주제끼리나). 라벨을 달 수 있음

let idCount = 0;

export function makeId(prefix) {
  idCount += 1;
  return `${prefix}_${Date.now()}_${idCount}`;
}

export function createMap() {
  return {
    version: 1,
    nodes: [{ id: makeId("n"), text: "중심 주제", x: 0, y: 0 }],
    edges: [],
    view: null,
  };
}

export function findNode(map, id) {
  return map.nodes.find((node) => node.id === id) || null;
}

export function findEdge(map, id) {
  return map.edges.find((edge) => edge.id === id) || null;
}

// 부모 주제 id. 없으면(가장 위 주제) null
export function parentOf(map, id) {
  const edge = map.edges.find((e) => e.type === "branch" && e.to === id);
  return edge ? edge.from : null;
}

export function childrenOf(map, id) {
  return map.edges
    .filter((e) => e.type === "branch" && e.from === id)
    .map((e) => e.to);
}

// 자기 자신과 그 아래 모든 자손 id
export function subtreeOf(map, id) {
  const result = [id];
  for (let i = 0; i < result.length; i++) {
    result.push(...childrenOf(map, result[i]));
  }
  return result;
}

export function addNode(map, x, y, text = "") {
  const node = { id: makeId("n"), text, x: Math.round(x), y: Math.round(y) };
  map.nodes.push(node);
  return node;
}

export function addChild(map, parentId, x, y) {
  const node = addNode(map, x, y);
  map.edges.push({ id: makeId("e"), from: parentId, to: node.id, type: "branch", label: "" });
  return node;
}

// 화살표 추가. 자기 자신이면 null, 이미 있으면 그 화살표를 돌려줌
export function addFlow(map, from, to) {
  if (from === to) return null;
  const existing = map.edges.find((e) => e.type === "flow" && e.from === from && e.to === to);
  if (existing) return existing;
  const edge = { id: makeId("e"), from, to, type: "flow", label: "" };
  map.edges.push(edge);
  return edge;
}

// 주제를 지우면 이어진 연결선도 함께 지움
export function removeNodes(map, ids) {
  const removed = new Set(ids);
  map.nodes = map.nodes.filter((node) => !removed.has(node.id));
  map.edges = map.edges.filter((e) => !removed.has(e.from) && !removed.has(e.to));
}

export function removeEdge(map, id) {
  map.edges = map.edges.filter((e) => e.id !== id);
}

export function moveNodes(map, ids, dx, dy) {
  for (const id of ids) {
    const node = findNode(map, id);
    if (node) {
      node.x += dx;
      node.y += dy;
    }
  }
}
