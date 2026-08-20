/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const fs = require("fs/promises");
const path = require("path");

function createAbortError() {
  const err = new Error("Aborted");
  err.name = "AbortError";
  return err;
}

function createVirtualFile(filePath) {
  return {
    name: path.basename(filePath),
    path: filePath,
    async text() {
      return fs.readFile(filePath, "utf8");
    },
  };
}

function createFileHandle(filePath) {
  return {
    kind: "file",
    name: path.basename(filePath),
    path: filePath,
    async getPath() {
      return filePath;
    },
    async getParentDirectoryPath() {
      return path.dirname(filePath);
    },
    async getParentDirectoryHandle() {
      return createDirectoryHandle(path.dirname(filePath));
    },
    async getFile() {
      return createVirtualFile(filePath);
    },
    async createWritable() {
      let buffer = "";
      return {
        async write(data) {
          buffer = typeof data === "string" ? data : String(data ?? "");
        },
        async close() {
          await fs.writeFile(filePath, buffer, "utf8");
        },
      };
    },
  };
}

function createDirectoryHandle(directoryPath) {
  return {
    kind: "directory",
    name: path.basename(directoryPath),
    path: directoryPath,
    async getFileHandle(name) {
      const relativePath = String(name || "").replace(/\\/g, "/");
      const normalizedPath = path.normalize(relativePath);
      if (
        !normalizedPath ||
        normalizedPath === "." ||
        path.isAbsolute(normalizedPath) ||
        normalizedPath.split(path.sep).includes("..")
      ) {
        const err = new Error(`Invalid relative path: ${relativePath}`);
        err.name = "NotFoundError";
        throw err;
      }
      const filePath = path.resolve(directoryPath, normalizedPath);
      const relativeFromDirectory = path.relative(directoryPath, filePath);
      if (
        !relativeFromDirectory ||
        relativeFromDirectory === "" ||
        relativeFromDirectory.startsWith("..") ||
        path.isAbsolute(relativeFromDirectory)
      ) {
        const err = new Error(`Invalid relative path: ${relativePath}`);
        err.name = "NotFoundError";
        throw err;
      }
      await fs.access(filePath);
      return createFileHandle(filePath);
    },
  };
}

function createDirectoryHandleFromFilePath(filePath) {
  return createDirectoryHandle(path.dirname(String(filePath || "")));
}

module.exports = {
  createAbortError,
  createVirtualFile,
  createFileHandle,
  createDirectoryHandle,
  createDirectoryHandleFromFilePath,
};
