// cache.js：缓存与预算（按拓扑序重算脏节点，预算耗尽后剩余脏节点标记为陈旧）
export function recompute(nodes, dirty, budget) {
  const indegree = new Map();
  const dependents = new Map();
  for (const node of nodes) {
    if (!indegree.has(node.id)) indegree.set(node.id, 0);
    for (const dep of node.deps || []) {
      indegree.set(node.id, (indegree.get(node.id) || 0) + 1);
      let list = dependents.get(dep);
      if (!list) {
        list = [];
        dependents.set(dep, list);
      }
      list.push(node.id);
    }
  }

  // 小顶堆：同层可选节点里按 id 升序取出
  const heap = [];
  const push = function (id) {
    heap.push(id);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent] <= heap[i]) break;
      const tmp = heap[parent];
      heap[parent] = heap[i];
      heap[i] = tmp;
      i = parent;
    }
  };
  const pop = function () {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
        if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
        if (smallest === i) break;
        const tmp = heap[smallest];
        heap[smallest] = heap[i];
        heap[i] = tmp;
        i = smallest;
      }
    }
    return top;
  };

  for (const entry of indegree) {
    if (entry[1] === 0) push(entry[0]);
  }

  const order = [];
  while (heap.length > 0) {
    const id = pop();
    order.push(id);
    const list = dependents.get(id);
    if (!list) continue;
    for (const next of list) {
      const degree = indegree.get(next) - 1;
      indegree.set(next, degree);
      if (degree === 0) push(next);
    }
  }

  if (order.length < indegree.size) {
    const remaining = [];
    for (const entry of indegree) {
      if (entry[1] > 0) remaining.push(entry[0]);
    }
    remaining.sort();
    const error = new Error("E_CYCLE: dependency cycle involving " + remaining.join(","));
    error.code = "E_CYCLE";
    error.nodes = remaining;
    throw error;
  }

  const dirtySet = new Set(dirty);
  const recomputed = [];
  const stale = [];
  let hits = 0;
  let used = 0;
  for (const id of order) {
    if (!dirtySet.has(id)) {
      hits += 1;
    } else if (used < budget) {
      recomputed.push(id);
      used += 1;
    } else {
      stale.push(id);
    }
  }
  return { recomputed: recomputed, hits: hits, stale: stale, used: used };
}
