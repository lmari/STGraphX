#!/usr/bin/env node

const path = require("path");
const { STGraphXHeadlessRuntime } = require("../headless-runtime.js");

async function simulate(rootDir, parameterA) {
  const runtime = await STGraphXHeadlessRuntime.load({
    src: "examples/oscillator.json",
    basePath: rootDir,
    lang: "it",
  });
  await runtime.setValue("a", parameterA, { evaluate: true });
  await runtime.runUntil(2);
  return { a: parameterA, time: runtime.getTime(), outputs: runtime.getOutputs() };
}

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const results = [];
  for (const parameterA of [0.5, 1, 1.5, 2]) {
    results.push(await simulate(rootDir, parameterA));
  }
  console.table(results.map(({ a, time, outputs }) => ({ a, time, x: outputs.x, y: outputs.y })));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
