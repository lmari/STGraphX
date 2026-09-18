/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initSelectionStateModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXSelectionState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createSelectionStateExports() {
  function selectedNodesOf(state) {
    if (!(state.selectedNodes instanceof Set)) {
      state.selectedNodes = new Set(state.selectedNodes || []);
    }
    return state.selectedNodes;
  }

  function clearSelection(state) {
    state.selected = null;
    selectedNodesOf(state).clear();
    state.selectedControlPoint = null;
    state.lastControlPointTap = null;
  }

  function synchronizeSelection(state, options = {}) {
    const nodeExists = typeof options.nodeExists === "function" ? options.nodeExists : () => false;
    const widgetExists = typeof options.widgetExists === "function" ? options.widgetExists : () => false;
    const textExists = typeof options.textExists === "function" ? options.textExists : () => false;
    const selectedNodes = selectedNodesOf(state);

    if (state.selected?.type === "widget") {
      if (!widgetExists(state.selected.id)) {
        state.selected = null;
      }
      selectedNodes.clear();
      return;
    }

    state.selectedNodes = new Set([...selectedNodes].filter(nodeExists));
    if (state.selected?.type === "edge") {
      state.selectedNodes.clear();
      return;
    }

    if (state.selected?.type === "text") {
      if (!textExists(state.selected.id)) {
        state.selected = null;
      }
      state.selectedNodes.clear();
      return;
    }

    if (state.selectedNodes.size === 1) {
      state.selected = { type: "node", id: [...state.selectedNodes][0] };
    } else if (state.selected?.type === "node") {
      state.selected = null;
    }
  }

  function selectTarget(state, type, id) {
    state.selected = { type, id };
    selectedNodesOf(state).clear();
    state.selectedControlPoint = null;
  }

  function selectSingleNode(state, id) {
    state.selected = { type: "node", id };
    state.selectedNodes = new Set([id]);
    state.selectedControlPoint = null;
  }

  function addNode(state, id, options) {
    const selectedNodes = selectedNodesOf(state);
    if (selectedNodes.has(id)) {
      return false;
    }
    selectedNodes.add(id);
    state.selectedControlPoint = null;
    state.selected = null;
    synchronizeSelection(state, options);
    return true;
  }

  function setNodes(state, ids, additive, options) {
    const selectedNodes = selectedNodesOf(state);
    if (!additive) {
      selectedNodes.clear();
    }
    (ids || []).forEach((id) => selectedNodes.add(id));
    state.selected = null;
    state.selectedControlPoint = null;
    synchronizeSelection(state, options);
  }

  return {
    addNode,
    clearSelection,
    selectSingleNode,
    selectTarget,
    setNodes,
    synchronizeSelection,
  };
});
