"use strict";

const assert = require("assert");
const { createHeadlessRuntime } = require("../headless-runtime.js");

async function run() {
  const runtime = createHeadlessRuntime({ lang: "en" });
  await runtime.load({ src: "tests/x2.json" });

  const submodel = runtime._runtimeModel.nodes.find((node) => node.name === "sottomodello");
  assert.ok(submodel, "the parent test model must contain its submodel node");
  runtime._runtimeModel.nodes.push({
    id: 99,
    name: "gain",
    shape: "diamond",
    global: true,
    valueExpression: "2",
    properties: [],
    computedValue: null,
    computedError: "",
  });
  submodel.inputBindings.input = "n1 + gain";

  const outputs = await runtime.step();
  assert.equal(outputs.n2, 14, "a binding can use a global parameter from the parent model");
  assert.deepEqual(
    runtime._runtimeModel.nodes.filter((node) => node.computedError).map((node) => node.name),
    [],
    "the submodel binding must not cause a runtime error",
  );

  const undefinedInputRuntime = createHeadlessRuntime({ lang: "en" });
  await undefinedInputRuntime.load({ src: "tests/x2.json" });
  const undefinedSource = undefinedInputRuntime._runtimeModel.nodes.find((node) => node.name === "n1");
  undefinedSource.valueExpression = "";
  const undefinedOutputs = await undefinedInputRuntime.step();
  assert.equal(
    undefinedOutputs.n2,
    null,
    "an undefined parent input must propagate an unavailable submodel output",
  );
  assert.deepEqual(
    undefinedInputRuntime._runtimeModel.nodes.filter((node) => node.computedError).map((node) => node.name),
    [],
    "an undefined parent input must not turn into a submodel runtime error",
  );

  const chainedRuntime = createHeadlessRuntime({ lang: "en" });
  await chainedRuntime.load({ src: "tests/submodel-chain-parent.json" });
  const chainedOutputs = await chainedRuntime.step();
  assert.deepEqual(
    chainedOutputs.targetModel,
    { output: 14 },
    "a submodel input can bind directly to an output of another submodel",
  );

  const feedbackRuntime = createHeadlessRuntime({ lang: "en" });
  await feedbackRuntime.load({ src: "tests/submodel-feedback-parent.json" });
  assert.deepEqual(
    await feedbackRuntime.step(),
    { a: 0, b: 1 },
    "state-mediated feedback between submodels evaluates their current outputs",
  );
  assert.deepEqual(
    feedbackRuntime._runtimeModel.nodes.filter((node) => node.computedError).map((node) => node.name),
    [],
    "state-mediated feedback between submodels must not create a dependency error",
  );
  console.log("submodel-runtime.test.js: ok");
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
