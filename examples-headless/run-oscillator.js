#!/usr/bin/env node

const path = require("path");
const { STGraphXHeadlessRuntime } = require("../headless-runtime.js");

async function main() {
  const rootDir = path.resolve(__dirname, "..");
  const runtime = await STGraphXHeadlessRuntime.load({
    src: "examples/oscillator.json",
    basePath: rootDir,
    lang: "it",
    onProgress({ phase, time }) {
      if (phase === "step" || phase === "runUntil") {
        console.log(`[avanzamento] fase=${phase} tempo=${time}`);
      }
    },
  });

  await runtime.setValue("a", 1.5, { evaluate: true });
  console.log("Variabili impostabili:", runtime.getSettableNames().join(", "));
  console.log("Output iniziali:", runtime.getOutputs());

  await runtime.runUntil(2);
  console.log("Output a t=2:", runtime.getOutputs());

  const csvPath = await runtime.writeOutputHistoryCsv(
    path.join(__dirname, "output", "oscillator.csv"),
  );
  console.log("Storico CSV scritto in:", csvPath);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
