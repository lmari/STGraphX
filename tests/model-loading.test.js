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

  const inputOnlyFile = {
    name: "legacy.json",
    async text() { return "{\"nodes\":[]}"; },
  };
  const writableHandle = {
    name: "legacy.json",
    async getFile() {
      return {
        name: "legacy.json",
        async text() { return "{\"nodes\":[]}"; },
      };
    },
    async createWritable() { return {}; },
  };
  let loadedFileHandle = null;
  let rememberedFileHandle = null;
  const relinkingHelpers = createModelLoadingHelpers({
    supportsOpenFilePicker: () => true,
    resolveRecentModelHandle: async () => inputOnlyFile,
    resolveRecentModelDirectoryHandle: async () => modelDirectory,
    showOpenFilePickerCompat: async () => [writableHandle],
    prepareSelectedJsonEntries: async (entries) => {
      const fileHandle = entries[0];
      const file = typeof fileHandle.getFile === "function" ? await fileHandle.getFile() : fileHandle;
      return {
        name: file.name,
        text: await file.text(),
        data: JSON.parse(await file.text()),
        file,
        fileHandle: typeof fileHandle.getFile === "function" ? fileHandle : null,
      };
    },
    loadGraphFromJsonText: (_text, _name, fileHandle) => { loadedFileHandle = fileHandle; },
    rememberRecentModel: async (_name, fileHandle) => { rememberedFileHandle = fileHandle; },
  });
  const relinked = await relinkingHelpers.openRecentModelEntry({ name: "legacy.json" });
  assert.equal(relinked, true);
  assert.strictEqual(loadedFileHandle, writableHandle, "a legacy recent model is reopened through a writable handle");
  assert.strictEqual(rememberedFileHandle, writableHandle, "the writable handle replaces the legacy recent entry");

  let fallbackLoaded = false;
  const cancelledRelinkHelpers = createModelLoadingHelpers({
    supportsOpenFilePicker: () => true,
    resolveRecentModelHandle: async () => inputOnlyFile,
    showOpenFilePickerCompat: async () => {
      const error = new Error("Cancelled");
      error.name = "AbortError";
      throw error;
    },
    prepareSelectedJsonEntries: async () => ({
      name: inputOnlyFile.name,
      text: await inputOnlyFile.text(),
      data: JSON.parse(await inputOnlyFile.text()),
      file: inputOnlyFile,
      fileHandle: null,
    }),
    loadGraphFromJsonText: () => { fallbackLoaded = true; },
  });
  assert.equal(await cancelledRelinkHelpers.openRecentModelEntry({ name: "legacy.json" }), true);
  assert.equal(fallbackLoaded, true, "cancelling relink keeps the readable recent model available");

  console.log("model-loading.test.js: ok");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
