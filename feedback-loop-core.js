/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initFeedbackLoopCoreModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXFeedbackLoopCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createFeedbackLoopCoreExports() {
  function normalizeInfluence(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "positive" || normalized === "+") return "positive";
    if (normalized === "negative" || normalized === "-") return "negative";
    if (normalized === "unknown" || normalized === "?") return "unknown";
    return "none";
  }

  function createFeedbackLoopCoreHelpers(options = {}) {
    const getGraph = typeof options.getGraph === "function" ? options.getGraph : () => ({ nodes: [], edges: [] });

    function findFeedbackLoops(maxCycles = 120) {
      const graph = getGraph() || {};
      const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
      const edges = Array.isArray(graph.edges) ? graph.edges : [];
      const nodeIds = new Set(nodes.map((node) => node?.id).filter((id) => Number.isInteger(id)));
      const bySource = new Map();
      edges.forEach((edge) => {
        if (!nodeIds.has(edge?.from) || !nodeIds.has(edge?.to)) return;
        if (!bySource.has(edge.from)) bySource.set(edge.from, []);
        bySource.get(edge.from).push(edge);
      });
      bySource.forEach((outgoing) => outgoing.sort((left, right) => (
        left.to - right.to || left.id - right.id
      )));

      const loops = [];
      let truncated = false;
      const orderedIds = [...nodeIds].sort((left, right) => left - right);
      for (const startId of orderedIds) {
        if (truncated) break;
        const visited = new Set([startId]);
        const pathNodeIds = [startId];
        const pathEdges = [];
        const visit = (nodeId) => {
          if (truncated) return;
          for (const edge of bySource.get(nodeId) || []) {
            const nextId = edge.to;
            if (nextId === startId) {
              loops.push({
                nodeIds: [...pathNodeIds],
                edgeIds: [...pathEdges.map((entry) => entry.id), edge.id],
                influences: [...pathEdges.map((entry) => normalizeInfluence(entry.influence)), normalizeInfluence(edge.influence)],
              });
              if (loops.length >= maxCycles) {
                truncated = true;
                return;
              }
              continue;
            }
            // The smallest node id is the canonical start of a cycle.
            if (nextId < startId || visited.has(nextId)) continue;
            visited.add(nextId);
            pathNodeIds.push(nextId);
            pathEdges.push(edge);
            visit(nextId);
            pathEdges.pop();
            pathNodeIds.pop();
            visited.delete(nextId);
            if (truncated) return;
          }
        };
        visit(startId);
      }

      const nodeNames = new Map(nodes.map((node) => [node.id, String(node.name ?? node.id)]));
      return {
        loops: loops.map((loop) => {
          const unknown = loop.influences.some((influence) => influence === "none" || influence === "unknown");
          const negativeCount = loop.influences.filter((influence) => influence === "negative").length;
          return {
            ...loop,
            nodeNames: loop.nodeIds.map((id) => nodeNames.get(id) || String(id)),
            sign: unknown ? "unknown" : (negativeCount % 2 === 0 ? "positive" : "negative"),
          };
        }),
        truncated,
      };
    }

    return { findFeedbackLoops };
  }

  return { createFeedbackLoopCoreHelpers };
});
