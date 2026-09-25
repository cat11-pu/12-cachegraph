import assert from "node:assert";
import { dirtySet } from "../graph.js";
import { recompute } from "../cache.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok   " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const nodes = [{ id: "a", deps: [] }, { id: "b", deps: ["a"] }];

check("dirty includes changed ids", () => {
  assert.ok(dirtySet(nodes, ["a"]).includes("a"));
});

check("dirty is an array", () => {
  assert.ok(Array.isArray(dirtySet(nodes, [])));
});

check("recompute returns hits number", () => {
  assert.strictEqual(typeof recompute(nodes, [], 10).hits, "number");
});

check("recompute returns stale list", () => {
  assert.ok(Array.isArray(recompute(nodes, [], 0).stale));
});

check("render exposes budget_used", () => {
  assert.strictEqual(typeof render({ nodes: nodes, changed: [], budget: 10 }).budget_used, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
