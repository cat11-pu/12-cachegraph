// graph.js：依赖图与脏传播（被改节点 + 全部传递依赖者，按 id 升序，去重）
export function dirtySet(nodes, changed) {
  const dependents = new Map();
  for (const node of nodes) {
    for (const dep of node.deps || []) {
      let list = dependents.get(dep);
      if (!list) {
        list = [];
        dependents.set(dep, list);
      }
      list.push(node.id);
    }
  }
  const seen = new Set();
  const queue = [];
  for (const id of changed) {
    if (!seen.has(id)) {
      seen.add(id);
      queue.push(id);
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const id = queue[head];
    const list = dependents.get(id);
    if (!list) continue;
    for (const next of list) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return Array.from(seen).sort();
}
