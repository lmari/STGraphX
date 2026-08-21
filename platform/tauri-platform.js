/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function installTauriPlatformAdapter(globalScope) {
  const invoke = globalScope.__TAURI__?.core?.invoke;
  const contract = globalScope.STGraphXPlatformContract;
  if (typeof invoke !== "function" || !contract?.normalizePlatformApi || globalScope.STGraphXPlatform) {
    return;
  }

  function createAbortError() {
    const error = new Error("Aborted");
    error.name = "AbortError";
    return error;
  }

  function normalizePath(value) {
    return String(value ?? "").replace(/\\/g, "/");
  }

  function basename(filePath) {
    const normalized = normalizePath(filePath).replace(/\/+$/u, "");
    const slash = normalized.lastIndexOf("/");
    return slash >= 0 ? normalized.slice(slash + 1) : normalized;
  }

  function dirname(filePath) {
    const normalized = normalizePath(filePath).replace(/\/+$/u, "");
    const slash = normalized.lastIndexOf("/");
    if (slash < 0) {
      return "";
    }
    return normalized.slice(0, slash) || "/";
  }

  function relativeChildPath(name) {
    const normalized = normalizePath(name).replace(/^\/+|\/+$/gu, "");
    if (!normalized || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
      const error = new Error(`Invalid relative path: ${String(name ?? "")}`);
      error.name = "NotFoundError";
      throw error;
    }
    return normalized;
  }

  function joinDirectoryPath(directoryPath, name) {
    return `${normalizePath(directoryPath).replace(/\/+$/u, "")}/${relativeChildPath(name)}`;
  }

  function createVirtualFile(filePath) {
    return {
      name: basename(filePath),
      path: filePath,
      async text() {
        return invoke("read_text_file", { path: filePath });
      },
    };
  }

  function createDirectoryHandle(directoryPath) {
    return {
      kind: "directory",
      name: basename(directoryPath),
      path: directoryPath,
      async getFileHandle(name) {
        const filePath = joinDirectoryPath(directoryPath, name);
        await invoke("ensure_file_exists", { path: filePath });
        return createFileHandle(filePath);
      },
    };
  }

  function createFileHandle(filePath) {
    return {
      kind: "file",
      name: basename(filePath),
      path: filePath,
      async getPath() {
        return filePath;
      },
      async getParentDirectoryPath() {
        return dirname(filePath);
      },
      async getParentDirectoryHandle() {
        return createDirectoryHandle(dirname(filePath));
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
            await invoke("write_text_file", { path: filePath, contents: buffer });
          },
        };
      },
    };
  }

  globalScope.STGraphXPlatform = contract.normalizePlatformApi({
    apiVersion: contract.PLATFORM_API_VERSION,
    platformId: "tauri",
    isTauri: true,
    capabilities: {
      filePaths: true,
      directoryPicker: true,
      clipboard: true,
    },
    createFileHandleFromPath(filePath) {
      return createFileHandle(String(filePath ?? ""));
    },
    createDirectoryHandleFromPath(filePath) {
      return createDirectoryHandle(dirname(filePath));
    },
    createDirectoryHandleFromDirectoryPath(directoryPath) {
      return createDirectoryHandle(String(directoryPath ?? ""));
    },
    async getStartupLanguage() {
      return invoke("get_startup_language");
    },
    async readClipboardText() {
      return invoke("read_clipboard_text");
    },
    async writeClipboardText(text) {
      await invoke("write_clipboard_text", { text: typeof text === "string" ? text : String(text ?? "") });
    },
    async showOpenFilePicker(options = {}) {
      const paths = await invoke("open_file_dialog", {
        multiple: Boolean(options.multiple),
        title: String(options.title ?? ""),
      });
      return Array.isArray(paths) ? paths.map((path) => createFileHandle(String(path))) : [];
    },
    async showSaveFilePicker(options = {}) {
      const filePath = await invoke("save_file_dialog", {
        suggestedName: String(options.suggestedName ?? "model.json"),
        title: String(options.title ?? ""),
      });
      if (!filePath) {
        throw createAbortError();
      }
      return createFileHandle(String(filePath));
    },
    async showDirectoryPicker(options = {}) {
      const directoryPath = await invoke("open_directory_dialog", { title: String(options.title ?? "") });
      if (!directoryPath) {
        throw createAbortError();
      }
      return createDirectoryHandle(String(directoryPath));
    },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
