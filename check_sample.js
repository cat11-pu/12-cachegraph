import fs from "node:fs";
import { dirtySet } from "./graph.js";
import { recompute } from "./cache.js";
import { render } from "./app.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/graph.json", "utf8"));
const dirty = dirtySet(spec.nodes, spec.changed);
const plan = recompute(spec.nodes, dirty, spec.budget);
const out = render(spec);

// 一致性：旧版本全量结果作为缓存，改动后只增量重算脏节点，与全量重算对比
function evaluateAll(nodes, versions, cache, only) {
  const order = recompute(nodes, nodes.map((node) => node.id), nodes.length).recomputed;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const values = new Map(cache);
  for (const id of order) {
    if (only && !only.has(id)) continue;
    const node = byId.get(id);
    let value = versions.get(id);
    for (const dep of node.deps || []) value += values.get(dep);
    values.set(id, value);
  }
  return values;
}

const changedSet = new Set(spec.changed);
const oldVersions = new Map(spec.nodes.map((node) => [node.id, node.version - (changedSet.has(node.id) ? 1 : 0)]));
const newVersions = new Map(spec.nodes.map((node) => [node.id, node.version]));
const cache = evaluateAll(spec.nodes, oldVersions, new Map());
const fullValues = evaluateAll(spec.nodes, newVersions, new Map());
const incValues = evaluateAll(spec.nodes, newVersions, cache, new Set(dirty));
const consistent = spec.nodes.every((node) => incValues.get(node.id) === fullValues.get(node.id));

let cycleCode = "";
try {
  recompute([{ id: "x", deps: ["y"] }, { id: "y", deps: ["x"] }], ["x"], 10);
} catch (error) {
  cycleCode = error.code;
}

console.log("受影响的节点 =", JSON.stringify(out.dirty));
console.log("实际重算的节点 =", JSON.stringify(out.recomputed));
console.log("命中缓存的节点数 =", out.hits);
console.log("因预算不足而陈旧的节点 =", JSON.stringify(out.stale));
console.log("预算消耗 =", out.budget_used);
console.log("增量结果与全量结果一致 =", consistent ? "True" : "False");
console.log("依赖成环的错误码 =", cycleCode);
