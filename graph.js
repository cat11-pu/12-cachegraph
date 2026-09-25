// graph.js：依赖图与脏传播（基线：只标记直接被改的节点）
export function dirtySet(nodes, changed) {
  return changed.slice();
}
