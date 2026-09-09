"use strict";

const assert = require("assert");
const config = require("../electron-builder.config.js");

assert.equal(config.artifactName, "STGraphX260909.${ext}");
assert.equal(config.nsis.artifactName, "STGraphX260909-setup.${ext}");
assert.equal(config.portable.artifactName, "STGraphX260909-portable.${ext}");
console.log("build-electron-config.test.js: ok");
