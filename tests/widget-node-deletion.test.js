"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "widgets.js"), "utf8"), context);
const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const start = app.indexOf("function removeNodeFromAllWidgetDisplays(");
const end = app.indexOf("\nfunction ", start + 1);
vm.runInContext(app.slice(start, end), context);
let menuItems;
let beforeAction;
Object.assign(context, {
  t: (key) => key,
  isEditingUiLocked: () => false,
  canBindSliderToNode: () => false,
  isSubmodelNode: () => false,
  isDraftNode: () => false,
  showContextMenu: (_x, _y, items) => { menuItems = items; },
  removeNodeFromInputWidgetBindings: () => {},
  removeNodeFromSubmodelInputBindings: () => {},
  clearAllSelection: () => { context.ui.selectedNodes.clear(); },
  setStatusKey: () => {},
  runAction: (action) => { beforeAction = JSON.stringify(context.graph); action(); },
});
function setup(selectedIds) {
  context.ui = { selectedNodes: new Set(selectedIds) };
  context.graph = {
    nodes: [{ id: 1, name: "a" }, { id: 2, name: "b" }, { id: 3, name: "c" }],
    edges: [{ from: 1, to: 3 }, { from: 2, to: 3 }],
    widgets: [{ type: "xychart", xyPairs: [
      { xSource: "time", ySource: "a", seriesData: [{ points: [{ x: 0, y: 1 }] }] },
      { xSource: "a", ySource: "c" },
      { xSource: "time", ySource: "b" },
      { xSource: "time", ySource: "c", color: "#123456" },
    ] }, { type: "xychart", xyPairs: [{ xSource: "c", ySource: "a" }] }],
  };
}
function checkDeleted(names) {
  assert(context.graph.widgets.every((widget) => widget.xyPairs.every((pair) =>
    !names.includes(pair.xSource) && !names.includes(pair.ySource))));
  const remaining = context.graph.widgets[0].xyPairs;
  assert(remaining.some((pair) => pair.ySource === "c" && pair.color === "#123456"));
  assert.equal(context.graph.widgets[1].xyPairs.length, 0);
  assert(context.graph.nodes.every((node) => !names.includes(node.name)));
  assert.equal(JSON.parse(beforeAction).widgets[0].xyPairs.length, 4, "cleanup belongs inside the undoable action");
}
setup([1]);
context.Widgets.removeSelected();
checkDeleted(["a"]);
assert.equal(context.graph.widgets[0].xyPairs.length, 2);
setup([1, 2]);
context.Widgets.removeSelected();
checkDeleted(["a", "b"]);
assert.equal(context.graph.widgets[0].xyPairs.length, 1);
setup([]);
context.Widgets.openNodeContextMenu({ clientX: 0, clientY: 0 }, context.graph.nodes[0]);
menuItems.find((item) => item.label === "context.node.delete").action();
checkDeleted(["a"]);
setup([1, 2]);
context.Widgets.openNodeContextMenu({ clientX: 0, clientY: 0 }, context.graph.nodes[0]);
menuItems.find((item) => item.label === "menu.edit.delete").action();
checkDeleted(["a", "b"]);
console.log("widget-node-deletion.test.js: ok");
