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
const { STGraphXHeadlessRuntime } = require("../headless-runtime.js");

async function run() {
  const runtime = await STGraphXHeadlessRuntime.load({
    src: "examples/read_data_demo.json",
    basePath: path.join(__dirname, ".."),
    lang: "en",
  });
  await runtime.evaluate();
  assert.deepEqual(runtime.getValue("dati"), [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 2, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ]);
  assert.deepEqual(runtime.getValue("n"), [0, 0, 1, 0, 0]);

  const model = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "examples", "read_data_demo.json"), "utf8"));
  model.nodes[0].type = "algebraic";
  model.nodes[0].input = false;
  const algebraicRuntime = await STGraphXHeadlessRuntime.load({
    data: model,
    basePath: path.join(__dirname, "..", "examples"),
    lang: "en",
  });
  await algebraicRuntime.evaluate();
  assert.deepEqual(algebraicRuntime.getValue("dati"), [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 1, 2, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0],
  ]);
  console.log("read-data-runtime.test.js: ok");
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
