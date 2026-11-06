#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GRAPH_VERSION = "acs-content-graph/1.0";
const HANDOFF_VERSION = "acs-publisher-handoff/1.0";
const NODE_KINDS = new Set(["source", "transcript", "thesis", "master", "derivative"]);
const EDGE_TYPES = new Set([
  "derived_from",
  "excerpt_of",
  "adaptation_of",
  "variant_of",
  "companion_to",
  "promotes",
]);
const REVIEW_STATES = new Set(["not_reviewed", "in_review", "approved", "rejected"]);
const ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const FORMAT_PATTERN = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireKeys(value, allowed, required, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  for (const key of required) {
    if (!(key in value)) errors.push(`${label}.${key} is required`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${label}.${key} is not allowed`);
  }
  return true;
}

function nonEmptyString(value, label, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${label} must be a non-empty string`);
    return false;
  }
  return true;
}

function stableId(value, label, errors) {
  if (!nonEmptyString(value, label, errors)) return false;
  if (!ID_PATTERN.test(value)) {
    errors.push(`${label} must be a stable lowercase kebab-case id`);
    return false;
  }
  return true;
}

function positiveVersion(value, label, errors) {
  if (!Number.isSafeInteger(value) || value < 1) {
    errors.push(`${label} must be a positive integer`);
    return false;
  }
  return true;
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function safeArtifactPath(relativePath, label, errors) {
  if (!nonEmptyString(relativePath, label, errors)) return false;
  if (
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    errors.push(`${label} must be a normalized relative POSIX path without traversal`);
    return false;
  }
  return true;
}

function checkFileHash(baseDirectory, relativePath, expectedHash, label, errors) {
  if (!safeArtifactPath(relativePath, `${label}.path`, errors)) return;
  if (typeof expectedHash !== "string" || !HASH_PATTERN.test(expectedHash)) {
    errors.push(`${label}.sha256 must use sha256:<64 lowercase hex>`);
    return;
  }
  const root = realpathSync(baseDirectory);
  const candidate = path.resolve(root, ...relativePath.split("/"));
  if (!existsSync(candidate)) {
    errors.push(`${label}.path does not exist: ${relativePath}`);
    return;
  }
  const resolved = realpathSync(candidate);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    errors.push(`${label}.path resolves outside the graph directory`);
    return;
  }
  const actualHash = sha256(readFileSync(resolved));
  if (actualHash !== expectedHash) {
    errors.push(`${label}.sha256 does not match ${relativePath}`);
  }
}

function checkReview(review, label, errors) {
  if (!requireKeys(review, ["status", "reviewer", "reference"], ["status", "reviewer", "reference"], label, errors)) return;
  if (!REVIEW_STATES.has(review.status)) errors.push(`${label}.status is not supported`);
  const decided = review.status === "approved" || review.status === "rejected";
  if (decided) {
    nonEmptyString(review.reviewer, `${label}.reviewer`, errors);
    nonEmptyString(review.reference, `${label}.reference`, errors);
  } else {
    if (review.reviewer !== null) errors.push(`${label}.reviewer must be null until decided`);
    if (review.reference !== null) errors.push(`${label}.reference must be null until decided`);
  }
}

function checkProvenance(provenance, label, errors) {
  if (!requireKeys(provenance, ["type", "statement", "references"], ["type", "statement", "references"], label, errors)) return;
  stableId(provenance.type, `${label}.type`, errors);
  nonEmptyString(provenance.statement, `${label}.statement`, errors);
  if (!Array.isArray(provenance.references)) {
    errors.push(`${label}.references must be an array`);
  } else {
    provenance.references.forEach((reference, index) => nonEmptyString(reference, `${label}.references[${index}]`, errors));
  }
}

function checkTargets(targets, label, errors) {
  if (!Array.isArray(targets)) {
    errors.push(`${label} must be an array`);
    return;
  }
  const seen = new Set();
  targets.forEach((target, index) => {
    if (stableId(target, `${label}[${index}]`, errors)) {
      if (seen.has(target)) errors.push(`${label} contains duplicate target ${target}`);
      seen.add(target);
    }
  });
}

function checkDesignHandoff(design, baseDirectory, errors) {
  const label = "graph.design_handoff";
  if (!requireKeys(design, ["revision", "provenance", "review_reference", "files"], ["revision", "provenance", "review_reference", "files"], label, errors)) return;
  nonEmptyString(design.revision, `${label}.revision`, errors);
  checkProvenance(design.provenance, `${label}.provenance`, errors);
  nonEmptyString(design.review_reference, `${label}.review_reference`, errors);
  if (!Array.isArray(design.files) || design.files.length === 0) {
    errors.push(`${label}.files must contain DESIGN.md and may contain selected assets`);
    return;
  }
  let designCount = 0;
  const seen = new Set();
  design.files.forEach((file, index) => {
    const fileLabel = `${label}.files[${index}]`;
    if (!requireKeys(file, ["role", "path", "sha256"], ["role", "path", "sha256"], fileLabel, errors)) return;
    if (file.role !== "design" && file.role !== "asset") errors.push(`${fileLabel}.role must be design or asset`);
    if (file.role === "design") {
      designCount += 1;
      if (path.posix.basename(file.path) !== "DESIGN.md") errors.push(`${fileLabel}.path must end in DESIGN.md`);
    }
    if (seen.has(file.path)) errors.push(`${label}.files contains duplicate path ${file.path}`);
    seen.add(file.path);
    checkFileHash(baseDirectory, file.path, file.sha256, fileLabel, errors);
  });
  if (designCount !== 1) errors.push(`${label}.files must contain exactly one design role`);
}

export function validateGraph(graph, baseDirectory) {
  const errors = [];
  if (!requireKeys(graph, ["contract_version", "family", "nodes", "edges", "design_handoff"], ["contract_version", "family", "nodes", "edges"], "graph", errors)) return errors;
  if (graph.contract_version !== GRAPH_VERSION) errors.push(`graph.contract_version must be ${GRAPH_VERSION}`);

  if (requireKeys(graph.family, ["id", "version", "review"], ["id", "version", "review"], "graph.family", errors)) {
    stableId(graph.family.id, "graph.family.id", errors);
    positiveVersion(graph.family.version, "graph.family.version", errors);
    checkReview(graph.family.review, "graph.family.review", errors);
  }

  const nodesById = new Map();
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    errors.push("graph.nodes must be a non-empty array");
  } else {
    graph.nodes.forEach((node, index) => {
      const label = `graph.nodes[${index}]`;
      if (!requireKeys(node, ["id", "version", "kind", "path", "format", "sha256", "provenance", "review", "channel_targets"], ["id", "version", "kind", "path", "format", "sha256", "provenance", "review"], label, errors)) return;
      if (stableId(node.id, `${label}.id`, errors)) {
        if (nodesById.has(node.id)) errors.push(`graph.nodes contains duplicate id ${node.id}`);
        nodesById.set(node.id, node);
      }
      positiveVersion(node.version, `${label}.version`, errors);
      if (!NODE_KINDS.has(node.kind)) errors.push(`${label}.kind is not supported`);
      if (typeof node.format !== "string" || !FORMAT_PATTERN.test(node.format)) errors.push(`${label}.format must be a lowercase media type`);
      checkFileHash(baseDirectory, node.path, node.sha256, label, errors);
      checkProvenance(node.provenance, `${label}.provenance`, errors);
      checkReview(node.review, `${label}.review`, errors);
      if ("channel_targets" in node) checkTargets(node.channel_targets, `${label}.channel_targets`, errors);
    });
  }

  if (!Array.isArray(graph.edges)) {
    errors.push("graph.edges must be an array");
  } else {
    const edgeKeys = new Set();
    graph.edges.forEach((edge, index) => {
      const label = `graph.edges[${index}]`;
      if (!requireKeys(edge, ["type", "from", "to"], ["type", "from", "to"], label, errors)) return;
      if (!EDGE_TYPES.has(edge.type)) errors.push(`${label}.type is not supported`);
      if (!nodesById.has(edge.from)) errors.push(`${label}.from does not name a node`);
      if (!nodesById.has(edge.to)) errors.push(`${label}.to does not name a node`);
      if (edge.from === edge.to) errors.push(`${label} cannot relate a node to itself`);
      const edgeKey = `${edge.type}:${edge.from}:${edge.to}`;
      if (edgeKeys.has(edgeKey)) errors.push(`${label} duplicates an existing edge`);
      edgeKeys.add(edgeKey);
    });
  }

  if ("design_handoff" in graph) checkDesignHandoff(graph.design_handoff, baseDirectory, errors);
  return errors;
}

export function validateHandoff(handoff, graph, graphFilePath) {
  const errors = [];
  const label = "handoff";
  if (!requireKeys(
    handoff,
    ["contract_version", "family_id", "graph_version", "graph_sha256", "status", "supervised", "not_posted", "external_posting", "selected_nodes"],
    ["contract_version", "family_id", "graph_version", "graph_sha256", "status", "supervised", "not_posted", "external_posting", "selected_nodes"],
    label,
    errors,
  )) return errors;
  const graphObject = isObject(graph) ? graph : {};
  if (!isObject(graph)) errors.push("graph must be an object for handoff validation");
  if (handoff.contract_version !== HANDOFF_VERSION) errors.push(`${label}.contract_version must be ${HANDOFF_VERSION}`);
  if (handoff.family_id !== graphObject.family?.id) errors.push(`${label}.family_id must match graph.family.id`);
  if (handoff.graph_version !== graphObject.family?.version) errors.push(`${label}.graph_version must match graph.family.version`);
  if (typeof handoff.graph_sha256 !== "string" || !HASH_PATTERN.test(handoff.graph_sha256)) {
    errors.push(`${label}.graph_sha256 must use sha256:<64 lowercase hex>`);
  } else {
    try {
      if (sha256(readFileSync(graphFilePath)) !== handoff.graph_sha256) {
        errors.push(`${label}.graph_sha256 does not match the graph file`);
      }
    } catch (error) {
      errors.push(`${label}.graph_sha256 could not read the graph file: ${error.message}`);
    }
  }
  if (handoff.status !== "awaiting-separate-authorization") errors.push(`${label}.status must be awaiting-separate-authorization`);
  if (handoff.supervised !== true) errors.push(`${label}.supervised must be true`);
  if (handoff.not_posted !== true) errors.push(`${label}.not_posted must be true`);
  if (handoff.external_posting !== false) errors.push(`${label}.external_posting must be false`);

  const graphNodes = Array.isArray(graphObject.nodes) ? graphObject.nodes : [];
  if (!Array.isArray(graphObject.nodes)) errors.push("graph.nodes must be an array for handoff validation");
  const nodesById = new Map(graphNodes.filter(isObject).map((node) => [node.id, node]));
  if (!Array.isArray(handoff.selected_nodes) || handoff.selected_nodes.length === 0) {
    errors.push(`${label}.selected_nodes must be a non-empty array`);
  } else {
    const seen = new Set();
    handoff.selected_nodes.forEach((selection, index) => {
      const selectionLabel = `${label}.selected_nodes[${index}]`;
      if (!requireKeys(selection, ["node_id", "version", "sha256", "channel_targets"], ["node_id", "version", "sha256"], selectionLabel, errors)) return;
      const node = nodesById.get(selection.node_id);
      if (!node) {
        errors.push(`${selectionLabel}.node_id does not name a graph node`);
        return;
      }
      if (seen.has(selection.node_id)) errors.push(`${label}.selected_nodes contains duplicate ${selection.node_id}`);
      seen.add(selection.node_id);
      if (selection.version !== node.version) errors.push(`${selectionLabel}.version must match the selected node`);
      if (selection.sha256 !== node.sha256) errors.push(`${selectionLabel}.sha256 must match the selected node`);
      if (node.review?.status !== "approved") {
        errors.push(`${selectionLabel} selects ${node.id} without that node's own approval`);
      }
      if ("channel_targets" in selection) {
        checkTargets(selection.channel_targets, `${selectionLabel}.channel_targets`, errors);
        if (Array.isArray(selection.channel_targets)) {
          const allowed = new Set(Array.isArray(node.channel_targets) ? node.channel_targets : []);
          for (const target of selection.channel_targets) {
            if (!allowed.has(target)) errors.push(`${selectionLabel}.channel_targets contains undeclared target ${target}`);
          }
        }
      }
    });
  }
  return errors;
}

export function loadAndValidate(graphFilePath, handoffFilePath) {
  const absoluteGraph = path.resolve(graphFilePath);
  const graph = JSON.parse(readFileSync(absoluteGraph, "utf8"));
  const errors = validateGraph(graph, path.dirname(absoluteGraph));
  if (handoffFilePath) {
    const handoff = JSON.parse(readFileSync(path.resolve(handoffFilePath), "utf8"));
    errors.push(...validateHandoff(handoff, graph, absoluteGraph));
  }
  return errors;
}

function main() {
  const [, , graphFilePath, handoffFilePath] = process.argv;
  if (!graphFilePath) {
    console.error("Usage: node check-content-graph.mjs <content-graph.json> [publisher-handoff.json]");
    process.exitCode = 2;
    return;
  }
  try {
    const errors = loadAndValidate(graphFilePath, handoffFilePath);
    if (errors.length > 0) {
      errors.forEach((error) => console.error(`ERROR: ${error}`));
      process.exitCode = 1;
      return;
    }
    console.log(`PASS content graph${handoffFilePath ? " and supervised publisher handoff" : ""}`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
