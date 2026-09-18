"use strict";

const assert = require("assert");
const { createValueFormattingHelpers } = require("../value-formatting.js");

function t(key, values = {}) {
  return `${key}:${Object.entries(values).map(([name, value]) => `${name}=${value}`).join(",")}`;
}

const format = createValueFormattingHelpers({ t, getDecimals: () => 2 });

assert.equal(format.formatNumberValue(1.2), "1.2");
assert.equal(format.formatNumberValue(-0.001), "0");
assert.equal(format.formatExecutionDuration(1250), "1.25 s");
assert.equal(format.formatComputedValue([[1, 2], [3, 4]]), "[[1, 2], [3, 4]]");
assert.equal(format.summarizeNodeRuntimeValue({ computedValue: [[1, 2], [3, 4]] }).text, "[2,2]");
assert.equal(format.summarizeTooltipValue(new Array(9).fill(1)), "text.vectorSummary:size=9");
assert.equal(format.describeExpressionPreviewShape([[1, 2], [3, 4]]), "expr.preview.shape.matrix:rows=2,cols=2");
assert.equal(
  format.formatAgentSpaceSummary({ kind: "agentSpace", rowCount: 3, colCount: 4, agentCount: 7 }),
  "text.agentSpaceSummary:rows=3,cols=4,agents=7",
);

console.log("value-formatting.test.js: ok");
