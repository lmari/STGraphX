/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

global.window = global;
require("../graph-functions.js");
require("../semantic.js");
const readData = require("../read-data-core.js");
require("../runtime-loader.js");

const normalizePath = (path) => String(path ?? "").trim().replace(/^\.\//u, "");

const validCell = readData.validateReadDataExpressionUsage(
  'readData("data/values.xlsx", "Dati", 2, 3)',
  { normalizeReadDataPath: normalizePath },
);
assert.equal(validCell.ok, true);
assert.deepEqual(validCell.calls[0], {
  ok: true, path: "data/values.xlsx", sheet: "Dati",
});

const validRange = readData.validateReadDataExpressionUsage(
  'readData("data/values.xlsx", "Dati", 1, 1, 3, 2)',
  { normalizeReadDataPath: normalizePath },
);
assert.equal(validRange.ok, true);
assert.equal(
  readData.validateReadDataExpressionUsage(
    'readData("data/values.xlsx", "Dati", time + 1, int(time) + 2)',
    { normalizeReadDataPath: normalizePath },
  ).ok,
  true,
);
assert.deepEqual(readData.extractReadDataPaths('readData("data/values.xlsx", "Dati", 1, 1)', normalizePath), ["data/values.xlsx"]);

for (const expression of [
  'readData("data/values.csv", "Dati", 1, 1)',
  'readData("data/values.xlsx", "Dati", 0, 1)',
  'readData("data/values.xlsx", "Dati", 2, 2, 1, 2)',
  'readData("data/values.xlsx")',
]) {
  assert.equal(
    readData.validateReadDataExpressionUsage(expression, { normalizeReadDataPath: normalizePath }).ok,
    false,
    `${expression} must be rejected`,
  );
}

const fixturePath = path.join(__dirname, "..", "examples", "data", "read_data.xlsx");
const fixtureBytes = fs.readFileSync(fixturePath);
const bytes = fixtureBytes.buffer.slice(fixtureBytes.byteOffset, fixtureBytes.byteOffset + fixtureBytes.byteLength);
const cache = readData.parseXlsxWorkbook(bytes, "data/read_data.xlsx");

assert.equal(readData.readDataFromWorkbook(cache, "Dati", 1, 1), "a");
assert.equal(readData.readDataFromWorkbook(cache, "Dati", 4, 3), 2);
assert.deepEqual(readData.readDataFromWorkbook(cache, "Dati", 2, 1, 6, 1), [0, 0, 1, 0, 0]);
assert.deepEqual(readData.readDataFromWorkbook(cache, "Dati", 2, 1, 3, 3), [[0, 0, 1], [0, 1, 1]]);
assert.equal(readData.readDataFromWorkbook(cache, "Dati", 20, 20), null);
assert.throws(() => readData.readDataFromWorkbook(cache, "Assente", 1, 1), /worksheet is unavailable/u);

async function verifyLoader() {
  const loader = global.STGraphXRuntimeLoader.createRuntimeLoader({
    t: (key) => key,
    normalizeReadDataPath: normalizePath,
    expressionUsesReadData: readData.expressionUsesReadData,
    validateReadDataExpressionUsage: (expression, options) => readData.validateReadDataExpressionUsage(expression, {
      ...options,
      normalizeReadDataPath: normalizePath,
    }),
    extractReadDataPaths: (expression) => readData.extractReadDataPaths(expression, normalizePath),
    parseXlsxWorkbook: readData.parseXlsxWorkbook,
    getDirectoryHandleForModel: async () => ({
      getFileHandle: async () => ({ getFile: async () => ({ arrayBuffer: async () => bytes }) }),
    }),
  });
  const model = { nodes: [{ shape: "diamond", valueExpression: 'readData("data/read_data.xlsx", "Dati", 1, 1)' }] };
  await loader.prepareReadDataCacheForModel(model);
  assert.equal(readData.readDataFromWorkbook(model.__readDataCache["data/read_data.xlsx"], "Dati", 4, 3), 2);
}

const sourcesInEveryNodeKind = {
  nodes: [
    { valueExpression: 'readData("data/algebraic.xlsx", "Dati", 1, 1)' },
    { initialStateExpression: 'readData("data/initial.xlsx", "Dati", 1, 1)' },
    { inputBindings: { input: 'readData("data/binding.xlsx", "Dati", 1, 1)' } },
  ],
  localFunctions: [{ expression: 'readData("data/function.xlsx", "Dati", 1, 1)' }],
};
const loaderForSources = global.STGraphXRuntimeLoader.createRuntimeLoader({
  t: (key) => key,
  normalizeReadDataPath: normalizePath,
  expressionUsesReadData: readData.expressionUsesReadData,
  validateReadDataExpressionUsage: (expression) => readData.validateReadDataExpressionUsage(expression, { normalizeReadDataPath: normalizePath }),
  extractReadDataPaths: (expression) => readData.extractReadDataPaths(expression, normalizePath),
  parseXlsxWorkbook: readData.parseXlsxWorkbook,
});
assert.deepEqual(
  Array.from(loaderForSources.collectReadDataPathsForModel(sourcesInEveryNodeKind)).sort(),
  ["data/algebraic.xlsx", "data/binding.xlsx", "data/function.xlsx", "data/initial.xlsx"],
);

verifyLoader().then(() => {
  console.log("read-data-core.test.js: ok");
}).catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
