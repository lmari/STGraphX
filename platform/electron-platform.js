/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const {
  createAbortError,
  createFileHandle,
  createDirectoryHandle,
  createDirectoryHandleFromFilePath,
} = require("./path-handles.js");
const { PLATFORM_API_VERSION, normalizePlatformApi } = require("./platform-contract.js");

function createElectronPlatform({ ipcRenderer, clipboard = null }) {
  if (!ipcRenderer || typeof ipcRenderer.invoke !== "function") {
    throw new Error("ipcRenderer is required to create the Electron platform bridge");
  }
  const canUseLocalClipboard = Boolean(
    clipboard
    && typeof clipboard.readText === "function"
    && typeof clipboard.writeText === "function",
  );
  return normalizePlatformApi({
    apiVersion: PLATFORM_API_VERSION,
    platformId: "electron",
    isElectron: true,
    capabilities: {
      filePaths: true,
      directoryPicker: true,
      clipboard: true,
    },
    createFileHandleFromPath(filePath) {
      return createFileHandle(String(filePath || ""));
    },
    createDirectoryHandleFromPath(filePath) {
      return createDirectoryHandleFromFilePath(filePath);
    },
    createDirectoryHandleFromDirectoryPath(directoryPath) {
      return createDirectoryHandle(String(directoryPath || ""));
    },
    getStartupLanguage() {
      return "";
    },
    readClipboardText() {
      return canUseLocalClipboard
        ? clipboard.readText()
        : ipcRenderer.invoke("stgraphx:read-clipboard-text");
    },
    writeClipboardText(text) {
      const normalized = typeof text === "string" ? text : String(text ?? "");
      if (canUseLocalClipboard) {
        clipboard.writeText(normalized);
        return undefined;
      }
      return ipcRenderer.invoke("stgraphx:write-clipboard-text", normalized);
    },
    async showOpenFilePicker(options = {}) {
      const result = await ipcRenderer.invoke("stgraphx:show-open-dialog", {
        multiple: Boolean(options.multiple),
        title: options.title || "",
      });
      if (result.canceled) {
        return [];
      }
      return (result.filePaths || []).map(createFileHandle);
    },
    async showSaveFilePicker(options = {}) {
      const result = await ipcRenderer.invoke("stgraphx:show-save-dialog", {
        suggestedName: options.suggestedName || "model.json",
        title: options.title || "",
      });
      if (result.canceled || !result.filePath) {
        throw createAbortError();
      }
      return createFileHandle(result.filePath);
    },
    async showDirectoryPicker(options = {}) {
      const result = await ipcRenderer.invoke("stgraphx:show-directory-dialog", {
        title: options.title || "",
      });
      if (result.canceled || !result.directoryPath) {
        throw createAbortError();
      }
      return createDirectoryHandle(result.directoryPath);
    },
  });
}

module.exports = {
  createElectronPlatform,
};
