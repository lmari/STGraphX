/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initPlatformContractModule(globalScope, factory) {
  const exports = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = exports;
    return;
  }
  globalScope.STGraphXPlatformContract = exports;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPlatformContractExports() {
  const PLATFORM_API_VERSION = 1;

  const PLATFORM_METHODS = Object.freeze([
    "createFileHandleFromPath",
    "createDirectoryHandleFromPath",
    "createDirectoryHandleFromDirectoryPath",
    "getStartupLanguage",
    "readClipboardText",
    "writeClipboardText",
    "showOpenFilePicker",
    "showSaveFilePicker",
    "showDirectoryPicker",
  ]);

  function normalizePlatformApi(platform = {}) {
    const source = platform && typeof platform === "object" ? platform : {};
    const capabilities = source.capabilities && typeof source.capabilities === "object"
      ? source.capabilities
      : {};
    return {
      ...source,
      apiVersion: Number(source.apiVersion) || PLATFORM_API_VERSION,
      platformId: String(source.platformId || "custom"),
      capabilities: {
        filePaths: Boolean(capabilities.filePaths ?? source.createFileHandleFromPath),
        directoryPicker: Boolean(capabilities.directoryPicker ?? source.showDirectoryPicker),
        clipboard: Boolean(capabilities.clipboard ?? (source.readClipboardText && source.writeClipboardText)),
        startupLanguage: Boolean(capabilities.startupLanguage ?? source.getStartupLanguage),
      },
    };
  }

  function missingPlatformMethods(platform) {
    return PLATFORM_METHODS.filter((name) => typeof platform?.[name] !== "function");
  }

  return {
    PLATFORM_API_VERSION,
    PLATFORM_METHODS,
    missingPlatformMethods,
    normalizePlatformApi,
  };
});
