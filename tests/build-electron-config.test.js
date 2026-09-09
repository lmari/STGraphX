"use strict";

const assert = require("assert");
const config = require("../electron-builder.config.js");
const { releaseBuildTag } = require("../scripts/release-metadata.js");

const prefix = `STGraphX${releaseBuildTag()}`;
assert.equal(config.artifactName, `${prefix}.${"${ext}"}`);
assert.equal(config.nsis.artifactName, `${prefix}-setup.${"${ext}"}`);
assert.equal(config.portable.artifactName, `${prefix}-portable.${"${ext}"}`);
console.log("build-electron-config.test.js: ok");
