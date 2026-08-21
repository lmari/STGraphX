/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initModelPersistenceModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXModelPersistence = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createModelPersistenceExports() {
  function createModelPersistenceHelpers() {
    async function writeTextToFileHandle(fileHandle, text) {
      if (!fileHandle) {
        return false;
      }
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
        return true;
      } catch (_err) {
        return false;
      }
    }

    async function writeJsonToFileHandle(fileHandle, json) {
      return writeTextToFileHandle(fileHandle, json);
    }

    async function saveJsonModel(options = {}) {
      const forceSaveAs = options.forceSaveAs === true;
      const dirtySinceLastSave = options.dirtySinceLastSave !== false;
      const exportGraphData = options.exportGraphData;
      const currentFileHandle = options.currentFileHandle || null;
      const currentFileName = String(options.currentFileName || "");
      const currentModelDirectoryHandle = options.currentModelDirectoryHandle || null;
      const defaultGraphFilename = typeof options.defaultGraphFilename === "function"
        ? options.defaultGraphFilename
        : () => "graph.json";
      const normalizeJsonFilename = typeof options.normalizeJsonFilename === "function"
        ? options.normalizeJsonFilename
        : (value) => String(value || "");
      const pickSaveAsHandle = typeof options.pickSaveAsHandle === "function"
        ? options.pickSaveAsHandle
        : async () => null;
      const deriveDirectoryHandleFromFileHandle = typeof options.deriveDirectoryHandleFromFileHandle === "function"
        ? options.deriveDirectoryHandleFromFileHandle
        : async () => null;
      const rememberRecentModel = typeof options.rememberRecentModel === "function"
        ? options.rememberRecentModel
        : async () => {};
      const markSavedSnapshot = typeof options.markSavedSnapshot === "function"
        ? options.markSavedSnapshot
        : () => {};
      const isFirefoxBrowser = typeof options.isFirefoxBrowser === "function"
        ? options.isFirefoxBrowser
        : () => false;
      const promptSaveAs = typeof options.promptSaveAs === "function"
        ? options.promptSaveAs
        : async () => null;
      const downloadJsonFile = typeof options.downloadJsonFile === "function"
        ? options.downloadJsonFile
        : () => {};
      const onAfterSave = typeof options.onAfterSave === "function"
        ? options.onAfterSave
        : async () => {};
      const setStatusKey = typeof options.setStatusKey === "function"
        ? options.setStatusKey
        : () => {};

      if (!forceSaveAs && !dirtySinceLastSave) {
        setStatusKey("status.alreadySaved");
        return {
          ok: true,
          fileHandle: currentFileHandle,
          fileName: currentFileName,
          directoryHandle: currentModelDirectoryHandle,
        };
      }

      const data = exportGraphData();
      const json = JSON.stringify(data, null, 2);
      let fileHandle = currentFileHandle;
      let fileName = currentFileName || defaultGraphFilename();
      let directoryHandle = currentModelDirectoryHandle || null;

      if (!forceSaveAs && fileHandle) {
        const ok = await writeJsonToFileHandle(fileHandle, json);
        if (!ok) {
          setStatusKey("error.saveFailed");
          return { ok: false, fileHandle, fileName, directoryHandle };
        }
        fileName = fileHandle.name || fileName;
        directoryHandle = directoryHandle || await deriveDirectoryHandleFromFileHandle(fileHandle) || null;
        await onAfterSave({ fileName, fileHandle, directoryHandle, data });
        markSavedSnapshot();
        await rememberRecentModel(fileName, fileHandle);
        setStatusKey("status.saved");
        return { ok: true, fileHandle, fileName, directoryHandle };
      }

      if (!forceSaveAs && !fileHandle) {
        try {
          fileHandle = await pickSaveAsHandle(fileName);
          if (fileHandle) {
            fileName = fileHandle.name || normalizeJsonFilename(fileName);
            const ok = await writeJsonToFileHandle(fileHandle, json);
            if (!ok) {
              setStatusKey("error.saveFailed");
              return { ok: false, fileHandle, fileName, directoryHandle };
            }
            directoryHandle = await deriveDirectoryHandleFromFileHandle(fileHandle) || directoryHandle || null;
            await onAfterSave({ fileName, fileHandle, directoryHandle, data });
            markSavedSnapshot();
            await rememberRecentModel(fileName, fileHandle);
            setStatusKey("status.saved");
            return { ok: true, fileHandle, fileName, directoryHandle };
          }
        } catch (err) {
          if (err && err.name === "AbortError") {
            setStatusKey("status.saveCanceled");
            return { ok: false, fileHandle: null, fileName, directoryHandle };
          }
          fileHandle = null;
        }

        let selectedName = normalizeJsonFilename(fileName);
        if (isFirefoxBrowser()) {
          const proposed = await promptSaveAs(selectedName);
          if (proposed == null) {
            setStatusKey("status.saveCanceled");
            return { ok: false, fileHandle: null, fileName, directoryHandle };
          }
          selectedName = normalizeJsonFilename(proposed);
        }
        fileName = selectedName;
        await onAfterSave({ fileName, fileHandle: null, directoryHandle, data });
        downloadJsonFile(selectedName, json);
        markSavedSnapshot();
        await rememberRecentModel(fileName, null);
        setStatusKey("status.saved");
        return { ok: true, fileHandle: null, fileName, directoryHandle };
      }

      if (forceSaveAs) {
        try {
          fileHandle = await pickSaveAsHandle(fileName);
          if (fileHandle) {
            fileName = fileHandle.name || normalizeJsonFilename(fileName);
          }
        } catch (err) {
          if (err && err.name === "AbortError") {
            setStatusKey("status.saveCanceled");
            return { ok: false, fileHandle: currentFileHandle, fileName: currentFileName, directoryHandle };
          }
          if (options.hasNativeSavePicker) {
            setStatusKey("error.saveFailed");
            return { ok: false, fileHandle: currentFileHandle, fileName: currentFileName, directoryHandle };
          }
          fileHandle = null;
        }
        if (fileHandle) {
          const ok = await writeJsonToFileHandle(fileHandle, json);
          if (!ok) {
            setStatusKey("error.saveFailed");
            return { ok: false, fileHandle, fileName, directoryHandle };
          }
          fileName = fileHandle.name || fileName;
          directoryHandle = await deriveDirectoryHandleFromFileHandle(fileHandle) || directoryHandle || null;
          await onAfterSave({ fileName, fileHandle, directoryHandle, data });
          markSavedSnapshot();
          await rememberRecentModel(fileName, fileHandle);
          setStatusKey("status.savedAs");
          return { ok: true, fileHandle, fileName, directoryHandle };
        }
      }

      if (forceSaveAs) {
        if (isFirefoxBrowser()) {
          const proposed = await promptSaveAs(normalizeJsonFilename(fileName));
          if (proposed == null) {
            setStatusKey("status.saveCanceled");
            return { ok: false, fileHandle: currentFileHandle, fileName: currentFileName, directoryHandle };
          }
          fileName = normalizeJsonFilename(proposed);
        } else {
          fileName = normalizeJsonFilename(fileName);
        }
      } else {
        fileName = normalizeJsonFilename(fileName);
      }

      await onAfterSave({ fileName, fileHandle: null, directoryHandle, data });
      downloadJsonFile(fileName, json);
      markSavedSnapshot();
      await rememberRecentModel(fileName, null);
      setStatusKey(forceSaveAs ? "status.savedAs" : "status.saved");
      return { ok: true, fileHandle: null, fileName, directoryHandle };
    }

    return {
      saveJsonModel,
      writeJsonToFileHandle,
      writeTextToFileHandle,
    };
  }

  return {
    createModelPersistenceHelpers,
  };
});
