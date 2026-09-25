// app.js：渲染结果
import { dirtySet } from "./graph.js";
import { recompute } from "./cache.js";

export function render(spec) {
  const nodes = spec.nodes;
  const dirty = dirtySet(nodes, spec.changed);
  const plan = recompute(nodes, dirty, spec.budget);
  return { dirty: dirty, recomputed: plan.recomputed, hits: plan.hits,
           stale: plan.stale, budget_used: plan.used };
}
