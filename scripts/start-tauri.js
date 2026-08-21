/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const { spawn } = require("child_process");
const path = require("path");

const rawArgs = process.argv.slice(2);
const tauriArgs = [];
let startupLanguage = "";

rawArgs.forEach((arg) => {
  const match = /^--lang=(.+)$/iu.exec(String(arg));
  if (match) {
    startupLanguage = match[1].trim();
    return;
  }
  tauriArgs.push(arg);
});

const command = process.platform === "win32" ? "tauri.cmd" : "tauri";
const executable = path.join(__dirname, "..", "node_modules", ".bin", command);
const child = spawn(executable, ["dev", ...tauriArgs], {
  cwd: path.resolve(__dirname, ".."),
  env: {
    ...process.env,
    STGRAPHX_LANG: startupLanguage,
  },
  stdio: "inherit",
});

child.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = Number.isInteger(code) ? code : 1;
});
