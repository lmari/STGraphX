#!/usr/bin/env node

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "build", "player");
const bundleFiles = [
  "i18n-inline.js",
  "graph-functions.js",
  "semantic.js",
  "runtime-shared.js",
  "runtime-core.js",
  "runtime-loader.js",
  "runtime-session.js",
  "runtime-controller.js",
  "headless-runtime.js",
  "player-shell.js",
];

function readSource(relPath) {
  const absPath = path.join(rootDir, relPath);
  return fs.readFileSync(absPath, "utf8");
}

function buildBundleText() {
  const header = [
    "/*!",
    " * STGraphX Embedded Player Bundle",
    ` * Generated: ${new Date().toISOString()}`,
    " */",
    "",
  ].join("\n");
  const body = bundleFiles.map((relPath) => {
    const source = readSource(relPath).replace(/\s+$/u, "");
    return `\n/* --- ${relPath} --- */\n${source}\n`;
  }).join("\n");
  return `${header}${body}`;
}

async function maybeMinify(sourceText) {
  try {
    const terser = require("terser");
    const result = await terser.minify(sourceText, {
      compress: true,
      mangle: true,
      format: {
        comments: /^!/,
      },
    });
    if (!result || typeof result.code !== "string" || !result.code.trim()) {
      throw new Error("minified output is empty");
    }
    return { ok: true, code: result.code };
  } catch (error) {
    return { ok: false, error };
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const bundleText = buildBundleText();
  const bundlePath = path.join(outDir, "stgraphx-player.js");
  fs.writeFileSync(bundlePath, bundleText, "utf8");
  console.log(`Wrote ${path.relative(rootDir, bundlePath)}`);

  const minified = await maybeMinify(bundleText);
  if (minified.ok) {
    const minPath = path.join(outDir, "stgraphx-player.min.js");
    fs.writeFileSync(minPath, minified.code, "utf8");
    console.log(`Wrote ${path.relative(rootDir, minPath)}`);
    return;
  }

  console.warn("Skipping minified bundle: terser is not available.");
  console.warn("Install terser as a dev dependency to produce build/player/stgraphx-player.min.js.");
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exitCode = 1;
});
