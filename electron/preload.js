/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const { contextBridge, ipcRenderer, clipboard } = require("electron");
const { exposePlatformInMainWorld } = require("../platform/install-platform.js");
const { createElectronPlatform } = require("../platform/electron-platform.js");

const platform = createElectronPlatform({ ipcRenderer, clipboard });

exposePlatformInMainWorld(contextBridge, platform);
