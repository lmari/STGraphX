"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadHeadlessRuntimeFromObject } = require("../headless-runtime.js");
const source = JSON.parse(fs.readFileSync(path.join(__dirname, "../examples/sgd.json"), "utf8"));

async function load(expressions = {}, execution = {}) {
  const model = structuredClone(source);
  // Keep deterministic assertions independent of the seed saved from the editor.
  Object.assign(model.execution, { randomSeed: 42 }, execution);
  for (const [name, expression] of Object.entries(expressions)) {
    model.nodes.find((node) => node.name === name).valueExpression = expression;
  }
  return loadHeadlessRuntimeFromObject(model, { lang: "en" });
}
function healthy(runtime) {
  assert.deepEqual(runtime._runtimeModel.nodes.filter((node) => node.computedError)
    .map((node) => [node.name, node.computedError]), []);
}
function rmse(x, y, k0, k1) {
  return Math.sqrt(y.reduce((sum, value, i) => sum + (value - k0 - k1 * x[i]) ** 2, 0) / y.length);
}
function near(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
}

(async () => {
  require("../markdown-rendering.js");
  const notesHtml = globalThis.STGraphXMarkdown.renderMarkdownToHtml(source.notes.markdown);
  const links = [...notesHtml.matchAll(/data-stgraphx-node="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(links.length > 20);
  for (const name of links) assert.ok(source.nodes.some((node) => node.name === name), name);
  for (const name of ["X", "Y", "k0", "k1", "trainRMSE", "testRMSE", "trainSteps"])
    assert.ok(links.includes(name), `Missing link to ${name}`);
  const runtime = await load();
  await runtime.evaluate();
  healthy(runtime);
  const chart = structuredClone(source.widgets.find((widget) =>
    widget.xyPairs.some((pair) => pair.ySource === "trainRMSE")));
  const context = vm.createContext({ graph: { widgets: [chart] } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../widgets.js"), "utf8"), context);
  function updateChart() {
    context.Widgets.updateXYWidgetsFromComputedValues(runtime.getTime(),
      new Map(runtime._runtimeModel.nodes.map((node) => [node.name, node])));
  }
  updateChart();
  const trainSeries = chart.xyPairs.find((pair) => pair.ySource === "trainRMSE");
  const testSeries = chart.xyPairs.find((pair) => pair.ySource === "testRMSE");
  assert.equal(trainSeries.seriesData[0].points.length, 1);
  assert.equal(testSeries.seriesData.length, 0);
  const initialError = runtime.getValue("trainRMSE");
  assert.equal(runtime.getValue("testRMSE"), null);
  const fixed = runtime.getValues(["X", "Y", "split", "trainIndices", "testIndices"]);
  const { trainIndices, testIndices } = fixed;
  assert.equal(trainIndices.length, 14);
  assert.equal(testIndices.length, 6);
  assert.deepEqual([...trainIndices, ...testIndices].sort((a, b) => a - b), [...Array(20).keys()]);
  for (let i = 0; i < 10; i += 1) {
    const batch = runtime.getValue("batch");
    assert.equal(batch.length, 3);
    assert.equal(new Set(batch).size, 3);
    assert.ok(batch.every((index) => Number.isInteger(index) && index >= 0 && index < 14));
    await runtime.step();
    assert.deepEqual(runtime.getValues(Object.keys(fixed)), fixed);
    assert.equal(runtime.getValue("testRMSE"), null);
  }
  await runtime.runUntil(200);
  updateChart();
  assert.equal(trainSeries.seriesData[0].points.at(-1).x, 200);
  assert.equal(testSeries.seriesData[0].points[0].x, 200);
  const trainingPoints = JSON.stringify(trainSeries.seriesData);
  const frozen = runtime.getValues(["k0", "k1", "trainRMSE", "testRMSE"]);
  healthy(runtime);
  assert.ok(frozen.trainRMSE < initialError / 3);
  for (const prefix of ["train", "test"]) {
    near(runtime.getValue(`${prefix}RMSE`), rmse(runtime.getValue(`${prefix}X`),
      runtime.getValue(`${prefix}Y`), frozen.k0, frozen.k1));
  }
  await runtime.step();
  assert.equal(runtime.getValue("trainRMSE"), null);
  assert.equal(runtime.getValue("testRMSE"), frozen.testRMSE);
  await runtime.run();
  healthy(runtime);
  updateChart();
  assert.equal(JSON.stringify(trainSeries.seriesData), trainingPoints);
  assert.equal(testSeries.seriesData[0].points.at(-1).x, 250);
  const final = { ...frozen, trainRMSE: null };
  assert.deepEqual(runtime.getValues(Object.keys(final)), final);
  const repeat = await load();
  await repeat.run();
  assert.deepEqual(repeat.getValues(Object.keys(final)), final);

  // Custom data: inferred length, ordered split, full batch and convergence to a known line.
  const custom = { X: "[0,1,2,3,4,5]", Y: "[0.5,0.7,0.9,1.1,1.3,1.5]",
    split: "range(n)", nTrain: "4", bSize: "100", lr: "0.05", trainSteps: "1000" };
  const fitted = await load(custom, { t1: 1000 });
  await fitted.run();
  healthy(fitted);
  assert.equal(fitted.getValue("n"), 6);
  assert.equal(fitted.getValue("batchSize"), 4);
  assert.deepEqual(fitted.getValue("testX"), [4, 5]);
  near(fitted.getValue("k0"), 0.5, 1e-6);
  near(fitted.getValue("k1"), 0.2, 1e-6);
  assert.ok(fitted.getValue("testRMSE") < 1e-6);

  // Alter only held-out targets: neither SGD nor the least-squares baseline may change.
  const changedTest = await load({ ...custom, Y: "[0.5,0.7,0.9,1.1,100,200]" }, { t1: 1000 });
  await changedTest.run();
  healthy(changedTest);
  assert.deepEqual(changedTest.getValues(["k0", "k1", "polyK", "trainRMSE"]),
    fitted.getValues(["k0", "k1", "polyK", "trainRMSE"]));
  assert.ok(changedTest.getValue("testRMSE") > 100);

  // Minimum valid dataset and boundary settings still keep both partitions nonempty.
  for (const [fraction, batch, count] of [["0", "0", 1], ["1", "2.9", 2]]) {
    const small = await load({ X: "[0,1,2]", Y: "[1,2,3]", split: "range(n)",
      trainFraction: fraction, bSize: batch }, { t1: 5 });
    await small.run();
    healthy(small);
    assert.equal(small.getValue("nTrain"), 2);
    assert.equal(small.getValue("batchSize"), count);
    assert.deepEqual(small.getValue("testIndices"), [2]);
  }
  console.log("sgd-example.test.js: ok");
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
