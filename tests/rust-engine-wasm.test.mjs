/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import init, { engineInfoJson, executeModelJson } from "../rust-engine-wasm/stgraphx_wasm.js";

const bytes = fs.readFileSync(new URL("../rust-engine-wasm/stgraphx_wasm_bg.wasm", import.meta.url));
await init({ module_or_path: bytes });

const info = JSON.parse(engineInfoJson());
assert.equal(info.name, "STGraphX Rust engine");
assert.equal(info.apiVersion, 1);
assert.ok(info.capabilities.includes("generated-arrays"));
assert.ok(info.capabilities.includes("numeric-range"));
assert.ok(info.capabilities.includes("seeded-random"));
assert.ok(info.capabilities.includes("array-set-at"));
assert.ok(info.capabilities.includes("tensor-append"));
assert.ok(info.capabilities.includes("array-iterations"));
assert.ok(info.capabilities.includes("global-parameters"));

const fixture = fs.readFileSync(
  new URL("../rust/stgraphx-engine/tests/fixtures/rk4-state.json", import.meta.url),
  "utf8",
);
const result = JSON.parse(executeModelJson(fixture));
assert.equal(result.schemaVersion, 1);
assert.equal(result.snapshots.length, 11);
assert.ok(Math.abs(result.snapshots.at(-1).values.decay - Math.exp(-1)) < 1e-6);

const generatedArraysFixture = fs.readFileSync(
  new URL("../rust/stgraphx-engine/tests/fixtures/generated-arrays.json", import.meta.url),
  "utf8",
);
const generatedArraysResult = JSON.parse(executeModelJson(generatedArraysFixture));
assert.deepEqual(generatedArraysResult.snapshots[0].values.indices, [0, 1, 2]);
assert.deepEqual(generatedArraysResult.snapshots[0].values.generatedGrid, [[2, 5], [4, 7]]);
assert.deepEqual(generatedArraysResult.snapshots[0].values.joined, [-1, 0, 1, 2, 3]);
assert.deepEqual(generatedArraysResult.snapshots[0].values.columns, [[1, 2, 5], [3, 4, 6]]);

const rangeFixture = fs.readFileSync(
  new URL("../rust/stgraphx-engine/tests/fixtures/range-sequences.json", import.meta.url),
  "utf8",
);
const rangeResult = JSON.parse(executeModelJson(rangeFixture));
assert.deepEqual(rangeResult.snapshots[0].values.singleArgument, [0, 1, 2, 3]);
assert.deepEqual(rangeResult.snapshots[0].values.descending, [3, 2, 1]);
assert.deepEqual(rangeResult.snapshots[0].values.fractional, [0, 0.1, 0.2, 0.3]);
assert.deepEqual(
  rangeResult.snapshots[0].values.valueAndIndex,
  [[-2, 0], [-1, 1], [0, 2], [1, 3], [2, 4]],
);

const randomFixture = fs.readFileSync(
  new URL("../rust/stgraphx-engine/tests/fixtures/seeded-random.json", import.meta.url),
  "utf8",
);
const randomResult = JSON.parse(executeModelJson(randomFixture));
assert.equal(randomResult.snapshots.length, 3);
assert.equal(randomResult.snapshots[0].values.fixedRandom, 0.2577907438389957);
assert.deepEqual(
  randomResult.snapshots[0].values.randomVector,
  [0.08268467499874532, 0.807323461631313, 1.8295045790728182],
);
assert.equal(randomResult.snapshots[2].values.walk, -1);

const setAtFixture = fs.readFileSync(
  new URL("../rust/stgraphx-engine/tests/fixtures/set-at.json", import.meta.url),
  "utf8",
);
const setAtResult = JSON.parse(executeModelJson(setAtFixture));
assert.deepEqual(setAtResult.snapshots[0].values.updatedVector, [1, 9, 3]);
assert.deepEqual(setAtResult.snapshots[0].values.updatedCell, [[1, 2], [8, 4]]);
assert.deepEqual(setAtResult.snapshots[0].values.infected, [
  [0, 0, 1],
  [0, 0, 0],
  [0, 0, 0],
]);
assert.deepEqual(setAtResult.snapshots[2].values.counter, [1, 1, 0]);

const arrayIterationsFixture = fs.readFileSync(
  new URL("../rust/stgraphx-engine/tests/fixtures/array-iterations.json", import.meta.url),
  "utf8",
);
const arrayIterationsResult = JSON.parse(executeModelJson(arrayIterationsFixture));
assert.deepEqual(arrayIterationsResult.snapshots[0].values.mappedVector, [-4, 1, 8, 11]);
assert.deepEqual(arrayIterationsResult.snapshots[0].values.filteredMatrix, [[2], [4]]);
assert.deepEqual(arrayIterationsResult.snapshots[0].values.flattened, [1, 2, 3, 4]);
assert.equal(arrayIterationsResult.snapshots[0].values.positiveCount, 2);
assert.deepEqual(arrayIterationsResult.snapshots[0].values.matrixIndices, [[1, 0], [1, 1]]);
assert.deepEqual(arrayIterationsResult.snapshots[2].values.mappedState, [3, 6, 9]);

process.stdout.write("rust-engine-wasm.test.mjs: ok\n");
