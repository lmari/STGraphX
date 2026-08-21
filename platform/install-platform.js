/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const { normalizePlatformApi } = require("./platform-contract.js");

function installPlatformApi(target, platform, globalName = "STGraphXPlatform") {
  if (!target || typeof target !== "object") {
    throw new Error("A valid target object is required to install the platform API");
  }
  const normalizedPlatform = normalizePlatformApi(platform);
  target[globalName] = normalizedPlatform;
  return normalizedPlatform;
}

function exposePlatformInMainWorld(contextBridge, platform, globalName = "STGraphXPlatform") {
  if (!contextBridge || typeof contextBridge.exposeInMainWorld !== "function") {
    throw new Error("A valid contextBridge is required to expose the platform API");
  }
  const normalizedPlatform = normalizePlatformApi(platform);
  contextBridge.exposeInMainWorld(globalName, normalizedPlatform);
  return normalizedPlatform;
}

module.exports = {
  installPlatformApi,
  exposePlatformInMainWorld,
};
