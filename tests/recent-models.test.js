"use strict";

const assert = require("assert");
const { createRecentModelsStore } = require("../platform/recent-models.js");

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

async function run() {
  const storage = createStorage();
  const fileHandle = { path: "/models/course/sir.json" };
  const store = createRecentModelsStore({
    storageKey: "recent-models-test",
    // The path must be retained even if this capability was unavailable at boot.
    supportsPaths: () => false,
    getHandlePath: async (handle) => handle?.path || "",
    createHandleFromPath: (filePath) => ({ path: filePath }),
  });

  await store.remember("sir.json", fileHandle, storage);
  const persisted = JSON.parse(storage.getItem("recent-models-test"));
  assert.equal(persisted[0].path, "/models/course/sir.json");

  const restored = createRecentModelsStore({
    storageKey: "recent-models-test",
    supportsPaths: () => false,
    createHandleFromPath: (filePath) => ({ path: filePath }),
  });
  await restored.loadFromStorage(storage);
  const entry = restored.entries()[0];
  assert.equal(entry.path, "/models/course/sir.json");
  assert.deepEqual(await restored.resolveHandle(entry), { path: "/models/course/sir.json" });

  const handleStorage = new Map();
  const persistentHandleStore = {
    get: async (key) => handleStorage.get(key),
    put: async (key, value) => handleStorage.set(key, value),
    remove: async (key) => handleStorage.delete(key),
    clear: async () => handleStorage.clear(),
  };
  const browserStorage = createStorage();
  const browserHandle = { kind: "file", name: "web-model.json" };
  const browserDirectoryHandle = { kind: "directory", name: "models" };
  const browserStore = createRecentModelsStore({
    storageKey: "recent-browser-test",
    getHandlePath: async () => "",
    persistentHandleStore,
  });
  await browserStore.remember("web-model.json", browserHandle, browserDirectoryHandle, browserStorage);
  const browserPersisted = JSON.parse(browserStorage.getItem("recent-browser-test"));
  assert.ok(browserPersisted[0].handleId, "browser entries retain an IndexedDB handle reference");
  assert.ok(browserPersisted[0].directoryHandleId, "browser entries retain an IndexedDB directory reference");

  const browserRestored = createRecentModelsStore({
    storageKey: "recent-browser-test",
    getHandlePath: async () => "",
    persistentHandleStore,
  });
  await browserRestored.loadFromStorage(browserStorage);
  const browserEntry = browserRestored.entries()[0];
  assert.equal(await browserRestored.resolveHandle(browserEntry), browserHandle);
  assert.equal(await browserRestored.resolveDirectoryHandle(browserEntry), browserDirectoryHandle);

  // Firefox and other browsers without File System Access only expose a File
  // from the input picker. It is still structured-cloneable in IndexedDB and
  // must therefore remain usable from the Recent models menu.
  const fallbackFile = { name: "input-only.json", text: async () => "{\"nodes\":[]}" };
  const fallbackStore = createRecentModelsStore({
    storageKey: "recent-input-test",
    getHandlePath: async () => "",
    persistentHandleStore,
  });
  await fallbackStore.remember("input-only.json", fallbackFile, browserStorage);
  const fallbackRestored = createRecentModelsStore({
    storageKey: "recent-input-test",
    getHandlePath: async () => "",
    persistentHandleStore,
  });
  await fallbackRestored.loadFromStorage(browserStorage);
  assert.equal(await fallbackRestored.resolveHandle(fallbackRestored.entries()[0]), fallbackFile);

  console.log("recent-models.test.js: ok");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
