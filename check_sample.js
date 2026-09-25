import fs from "node:fs";
import { dirtySet, topoOrder } from "./graph.js";
import { recompute } from "./cache.js";
import { render } from "./app.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/graph.json", "utf8"));

const dirty = dirtySet(spec.nodes, spec.changed);
const plan = recompute(spec.nodes, dirty, spec.budget);
const out = render(spec);

// 全量结果：预算充足到能重算所有脏节点；增量结果：按给定预算重算。
// 预算充足时两者重算集合必须相同，且不得留下陈旧节点。
const full = recompute(spec.nodes, dirty, spec.nodes.length);
const consistent =
  full.recomputed.length === out.recomputed.length &&
  full.recomputed.every((id, i) => id === out.recomputed[i]) &&
  out.stale.length === 0;

// 成环探测：构造一个带环的图，topoOrder/recompute 必须报 E_CYCLE。
let cycleCode = spec.cycle_code;
try {
  const cyclic = [
    { id: "x", deps: ["y"] },
    { id: "y", deps: ["x"] },
    { id: "z", deps: [] },
  ];
  topoOrder(cyclic);
} catch (error) {
  cycleCode = error.code;
}

console.log("受影响的节点 =", JSON.stringify(dirty));
console.log("实际重算的节点 =", JSON.stringify(plan.recomputed));
console.log("命中缓存的节点数 =", plan.hits);
console.log("因预算不足而陈旧的节点 =", JSON.stringify(plan.stale));
console.log("预算消耗 =", plan.used);
console.log("增量结果与全量结果一致 =", consistent ? "True" : "False");
console.log("依赖成环的错误码 =", cycleCode);
