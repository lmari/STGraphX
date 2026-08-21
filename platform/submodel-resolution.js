/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initSubmodelResolutionModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXSubmodelResolution = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createSubmodelResolutionExports() {
  function createSubmodelResolutionHelpers(options = {}) {
    const normalizeSubmodelPath = typeof options.normalizeSubmodelPath === "function"
      ? options.normalizeSubmodelPath
      : (value) => String(value || "");
    const basenameOfSubmodelPath = typeof options.basenameOfSubmodelPath === "function"
      ? options.basenameOfSubmodelPath
      : (value) => String(value || "");
    const buildRuntimeModelFromData = typeof options.buildRuntimeModelFromData === "function"
      ? options.buildRuntimeModelFromData
      : () => null;
    const extractSubmodelInterfaceFromData = typeof options.extractSubmodelInterfaceFromData === "function"
      ? options.extractSubmodelInterfaceFromData
      : () => ({ inputs: [], outputs: [], inputDetails: {} });
    const supportsDirectoryInputSelection = typeof options.supportsDirectoryInputSelection === "function"
      ? options.supportsDirectoryInputSelection
      : () => false;
    const supportsDirectoryPicker = typeof options.supportsDirectoryPicker === "function"
      ? options.supportsDirectoryPicker
      : () => false;
    const ensureCurrentModelDirectoryHandle = typeof options.ensureCurrentModelDirectoryHandle === "function"
      ? options.ensureCurrentModelDirectoryHandle
      : async () => null;
    const supportsOpenFilePicker = typeof options.supportsOpenFilePicker === "function"
      ? options.supportsOpenFilePicker
      : () => false;
    const showOpenFilePickerCompat = typeof options.showOpenFilePickerCompat === "function"
      ? options.showOpenFilePickerCompat
      : async () => [];
    const pickSubmodelFileWithInput = typeof options.pickSubmodelFileWithInput === "function"
      ? options.pickSubmodelFileWithInput
      : async () => null;
    const t = typeof options.t === "function" ? options.t : (key) => key;
    const getCurrentModelDirectoryHandle = typeof options.getCurrentModelDirectoryHandle === "function"
      ? options.getCurrentModelDirectoryHandle
      : () => null;
    const getCachedSubmodelHandle = typeof options.getCachedSubmodelHandle === "function"
      ? options.getCachedSubmodelHandle
      : () => null;
    const deleteCachedSubmodelHandle = typeof options.deleteCachedSubmodelHandle === "function"
      ? options.deleteCachedSubmodelHandle
      : () => {};
    const getCachedSubmodelSource = typeof options.getCachedSubmodelSource === "function"
      ? options.getCachedSubmodelSource
      : () => "";
    const hasCachedSubmodelSource = typeof options.hasCachedSubmodelSource === "function"
      ? options.hasCachedSubmodelSource
      : () => false;
    const cacheResolvedSubmodel = typeof options.cacheResolvedSubmodel === "function"
      ? options.cacheResolvedSubmodel
      : () => {};
    const hasSubmodelTemplate = typeof options.hasSubmodelTemplate === "function"
      ? options.hasSubmodelTemplate
      : () => false;
    const getSubmodelTemplate = typeof options.getSubmodelTemplate === "function"
      ? options.getSubmodelTemplate
      : () => null;
    const setSubmodelTemplate = typeof options.setSubmodelTemplate === "function"
      ? options.setSubmodelTemplate
      : () => {};
    const isSubmodelNode = typeof options.isSubmodelNode === "function"
      ? options.isSubmodelNode
      : () => false;

    const deferredResolutionToken = String(options.deferredResolutionToken || "__submodel_deferred_resolution__");

    async function resolveSubmodelFileByPath(modelPath, resolutionOptions = {}) {
      const normalizedPath = normalizeSubmodelPath(modelPath);
      if (!normalizedPath) {
        throw new Error(t("error.submodelPathInvalid"));
      }
      const allowPrompt = resolutionOptions.allowPrompt !== false;
      const expectedName = basenameOfSubmodelPath(normalizedPath);

      async function readFromFileHandle(fileHandle, directoryHandle = null) {
        const file = await fileHandle.getFile();
        const text = await file.text();
        cacheResolvedSubmodel(normalizedPath, {
          text,
          fileHandle,
        });
        return {
          file,
          fileHandle,
          directoryHandle,
          text,
        };
      }

      const currentDirectoryHandle = getCurrentModelDirectoryHandle();
      if (currentDirectoryHandle) {
        const fileHandle = await currentDirectoryHandle.getFileHandle(normalizedPath);
        return readFromFileHandle(fileHandle, currentDirectoryHandle);
      }

      const cachedHandle = getCachedSubmodelHandle(normalizedPath);
      if (cachedHandle) {
        try {
          return await readFromFileHandle(cachedHandle, null);
        } catch (_err) {
          deleteCachedSubmodelHandle(normalizedPath);
        }
      }

      if (hasCachedSubmodelSource(normalizedPath) && !resolutionOptions.forcePrompt) {
        return {
          file: null,
          fileHandle: null,
          directoryHandle: null,
          text: getCachedSubmodelSource(normalizedPath),
        };
      }

      if (!allowPrompt) {
        throw new Error(deferredResolutionToken);
      }

      if (supportsDirectoryInputSelection() || supportsDirectoryPicker()) {
        const directoryHandle = await ensureCurrentModelDirectoryHandle();
        const fileHandle = await directoryHandle.getFileHandle(normalizedPath);
        return readFromFileHandle(fileHandle, directoryHandle);
      }

      if (supportsOpenFilePicker()) {
        const handles = await showOpenFilePickerCompat({
          multiple: false,
          types: [{
            description: "JSON",
            accept: { "application/json": [".json"] },
          }],
        });
        const fileHandle = handles?.[0] || null;
        if (!fileHandle) {
          throw new Error(t("error.loadCancelled"));
        }
        if (expectedName && fileHandle.name !== expectedName) {
          throw new Error(`${t("error.submodelPathInvalid")}: ${expectedName}`);
        }
        return readFromFileHandle(fileHandle, null);
      }

      const file = await pickSubmodelFileWithInput();
      if (expectedName && file?.name !== expectedName) {
        throw new Error(`${t("error.submodelPathInvalid")}: ${expectedName}`);
      }
      const text = await file.text();
      cacheResolvedSubmodel(normalizedPath, {
        text,
        fileHandle: null,
      });
      return {
        file,
        fileHandle: null,
        directoryHandle: null,
        text,
      };
    }

    async function loadSubmodelInterfaceByPath(modelPath) {
      const normalizedPath = normalizeSubmodelPath(modelPath);
      if (!normalizedPath) {
        throw new Error(t("error.submodelPathInvalid"));
      }
      const { text, directoryHandle } = await resolveSubmodelFileByPath(normalizedPath);
      const data = JSON.parse(text);
      setSubmodelTemplate(normalizedPath, buildRuntimeModelFromData(data, {
        directoryPath: String(directoryHandle?.path ?? ""),
      }));
      return extractSubmodelInterfaceFromData(data);
    }

    async function loadSubmodelTemplateByPath(modelPath, visited = new Set(), loadOptions = {}) {
      const normalizedPath = normalizeSubmodelPath(modelPath);
      if (!normalizedPath) {
        throw new Error(t("error.submodelPathInvalid"));
      }
      if (visited.has(normalizedPath)) {
        throw new Error(t("error.submodelRecursiveReference"));
      }
      if (hasSubmodelTemplate(normalizedPath)) {
        const cachedTemplate = getSubmodelTemplate(normalizedPath);
        const nextVisited = new Set(visited);
        nextVisited.add(normalizedPath);
        for (const childNode of (cachedTemplate?.nodes || []).filter((node) => isSubmodelNode(node) && String(node.modelPath ?? "").trim())) {
          await loadSubmodelTemplateByPath(childNode.modelPath, nextVisited, loadOptions);
        }
        return cachedTemplate;
      }
      const { text, directoryHandle } = await resolveSubmodelFileByPath(normalizedPath, {
        allowPrompt: loadOptions.allowPrompt !== false,
      });
      const data = JSON.parse(text);
      const template = buildRuntimeModelFromData(data, {
        directoryPath: String(directoryHandle?.path ?? ""),
      });
      setSubmodelTemplate(normalizedPath, template);
      const nextVisited = new Set(visited);
      nextVisited.add(normalizedPath);
      for (const childNode of (template?.nodes || []).filter((node) => isSubmodelNode(node) && String(node.modelPath ?? "").trim())) {
        await loadSubmodelTemplateByPath(childNode.modelPath, nextVisited, loadOptions);
      }
      return template;
    }

    return {
      deferredResolutionToken,
      loadSubmodelInterfaceByPath,
      loadSubmodelTemplateByPath,
      resolveSubmodelFileByPath,
    };
  }

  return {
    createSubmodelResolutionHelpers,
  };
});
