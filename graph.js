// graph.js：依赖图、脏传播与拓扑序
//
// 依赖方向：node.deps 里列出的是“我依赖谁”。
// 脏传播沿反向边（依赖我 -> 我）传播：改了一个节点，所有传递依赖者都脏。

// 数字按数值、其余按 localeCompare，保证 id 升序稳定（也兼容纯字符串 id）。
export function compareId(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (a !== "" && b !== "" && Number.isFinite(na) && Number.isFinite(nb)) {
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

// 构建 id -> 节点表与正向依赖边（node -> 依赖它的节点）。
// 不存在的依赖边直接忽略；重复依赖只计一次。
export function buildGraph(nodes) {
  const byId = new Map();
  for (const node of nodes) {
    if (!byId.has(node.id)) byId.set(node.id, node);
  }
  const dependents = new Map();
  const indegree = new Map();
  for (const id of byId.keys()) {
    dependents.set(id, []);
    indegree.set(id, 0);
  }
  for (const node of byId.values()) {
    let seenDep = null;
    for (const dep of node.deps || []) {
      if (!byId.has(dep)) continue;
      if (seenDep === null) seenDep = new Set();
      if (seenDep.has(dep)) continue;
      seenDep.add(dep);
      dependents.get(dep).push(node.id);
      indegree.set(node.id, indegree.get(node.id) + 1);
    }
  }
  return { byId, dependents, indegree };
}

// 受影响的节点 = 被改节点及其全部传递依赖者。
// 一次 BFS 线性扫描，每个节点最多入队一次；结果按 id 升序、无重复。
export function dirtySet(nodes, changed) {
  const { byId, dependents } = buildGraph(nodes);
  const seen = new Set();
  const queue = [];
  for (const id of changed || []) {
    if (byId.has(id) && !seen.has(id)) {
      seen.add(id);
      queue.push(id);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    for (const dep of dependents.get(queue[head])) {
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(dep);
      }
    }
  }
  return queue.sort(compareId);
}

// 分层 Kahn 拓扑序：每层（同层）按 id 升序。
// 依赖成环时抛出 code = "E_CYCLE" 的错误，并带上没能入序的节点（不丢节点、不死循环）。
export function topoOrder(nodes) {
  const { byId, indegree, dependents } = buildGraph(nodes);
  const remaining = new Map(indegree);
  let layer = [];
  for (const [id, deg] of remaining) {
    if (deg === 0) layer.push(id);
  }
  layer.sort(compareId);
  const order = [];
  while (layer.length) {
    order.push(...layer);
    const next = [];
    for (const id of layer) {
      for (const child of dependents.get(id)) {
        const deg = remaining.get(child) - 1;
        remaining.set(child, deg);
        if (deg === 0) next.push(child);
      }
    }
    next.sort(compareId);
    layer = next;
  }
  if (order.length !== byId.size) {
    const cyclic = [];
    for (const [id, deg] of remaining) {
      if (deg > 0) cyclic.push(id);
    }
    cyclic.sort(compareId);
    const error = new Error("dependency cycle detected: " + cyclic.join(", "));
    error.code = "E_CYCLE";
    error.cyclic = cyclic;
    throw error;
  }
  return order;
}
