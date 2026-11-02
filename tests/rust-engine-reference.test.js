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

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  await checkScalarAlgebraic(rootDir);
  await checkScalarStateEuler(rootDir);
  console.log("rust-engine-reference.test.js: ok");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
