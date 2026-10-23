"use strict";

const assert = require("assert");
const { createModelLoadingHelpers } = require("../platform/model-loading.js");

async function run() {
  const modelDirectory = { kind: "directory", path: "/models/current" };
  const modelFile = { kind: "file", path: "/models/current/model.json" };
  let pickerOptions = null;
  const helpers = createModelLoadingHelpers({
    supportsOpenFilePicker: () => true,
    getCurrentModelDirectoryHandle: () => modelDirectory,
    getCurrentModelFileHandle: () => modelFile,
    showOpenFilePickerCompat: async (options) => {
      pickerOptions = options;
      return [];
    },
  });

  const opened = await helpers.openGraphJson();
  assert.equal(opened, false);
  assert.strictEqual(pickerOptions.startIn, modelDirectory);
  assert.equal(pickerOptions.defaultPath, modelFile.path);
  assert.equal(pickerOptions.multiple, true);
  console.log("model-loading.test.js: ok");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
