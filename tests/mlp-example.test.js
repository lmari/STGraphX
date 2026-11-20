"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const { loadHeadlessRuntimeFromObject } = require("../headless-runtime.js");
const source = JSON.parse(fs.readFileSync(path.join(__dirname, "../examples/mlp.json"), "utf8"));
const weights = ["W1", "b1", "W2", "b2"];

async function load(expressions = {}, execution = {}) {
  const model = structuredClone(source);
  Object.assign(model.execution, execution);
  for (const [name, expression] of Object.entries(expressions)) {
    model.nodes.find((node) => node.name === name).valueExpression = expression;
  }
  const runtime = await loadHeadlessRuntimeFromObject(model, { lang: "en" });
  await runtime.step();
  healthy(runtime);
  return runtime;
}
function healthy(runtime) {
  assert.deepEqual(runtime._runtimeModel.nodes.filter((node) => node.computedError)
    .map((node) => [node.name, node.computedError]), []);
}
function predict(x, { W1, b1, W2, b2 }) {
  return b2 + W1.reduce((sum, w, j) => sum + W2[j] * Math.tanh(w * x + b1[j]), 0);
}
function loss(x, y, params) {
  return x.reduce((sum, value, i) => sum + (predict(value, params) - y[i]) ** 2, 0) / (2 * x.length);
}
function near(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
}

(async () => {
  require("../markdown-rendering.js");
  const html = globalThis.STGraphXMarkdown.renderMarkdownToHtml(source.notes.markdown);
  const links = [...html.matchAll(/data-stgraphx-node="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(links.length > 20);
  links.forEach((name) => assert.ok(source.nodes.some((node) => node.name === name), name));

  const runtime = await load();
  const initial = runtime.getValues(weights);
  const initialRMSE = runtime.getValue("trainRMSE");
  assert.equal(runtime.getValue("testRMSE"), null);
  assert.equal(runtime.getValue("batchSize"), runtime.getValue("nTrain"));
  const fixed = runtime.getValues(["X", "Y", "split", "trainIndices", "testIndices"]);
  assert.deepEqual([...fixed.trainIndices, ...fixed.testIndices].sort((a, b) => a - b),
    Array.from({ length: 31 }, (_, i) => i));

  // Numerical differentiation independently checks every backpropagated component.
  const x = runtime.getValue("batchX");
  const y = runtime.getValue("batchY");
  const gradientNames = ["dW1", "db1", "dW2", "db2"];
  const gradients = runtime.getValues(gradientNames);
  for (const [index, name] of weights.entries()) {
    const components = Array.isArray(initial[name]) ? initial[name].length : 1;
    for (let j = 0; j < components; j += 1) {
      const plus = structuredClone(initial);
      const minus = structuredClone(initial);
      const epsilon = 1e-5;
      if (Array.isArray(initial[name])) {
        plus[name][j] += epsilon;
        minus[name][j] -= epsilon;
      } else {
        plus[name] += epsilon;
        minus[name] -= epsilon;
      }
      const expected = (loss(x, y, plus) - loss(x, y, minus)) / (2 * epsilon);
      const gradient = gradients[gradientNames[index]];
      near(Array.isArray(gradient) ? gradient[j] : gradient, expected);
    }
  }
  runtime.getValue("batchPred").forEach((value, i) => near(value, predict(x[i], initial)));
  await runtime.step();
  const rate = runtime.getValue("lr");
  weights.forEach((name, i) => {
    const gradient = gradients[gradientNames[i]];
    const expected = Array.isArray(initial[name])
      ? initial[name].map((value, j) => value - rate * gradient[j])
      : initial[name] - rate * gradient;
    assert.deepEqual(runtime.getValue(name), expected);
  });
  await runtime.runUntil(1499);
  healthy(runtime);
  assert.equal(runtime.getValue("testRMSE"), null);
  assert.deepEqual(runtime.getValues(Object.keys(fixed)), fixed);
  await runtime.step();
  const frozen = runtime.getValues(weights);
  const testRMSE = runtime.getValue("testRMSE");
  assert.ok(runtime.getValue("trainRMSE") < initialRMSE / 5);
  assert.ok(testRMSE < 0.12);
  for (const prefix of ["train", "test"]) {
    near(runtime.getValue(`${prefix}RMSE`), Math.sqrt(2 * loss(
      runtime.getValue(`${prefix}X`), runtime.getValue(`${prefix}Y`), frozen)));
  }
  await runtime.run();
  healthy(runtime);
  assert.deepEqual(runtime.getValues(weights), frozen);
  assert.equal(runtime.getValue("trainRMSE"), null);
  assert.equal(runtime.getValue("testRMSE"), testRMSE);
  const repeat = await load();
  await repeat.run();
  assert.deepEqual(repeat.getValues(weights), frozen);

  // Held-out targets cannot influence training; custom sizes and mini-batches work.
  for (const [hiddenSize, bSize] of [[1, 1], [6, 3]]) {
    const settings = { X: "[-1,-0.6,-0.2,0.2,0.6,1]", Y: "[1,0.36,0.04,0.04,0.36,1]",
      split: "range(n)", nTrain: "4", hiddenSize: String(hiddenSize),
      bSize: String(bSize), trainSteps: "20" };
    const normal = await load(settings, { t1: 21 });
    const changed = await load({ ...settings, Y: "[1,0.36,0.04,0.04,100,200]" }, { t1: 21 });
    for (let i = 0; i < 20; i += 1) {
      const batch = normal.getValue("batch");
      assert.equal(batch.length, bSize);
      assert.equal(new Set(batch).size, bSize);
      assert.ok(batch.every((value) => value >= 0 && value < 4));
      await normal.step();
      await changed.step();
      assert.deepEqual(changed.getValues(weights), normal.getValues(weights));
    }
    healthy(normal);
    healthy(changed);
    assert.equal(normal.getValue("W1").length, hiddenSize);
    assert.equal(normal.getValue("b1").length, hiddenSize);
    assert.equal(normal.getValue("W2").length, hiddenSize);
    assert.equal(normal.getValue("n"), 6);
    assert.ok(changed.getValue("testRMSE") > 100);
    assert.notEqual(normal.getValue("testRMSE"), changed.getValue("testRMSE"));
  }
  console.log("mlp-example.test.js: ok");
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
