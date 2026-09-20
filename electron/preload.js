/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const { contextBridge, ipcRenderer } = require("electron");
const { exposePlatformInMainWorld } = require("../platform/install-platform.js");
const { createElectronPlatform } = require("../platform/electron-platform.js");

const platform = createElectronPlatform({ ipcRenderer });

exposePlatformInMainWorld(contextBridge, platform);

// Keep desktop file paths as plain data across the context bridge. Chromium's
// native File System Access handles do not expose a parent directory, which is
// needed to reopen models and their relative submodels reliably.
contextBridge.exposeInMainWorld("STGraphXElectronFiles", {
  async showConfirmDialog(options = {}) {
    const result = await ipcRenderer.invoke("stgraphx:show-confirm-dialog", options);
    return Number.isInteger(result?.response) ? result.response : -1;
  },
  async showOpenFilePaths(options = {}) {
    const result = await ipcRenderer.invoke("stgraphx:show-open-dialog", options);
    return result?.canceled ? [] : (result?.filePaths || []);
  },
  async showSaveFilePath(options = {}) {
    const result = await ipcRenderer.invoke("stgraphx:show-save-dialog", options);
    return result?.canceled ? "" : String(result?.filePath || "");
  },
  async readTextFile(filePath) {
    const result = await ipcRenderer.invoke("stgraphx:read-text-file", String(filePath || ""));
    if (result?.ok) {
      return String(result.text ?? "");
    }
    const err = new Error(String(result?.message || "Unable to read file"));
    err.code = String(result?.code || "READ_ERROR");
    if (err.code === "ENOENT") {
      err.name = "NotFoundError";
    }
    throw err;
  },
  writeTextFile: (filePath, text) => ipcRenderer.invoke(
    "stgraphx:write-text-file",
    String(filePath || ""),
    typeof text === "string" ? text : String(text ?? ""),
  ),
});
