"use strict";

const assert = require("assert");
const { createModelSessionHelpers } = require("../platform/model-session.js");

async function run() {
  const nativeHandle = { kind: "file", name: "dropped.json", path: "/models/dropped.json" };
  let requestedPath = "";
  let derivedHandle = null;
  const helpers = createModelSessionHelpers({
    createFileHandleFromPath(path) {
      requestedPath = path;
      return nativeHandle;
    },
    deriveDirectoryHandleFromFileHandle: async (handle) => {
      assert.strictEqual(handle, nativeHandle);
      derivedHandle = { kind: "directory", path: "/models" };
      return derivedHandle;
    },
  });

  const entry = await helpers.parseSelectedJsonEntry({
    name: "dropped.json",
    path: "/models/dropped.json",
    text: async () => '{"nodes":[]}',
  });

  assert.equal(requestedPath, "/models/dropped.json");
  assert.strictEqual(entry.fileHandle, nativeHandle);
  assert.strictEqual(entry.directoryHandle, derivedHandle);
  assert.equal(entry.text, '{"nodes":[]}');

  let saveOptions = null;
  const saveHelpers = createModelSessionHelpers({
    showSaveFilePickerCompat: async (options) => {
      saveOptions = options;
      return null;
    },
    normalizeJsonFilename: (name) => `${name}.json`,
  });
  await saveHelpers.pickSaveAsHandle("dropped", { path: "/models" });
  assert.equal(saveOptions.suggestedName, "dropped.json");
  assert.equal(saveOptions.defaultPath, "/models/dropped.json");
  assert.equal(saveOptions.startIn.path, "/models");
  console.log("model-session.test.js: ok");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
