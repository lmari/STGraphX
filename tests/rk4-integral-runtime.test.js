"use strict";

const assert = require("assert");
const { loadHeadlessRuntimeFromObject } = require("../headless-runtime.js");

async function run() {
  const model = {
    version: 1,
    execution: {
      t0: 0,
      dt: 0.1,
      t1: 1,
      delayMs: 1,
      decimals: 6,
      integrator: "rk4",
      strictDefinitions: false,
    },
    nodes: [
      { id: 1, name: "rate", type: "parameter", valueExpression: "-1" },
      { id: 2, name: "pure", type: "state", output: true, initialState: "1", stateTransition: "integral(rate*this)" },
      { id: 3, name: "general", type: "state", output: true, initialState: "1", stateTransition: "integral(rate*this)+0" },
    ],
    edges: [
      { id: 1, from: 1, to: 2 },
      { id: 2, from: 1, to: 3 },
    ],
  };

  const runtime = await loadHeadlessRuntimeFromObject(model, { lang: "en" });
  await runtime.run();
  const { pure, general } = runtime.getOutputs();

  assert.ok(Math.abs(pure - Math.exp(-1)) < 1e-6, "the pure integral RK4 result must be accurate");
  assert.ok(Math.abs(pure - general) < 1e-12, "the optimized and generic RK4 paths must agree");
  console.log("rk4-integral-runtime.test.js: ok");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
