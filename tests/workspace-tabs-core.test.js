"use strict";

const assert = require("assert");
const tabsCore = require("../workspace-tabs-core.js");

const tabs = [
  { id: 1, state: { context: { data: { name: "a" }, lastSavedSnapshot: "{\"name\":\"a\"}" } } },
  { id: 2, meta: { parentTabId: 1 } },
  { id: 3, meta: { parentTabId: 2 } },
  { id: 4 },
];

assert.equal(tabsCore.getTabById(tabs, 2).id, 2);
assert.equal(tabsCore.currentTab(tabs, 4).id, 4);
assert.deepEqual(tabsCore.collectDescendantTabIds(tabs, 1), [2, 3]);
assert.equal(tabsCore.contextHasUnsavedChanges(tabs[0].state.context), false);
assert.equal(tabsCore.contextHasUnsavedChanges({ data: { name: "b" }, lastSavedSnapshot: "{}" }), true);
assert.equal(tabsCore.nextTabIdAfterClosing(tabs, [1, 2, 3], 1), 4);
assert.equal(tabsCore.nextTabIdAfterClosing(tabs, [2], 2), 3);
assert.equal(tabsCore.nextTabIdAfterClosing(tabs, [4], 4), 3);

console.log("workspace-tabs-core.test.js: ok");
