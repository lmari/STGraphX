"use strict";

const assert = require("assert");
const { createWorkspaceRuntimeStateHelpers } = require("../workspace-runtime-state.js");
const helpers = createWorkspaceRuntimeStateHelpers({
  deepClone: (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value))),
});

assert.deepEqual(helpers.cloneRuntimeWidgetState({ id: 1, type: "button", value: 1 }), { id: 1, type: "button", value: true });
assert.deepEqual(helpers.cloneRuntimeWidgetState({ id: 2, type: "table", rows: [{ value: 1 }] }), { id: 2, type: "table", rows: [{ value: 1 }] });
assert.deepEqual(
  helpers.buildChartPairSeriesDefinitionsForSync({ xSource: "x", ySource: "y" }, [1, 2], [3, 4]),
  [{ label: "x -> y", point: { x: 1, y: 3 } }, { label: "x -> y", point: { x: 2, y: 4 } }],
);
assert.deepEqual(
  helpers.buildChartPairInstantSeriesDefinitionsForSync({ xSource: "x", ySource: "y" }, 2, [3, 4]),
  [{ label: "x -> y", points: [{ x: 2, y: 3 }, { x: 2, y: 4 }] }],
);

const runtimeNodes = [{ name: "out", output: true, computedValue: 4, computedError: "" }];
const synced = helpers.buildSyncedWidgetRuntimeStates([
  { id: 3, type: "table", showHistory: true, columns: ["time", "out"] },
  { id: 4, type: "xychart", xyPairs: [{ xSource: "time", ySource: "out", showTimeSeries: true, showInstantProfile: false }] },
], runtimeNodes, 2);
assert.equal(synced[0].rows[0].values.out.value, 4);
assert.deepEqual(synced[1].xyPairs[0].seriesData[0].points, [{ x: 2, y: 4 }]);
assert.equal(
  helpers.buildSubmodelSimulationHistory([], { execution: { currentTime: 2 }, nodes: runtimeNodes })[0].values.out.value,
  4,
);

const graph = {
  execution: { currentTime: 3 },
  nodes: [{ id: 1, computedValue: 7, computedError: "" }],
  widgets: [{ id: 1, type: "slider", value: 8 }],
};
const snapshot = helpers.captureRuntimeStateSnapshot(graph);
graph.execution.currentTime = 0;
graph.nodes[0].computedValue = null;
graph.widgets[0].value = 0;
helpers.applyRuntimeStateSnapshot(graph, snapshot);
assert.equal(graph.execution.currentTime, 3);
assert.equal(graph.nodes[0].computedValue, 7);
assert.equal(graph.widgets[0].value, 8);

console.log("workspace-runtime-state.test.js: ok");
