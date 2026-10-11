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

const graph = {
  execution: { timeUnit: "anno" },
  nodes: [
    { id: 1, name: "cap0", shape: "diamond", unit: "€", valueExpression: "100", properties: [] },
    { id: 2, name: "flusso", shape: "ellipse", unit: "€/anno", valueExpression: "cap0/dt", properties: [] },
    { id: 3, name: "capitale", shape: "rect", unit: "", initialStateExpression: "cap0", valueExpression: "this+flusso", properties: [] },
  ],
  edges: [{ from: 1, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 }],
  widgets: [],
};
const nodeById = (id) => graph.nodes.find((node) => node.id === id) || null;
const analysis = createModelAnalysisCoreHelpers({
  t: (key) => key,
  getGraph: () => graph,
  unitAnalysis,
  parseExpressionAst: context.window.GraphSemantics.parseExpressionAst,
  isStateNode: (node) => node?.shape === "rect",
  isAlgebraicNode: (node) => node?.shape === "ellipse",
  buildNodeNameMap: () => new Map(graph.nodes.map((node) => [node.name, node])),
  getNodeById: nodeById,
});

const issues = analysis.analyzeModelStaticIssues();
assert(issues.some((issue) => issue.key === "analysis.issue.unitExpressionMismatch" && issue.target?.id === 3));
const incompatibleSum = unitAnalysis.inferAst(
  { type: "binary", op: "+", left: { type: "identifier", name: "amount" }, right: { type: "identifier", name: "flow" } },
  { resolve: (name) => unitAnalysis.parseUnit(name === "amount" ? "€" : "€/anno").value },
);
assert.equal(unitAnalysis.display(incompatibleSum.left), "€");
assert.equal(unitAnalysis.display(incompatibleSum.right), "€/anno");
assert.equal(graph.nodes[2].inferredUnit, "€");
assert(unitAnalysis.same(unitAnalysis.parseUnit("euro").value, unitAnalysis.parseUnit("€").value));
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("$/anno").value), "$/anno");
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("°C/s").value), "°C/s");
assert(unitAnalysis.same(unitAnalysis.parseUnit("celsius").value, unitAnalysis.parseUnit("°C").value));
console.log("unit-analysis-core.test.js: ok");
