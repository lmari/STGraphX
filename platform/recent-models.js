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
      handleId: String(entry?.handleId || "").trim(),
      directoryHandleId: String(entry?.directoryHandleId || "").trim(),
      handle: entry?.handle || null,
      directoryHandle: entry?.directoryHandle || null,
    };
  }

  function createIndexedDbHandleStore(databaseName) {
    if (!globalThis.indexedDB) {
      return null;
    }
    let databasePromise = null;

    function database() {
      if (databasePromise) {
        return databasePromise;
      }
      databasePromise = new Promise((resolve, reject) => {
        const request = globalThis.indexedDB.open(databaseName, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("handles");
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB unavailable"));
      });
      return databasePromise;
    }

    async function run(mode, operation) {
      const db = await database();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("handles", mode);
        const request = operation(transaction.objectStore("handles"));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB operation failed"));
      });
    }

    return {
      get: (key) => run("readonly", (store) => store.get(key)),
      put: (key, value) => run("readwrite", (store) => store.put(value, key)),
      remove: (key) => run("readwrite", (store) => store.delete(key)),
      clear: () => run("readwrite", (store) => store.clear()),
    };
  }

  function createRecentModelsStore(options = {}) {
    const storageKey = String(options.storageKey || "stgraphx.recentModels.v1");
    const maxEntries = Math.max(1, Number(options.maxEntries) || 8);
    const getHandlePath = typeof options.getHandlePath === "function" ? options.getHandlePath : async () => "";
    const createHandleFromPath = typeof options.createHandleFromPath === "function" ? options.createHandleFromPath : null;
    const unnamedLabel = typeof options.unnamedLabel === "function" ? options.unnamedLabel : () => "unnamed";
    const persistentHandleStore = options.persistentHandleStore
      || createIndexedDbHandleStore(`${storageKey}.handles`);

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
            handleId: String(entry.handleId || ""),
            directoryHandleId: String(entry.directoryHandleId || ""),
          }));
        storage?.setItem?.(storageKey, JSON.stringify(payload));
      } catch (_err) {
        // Ignore storage failures.
      }
    }

    async function loadFromStorage(storage = globalThis.localStorage) {
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
      if (persistentHandleStore) {
        await Promise.all(entries.map(async (entry) => {
          if (entry.handleId) {
            try {
              entry.handle = await persistentHandleStore.get(entry.handleId) || null;
            } catch (_err) {
              entry.handle = null;
            }
          }
          if (entry.directoryHandleId) {
            try {
              entry.directoryHandle = await persistentHandleStore.get(entry.directoryHandleId) || null;
            } catch (_err) {
              entry.directoryHandle = null;
            }
          }
        }));
      }
      return snapshot();
    }

    function clear(storage = globalThis.localStorage) {
      entries = [];
      saveToStorage(storage);
      persistentHandleStore?.clear?.().catch?.(() => {});
      return snapshot();
    }

    function remove(entryToRemove, storage = globalThis.localStorage) {
      entries = entries.filter((entry) => entry !== entryToRemove);
      saveToStorage(storage);
      if (entryToRemove?.handleId) {
        persistentHandleStore?.remove?.(entryToRemove.handleId).catch?.(() => {});
      }
      if (entryToRemove?.directoryHandleId) {
        persistentHandleStore?.remove?.(entryToRemove.directoryHandleId).catch?.(() => {});
      }
      return snapshot();
    }

    async function remember(name, fileHandle = null, directoryHandle = null, storage = globalThis.localStorage) {
      // Compatibility with the former remember(name, handle, storage) API.
      if (directoryHandle && typeof directoryHandle.getItem === "function" && typeof directoryHandle.setItem === "function") {
        storage = directoryHandle;
        directoryHandle = null;
      }
      const trimmedName = String(name || "").trim();
      // Native handles expose their path even if a platform capability was not
      // detected during startup. Persist it whenever it is actually available.
      let path = "";
      try {
        path = String(await getHandlePath(fileHandle)).trim();
      } catch (_err) {
        path = "";
      }
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
        const [replaced] = entries.splice(dedupeIndex, 1);
        if (replaced?.handleId) {
          persistentHandleStore?.remove?.(replaced.handleId).catch?.(() => {});
        }
        if (replaced?.directoryHandleId) {
          persistentHandleStore?.remove?.(replaced.directoryHandleId).catch?.(() => {});
        }
      }
      let handleId = "";
      let directoryHandleId = "";
      if (!path && handle && persistentHandleStore) {
        handleId = `recent-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
          await persistentHandleStore.put(handleId, handle);
        } catch (_err) {
          handleId = "";
        }
      }
      if (!path && directoryHandle && persistentHandleStore) {
        directoryHandleId = `recent-directory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
          // Legacy webkitdirectory handles contain methods and cannot be
          // structured-cloned. Persist their selected File objects instead.
          const directoryValue = Array.isArray(directoryHandle.files)
            ? {
              kind: "pseudo-directory",
              name: String(directoryHandle.name || ""),
              files: directoryHandle.files,
            }
            : directoryHandle;
          await persistentHandleStore.put(directoryHandleId, directoryValue);
        } catch (_err) {
          directoryHandleId = "";
        }
      }
      entries.unshift({
        name: trimmedName || path || String(unnamedLabel()),
        path,
        handleId,
        directoryHandleId,
        handle,
        directoryHandle: directoryHandle || null,
      });
      trimEntries();
      saveToStorage(storage);
      return snapshot();
    }

    async function resolveHandle(entry) {
      if (entry?.handle) {
        return entry.handle;
      }
      if (entry?.path && createHandleFromPath) {
        try {
          const handle = createHandleFromPath(entry.path);
          entry.handle = handle;
          return handle;
        } catch (_err) {
          return null;
        }
      }
      if (entry?.handleId && persistentHandleStore) {
        try {
          const handle = await persistentHandleStore.get(entry.handleId);
          entry.handle = handle || null;
          return entry.handle;
        } catch (_err) {
          return null;
        }
      }
      return null;
    }

    async function resolveDirectoryHandle(entry) {
      if (entry?.directoryHandle) {
        return entry.directoryHandle;
      }
      if (entry?.directoryHandleId && persistentHandleStore) {
        try {
          const handle = await persistentHandleStore.get(entry.directoryHandleId);
          entry.directoryHandle = handle || null;
          return entry.directoryHandle;
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
      resolveDirectoryHandle,
      resolveHandle,
      saveToStorage,
    };
  }

  return {
    createRecentModelsStore,
    createIndexedDbHandleStore,
  };
});
