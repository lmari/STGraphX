"use strict";

const assert = require("assert");
const { createFeedbackLoopCoreHelpers } = require("../feedback-loop-core.js");

const graph = {
  nodes: ["A", "B", "C", "D"].map((name, index) => ({ id: index + 1, name })),
  edges: [
    { id: 1, from: 1, to: 2, influence: "positive" },
    { id: 2, from: 2, to: 1, influence: "positive" },
    { id: 3, from: 2, to: 3, influence: "negative" },
    { id: 4, from: 3, to: 2, influence: "positive" },
    { id: 5, from: 3, to: 4, influence: "none" },
    { id: 6, from: 4, to: 3, influence: "positive" },
  ],
};

const result = createFeedbackLoopCoreHelpers({ getGraph: () => graph }).findFeedbackLoops();
assert.equal(result.truncated, false);
assert.equal(result.loops.length, 3);
assert.deepEqual(result.loops.map((loop) => loop.nodeNames), [["A", "B"], ["B", "C"], ["C", "D"]]);
assert.deepEqual(result.loops.map((loop) => loop.sign), ["positive", "negative", "unknown"]);
assert.deepEqual(result.loops[1].edgeIds, [3, 4]);
console.log("feedback-loop-core.test.js: ok");
