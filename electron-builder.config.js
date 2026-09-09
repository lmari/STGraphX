/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

"use strict";

const packageJson = require("./package.json");
const { releaseBuildTag } = require("./scripts/release-metadata.js");

const releaseTag = releaseBuildTag();
const extension = "${ext}";
const artifactName = `STGraphX${releaseTag}.${extension}`;

module.exports = {
  ...packageJson.build,
  artifactName,
  // Both Windows targets are .exe files, so they need distinct names.
  nsis: {
    artifactName: `STGraphX${releaseTag}-setup.${extension}`,
  },
  portable: {
    artifactName: `STGraphX${releaseTag}-portable.${extension}`,
  },
};
