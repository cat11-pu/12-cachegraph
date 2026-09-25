import assert from "node:assert";
import { dirtySet, topoOrder } from "../graph.js";
import { recompute } from "../cache.js";
import { render } from "../app.js";

let failed = 0;
let total = 0;
function check(name, fn) {
  total += 1;
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

const chain = [
  { id: "a", deps: [] },
  { id: "b", deps: ["a"] },
  { id: "c", deps: ["b"] },
  { id: "d", deps: [] },
  { id: "e", deps: ["d"] },
  { id: "f", deps: ["c", "e"] },
];

check("dirty propagates to transitive dependents, sorted by id", () => {
  assert.deepStrictEqual(dirtySet(chain, ["d"]), ["d", "e", "f"]);
});

check("dirty set has no duplicates with shared dependents", () => {
  const got = dirtySet(chain, ["a", "d"]);
  assert.strictEqual(got.length, new Set(got).size);
  assert.deepStrictEqual(got, ["a", "b", "c", "d", "e", "f"]);
});

check("dirty ignores unknown changed ids", () => {
  assert.deepStrictEqual(dirtySet(chain, ["nope", "b"]), ["b", "c", "f"]);
});

check("recompute follows topo order with full budget", () => {
  const dirty = dirtySet(chain, ["d"]);
  const plan = recompute(chain, dirty, 10);
  assert.deepStrictEqual(plan.recomputed, ["d", "e", "f"]);
  assert.strictEqual(plan.hits, 3);
  assert.deepStrictEqual(plan.stale, []);
  assert.strictEqual(plan.used, 3);
});

check("same-level nodes are processed by id ascending", () => {
  const diamond = [
    { id: "r", deps: [] },
    { id: "b", deps: ["r"] },
    { id: "a", deps: ["r"] },
    { id: "c", deps: ["a", "b"] },
  ];
  assert.deepStrictEqual(topoOrder(diamond), ["r", "a", "b", "c"]);
});

check("budget exhaustion marks remaining dirty nodes stale, not valid", () => {
  const dirty = dirtySet(chain, ["a"]);
  const plan = recompute(chain, dirty, 2);
  assert.deepStrictEqual(plan.recomputed, ["a", "b"]);
  assert.deepStrictEqual(plan.stale, ["c", "f"]);
  assert.strictEqual(plan.used, 2);
  assert.strictEqual(plan.hits, 2);
});

check("zero budget recomputes nothing, all dirty are stale", () => {
  const dirty = dirtySet(chain, ["d"]);
  const plan = recompute(chain, dirty, 0);
  assert.deepStrictEqual(plan.recomputed, []);
  assert.deepStrictEqual(plan.stale, ["d", "e", "f"]);
  assert.strictEqual(plan.used, 0);
});

check("cycle raises E_CYCLE without dropping nodes", () => {
  const cyclic = [
    { id: "a", deps: ["b"] },
    { id: "b", deps: ["a"] },
    { id: "c", deps: [] },
  ];
  let caught;
  try { topoOrder(cyclic); } catch (e) { caught = e; }
  assert.ok(caught, "expected an error to be thrown");
  assert.strictEqual(caught.code, "E_CYCLE");
  assert.deepStrictEqual(caught.cyclic.sort(), ["a", "b"]);
});

check("recompute raises E_CYCLE on cyclic graph", () => {
  const cyclic = [{ id: "a", deps: ["a"] }];
  assert.throws(() => recompute(cyclic, ["a"], 10), (e) => e.code === "E_CYCLE");
});

check("render keeps the five-key contract", () => {
  const result = render({ nodes: chain, changed: ["d"], budget: 3 });
  assert.deepStrictEqual(Object.keys(result).sort(),
    ["budget_used", "dirty", "hits", "recomputed", "stale"]);
  assert.deepStrictEqual(result.dirty, ["d", "e", "f"]);
  assert.deepStrictEqual(result.recomputed, ["d", "e", "f"]);
  assert.strictEqual(result.hits, 3);
  assert.deepStrictEqual(result.stale, []);
  assert.strictEqual(result.budget_used, 3);
});

check("incremental recompute equals full recompute with sufficient budget", () => {
  const spec = { nodes: chain, changed: ["b", "d"], budget: chain.length };
  const result = render(spec);
  const full = recompute(chain, result.dirty, chain.length);
  assert.deepStrictEqual(result.recomputed, full.recomputed);
  assert.deepStrictEqual(result.stale, []);
});

check("dirty propagation is linear at 100k nodes (each node enqueued once)", () => {
  const n = 100000;
  const big = [];
  for (let i = 0; i < n; i++) {
    big.push({ id: "n" + String(i).padStart(6, "0"), deps: i === 0 ? [] : ["n" + String(i - 1).padStart(6, "0")] });
  }
  const start = Date.now();
  const got = dirtySet(big, [big[0].id]);
  const elapsed = Date.now() - start;
  assert.strictEqual(got.length, n);
  assert.ok(elapsed < 5000, "dirtySet took " + elapsed + "ms");
});

console.log(total + " cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
