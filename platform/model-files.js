/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initModelFilesModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXModelFiles = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createModelFilesExports() {
  function createModelFileHelpers(options = {}) {
    const defaultJsonFilename = typeof options.defaultJsonFilename === "function"
      ? options.defaultJsonFilename
      : () => "graph.json";
    const hasPlatformApi = typeof options.hasPlatformApi === "function"
      ? options.hasPlatformApi
      : () => false;
    const getPlatform = typeof options.getPlatform === "function"
      ? options.getPlatform
      : () => globalThis.STGraphXPlatform;

    function normalizeJsonFilename(name) {
      const trimmed = String(name || "").trim();
      if (!trimmed) {
        return String(defaultJsonFilename());
      }
      return trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`;
    }

    function normalizeCsvFilename(name) {
      const trimmed = String(name || "").trim();
      if (!trimmed) {
        return normalizeJsonFilename(defaultJsonFilename()).replace(/\.json$/i, ".csv");
      }
      return trimmed.toLowerCase().endsWith(".csv") ? trimmed : `${trimmed}.csv`;
    }

    function supportsRecentModelPaths() {
      return hasPlatformApi("createFileHandleFromPath");
    }

    async function extractFileHandlePath(fileHandle) {
      if (!fileHandle) {
        return "";
      }
      if (typeof fileHandle.getPath === "function") {
        try {
          const path = String(await fileHandle.getPath()).trim();
          if (path) {
            return path;
          }
        } catch (_err) {
          // Fall back below.
        }
      }
      return String(fileHandle.path ?? "").trim();
    }

    function tryDeriveDirectoryHandleFromFileHandle(fileHandle) {
      const filePath = String(fileHandle?.path ?? "").trim();
      if (!filePath || !hasPlatformApi("createDirectoryHandleFromPath")) {
        return null;
      }
      try {
        return getPlatform()?.createDirectoryHandleFromPath(filePath) || null;
      } catch (_err) {
        return null;
      }
    }

    async function deriveDirectoryHandleFromFileHandle(fileHandle) {
      if (!fileHandle) {
        return null;
      }
      if (
        typeof fileHandle.getParentDirectoryPath === "function"
        && hasPlatformApi("createDirectoryHandleFromDirectoryPath")
      ) {
        try {
          const directoryPath = String(await fileHandle.getParentDirectoryPath()).trim();
          if (directoryPath) {
            return getPlatform()?.createDirectoryHandleFromDirectoryPath(directoryPath) || null;
          }
        } catch (_err) {
          // Fall back below.
        }
      }
      if (typeof fileHandle.getPath === "function" && hasPlatformApi("createDirectoryHandleFromPath")) {
        try {
          const filePath = String(await fileHandle.getPath()).trim();
          if (filePath) {
            return getPlatform()?.createDirectoryHandleFromPath(filePath) || null;
          }
        } catch (_err) {
          // Fall back below.
        }
      }
      if (typeof fileHandle.getParentDirectoryHandle === "function") {
        try {
          const handle = await fileHandle.getParentDirectoryHandle();
          if (handle) {
            return handle;
          }
        } catch (_err) {
          // Fall back below.
        }
      }
      return tryDeriveDirectoryHandleFromFileHandle(fileHandle);
    }

    function derivedDirectoryHandleDisplayName(handle) {
      const name = String(handle?.name ?? "").trim();
      const rawPath = String(handle?.path ?? "").trim();
      return name || rawPath || "";
    }

    function downloadJsonFile(filename, json) {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = normalizeJsonFilename(filename);
      anchor.click();
      URL.revokeObjectURL(url);
    }

    function downloadTextFile(filename, text, mimeType = "text/plain;charset=utf-8") {
      const blob = new Blob([text], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    return {
      normalizeJsonFilename,
      normalizeCsvFilename,
      supportsRecentModelPaths,
      extractFileHandlePath,
      tryDeriveDirectoryHandleFromFileHandle,
      deriveDirectoryHandleFromFileHandle,
      derivedDirectoryHandleDisplayName,
      downloadJsonFile,
      downloadTextFile,
    };
  }

  return {
    createModelFileHelpers,
  };
});
