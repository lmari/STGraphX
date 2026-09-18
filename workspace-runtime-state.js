/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initWorkspaceRuntimeStateModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXWorkspaceRuntimeState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorkspaceRuntimeStateExports() {
  function createWorkspaceRuntimeStateHelpers(options = {}) {
    const deepClone = typeof options.deepClone === "function" ? options.deepClone : (value) => value;
    const cloneRuntimeModel = typeof options.cloneRuntimeModel === "function" ? options.cloneRuntimeModel : (value) => value;
    const cloneSimulationOutputValue = typeof options.cloneSimulationOutputValue === "function"
      ? options.cloneSimulationOutputValue
      : deepClone;

    function cloneRuntimeNodeState(node) {
      if (!node) return null;
      return {
        id: Number(node.id),
        computedValue: deepClone(node.computedValue),
        computedError: String(node.computedError || ""),
        pendingStateValue: deepClone(node.pendingStateValue),
        pendingStateError: String(node.pendingStateError || ""),
        submodelError: String(node.submodelError || ""),
        runtimeSubmodelPath: String(node.__runtimeSubmodelPath || ""),
        runtimeSubmodel: node.__runtimeSubmodel ? cloneRuntimeModel(node.__runtimeSubmodel) : null,
      };
    }

    function cloneRuntimeWidgetState(widget) {
      if (!widget) return null;
      const state = { id: Number(widget.id), type: String(widget.type || "") };
      if (["slider", "select"].includes(widget.type)) state.value = Number(widget.value);
      if (widget.type === "button") state.value = Boolean(widget.value);
      if (widget.type === "table") state.rows = Array.isArray(widget.rows) ? deepClone(widget.rows) : [];
      if (widget.type === "matrix") state.lastMatrixValue = Array.isArray(widget.lastMatrixValue) ? deepClone(widget.lastMatrixValue) : null;
      if (widget.type === "xychart") {
        state.xyPairs = Array.isArray(widget.xyPairs)
          ? widget.xyPairs.map((pair) => ({
            xSource: String(pair?.xSource ?? "time"),
            ySource: String(pair?.ySource ?? ""),
            points: Array.isArray(pair?.points) ? deepClone(pair.points) : [],
            seriesData: Array.isArray(pair?.seriesData) ? deepClone(pair.seriesData) : [],
            instantSeriesData: Array.isArray(pair?.instantSeriesData) ? deepClone(pair.instantSeriesData) : [],
          }))
          : [];
      }
      return state;
    }

    function cloneEmptyRuntimeNodeStateFromDataNode(node) {
      return {
        id: Number(node?.id), computedValue: null, computedError: "", pendingStateValue: null,
        pendingStateError: "", submodelError: "", runtimeSubmodelPath: "", runtimeSubmodel: null,
      };
    }

    function buildNodeMapFromRuntimeNodes(nodes = []) {
      return new Map((Array.isArray(nodes) ? nodes : []).map((node) => [String(node?.name ?? ""), node]));
    }

    function buildChartPairSeriesDefinitionsForSync(pair, xValue, yValue) {
      const scalar = (value) => typeof value === "number" && Number.isFinite(value);
      const vector = (value) => Array.isArray(value) && value.every(scalar);
      const label = `${pair.xSource} -> ${pair.ySource}`;
      if (scalar(xValue) && scalar(yValue)) return [{ label, point: { x: xValue, y: yValue } }];
      if (scalar(xValue) && vector(yValue)) return yValue.map((y) => ({ label, point: { x: xValue, y } }));
      if (vector(xValue) && vector(yValue) && xValue.length === yValue.length) {
        return xValue.map((x, index) => ({ label, point: { x, y: yValue[index] } }));
      }
      return [];
    }

    function buildChartPairInstantSeriesDefinitionsForSync(pair, xValue, yValue) {
      const scalar = (value) => typeof value === "number" && Number.isFinite(value);
      const vector = (value) => Array.isArray(value) && value.every(scalar);
      const label = `${pair.xSource} -> ${pair.ySource}`;
      if (scalar(xValue) && vector(yValue)) return [{ label, points: yValue.map((y) => ({ x: xValue, y })) }];
      if (vector(xValue) && vector(yValue) && xValue.length === yValue.length) {
        return [{ label, points: xValue.map((x, index) => ({ x, y: yValue[index] })) }];
      }
      return [];
    }

    function buildSubmodelSimulationHistory(previousHistory, runtimeModel) {
      const currentTime = Number(runtimeModel?.execution?.currentTime);
      if (!Number.isFinite(currentTime)) return [];
      const outputNodes = (runtimeModel?.nodes || []).filter((node) => node.output);
      if (!outputNodes.length) return [];
      const history = Array.isArray(previousHistory) ? deepClone(previousHistory) : [];
      const lastTime = history.length ? Number(history[history.length - 1]?.time) : null;
      if (lastTime != null && Math.abs(lastTime - currentTime) < 1e-12) return history;
      history.push({
        time: currentTime,
        values: Object.fromEntries(outputNodes.map((node) => [node.name, {
          value: cloneSimulationOutputValue(node.computedValue),
          error: String(node.computedError || ""),
        }])),
      });
      return history;
    }

    function buildSyncedWidgetRuntimeStates(widgetDefs, runtimeNodes, timeValue, previousStates = []) {
      const nodeMap = buildNodeMapFromRuntimeNodes(runtimeNodes);
      const previousById = new Map((Array.isArray(previousStates) ? previousStates : []).map((state) => [Number(state?.id), state]));
      return (Array.isArray(widgetDefs) ? widgetDefs : []).map((widget) => {
        const previous = previousById.get(Number(widget?.id)) || null;
        if (widget?.type === "table") {
          const state = cloneRuntimeWidgetState(widget) || { id: Number(widget?.id), type: "table", rows: [] };
          state.rows = Array.isArray(previous?.rows) ? deepClone(previous.rows) : [];
          state.lastSyncedTime = Number(previous?.lastSyncedTime);
          if (widget.showHistory && Number.isFinite(timeValue) && state.lastSyncedTime !== timeValue) {
            const columns = widget.outputOnly
              ? (Array.isArray(widget.columns) ? widget.columns.filter((name) => name === "time" || nodeMap.get(name)?.output) : [])
              : (Array.isArray(widget.columns) ? widget.columns.slice() : []);
            const values = {};
            columns.forEach((name) => {
              if (name === "time") values.time = { value: timeValue };
              else if (!nodeMap.get(name)) values[name] = { value: null };
              else if (nodeMap.get(name).computedError) values[name] = { error: nodeMap.get(name).computedError };
              else values[name] = { value: cloneSimulationOutputValue(nodeMap.get(name).computedValue) };
            });
            state.rows.push({ values });
            state.lastSyncedTime = timeValue;
          }
          return state;
        }
        if (widget?.type === "xychart") {
          const state = cloneRuntimeWidgetState(widget) || { id: Number(widget?.id), type: "xychart", xyPairs: [] };
          const previousPairs = new Map((Array.isArray(previous?.xyPairs) ? previous.xyPairs : []).map((pair) => [
            `${String(pair?.xSource ?? "time")}__${String(pair?.ySource ?? "")}`, pair,
          ]));
          state.xyPairs = (Array.isArray(widget.xyPairs) ? widget.xyPairs : []).map((pair) => {
            const key = `${String(pair?.xSource ?? "time")}__${String(pair?.ySource ?? "")}`;
            const previousPair = previousPairs.get(key) || null;
            const nextPair = {
              xSource: String(pair?.xSource ?? "time"), ySource: String(pair?.ySource ?? ""),
              points: Array.isArray(previousPair?.points) ? deepClone(previousPair.points) : [],
              seriesData: Array.isArray(previousPair?.seriesData) ? deepClone(previousPair.seriesData) : [],
              instantSeriesData: [], lastSyncedTime: Number(previousPair?.lastSyncedTime),
            };
            const xNode = nextPair.xSource === "time" ? null : nodeMap.get(nextPair.xSource);
            const yNode = nextPair.ySource === "time" ? null : nodeMap.get(nextPair.ySource);
            const xAllowed = !widget.outputOnly || nextPair.xSource === "time" || xNode?.output;
            const yAllowed = !widget.outputOnly || nextPair.ySource === "time" || yNode?.output;
            if (!xAllowed || !yAllowed || xNode?.computedError || yNode?.computedError) {
              nextPair.instantSeriesData = Array.isArray(previousPair?.instantSeriesData) ? deepClone(previousPair.instantSeriesData) : [];
              return nextPair;
            }
            const xValue = nextPair.xSource === "time" ? timeValue : xNode?.computedValue;
            const yValue = nextPair.ySource === "time" ? timeValue : yNode?.computedValue;
            nextPair.instantSeriesData = pair?.showInstantProfile
              ? buildChartPairInstantSeriesDefinitionsForSync(nextPair, xValue, yValue) : [];
            if (pair?.showTimeSeries !== false && Number.isFinite(timeValue) && nextPair.lastSyncedTime !== timeValue) {
              const definitions = buildChartPairSeriesDefinitionsForSync(nextPair, xValue, yValue);
              definitions.forEach((definition, index) => {
                if (!nextPair.seriesData[index] || nextPair.seriesData[index].label !== definition.label) {
                  nextPair.seriesData[index] = { label: definition.label, points: [] };
                }
                nextPair.seriesData[index].points.push(definition.point);
              });
              if (nextPair.seriesData.length > definitions.length) nextPair.seriesData = nextPair.seriesData.slice(0, definitions.length);
              nextPair.lastSyncedTime = timeValue;
            } else if (pair?.showTimeSeries === false) {
              nextPair.seriesData = [];
            }
            return nextPair;
          });
          return state;
        }
        if (widget?.type === "matrix") {
          const state = cloneRuntimeWidgetState(widget) || { id: Number(widget?.id), type: "matrix", lastMatrixValue: null };
          const sourceNode = nodeMap.get(String(widget?.source ?? ""));
          state.lastMatrixValue = Array.isArray(sourceNode?.computedValue) ? deepClone(sourceNode.computedValue) : state.lastMatrixValue;
          return state;
        }
        return cloneRuntimeWidgetState(widget);
      }).filter(Boolean);
    }

    function captureRuntimeStateSnapshot(graph) {
      return {
        executionCurrentTime: graph?.execution?.currentTime == null ? null : deepClone(graph.execution.currentTime),
        simulationHistory: deepClone(graph?.__simulationHistory || []),
        readDataCache: deepClone(graph?.__readDataCache || Object.create(null)),
        nodeStates: (graph?.nodes || []).map(cloneRuntimeNodeState),
        widgetStates: (graph?.widgets || []).map(cloneRuntimeWidgetState),
      };
    }

    function applyRuntimeStateSnapshot(graph, snapshot) {
      if (!graph || !snapshot || typeof snapshot !== "object") return;
      graph.execution.currentTime = snapshot.executionCurrentTime == null ? null : deepClone(snapshot.executionCurrentTime);
      graph.__simulationHistory = Array.isArray(snapshot.simulationHistory) ? deepClone(snapshot.simulationHistory) : [];
      graph.__readDataCache = snapshot.readDataCache && typeof snapshot.readDataCache === "object"
        ? deepClone(snapshot.readDataCache) : Object.create(null);
      const nodeStates = new Map((Array.isArray(snapshot.nodeStates) ? snapshot.nodeStates : []).map((state) => [Number(state?.id), state]));
      const widgetStates = new Map((Array.isArray(snapshot.widgetStates) ? snapshot.widgetStates : []).map((state) => [Number(state?.id), state]));
      (graph.nodes || []).forEach((node) => {
        const saved = nodeStates.get(Number(node.id));
        node.computedValue = saved ? deepClone(saved.computedValue) : null;
        node.computedError = saved ? String(saved.computedError || "") : "";
        node.pendingStateValue = saved ? deepClone(saved.pendingStateValue) : null;
        node.pendingStateError = saved ? String(saved.pendingStateError || "") : "";
        node.submodelError = saved ? String(saved.submodelError || "") : "";
        node.__runtimeSubmodelPath = saved ? String(saved.runtimeSubmodelPath || "") : "";
        node.__runtimeSubmodel = saved?.runtimeSubmodel ? cloneRuntimeModel(saved.runtimeSubmodel) : null;
      });
      (graph.widgets || []).forEach((widget) => {
        const saved = widgetStates.get(Number(widget.id));
        if (!saved) {
          if (widget.type === "table") widget.rows = [];
          else if (widget.type === "matrix") widget.lastMatrixValue = null;
          else if (widget.type === "xychart" && Array.isArray(widget.xyPairs)) {
            widget.xyPairs.forEach((pair) => { pair.points = []; pair.seriesData = []; pair.instantSeriesData = []; });
          }
          return;
        }
        if (["slider", "select"].includes(widget.type)) widget.value = Number(saved.value);
        else if (widget.type === "button") widget.value = Boolean(saved.value);
        if (widget.type === "table") widget.rows = Array.isArray(saved.rows) ? deepClone(saved.rows) : [];
        else if (widget.type === "matrix") widget.lastMatrixValue = Array.isArray(saved.lastMatrixValue) ? deepClone(saved.lastMatrixValue) : null;
        else if (widget.type === "xychart" && Array.isArray(widget.xyPairs)) {
          const pairs = new Map((Array.isArray(saved.xyPairs) ? saved.xyPairs : []).map((pair) => [
            `${String(pair?.xSource ?? "time")}__${String(pair?.ySource ?? "")}`, pair,
          ]));
          widget.xyPairs.forEach((pair) => {
            const savedPair = pairs.get(`${String(pair?.xSource ?? "time")}__${String(pair?.ySource ?? "")}`);
            pair.points = Array.isArray(savedPair?.points) ? deepClone(savedPair.points) : [];
            pair.seriesData = Array.isArray(savedPair?.seriesData) ? deepClone(savedPair.seriesData) : [];
            pair.instantSeriesData = Array.isArray(savedPair?.instantSeriesData) ? deepClone(savedPair.instantSeriesData) : [];
          });
        }
      });
    }

    return {
      buildChartPairInstantSeriesDefinitionsForSync,
      buildChartPairSeriesDefinitionsForSync,
      applyRuntimeStateSnapshot,
      buildSubmodelSimulationHistory,
      buildSyncedWidgetRuntimeStates,
      captureRuntimeStateSnapshot,
      buildNodeMapFromRuntimeNodes,
      cloneEmptyRuntimeNodeStateFromDataNode,
      cloneRuntimeNodeState,
      cloneRuntimeWidgetState,
    };
  }

  return { createWorkspaceRuntimeStateHelpers };
});
