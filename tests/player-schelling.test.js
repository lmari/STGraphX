"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { loadHeadlessRuntimeFromObject } = require("../headless-runtime.js");

async function run() {
  const model = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "player", "schelling.json"), "utf8"));
  const runtime = await loadHeadlessRuntimeFromObject(model, { lang: "en" });
  assert.equal(
    runtime._runtimeModel.execution.renderEverySteps,
    model.execution.renderEverySteps,
    "the runtime must preserve the visual refresh interval configured by the model",
  );
  const moveToExpression = model.nodes.find((node) => node.name === "moveTo").valueExpression;
  for (const moveCount of [1, 2]) {
    const selection = globalThis.GraphSemantics.evaluateValueExpression(moveToExpression, {
      moveCount,
      emptyCoords: [[0, 0], [1, 1], [2, 2]],
    });
    assert.equal(selection.ok, true, `moveTo must evaluate with ${moveCount} moves`);
    assert.equal(selection.value.length, moveCount);
    assert.ok(selection.value.every((row) => Array.isArray(row) && row.length === 2), "moveTo must remain a k x 2 matrix");
  }
  await runtime.setValue("tau", 0);

  let population = null;
  for (let step = 0; step < 10; step += 1) {
    await runtime.step();
    const failed = runtime._runtimeModel.nodes.filter((node) => node.computedError);
    assert.deepEqual(failed.map((node) => `${node.name}: ${node.computedError}`), []);
    const outputs = runtime.getOutputs();
    assert.equal(outputs.unhappy, 0, "tau = 0 must leave no unhappy agents");
    assert.equal(runtime.getValue("moveCount"), 0, "no unhappy agents must produce no moves");
    assert.deepEqual(runtime.getValue("moveFrom"), [], "empty moves must not index unhappy coordinates");
    assert.deepEqual(runtime.getValue("moveTo"), [], "empty moves must not index vacant coordinates");
    assert.deepEqual(runtime.getValue("moveValues"), [], "empty moves must not index the space matrix");
    const currentPopulation = outputs.A + outputs.B;
    if (population == null) {
      population = currentPopulation;
    }
    assert.equal(currentPopulation, population, "moves must preserve the population");
  }
  console.log("player-schelling.test.js: ok");
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
