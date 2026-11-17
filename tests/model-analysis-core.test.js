"use strict";

const assert = require("assert");
const { createModelAnalysisCoreHelpers } = require("../model-analysis-core.js");

const helpers = createModelAnalysisCoreHelpers({
  isAlgebraicNode: (node) => node?.shape === "ellipse",
  isSubmodelNode: (node) => node?.shape === "submodel",
});

const submodelFeedback = {
  nodes: [
    { id: 1, name: "sub_coda", shape: "submodel" },
    { id: 2, name: "sub_server", shape: "submodel" },
  ],
  edges: [
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 1 },
  ],
};
assert.deepEqual(
  helpers.detectNonStateCycles(submodelFeedback),
  [],
  "a feedback relation between submodel containers is not an algebraic cycle",
);

const algebraicFeedback = {
  nodes: [
    { id: 1, name: "a", shape: "ellipse" },
    { id: 2, name: "b", shape: "ellipse" },
  ],
  edges: [
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 1 },
  ],
};
assert.deepEqual(helpers.detectNonStateCycles(algebraicFeedback), [{ ids: [1, 2], names: ["a", "b"] }]);

assert.equal(helpers.valueStructureForAnalysis(4), "scalar");
assert.equal(helpers.valueStructureForAnalysis([1, 2]), "vector");
assert.equal(helpers.valueStructureForAnalysis([1, 2, 3, 4]), "vector");
assert.equal(helpers.valueStructureForAnalysis([]), "vector");
assert.equal(helpers.valueStructureForAnalysis([[1, 2], [3, 4]]), "matrix");
assert.equal(helpers.valueStructureForAnalysis([[1], [2], [3]]), "matrix");

console.log("model-analysis-core.test.js: ok");
