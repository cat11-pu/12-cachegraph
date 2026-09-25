// cache.js：缓存与预算
//
// recompute(nodes, dirty, budget) 按拓扑序重算脏节点（同层按 id 升序）：
//   recomputed —— 预算内实际重算的脏节点（拓扑序）
//   hits       —— 拓扑序里不需要重算的节点数（缓存仍有效）
//   stale      —— 预算用尽后剩余的脏节点，只做陈旧标记，不当成有效结果
//   used       —— 实际消耗的预算（按节点数计）
// 依赖成环时由 topoOrder 抛出 code = "E_CYCLE"。

import { topoOrder } from "./graph.js";

export function recompute(nodes, dirty, budget) {
  const order = topoOrder(nodes);
  const dirtySetNow = new Set(dirty);
  const limit = Number.isFinite(budget) ? Math.max(0, Math.floor(budget)) : order.length;

  const recomputed = [];
  const stale = [];
  let remaining = limit;
  for (const id of order) {
    if (!dirtySetNow.has(id)) continue;
    if (remaining > 0) {
      recomputed.push(id);
      remaining -= 1;
    } else {
      stale.push(id);
    }
  }

  return {
    recomputed,
    hits: order.length - dirtySetNow.size,
    stale,
    used: recomputed.length,
  };
}
