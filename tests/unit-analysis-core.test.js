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
  unitDefinitions: [],
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
const mechanicalUnits = unitAnalysis.prepareDefinitions([]);
assert.equal(mechanicalUnits.errors.length, 0);
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("N/kg", { definitions: mechanicalUnits.definitions }).value), "m/s^2");
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("V*A").value), "W");
const speed = unitAnalysis.parseUnit("m/s").value;
assert.equal(unitAnalysis.display(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst("integral(a)"), {
  resolve: (name) => name === "a" ? speed : unitAnalysis.unknown(),
  timeUnit: unitAnalysis.parseUnit("s").value,
})), "m");
assert.equal(unitAnalysis.display(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst("integral(a)"), {
  resolve: (name) => name === "a" ? unitAnalysis.parseUnit("€/anno").value : unitAnalysis.unknown(),
  timeUnit: unitAnalysis.parseUnit("anno").value,
})), "€");
assert.equal(unitAnalysis.prepareDefinitions([{ symbol: "A", expression: "B" }, { symbol: "B", expression: "A" }]).errors[0].reason, "cycle");
const mechanicsGraph = {
  execution: { timeUnit: "s" },
  unitDefinitions: [],
  nodes: [
    { id: 11, name: "mass", shape: "diamond", unit: "kg", valueExpression: "2", properties: [] },
    { id: 12, name: "force", shape: "diamond", unit: "N", valueExpression: "10", properties: [] },
    { id: 13, name: "acceleration", shape: "ellipse", unit: "", valueExpression: "force/mass", properties: [] },
  ],
  edges: [{ from: 11, to: 13 }, { from: 12, to: 13 }],
  widgets: [],
};
const mechanicsAnalysis = createModelAnalysisCoreHelpers({
  t: (key) => key,
  getGraph: () => mechanicsGraph,
  unitAnalysis,
  parseExpressionAst: context.window.GraphSemantics.parseExpressionAst,
  isStateNode: (node) => node?.shape === "rect",
  isAlgebraicNode: (node) => node?.shape === "ellipse",
  buildNodeNameMap: () => new Map(mechanicsGraph.nodes.map((node) => [node.name, node])),
  getNodeById: (id) => mechanicsGraph.nodes.find((node) => node.id === id) || null,
});
assert(!mechanicsAnalysis.analyzeModelStaticIssues().some((issue) => issue.target?.id === 13 && issue.key === "analysis.issue.unitExpressionMismatch"));
assert.equal(mechanicsGraph.nodes[2].inferredUnit, "m/s^2");
console.log("unit-analysis-core.test.js: ok");
