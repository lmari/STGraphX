"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { loadHeadlessRuntimeFromObject } = require("../headless-runtime.js");

async function runExample(fileName, expectedOutputs) {
  const filePath = path.join(__dirname, "..", "examples", fileName);
  const model = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const runtime = await loadHeadlessRuntimeFromObject(model, { lang: "en" });
  for (let step = 0; step < 8; step += 1) {
    await runtime.step();
  }
  const failedNodes = runtime._runtimeModel.nodes.filter((node) => node.computedError);
  assert.deepEqual(
    failedNodes.map((node) => `${node.name}: ${node.computedError}`),
    [],
    `${fileName} has nodes with execution errors`,
  );
  const outputs = runtime.getOutputs();
  expectedOutputs.forEach((name) => {
    assert.notEqual(outputs[name], null, `${fileName} did not produce ${name}`);
  });
}

(async () => {
  await runExample("daisyworld_abm.json", ["daisies", "occupancy", "population", "neighborCounts"]);
  await runExample("abm_spatial_swarm.json", ["swarm", "occupancy", "neighborCounts", "focusNeighbors"]);
  console.log("abm-examples.test.js: ok");
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
