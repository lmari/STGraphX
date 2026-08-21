/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initRecentModelsModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXRecentModels = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createRecentModelsExports() {
  function normalizeRecentEntry(entry) {
    return {
      name: String(entry?.name || ""),
      path: String(entry?.path || "").trim(),
      handle: entry?.handle || null,
    };
  }

  function createRecentModelsStore(options = {}) {
    const storageKey = String(options.storageKey || "stgraphx.recentModels.v1");
    const maxEntries = Math.max(1, Number(options.maxEntries) || 8);
    const getHandlePath = typeof options.getHandlePath === "function" ? options.getHandlePath : async () => "";
    const supportsPaths = typeof options.supportsPaths === "function" ? options.supportsPaths : () => false;
    const createHandleFromPath = typeof options.createHandleFromPath === "function" ? options.createHandleFromPath : null;
    const unnamedLabel = typeof options.unnamedLabel === "function" ? options.unnamedLabel : () => "unnamed";

    let entries = [];

    function snapshot() {
      return entries.slice();
    }

    function trimEntries() {
      entries = entries.slice(0, maxEntries);
    }

    function saveToStorage(storage = globalThis.localStorage) {
      try {
        const payload = entries
          .filter((entry) => entry && (entry.path || entry.name))
          .slice(0, maxEntries)
          .map((entry) => ({
            name: String(entry.name || ""),
            path: String(entry.path || ""),
          }));
        storage?.setItem?.(storageKey, JSON.stringify(payload));
      } catch (_err) {
        // Ignore storage failures.
      }
    }

    function loadFromStorage(storage = globalThis.localStorage) {
      try {
        const raw = storage?.getItem?.(storageKey);
        if (!raw) {
          entries = [];
          return snapshot();
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          entries = [];
          return snapshot();
        }
        entries = parsed
          .map(normalizeRecentEntry)
          .filter((entry) => entry.path || entry.name)
          .slice(0, maxEntries);
      } catch (_err) {
        entries = [];
      }
      return snapshot();
    }

    function clear(storage = globalThis.localStorage) {
      entries = [];
      saveToStorage(storage);
      return snapshot();
    }

    function remove(entryToRemove, storage = globalThis.localStorage) {
      entries = entries.filter((entry) => entry !== entryToRemove);
      saveToStorage(storage);
      return snapshot();
    }

    async function remember(name, fileHandle = null, storage = globalThis.localStorage) {
      const trimmedName = String(name || "").trim();
      const path = supportsPaths() ? String(await getHandlePath(fileHandle)).trim() : "";
      const handle = fileHandle || null;
      if (!trimmedName && !path && !handle) {
        return snapshot();
      }
      const dedupeIndex = entries.findIndex((entry) => {
        if (path && entry.path) {
          return entry.path === path;
        }
        if (!path && !entry.path && handle && entry.handle) {
          return entry.handle === handle;
        }
        return !path && !entry.path && trimmedName && entry.name === trimmedName;
      });
      if (dedupeIndex >= 0) {
        entries.splice(dedupeIndex, 1);
      }
      entries.unshift({
        name: trimmedName || path || String(unnamedLabel()),
        path,
        handle,
      });
      trimEntries();
      saveToStorage(storage);
      return snapshot();
    }

    async function resolveHandle(entry) {
      if (entry?.handle) {
        return entry.handle;
      }
      if (entry?.path && supportsPaths() && createHandleFromPath) {
        try {
          const handle = createHandleFromPath(entry.path);
          entry.handle = handle;
          return handle;
        } catch (_err) {
          return null;
        }
      }
      return null;
    }

    return {
      clear,
      entries: snapshot,
      loadFromStorage,
      remember,
      remove,
      resolveHandle,
      saveToStorage,
    };
  }

  return {
    createRecentModelsStore,
  };
});
