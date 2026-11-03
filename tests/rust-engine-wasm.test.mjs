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

const fixture = fs.readFileSync(
  new URL("../rust/stgraphx-engine/tests/fixtures/rk4-state.json", import.meta.url),
  "utf8",
);
const result = JSON.parse(executeModelJson(fixture));
assert.equal(result.schemaVersion, 1);
assert.equal(result.snapshots.length, 11);
assert.ok(Math.abs(result.snapshots.at(-1).values.decay - Math.exp(-1)) < 1e-6);

process.stdout.write("rust-engine-wasm.test.mjs: ok\n");
