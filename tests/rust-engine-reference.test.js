#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { STGraphXHeadlessRuntime } = require("../headless-runtime.js");

async function loadFixture(rootDir, name) {
  const fixturePath = path.join(
    rootDir,
    "rust",
    "stgraphx-engine",
    "tests",
    "fixtures",
    name,
  );
  const source = fs.readFileSync(fixturePath, "utf8");
  return STGraphXHeadlessRuntime.loadFromJsonText(source, {
    basePath: rootDir,
    lang: "en",
  });
}

async function checkScalarAlgebraic(rootDir) {
  const runtime = await loadFixture(rootDir, "scalar-algebraic.json");

  await runtime.evaluate();
  assert.deepStrictEqual(
    runtime.getValues(["a", "b", "total", "result", "precedence"]),
    {
      a: 2,
      b: 3,
      total: 5,
      result: 24,
      precedence: 508,
    },
  );
}

async function checkScalarStateEuler(rootDir) {
  const runtime = await loadFixture(rootDir, "scalar-state-euler.json");

  await runtime.run();
  assert.deepStrictEqual(runtime.getOutputHistory(), [
    { time: 0, values: { stock: 1, counter: 10, observed: 11 } },
    { time: 0.5, values: { stock: 2, counter: 11, observed: 13.5 } },
    { time: 1, values: { stock: 3, counter: 12, observed: 16 } },
    { time: 1.5, values: { stock: 4, counter: 13, observed: 18.5 } },
  ]);
}

async function checkTensorStateEuler(rootDir) {
  const runtime = await loadFixture(rootDir, "tensor-state-euler.json");

  await runtime.run();
  assert.deepStrictEqual(runtime.getOutputHistory(), [
    {
      time: 0,
      values: {
        position: [0, 1],
        shifted: [10, 22],
        lattice: [[1, 2], [3, 4]],
      },
    },
    {
      time: 0.5,
      values: {
        position: [1, 0.5],
        shifted: [12, 21],
        lattice: [[2, 3], [4, 5]],
      },
    },
    {
      time: 1,
      values: {
        position: [2, 0],
        shifted: [14, 20],
        lattice: [[3, 4], [5, 6]],
      },
    },
  ]);
}

async function checkConditionalFunctions(rootDir) {
  const runtime = await loadFixture(rootDir, "conditional-functions.json");

  await runtime.evaluate();
  assert.deepStrictEqual(
    runtime.getValues([
      "absolute",
      "mask",
      "total",
      "rowMeans",
      "dimensions",
      "clipped",
      "roots",
      "columnTotals",
      "nonZeroByColumn",
    ]),
    {
      absolute: [2, 4, 8],
      mask: [0, 0, 1],
      total: 14,
      rowMeans: [1.5, 3.5],
      dimensions: [2, 2],
      clipped: [0, 4, 0],
      roots: [1, 2, 3],
      columnTotals: [4, 6],
      nonZeroByColumn: [1, 1],
    },
  );
}

async function checkTensorIndexing(rootDir) {
  const runtime = await loadFixture(rootDir, "tensor-indexing.json");

  await runtime.evaluate();
  assert.deepStrictEqual(
    runtime.getValues([
      "second",
      "last",
      "strideSlice",
      "reversed",
      "middleRow",
      "cell",
      "middleColumn",
      "block",
      "selectedRows",
      "selectedColumns",
      "coordinateCells",
      "dynamicCell",
      "chainedCell",
    ]),
    {
      second: 20,
      last: 40,
      strideSlice: [20, 40],
      reversed: [40, 30, 20, 10],
      middleRow: [4, 5, 6],
      cell: 6,
      middleColumn: [2, 5, 8],
      block: [[2, 3], [5, 6]],
      selectedRows: [[1, 2, 3], [7, 8, 9]],
      selectedColumns: [[1, 3], [4, 6], [7, 9]],
      coordinateCells: [2, 7],
      dynamicCell: 5,
      chainedCell: 7,
    },
  );
}

async function checkGeneratedArrays(rootDir) {
  const runtime = await loadFixture(rootDir, "generated-arrays.json");

  await runtime.evaluate();
  assert.deepStrictEqual(
    runtime.getValues([
      "indices",
      "selected",
      "generatedGrid",
      "joined",
      "rows",
      "columns",
      "position",
    ]),
    {
      indices: [0, 1, 2],
      selected: [2, 5],
      generatedGrid: [[2, 5], [4, 7]],
      joined: [-1, 0, 1, 2, 3],
      rows: [[1, 2], [3, 4], [5, 6]],
      columns: [[1, 2, 5], [3, 4, 6]],
      position: [0, 0, 0],
    },
  );
}

async function checkLocalFunctions(rootDir) {
  const runtime = await loadFixture(rootDir, "local-functions.json");

  await runtime.evaluate();
  assert.deepStrictEqual(
    runtime.getValues([
      "literalResult",
      "transformed",
      "sampleNorm",
      "separation",
      "sampleTail",
      "shiftedMatrix",
      "lastRowNorm",
    ]),
    {
      literalResult: 7,
      transformed: [0, 0, 5],
      sampleNorm: 13,
      separation: 5,
      sampleTail: [0, 3],
      shiftedMatrix: [[3, 5], [7, 9]],
      lastRowNorm: 25,
    },
  );
}

function assertClose(actual, expected, tolerance, label) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, found ${actual}`,
  );
}

async function checkRk4State(rootDir) {
  const runtime = await loadFixture(rootDir, "rk4-state.json");

  await runtime.run();
  const history = runtime.getOutputHistory();
  assert.strictEqual(history.length, 11);
  const finalSnapshot = history[history.length - 1];
  assertClose(finalSnapshot.time, 1, 1e-12, "time");
  assertClose(finalSnapshot.values.decay, Math.exp(-1), 1e-6, "decay");
  assertClose(finalSnapshot.values.vectorDecay[0], Math.exp(-1), 1e-6, "vectorDecay[0]");
  assertClose(finalSnapshot.values.vectorDecay[1], 2 * Math.exp(-1), 2e-6, "vectorDecay[1]");
  assertClose(finalSnapshot.values.position, Math.cos(1), 1e-6, "position");
  assertClose(finalSnapshot.values.velocity, -Math.sin(1), 1e-6, "velocity");
  assert.strictEqual(finalSnapshot.values.counter, 10);
  assertClose(finalSnapshot.values.timeIntegral, 0.5, 1e-12, "timeIntegral");
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  await checkScalarAlgebraic(rootDir);
  await checkScalarStateEuler(rootDir);
  await checkTensorStateEuler(rootDir);
  await checkConditionalFunctions(rootDir);
  await checkTensorIndexing(rootDir);
  await checkGeneratedArrays(rootDir);
  await checkLocalFunctions(rootDir);
  await checkRk4State(rootDir);
  console.log("rust-engine-reference.test.js: ok");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
