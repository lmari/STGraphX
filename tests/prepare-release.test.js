"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { prepareReleaseArtifacts } = require("../scripts/prepare-release.js");

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "stgraphx-release-test-"));
const prefix = "STGraphX991231";
fs.writeFileSync(path.join(tempDirectory, `${prefix}.AppImage`), "app-image", "utf8");
fs.writeFileSync(path.join(tempDirectory, `${prefix}.tar.gz`), "archive", "utf8");

const result = prepareReleaseArtifacts(tempDirectory, prefix);
assert.equal(result.artifacts.length, 2);
assert.equal(fs.readFileSync(path.join(tempDirectory, "STGraphX.AppImage"), "utf8"), "app-image");
assert.equal(fs.readFileSync(path.join(tempDirectory, "STGraphX.tar.gz"), "utf8"), "archive");
const checksumText = fs.readFileSync(path.join(tempDirectory, "SHA256SUMS.txt"), "utf8");
assert.match(checksumText, /STGraphX991231\.AppImage/u);
assert.match(checksumText, /STGraphX\.AppImage/u);
assert.match(checksumText, /STGraphX991231\.tar\.gz/u);
assert.match(checksumText, /STGraphX\.tar\.gz/u);
fs.rmSync(tempDirectory, { recursive: true, force: true });
console.log("prepare-release.test.js: ok");
