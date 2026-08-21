/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initModelSessionModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXModelSession = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createModelSessionExports() {
  function createModelSessionHelpers(options = {}) {
    const deriveDirectoryHandleFromFileHandle = typeof options.deriveDirectoryHandleFromFileHandle === "function"
      ? options.deriveDirectoryHandleFromFileHandle
      : async () => null;
    const hasPlatformApi = typeof options.hasPlatformApi === "function"
      ? options.hasPlatformApi
      : () => false;
    const getPlatform = typeof options.getPlatform === "function"
      ? options.getPlatform
      : () => globalThis.STGraphXPlatform;
    const normalizeSubmodelPath = typeof options.normalizeSubmodelPath === "function"
      ? options.normalizeSubmodelPath
      : (value) => String(value || "");
    const basenameOfSubmodelPath = typeof options.basenameOfSubmodelPath === "function"
      ? options.basenameOfSubmodelPath
      : (value) => String(value || "");
    const buildRuntimeModelFromData = typeof options.buildRuntimeModelFromData === "function"
      ? options.buildRuntimeModelFromData
      : () => null;
    const showSaveFilePickerCompat = typeof options.showSaveFilePickerCompat === "function"
      ? options.showSaveFilePickerCompat
      : async () => null;
    const normalizeJsonFilename = typeof options.normalizeJsonFilename === "function"
      ? options.normalizeJsonFilename
      : (value) => String(value || "");
    const normalizeCsvFilename = typeof options.normalizeCsvFilename === "function"
      ? options.normalizeCsvFilename
      : (value) => String(value || "");

    async function parseSelectedJsonEntry(entry) {
      if (!entry) {
        return null;
      }
      if (typeof entry.getFile === "function") {
        const file = await entry.getFile();
        const directoryHandle = await deriveDirectoryHandleFromFileHandle(entry);
        return {
          name: String(file?.name || entry.name || ""),
          text: await file.text(),
          file,
          fileHandle: entry,
          directoryHandle,
        };
      }
      const filePath = String(entry?.path || entry?.webkitRelativePath || "").trim();
      const directoryHandle = filePath && hasPlatformApi("createDirectoryHandleFromPath")
        ? getPlatform()?.createDirectoryHandleFromPath(filePath) || null
        : null;
      return {
        name: String(entry?.name || ""),
        text: await entry.text(),
        file: entry,
        fileHandle: null,
        directoryHandle,
      };
    }

    async function prepareSelectedJsonEntries(entries, callbacks = {}) {
      const onCacheSubmodelSource = typeof callbacks.onCacheSubmodelSource === "function"
        ? callbacks.onCacheSubmodelSource
        : () => {};
      const parsed = [];
      for (const entry of entries || []) {
        const item = await parseSelectedJsonEntry(entry);
        if (!item?.name) {
          continue;
        }
        try {
          item.data = JSON.parse(item.text);
        } catch (_err) {
          item.data = null;
        }
        item.baseName = normalizeSubmodelPath(item.name) || basenameOfSubmodelPath(item.name);
        parsed.push(item);
      }
      const referenced = new Set();
      parsed.forEach((item) => {
        if (!item?.data || !Array.isArray(item.data.nodes)) {
          return;
        }
        item.data.nodes
          .filter((node) => String(node?.type ?? "") === "submodel")
          .map((node) => normalizeSubmodelPath(node?.modelPath))
          .filter(Boolean)
          .forEach((name) => referenced.add(name));
      });
      const root = parsed.find((item) => item.baseName && !referenced.has(item.baseName)) || parsed[0] || null;
      if (!root) {
        return null;
      }
      parsed.forEach((item) => {
        if (!item.baseName || item === root) {
          return;
        }
        let template = null;
        if (item.data) {
          try {
            template = buildRuntimeModelFromData(item.data, {
              directoryPath: String(item.directoryHandle?.path ?? ""),
            });
          } catch (_err) {
            template = null;
          }
        }
        onCacheSubmodelSource(item.baseName, {
          text: item.text,
          fileHandle: item.fileHandle || null,
          template,
        });
      });
      return root;
    }

    async function pickSaveAsHandle(suggestedName) {
      return showSaveFilePickerCompat({
        suggestedName: normalizeJsonFilename(suggestedName),
        types: [
          {
            description: "JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
    }

    async function pickSaveCsvHandle(suggestedName) {
      return showSaveFilePickerCompat({
        suggestedName: normalizeCsvFilename(suggestedName),
        types: [
          {
            description: "CSV",
            accept: { "text/csv": [".csv"] },
          },
        ],
      });
    }

    return {
      parseSelectedJsonEntry,
      prepareSelectedJsonEntries,
      pickSaveAsHandle,
      pickSaveCsvHandle,
    };
  }

  return {
    createModelSessionHelpers,
  };
});
