"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createModelAnalysisCoreHelpers } = require("../model-analysis-core.js");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "graph-functions.js"), "utf8"), context, { filename: "graph-functions.js" });
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "semantic.js"), "utf8"), context, { filename: "semantic.js" });
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "runtime-core.js"), "utf8"), context, { filename: "runtime-core.js" });

const semantics = context.window.GraphSemantics;
const nodeById = (model, id) => model.nodes.find((node) => node.id === id) || null;
const runtimeCore = context.STGraphXRuntimeCore.createRuntimeCore({
  t: (key) => key,
  semantics,
  deepClone: (value) => JSON.parse(JSON.stringify(value)),
  localFunctionsForSemantics: () => [],
  globalParameterNodesForModel: () => [],
  referencedGlobalParameterNodesForTarget: () => [],
  isStateNode: (node) => node?.shape === "rect",
  getModelNodeById: nodeById,
  normalizeReadDataPath: (value) => String(value || ""),
  parseModelPropertyStoredValue: (value) => value,
  serializeModelPropertyStoredValue: (value) => String(value),
  parseNodePropertyStoredValue: (value) => value,
  serializeNodePropertyStoredValue: (value) => String(value),
});

function makeNode(id, name, shape, expression, initial = "") {
  return {
    id, name, shape, valueExpression: expression, initialStateExpression: initial,
    properties: [], computedValue: null, computedError: "", pendingStateValue: null, pendingStateError: "",
    externalValueEnabled: false, externalValue: null,
  };
}

const model = {
  properties: [],
  localFunctions: [],
  nodes: [
    makeNode(4, "c", "rect", "", "b+3"),
    makeNode(3, "b", "ellipse", "a*2"),
    makeNode(2, "a", "rect", "", "p+1"),
    makeNode(1, "p", "diamond", "2"),
  ],
  edges: [{ from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }],
  __readDataCache: {},
};
const execution = { t0: 0, t1: 1, dt: 1 };
runtimeCore.initializeStateNodesForModel(model, 0, execution);
assert.equal(nodeById(model, 2).computedValue, 3);
assert.equal(nodeById(model, 3).computedValue, 6);
assert.equal(nodeById(model, 4).computedValue, 9);

const cycleModel = {
  properties: [], localFunctions: [], __readDataCache: {},
  nodes: [makeNode(1, "a", "rect", "", "b+1"), makeNode(2, "b", "ellipse", "a+1")],
  edges: [{ from: 1, to: 2 }, { from: 2, to: 1 }],
};
runtimeCore.initializeStateNodesForModel(cycleModel, 0, execution);
assert.equal(nodeById(cycleModel, 1).computedError, "dependency");
assert.equal(nodeById(cycleModel, 2).computedError, "dependency");

const analysisHelpers = createModelAnalysisCoreHelpers({
  getGraph: () => cycleModel,
  isStateNode: (node) => node?.shape === "rect",
  isAlgebraicNode: (node) => node?.shape === "ellipse",
  buildNodeNameMap: () => new Map(cycleModel.nodes.map((node) => [node.name, node])),
  getNodeById: (id) => nodeById(cycleModel, id),
});
assert.deepEqual(analysisHelpers.detectInitialDefinitionCycles(cycleModel)[0].names, ["a", "b"]);
console.log("initialization-dependencies.test.js: ok");
