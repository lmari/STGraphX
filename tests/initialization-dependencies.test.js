"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createModelAnalysisCoreHelpers } = require("../model-analysis-core.js");
const unitAnalysis = require("../unit-analysis-core.js");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "graph-functions.js"), "utf8"), context, { filename: "graph-functions.js" });
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "semantic.js"), "utf8"), context, { filename: "semantic.js" });
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "runtime-core.js"), "utf8"), context, { filename: "runtime-core.js" });

const semantics = context.window.GraphSemantics;
const nodeById = (model, id) => model.nodes.find((node) => node.id === id) || null;
const runtimeCore = context.STGraphXRuntimeCore.createRuntimeCore({
  t: (key) => key,
  semantics,
  unitAnalysis,
  deepClone: (value) => JSON.parse(JSON.stringify(value)),
  localFunctionsForSemantics: () => [],
  globalParameterNodesForModel: () => [],
  referencedGlobalParameterNodesForTarget: () => [],
  isStateNode: (node) => node?.shape === "rect",
  isSubmodelNode: () => false,
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
const normalGlobals = runtimeCore.buildExecutionGlobalsForModel(model, execution, 0);
assert.equal(normalGlobals.time, 0);
assert.equal(normalGlobals.t0, 0);
assert.equal(normalGlobals.t1, 1);
assert.equal(normalGlobals.dt, 1);
const playGlobals = runtimeCore.buildExecutionGlobalsForModel(model, execution, 0, { playMode: true });
assert.equal(playGlobals.dt, 1, "playmode keeps dt available");
assert.equal(Object.hasOwn(playGlobals, "time"), false, "playmode does not expose time");
assert.equal(Object.hasOwn(playGlobals, "t0"), false, "playmode does not expose t0");
assert.equal(Object.hasOwn(playGlobals, "t1"), false, "playmode does not expose t1");
runtimeCore.initializeStateNodesForModel(model, 0, execution);
assert.equal(nodeById(model, 2).computedValue, 3);
assert.equal(nodeById(model, 3).computedValue, 6);
assert.equal(nodeById(model, 4).computedValue, 9);

const timeDependentModel = {
  properties: [], localFunctions: [], __readDataCache: {},
  nodes: [makeNode(21, "clock", "ellipse", "time")],
  edges: [],
};
const normalTimeResult = runtimeCore.evaluateModelAtTimeRecursive(
  timeDependentModel,
  2,
  { rootExecution: execution, stack: [] },
);
assert.equal(normalTimeResult.errorCount, 0);
assert.equal(nodeById(timeDependentModel, 21).computedValue, 2);
const playTimeResult = runtimeCore.evaluateModelAtTimeRecursive(
  timeDependentModel,
  2,
  { rootExecution: execution, stack: [], playMode: true },
);
assert.equal(playTimeResult.errorCount, 1, "time is unavailable while evaluating in playmode");

const scaledUnitModel = {
  properties: [], localFunctions: [], unitDefinitions: [], __readDataCache: {},
  execution: { timeUnit: "s" },
  nodes: [
    { ...makeNode(11, "metres", "diamond", "10"), unit: "m" },
    { ...makeNode(12, "centimetres", "diamond", "100"), unit: "cm" },
    { ...makeNode(13, "total", "ellipse", "metres+centimetres"), unit: "m" },
  ],
  edges: [{ from: 11, to: 13 }, { from: 12, to: 13 }],
};
runtimeCore.initializeStateNodesForModel(scaledUnitModel, 0, execution);
assert.equal(nodeById(scaledUnitModel, 13).computedValue, 11);
const previewOptions = runtimeCore.unitEvaluationOptionsForNode(
  scaledUnitModel,
  nodeById(scaledUnitModel, 13),
  "metres+centimetres",
);
assert.equal(semantics.evaluateValueExpression("metres+centimetres", { metres: 10, centimetres: 100 }, previewOptions).value, 11);
runtimeCore.evaluateModelAtTimeRecursive(scaledUnitModel, 0, { rootExecution: execution });
assert.equal(nodeById(scaledUnitModel, 13).computedValue, 11);

const parameterDependencyNodes = [
  makeNode(1, "base", "diamond", "2"),
  makeNode(2, "doubleBase", "diamond", "base*2"),
];
const parameterDependencyResults = semantics.evaluateStatefulGraphStep(
  parameterDependencyNodes,
  [{ from: 1, to: 2 }],
);
assert.equal(
  parameterDependencyResults.algebraic.find((entry) => entry.id === 2)?.result.value,
  4,
  "a parameter can depend on an incoming parameter edge",
);

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
