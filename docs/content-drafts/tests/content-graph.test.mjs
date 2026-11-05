import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadAndValidate, validateGraph, validateHandoff } from "../../skills/content/scripts/check-content-graph.mjs";

const fixtureDirectory = fileURLToPath(new URL("./fixtures/content-graph", import.meta.url));
const graphPath = path.join(fixtureDirectory, "content-graph.json");
const handoffPath = path.join(fixtureDirectory, "publisher-handoff.json");

function json(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function hash(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

test("neutral fixture represents every core node kind and validates without channel targets", () => {
  assert.deepEqual(loadAndValidate(graphPath, handoffPath), []);
  const graph = json(graphPath);
  assert.deepEqual(new Set(graph.nodes.map((node) => node.kind)), new Set(["source", "transcript", "thesis", "master", "derivative"]));
  assert.equal(graph.nodes.some((node) => "channel_targets" in node), false);
});

test("family and source approval never approve a derivative", () => {
  const graph = json(graphPath);
  const handoff = json(handoffPath);
  const derivative = graph.nodes.find((node) => node.id === "node-derivative");
  handoff.selected_nodes = [{ node_id: derivative.id, version: derivative.version, sha256: derivative.sha256 }];
  const errors = validateHandoff(handoff, graph, graphPath);
  assert.ok(errors.some((error) => error.includes("without that node's own approval")));
});

test("handoff reports null selection targets without throwing", () => {
  const graph = json(graphPath);
  const handoff = json(handoffPath);
  handoff.selected_nodes[0].channel_targets = null;
  const errors = validateHandoff(handoff, graph, graphPath);
  assert.ok(errors.includes("handoff.selected_nodes[0].channel_targets must be an array"));
});

test("handoff reports non-array graph nodes without throwing", () => {
  const handoff = json(handoffPath);
  for (const malformedNodes of [{}, "not-an-array"]) {
    const graph = json(graphPath);
    graph.nodes = malformedNodes;
    const errors = validateHandoff(handoff, graph, graphPath);
    assert.ok(errors.includes("graph.nodes must be an array for handoff validation"));
    assert.ok(errors.some((error) => error.includes("node_id does not name a graph node")));
  }
});

test("handoff target selection remains a subset of the approved node targets", () => {
  const graph = json(graphPath);
  const handoff = json(handoffPath);
  graph.nodes.find((node) => node.id === "node-master").channel_targets = ["private-newsletter"];
  handoff.selected_nodes[0].channel_targets = ["undeclared-target"];
  const errors = validateHandoff(handoff, graph, graphPath);
  assert.ok(errors.some((error) => error.includes("contains undeclared target undeclared-target")));
});

test("channel targets are optional and accept arbitrary stable ids", () => {
  const graph = json(graphPath);
  graph.nodes.find((node) => node.id === "node-master").channel_targets = ["private-newsletter"];
  assert.deepEqual(validateGraph(graph, fixtureDirectory), []);
});

test("artifact hashes are checked against actual bytes", () => {
  const graph = json(graphPath);
  graph.nodes[0].sha256 = `sha256:${"0".repeat(64)}`;
  assert.ok(validateGraph(graph, fixtureDirectory).some((error) => error.includes("does not match")));
});

test("all six relation names are accepted and unknown relations fail", () => {
  const graph = json(graphPath);
  graph.edges.push(
    { type: "variant_of", from: "node-derivative", to: "node-thesis" },
    { type: "companion_to", from: "node-master", to: "node-transcript" },
    { type: "promotes", from: "node-derivative", to: "node-master" },
  );
  assert.deepEqual(validateGraph(graph, fixtureDirectory), []);
  graph.edges[0].type = "inherits_approval";
  assert.ok(validateGraph(graph, fixtureDirectory).some((error) => error.includes("type is not supported")));
});

test("optional ADS handoff is immutable, reviewed, and not required", (t) => {
  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "acs-design-handoff-"));
  t.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));
  const designBytes = Buffer.from("# Accepted direction\n");
  const assetBytes = Buffer.from("selected asset\n");
  writeFileSync(path.join(temporaryDirectory, "DESIGN.md"), designBytes);
  writeFileSync(path.join(temporaryDirectory, "asset.txt"), assetBytes);
  writeFileSync(path.join(temporaryDirectory, "node.txt"), "node\n");
  const graph = {
    contract_version: "acs-content-graph/1.0",
    family: {
      id: "family-design-proof",
      version: 1,
      review: { status: "not_reviewed", reviewer: null, reference: null },
    },
    nodes: [{
      id: "node-source",
      version: 1,
      kind: "source",
      path: "node.txt",
      format: "text/plain",
      sha256: hash(Buffer.from("node\n")),
      provenance: { type: "owner-recorded", statement: "Fixture source.", references: [] },
      review: { status: "not_reviewed", reviewer: null, reference: null },
    }],
    edges: [],
    design_handoff: {
      revision: "ads-revision-7",
      provenance: { type: "ads-handoff", statement: "Accepted immutable snapshot.", references: ["owner-review-7"] },
      review_reference: "owner-review-7",
      files: [
        { role: "design", path: "DESIGN.md", sha256: hash(designBytes) },
        { role: "asset", path: "asset.txt", sha256: hash(assetBytes) },
      ],
    },
  };
  assert.deepEqual(validateGraph(graph, temporaryDirectory), []);
  graph.design_handoff.files[1].sha256 = `sha256:${"f".repeat(64)}`;
  assert.ok(validateGraph(graph, temporaryDirectory).some((error) => error.includes("does not match")));
});
