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
  async showOpenFilePaths(options = {}) {
    const result = await ipcRenderer.invoke("stgraphx:show-open-dialog", options);
    return result?.canceled ? [] : (result?.filePaths || []);
  },
  async showSaveFilePath(options = {}) {
    const result = await ipcRenderer.invoke("stgraphx:show-save-dialog", options);
    return result?.canceled ? "" : String(result?.filePath || "");
  },
  readTextFile: (filePath) => ipcRenderer.invoke("stgraphx:read-text-file", String(filePath || "")),
  writeTextFile: (filePath, text) => ipcRenderer.invoke(
    "stgraphx:write-text-file",
    String(filePath || ""),
    typeof text === "string" ? text : String(text ?? ""),
  ),
});
