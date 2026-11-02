#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { STGraphXHeadlessRuntime } = require("../headless-runtime.js");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const fixturePath = path.join(
    rootDir,
    "rust",
    "stgraphx-engine",
    "tests",
    "fixtures",
    "scalar-algebraic.json",
  );
  const source = fs.readFileSync(fixturePath, "utf8");
  const runtime = await STGraphXHeadlessRuntime.loadFromJsonText(source, {
    basePath: rootDir,
    lang: "en",
  });

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
  console.log("rust-engine-reference.test.js: ok");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
