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
const metres = unitAnalysis.parseUnit("m").value;
const centimetres = unitAnalysis.parseUnit("cm").value;
const millimetres = unitAnalysis.parseUnit("mm").value;
const kilometres = unitAnalysis.parseUnit("km").value;
assert(unitAnalysis.same(metres, centimetres));
assert.equal(unitAnalysis.display(centimetres), "cm");
assert.equal(unitAnalysis.conversionFactor(centimetres, metres), 0.01);
assert.equal(unitAnalysis.conversionFactor(kilometres, metres), 1000);
assert.deepEqual(unitAnalysis.scaleValue([100, [25]], unitAnalysis.conversionFactor(centimetres, metres)), [1, [0.25]]);
assert.equal(unitAnalysis.conversionFactor(unitAnalysis.parseUnit("°C").value, unitAnalysis.parseUnit("°C").value), null);
const scaledDefinitions = unitAnalysis.prepareDefinitions([{ symbol: "ha", expression: "10000*m^2" }]);
assert.equal(scaledDefinitions.errors.length, 0);
assert.equal(unitAnalysis.conversionFactor(unitAnalysis.parseUnit("ha", { definitions: scaledDefinitions.definitions }).value, unitAnalysis.parseUnit("m^2").value), 10000);
const unitByName = { n1: metres, n2: centimetres, n3: millimetres };
const evaluateWithUnits = (expression, contextValues, targetUnit = unitAnalysis.unknown()) => {
  const expressionAst = context.window.GraphSemantics.parseExpressionAst(expression);
  return context.window.GraphSemantics.evaluateValueExpression(expression, contextValues, {
    hooks: unitAnalysis.createEvaluationHooks({
      expressionAst,
      targetUnit,
      resolve: (name) => unitByName[name] || unitAnalysis.unknown(),
    }),
  });
};
assert.equal(evaluateWithUnits("n1+n2", { n1: 10, n2: 10 }).value, 10.1);
assert.equal(evaluateWithUnits("n1+n2", { n1: 10, n2: 100 }).value, 11);
assert.equal(evaluateWithUnits("n2+n1", { n1: 10, n2: 100 }).value, 1100);
assert.equal(evaluateWithUnits("n1+n2", { n1: 10, n2: 100 }, centimetres).value, 1100);
assert.equal(evaluateWithUnits("n1==n2", { n1: 1, n2: 100 }).value, 1);
assert.deepEqual(evaluateWithUnits("n1+n2", { n1: [1, 2], n2: [100, 50] }).value, [2, 2.5]);
assert.equal(evaluateWithUnits("n2*n3", { n2: 1, n3: 1 }).value, 0.1);
assert.equal(evaluateWithUnits("n1/n2", { n1: 1, n2: 1 }).value, 100);
const mechanicalUnits = unitAnalysis.prepareDefinitions([]);
assert.equal(mechanicalUnits.errors.length, 0);
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("N/kg", { definitions: mechanicalUnits.definitions }).value), "m/s^2");
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("V*A").value), "W");
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("rad/s").value), "rad/s");
assert.equal(unitAnalysis.display(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst("sin(angle)"), {
  resolve: (name) => name === "angle" ? unitAnalysis.parseUnit("rad").value : unitAnalysis.unknown(),
})), "rad");
assert(unitAnalysis.same(unitAnalysis.parseUnit("rad/s").value, unitAnalysis.parseUnit("1/s").value));
const legacyRadianDefinitions = unitAnalysis.prepareDefinitions([{ symbol: "rad", expression: "m/m" }]);
assert.equal(unitAnalysis.display(unitAnalysis.parseUnit("rad", { definitions: legacyRadianDefinitions.definitions }).value), "rad");
assert.equal(unitAnalysis.display(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst("-g/l * sin(p)"), {
  resolve: (name) => ({
    g: unitAnalysis.parseUnit("m/s^2").value,
    l: unitAnalysis.parseUnit("m").value,
    p: unitAnalysis.parseUnit("rad").value,
  })[name] || unitAnalysis.unknown(),
})), "rad/s^2");
const speed = unitAnalysis.parseUnit("m/s").value;
assert.equal(unitAnalysis.display(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst("sqrt(area)"), {
  resolve: (name) => name === "area" ? unitAnalysis.parseUnit("m^2").value : unitAnalysis.unknown(),
})), "m");
assert.equal(unitAnalysis.display(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst("sqrt(length)"), {
  resolve: (name) => name === "length" ? unitAnalysis.parseUnit("m").value : unitAnalysis.unknown(),
})), "m^0.5");
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

for (const name of ["median", "mode"]) {
  assert.equal(unitAnalysis.display(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst(`${name}(amounts)`), {
    resolve: () => unitAnalysis.parseUnit("m").value,
  })), "m");
}
assert(unitAnalysis.same(unitAnalysis.inferAst(context.window.GraphSemantics.parseExpressionAst("correlation(x,y)"), {
  resolve: (name) => unitAnalysis.parseUnit(name === "x" ? "m" : "s").value,
}), unitAnalysis.dimensionless()));
console.log("unit-analysis-core.test.js: ok");
