// 화살표를 따라가는 순서 (DOM 사용 안 함)
//
// - 들어오는 화살표가 없는 주제에서 시작 (여럿이면 위 → 아래, 왼쪽 → 오른쪽)
// - 화살표를 따라 한 갈래를 끝까지 간 뒤 다음 갈래로 (깊이 우선)
// - 한 주제에서 여러 화살표가 나가면 "예"를 먼저, "아니오"를 마지막에, 나머지는 자리 순
// - 고리(순환)만 남은 주제는 자리 순으로 이어서 매김
// boxes에 없는(숨은) 주제는 건너뜀

export function flowOrder(map, boxes) {
  const flows = map.edges.filter((e) => e.type === "flow" && boxes[e.from] && boxes[e.to]);
  if (flows.length === 0) return [];

  const byPosition = (a, b) => boxes[a].y - boxes[b].y || boxes[a].x - boxes[b].x;
  const labelRank = (edge) => (edge.label === "예" ? 0 : edge.label === "아니오" ? 2 : 1);
  const edgeOrder = (a, b) => labelRank(a) - labelRank(b) || byPosition(a.to, b.to);

  const inFlow = [...new Set(flows.flatMap((e) => [e.from, e.to]))].sort(byPosition);
  const hasIncoming = new Set(flows.map((e) => e.to));
  const order = [];
  const seen = new Set();

  function visit(id) {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(id);
    const nexts = flows.filter((e) => e.from === id).sort(edgeOrder);
    for (const edge of nexts) visit(edge.to);
  }

  for (const id of inFlow) {
    if (!hasIncoming.has(id)) visit(id);
  }
  for (const id of inFlow) visit(id);
  return order;
}
