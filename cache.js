// cache.js：缓存与预算（基线：全部重算、不计命中）
export function recompute(nodes, dirty, budget) {
  return { recomputed: nodes.map((node) => node.id), hits: 0, stale: [], used: nodes.length };
}
