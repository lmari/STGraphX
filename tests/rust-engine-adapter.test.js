/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "rust-engine-adapter.js"), "utf8");
const context = vm.createContext({ console });
context.globalThis = context;
vm.runInContext(source, context, { filename: "rust-engine-adapter.js" });

async function main() {
  let loadCount = 0;
  let initCount = 0;
  let receivedModel = null;
  const fakeModule = {
    async default() {
      initCount += 1;
    },
    engineInfoJson() {
      return JSON.stringify({ name: "test", version: "0.1.0", apiVersion: 1, capabilities: [] });
    },
    executeModelJson(modelSource) {
      receivedModel = JSON.parse(modelSource);
      return JSON.stringify({
        schemaVersion: 1,
        engine: { name: "test", version: "0.1.0", apiVersion: 1, capabilities: [] },
        nodeCount: 2,
        snapshots: [
          { time: 0, values: { scalar: 1, vector: [1, 2] } },
          { time: 1, values: { scalar: 2, vector: [2, 4] } },
        ],
      });
    },
  };
  const adapter = context.STGraphXRustEngine.createRustEngineAdapter({
    moduleLoader: async () => {
      loadCount += 1;
      return fakeModule;
    },
  });

  assert.strictEqual(loadCount, 0, "the WebAssembly module should be loaded lazily");
  const info = await adapter.info();
  assert.strictEqual(info.name, "test");
  const result = await adapter.executeModel({ version: 1, nodes: [] });
  assert.strictEqual(loadCount, 1, "the WebAssembly module should be loaded once");
  assert.strictEqual(initCount, 1, "the WebAssembly module should be initialized once");
  assert.strictEqual(receivedModel.version, 1);
  assert.strictEqual(result.snapshots[1].values.vector[1], 4);

  assert.throws(
    () => context.STGraphXRustEngine.normalizeExecutionResult(JSON.stringify({ schemaVersion: 2 })),
    /unsupported result schema/u,
  );
  assert.throws(
    () => context.STGraphXRustEngine.normalizeExecutionResult(JSON.stringify({
      schemaVersion: 1,
      engine: { apiVersion: 1 },
      snapshots: [{ time: 0, values: { invalid: "not numeric" } }],
    })),
    /invalid value/u,
  );

  process.stdout.write("rust-engine-adapter.test.js: ok\n");
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
