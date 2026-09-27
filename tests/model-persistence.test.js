"use strict";

const assert = require("assert");
const { createModelPersistenceHelpers } = require("../platform/model-persistence.js");

async function run() {
  const helpers = createModelPersistenceHelpers();
  let pickerCalls = 0;
  let written = "";
  let saved = false;
  let recentCalls = 0;
  const fileHandle = {
    name: "lesson.json",
    async createWritable() {
      return {
        async write(text) { written = text; },
        async close() {},
      };
    },
  };
  const result = await helpers.saveJsonModel({
    dirtySinceLastSave: true,
    currentFileName: "lesson.json",
    exportGraphData: () => ({ nodes: [] }),
    pickSaveAsHandle: async () => {
      pickerCalls += 1;
      return fileHandle;
    },
    normalizeJsonFilename: (name) => name,
    markSavedSnapshot: () => { saved = true; },
    rememberRecentModel: async () => { recentCalls += 1; },
  });

  assert.equal(result.ok, true);
  assert.equal(pickerCalls, 1, "the first web Save must establish a writable file handle");
  assert.equal(written, '{\n  "nodes": []\n}');
  assert.equal(saved, true);
  assert.equal(recentCalls, 1, "the selected writable file must be stored among recent models");

  let fallbackRecent = null;
  const fallback = await helpers.saveJsonModel({
    dirtySinceLastSave: true,
    currentFileName: "download-only.json",
    exportGraphData: () => ({ nodes: [1] }),
    pickSaveAsHandle: async () => null,
    normalizeJsonFilename: (name) => name,
    downloadJsonFile: () => {},
    markSavedSnapshot: () => {},
    rememberRecentModel: async (...args) => { fallbackRecent = args; },
  });
  assert.equal(fallback.ok, true);
  assert.equal(fallbackRecent[0], "download-only.json");
  assert.equal(fallbackRecent[1], null);
  assert.equal(fallbackRecent[3], '{\n  "nodes": [\n    1\n  ]\n}');
  console.log("model-persistence.test.js: ok");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
