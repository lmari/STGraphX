"use strict";

const assert = require("assert");
const selection = require("../selection-state.js");

const existing = {
  nodeExists: (id) => ["n1", "n2"].includes(id),
  widgetExists: (id) => id === "w1",
  textExists: (id) => id === "t1",
};

function state() {
  return {
    selected: null,
    selectedNodes: new Set(),
    selectedControlPoint: { edgeId: "e1" },
    lastControlPointTap: { edgeId: "e1" },
  };
}

function run() {
  const single = state();
  selection.setNodes(single, ["n1", "missing"], false, existing);
  assert.deepEqual([...single.selectedNodes], ["n1"]);
  assert.deepEqual(single.selected, { type: "node", id: "n1" });

  selection.addNode(single, "n2", existing);
  assert.deepEqual([...single.selectedNodes].sort(), ["n1", "n2"]);
  assert.equal(single.selected, null);
  assert.equal(selection.addNode(single, "n2", existing), false);

  selection.selectTarget(single, "widget", "w1");
  selection.synchronizeSelection(single, existing);
  assert.deepEqual(single.selected, { type: "widget", id: "w1" });
  assert.equal(single.selectedNodes.size, 0);

  single.selected = { type: "text", id: "removed" };
  selection.synchronizeSelection(single, existing);
  assert.equal(single.selected, null);

  selection.clearSelection(single);
  assert.equal(single.selected, null);
  assert.equal(single.selectedNodes.size, 0);
  assert.equal(single.selectedControlPoint, null);
  assert.equal(single.lastControlPointTap, null);

  console.log("selection-state.test.js: ok");
}

run();
