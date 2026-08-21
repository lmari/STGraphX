/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initSubmodelOrchestrationModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXSubmodelOrchestration = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createSubmodelOrchestrationExports() {
  function createSubmodelOrchestrationHelpers(options = {}) {
    const graph = options.graph;
    const ui = options.ui;
    const t = typeof options.t === "function" ? options.t : (key) => key;
    const isSubmodelNode = typeof options.isSubmodelNode === "function" ? options.isSubmodelNode : () => false;
    const normalizeSubmodelPath = typeof options.normalizeSubmodelPath === "function"
      ? options.normalizeSubmodelPath
      : (value) => String(value || "");
    const loadSubmodelTemplateByPath = typeof options.loadSubmodelTemplateByPath === "function"
      ? options.loadSubmodelTemplateByPath
      : async () => null;
    const loadSubmodelInterfaceByPath = typeof options.loadSubmodelInterfaceByPath === "function"
      ? options.loadSubmodelInterfaceByPath
      : async () => ({ inputs: [], outputs: [], inputDetails: {} });
    const resolveSubmodelFileByPath = typeof options.resolveSubmodelFileByPath === "function"
      ? options.resolveSubmodelFileByPath
      : async () => ({ text: "", fileHandle: null, file: null, directoryHandle: null });
    const isDeferredSubmodelResolutionError = typeof options.isDeferredSubmodelResolutionError === "function"
      ? options.isDeferredSubmodelResolutionError
      : () => false;
    const getNodeDescription = typeof options.getNodeDescription === "function" ? options.getNodeDescription : () => "";
    const emptySubmodelInterfaceCache = typeof options.emptySubmodelInterfaceCache === "function"
      ? options.emptySubmodelInterfaceCache
      : () => ({ inputs: [], outputs: [], inputDetails: {} });
    const normalizeSubmodelInterfaceCache = typeof options.normalizeSubmodelInterfaceCache === "function"
      ? options.normalizeSubmodelInterfaceCache
      : (value) => value;
    const sanitizeSubmodelBindings = typeof options.sanitizeSubmodelBindings === "function"
      ? options.sanitizeSubmodelBindings
      : () => {};
    const sanitizeAllEdgesForNode = typeof options.sanitizeAllEdgesForNode === "function"
      ? options.sanitizeAllEdgesForNode
      : () => {};
    const refreshSidebar = typeof options.refreshSidebar === "function" ? options.refreshSidebar : () => {};
    const render = typeof options.render === "function" ? options.render : () => {};
    const setStatusKey = typeof options.setStatusKey === "function" ? options.setStatusKey : () => {};
    const invalidateExecutionPlan = typeof options.invalidateExecutionPlan === "function"
      ? options.invalidateExecutionPlan
      : () => {};
    const scheduleFileStatusRefresh = typeof options.scheduleFileStatusRefresh === "function"
      ? options.scheduleFileStatusRefresh
      : () => {};
    const deriveDirectoryHandleFromFileHandle = typeof options.deriveDirectoryHandleFromFileHandle === "function"
      ? options.deriveDirectoryHandleFromFileHandle
      : async () => null;
    const loadGraphFromJsonText = typeof options.loadGraphFromJsonText === "function"
      ? options.loadGraphFromJsonText
      : () => {};
    const preloadSubmodelsAfterLoadRef = typeof options.preloadSubmodelsAfterLoadRef === "function"
      ? options.preloadSubmodelsAfterLoadRef
      : async () => {};
    const captureCurrentModelContext = typeof options.captureCurrentModelContext === "function"
      ? options.captureCurrentModelContext
      : () => null;
    const pushModelContext = typeof options.pushModelContext === "function" ? options.pushModelContext : () => {};
    const beforeOpenSubmodelInNewTab = typeof options.beforeOpenSubmodelInNewTab === "function"
      ? options.beforeOpenSubmodelInNewTab
      : () => ({ previousActiveTabId: null });
    const afterOpenSubmodelInNewTab = typeof options.afterOpenSubmodelInNewTab === "function"
      ? options.afterOpenSubmodelInNewTab
      : () => {};
    const onOpenSubmodelInNewTabFailure = typeof options.onOpenSubmodelInNewTabFailure === "function"
      ? options.onOpenSubmodelInNewTabFailure
      : () => {};

    async function ensureSubmodelTemplatesReady(orchestrationOptions = {}) {
      const submodelNodes = (graph?.nodes || []).filter((node) => isSubmodelNode(node));
      if (!submodelNodes.length) {
        ui.submodelsPrepared = true;
        return true;
      }
      if (ui.submodelsPrepared) {
        return true;
      }
      try {
        for (const node of submodelNodes) {
          const normalizedPath = normalizeSubmodelPath(node.modelPath);
          if (!normalizedPath) {
            node.submodelError = t("error.nodeDefinition.missingSubmodelPath");
            continue;
          }
          const template = await loadSubmodelTemplateByPath(normalizedPath, new Set(), orchestrationOptions);
          node.interfaceCache = {
            inputs: (template?.nodes || [])
              .filter((child) => child.shape === "diamond" || child.input)
              .map((child) => child.name),
            outputs: (template?.nodes || []).filter((child) => child.output).map((child) => child.name),
            inputDetails: Object.fromEntries(
              (template?.nodes || [])
                .filter((child) => child.shape === "diamond" || child.input)
                .map((child) => [child.name, { description: getNodeDescription(child) }]),
            ),
          };
          node.submodelError = "";
          sanitizeSubmodelBindings(node);
          sanitizeAllEdgesForNode(node.id);
        }
        ui.submodelsPrepared = true;
        refreshSidebar();
        render();
        return true;
      } catch (err) {
        if (orchestrationOptions.allowPrompt === false && isDeferredSubmodelResolutionError(err)) {
          return false;
        }
        ui.submodelsPrepared = false;
        setStatusKey("error.submodelPrepareFailed", { message: String(err?.message || t("error.load")) });
        return false;
      }
    }

    async function refreshSubmodelInterface(node, updateStatus = true, orchestrationOptions = {}) {
      if (!node || !isSubmodelNode(node)) {
        return false;
      }
      const modelPath = String(node.modelPath ?? "").trim();
      if (!modelPath) {
        node.interfaceCache = emptySubmodelInterfaceCache();
        node.submodelError = t("error.nodeDefinition.missingSubmodelPath");
        ui.submodelsPrepared = false;
        if (updateStatus) {
          setStatusKey("error.submodelMissingPath");
        }
        render();
        return false;
      }
      try {
        const normalizedPath = normalizeSubmodelPath(modelPath);
        const { text, directoryHandle } = await resolveSubmodelFileByPath(normalizedPath, {
          allowPrompt: orchestrationOptions.allowPrompt !== false,
        });
        const data = JSON.parse(text);
        const iface = await loadSubmodelInterfaceByPath(normalizedPath);
        node.interfaceCache = normalizeSubmodelInterfaceCache(iface);
        sanitizeSubmodelBindings(node);
        sanitizeAllEdgesForNode(node.id);
        node.submodelError = "";
        invalidateExecutionPlan();
        ui.submodelsPrepared = false;
        scheduleFileStatusRefresh();
        if (updateStatus) {
          setStatusKey("status.submodelInterfaceLoaded", { name: node.name });
        }
        render();
        return true;
      } catch (err) {
        if (orchestrationOptions.allowPrompt === false && isDeferredSubmodelResolutionError(err)) {
          return false;
        }
        node.interfaceCache = emptySubmodelInterfaceCache();
        node.submodelError = String(err?.message || t("error.load"));
        ui.submodelsPrepared = false;
        sanitizeAllEdgesForNode(node.id);
        invalidateExecutionPlan();
        scheduleFileStatusRefresh();
        if (updateStatus) {
          setStatusKey("error.submodelLoadFailed", { message: node.submodelError });
        }
        render();
        return false;
      }
    }

    async function refreshAllSubmodelInterfaces() {
      const submodelNodes = (graph?.nodes || []).filter((node) => isSubmodelNode(node) && String(node.modelPath ?? "").trim());
      if (!submodelNodes.length) {
        return;
      }
      for (const node of submodelNodes) {
        await refreshSubmodelInterface(node, false, { allowPrompt: false });
      }
    }

    async function preloadSubmodelsAfterLoad() {
      const submodelNodes = (graph?.nodes || []).filter((node) => isSubmodelNode(node) && String(node.modelPath ?? "").trim());
      if (!submodelNodes.length) {
        return;
      }
      try {
        await refreshAllSubmodelInterfaces();
        await ensureSubmodelTemplatesReady({ allowPrompt: false });
      } catch (_err) {
        // Best-effort preload.
      }
    }

    async function openSubmodelNode(node) {
      if (!node || !isSubmodelNode(node)) {
        return false;
      }
      const modelPath = normalizeSubmodelPath(node.modelPath);
      if (!modelPath) {
        setStatusKey("error.submodelMissingPath");
        return false;
      }
      try {
        const { text, fileHandle, file, directoryHandle } = await resolveSubmodelFileByPath(modelPath);
        pushModelContext(captureCurrentModelContext(node.name));
        const effectiveDirectoryHandle = directoryHandle || await deriveDirectoryHandleFromFileHandle(fileHandle) || null;
        loadGraphFromJsonText(
          text,
          (fileHandle && fileHandle.name) || (file && file.name) || modelPath,
          fileHandle,
          effectiveDirectoryHandle,
          true,
        );
        await preloadSubmodelsAfterLoadRef();
        setStatusKey("status.submodelOpened", { name: node.name });
        return true;
      } catch (err) {
        setStatusKey("error.submodelOpenFailed", { message: String(err?.message || t("error.load")) });
        return false;
      }
    }

    async function openSubmodelNodeInNewTab(node) {
      if (!node || !isSubmodelNode(node)) {
        return false;
      }
      const modelPath = normalizeSubmodelPath(node.modelPath);
      if (!modelPath) {
        setStatusKey("error.submodelMissingPath");
        return false;
      }
      const checkpoint = beforeOpenSubmodelInNewTab(node) || {};
      try {
        const { text, fileHandle, file, directoryHandle } = await resolveSubmodelFileByPath(modelPath);
        const effectiveDirectoryHandle = directoryHandle || await deriveDirectoryHandleFromFileHandle(fileHandle) || null;
        loadGraphFromJsonText(
          text,
          (fileHandle && fileHandle.name) || (file && file.name) || modelPath,
          fileHandle,
          effectiveDirectoryHandle,
          true,
        );
        await preloadSubmodelsAfterLoadRef();
        afterOpenSubmodelInNewTab(node, checkpoint);
        setStatusKey("status.submodelOpened", { name: node.name });
        return true;
      } catch (err) {
        onOpenSubmodelInNewTabFailure(checkpoint);
        setStatusKey("error.submodelOpenFailed", { message: String(err?.message || t("error.load")) });
        return false;
      }
    }

    return {
      ensureSubmodelTemplatesReady,
      openSubmodelNode,
      openSubmodelNodeInNewTab,
      preloadSubmodelsAfterLoad,
      refreshAllSubmodelInterfaces,
      refreshSubmodelInterface,
    };
  }

  return {
    createSubmodelOrchestrationHelpers,
  };
});
