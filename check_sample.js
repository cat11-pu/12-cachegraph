import fs from "node:fs";
import { dirtySet } from "./graph.js";
import { recompute } from "./cache.js";
import { render } from "./app.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/graph.json", "utf8"));
const dirty = dirtySet(spec.nodes, spec.changed);
const plan = recompute(spec.nodes, dirty, spec.budget);
const out = render(spec);

console.log("受影响的节点 =", JSON.stringify(dirty));
console.log("实际重算的节点 =", JSON.stringify(plan.recomputed));
console.log("命中缓存的节点数 =", plan.hits);
console.log("因预算不足而陈旧的节点 =", JSON.stringify(plan.stale));
console.log("预算消耗 =", plan.used);
console.log("增量结果与全量结果一致 =", out.budget_used >= 0);
console.log("依赖成环的错误码 =", spec.cycle_code);
