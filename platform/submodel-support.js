/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initSubmodelSupportModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXSubmodelSupport = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createSubmodelSupportExports() {
  function createSubmodelSupportHelpers(options = {}) {
    const normalizeSubmodelPath = typeof options.normalizeSubmodelPath === "function"
      ? options.normalizeSubmodelPath
      : (value) => String(value || "");
    const basenameOfSubmodelPath = typeof options.basenameOfSubmodelPath === "function"
      ? options.basenameOfSubmodelPath
      : (value) => String(value || "");
    const parseSelectedJsonEntry = typeof options.parseSelectedJsonEntry === "function"
      ? options.parseSelectedJsonEntry
      : async () => null;
    const buildRuntimeModelFromData = typeof options.buildRuntimeModelFromData === "function"
      ? options.buildRuntimeModelFromData
      : () => null;
    const descriptionPropertyKeys = typeof options.descriptionPropertyKeys === "function"
      ? options.descriptionPropertyKeys
      : () => new Set(["description"]);
    const supportsOpenFilePicker = typeof options.supportsOpenFilePicker === "function"
      ? options.supportsOpenFilePicker
      : () => false;
    const showOpenFilePickerCompat = typeof options.showOpenFilePickerCompat === "function"
      ? options.showOpenFilePickerCompat
      : async () => [];
    const pickSubmodelFilesWithInput = typeof options.pickSubmodelFilesWithInput === "function"
      ? options.pickSubmodelFilesWithInput
      : async () => [];
    const getCurrentModelDirectoryHandle = typeof options.getCurrentModelDirectoryHandle === "function"
      ? options.getCurrentModelDirectoryHandle
      : () => null;
    const deriveDirectoryHandleFromCurrentFile = typeof options.deriveDirectoryHandleFromCurrentFile === "function"
      ? options.deriveDirectoryHandleFromCurrentFile
      : async () => null;
    const setCurrentModelDirectoryHandle = typeof options.setCurrentModelDirectoryHandle === "function"
      ? options.setCurrentModelDirectoryHandle
      : () => {};
    const ensureCurrentModelDirectoryHandle = typeof options.ensureCurrentModelDirectoryHandle === "function"
      ? options.ensureCurrentModelDirectoryHandle
      : async () => null;
    const supportsDirectoryInputSelection = typeof options.supportsDirectoryInputSelection === "function"
      ? options.supportsDirectoryInputSelection
      : () => false;
    const supportsDirectoryPicker = typeof options.supportsDirectoryPicker === "function"
      ? options.supportsDirectoryPicker
      : () => false;
    const confirmSelectModelFolder = typeof options.confirmSelectModelFolder === "function"
      ? options.confirmSelectModelFolder
      : () => false;
    const onModelFolderSelected = typeof options.onModelFolderSelected === "function"
      ? options.onModelFolderSelected
      : () => {};
    const hasCachedSubmodel = typeof options.hasCachedSubmodel === "function"
      ? options.hasCachedSubmodel
      : () => false;
    const cacheSubmodel = typeof options.cacheSubmodel === "function"
      ? options.cacheSubmodel
      : () => {};
    const invalidJsonMessage = typeof options.invalidJsonMessage === "function"
      ? options.invalidJsonMessage
      : () => String(options.invalidJsonMessage || "Invalid JSON");

    function collectReferencedSubmodelNames(data) {
      if (!data || !Array.isArray(data.nodes)) {
        return [];
      }
      return data.nodes
        .filter((node) => String(node?.type ?? "") === "submodel")
        .map((node) => normalizeSubmodelPath(node?.modelPath))
        .filter(Boolean);
    }

    function rootModelHasSubmodels(data) {
      return Boolean(data && Array.isArray(data.nodes) && data.nodes.some((node) => String(node?.type ?? "") === "submodel"));
    }

    function rootModelHasUnresolvedSubmodels(data) {
      const names = collectReferencedSubmodelNames(data);
      return names.some((name) => name && !hasCachedSubmodel(name));
    }

    async function maybeSelectModelDirectoryForSubmodels(data) {
      if (!rootModelHasSubmodels(data)) {
        return null;
      }
      const derivedFromCurrentFile = await deriveDirectoryHandleFromCurrentFile();
      if (derivedFromCurrentFile) {
        setCurrentModelDirectoryHandle(derivedFromCurrentFile);
        return derivedFromCurrentFile;
      }
      const currentDirectoryHandle = getCurrentModelDirectoryHandle();
      if (currentDirectoryHandle) {
        return currentDirectoryHandle;
      }
      if (!rootModelHasUnresolvedSubmodels(data)) {
        return null;
      }
      if (!supportsDirectoryInputSelection() && !supportsDirectoryPicker()) {
        return null;
      }
      if (!confirmSelectModelFolder()) {
        return null;
      }
      const handle = await ensureCurrentModelDirectoryHandle();
      onModelFolderSelected();
      return handle;
    }

    async function cacheSelectedSubmodelEntries(entries, allowedNames = null) {
      const allowed = allowedNames instanceof Set ? allowedNames : null;
      for (const entry of entries || []) {
        const item = await parseSelectedJsonEntry(entry);
        if (!item?.name) {
          continue;
        }
        const baseName = normalizeSubmodelPath(item.name) || basenameOfSubmodelPath(item.name);
        if (!baseName || (allowed && !allowed.has(baseName))) {
          continue;
        }
        let template = null;
        try {
          const data = JSON.parse(item.text);
          template = buildRuntimeModelFromData(data, {
            directoryPath: String(item.directoryHandle?.path ?? ""),
          });
        } catch (_err) {
          template = null;
        }
        cacheSubmodel(baseName, {
          text: item.text,
          fileHandle: item.fileHandle || null,
          template,
        });
      }
    }

    async function promptForMissingSubmodelFiles(missingPaths) {
      const unresolved = new Set(
        Array.from(missingPaths || [])
          .map((value) => normalizeSubmodelPath(value))
          .filter(Boolean),
      );
      if (!unresolved.size) {
        return false;
      }
      try {
        if (supportsOpenFilePicker()) {
          const handles = await showOpenFilePickerCompat({
            multiple: true,
            types: [{
              description: "JSON",
              accept: { "application/json": [".json"] },
            }],
          });
          if (!handles || handles.length === 0) {
            return false;
          }
          await cacheSelectedSubmodelEntries(handles, unresolved);
        } else {
          const files = await pickSubmodelFilesWithInput();
          await cacheSelectedSubmodelEntries(files, unresolved);
        }
        return Array.from(unresolved).every((name) => hasCachedSubmodel(name));
      } catch (_err) {
        return false;
      }
    }

    function extractSubmodelInterfaceFromData(data) {
      if (!data || !Array.isArray(data.nodes)) {
        throw new Error(invalidJsonMessage());
      }
      const inputs = [];
      const outputs = [];
      const inputDetails = {};
      data.nodes.forEach((node) => {
        const nodeType = String(node?.type ?? "");
        const name = String(node?.name ?? "").trim();
        if (!name) {
          return;
        }
        if (nodeType === "parameter" || (nodeType === "algebraic" && node.input === true)) {
          inputs.push(name);
          const description = Array.isArray(node?.properties)
            ? String(
              (node.properties.find((prop) => descriptionPropertyKeys().has(String(prop?.key ?? "").trim().toLowerCase()))?.value) ?? "",
            ).trim()
            : "";
          inputDetails[name] = { description };
        }
        if (node.output === true) {
          outputs.push(name);
        }
      });
      return {
        inputs: [...new Set(inputs)],
        outputs: [...new Set(outputs)],
        inputDetails,
      };
    }

    return {
      cacheSelectedSubmodelEntries,
      collectReferencedSubmodelNames,
      extractSubmodelInterfaceFromData,
      maybeSelectModelDirectoryForSubmodels,
      promptForMissingSubmodelFiles,
      rootModelHasSubmodels,
      rootModelHasUnresolvedSubmodels,
    };
  }

  return {
    createSubmodelSupportHelpers,
  };
});
