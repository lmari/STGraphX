/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const { spawn } = require("child_process");
const path = require("path");

const command = process.platform === "win32" ? "tauri.cmd" : "tauri";
const executable = path.join(__dirname, "..", "node_modules", ".bin", command);
const environment = { ...process.env };

// Current linuxdeploy cannot strip SHT_RELR-based libraries on some Linux systems.
if (process.platform === "linux") {
  environment.NO_STRIP = "1";
}

const child = spawn(executable, ["build", ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, ".."),
  env: environment,
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
