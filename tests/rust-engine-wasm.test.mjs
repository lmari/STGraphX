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
assert.ok(info.capabilities.includes("tensor-append"));
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

process.stdout.write("rust-engine-wasm.test.mjs: ok\n");
