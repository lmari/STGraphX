/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initRuntimeLoader(global) {
  function createRuntimeLoader(options = {}) {
    const {
      t,
      normalizeReadDataPath,
      expressionUsesReadData,
      validateReadDataExpressionUsage,
      extractReadDataPaths,
      parseCsvMatrix,
      normalizeSubmodelPath,
      isSubmodelNode,
      getSubmodelTemplate,
      getDirectoryHandleForModel,
    } = options;

    if (
      !t
      || typeof normalizeReadDataPath !== "function"
      || typeof expressionUsesReadData !== "function"
      || typeof validateReadDataExpressionUsage !== "function"
      || typeof extractReadDataPaths !== "function"
      || typeof parseCsvMatrix !== "function"
    ) {
      throw new Error("STGraphXRuntimeLoader requires readData and translation dependencies");
    }

    function parseJsonText(jsonText) {
      try {
        return JSON.parse(String(jsonText || "{}"));
      } catch (err) {
        throw new Error(err?.message || t("error.invalidJson"));
      }
    }

    function collectReadDataPathsForModel(model) {
      const referencedPaths = new Set();
      const parameterNodes = (model?.nodes || []).filter((node) => node?.shape === "diamond");
      parameterNodes.forEach((node) => {
        const source = String(node?.valueExpression ?? "");
        if (!expressionUsesReadData(source)) {
          return;
        }
        const usage = validateReadDataExpressionUsage(source, { allowReadData: true });
        if (!usage.ok) {
          throw new Error(usage.message || "readData expects a string literal path");
        }
        extractReadDataPaths(source).forEach((path) => {
          const normalized = normalizeReadDataPath(path);
          if (normalized) {
            referencedPaths.add(normalized);
          }
        });
      });
      return referencedPaths;
    }

    async function prepareReadDataCacheForModel(model) {
      if (!model) {
        return;
      }
      const referencedPaths = collectReadDataPathsForModel(model);
      model.__readDataCache = Object.create(null);
      if (!referencedPaths.size) {
        return;
      }
      const directoryHandle = await getDirectoryHandleForModel(model);
      for (const relativePath of referencedPaths) {
        let fileHandle;
        let file;
        try {
          fileHandle = await directoryHandle.getFileHandle(relativePath);
          file = await fileHandle.getFile();
        } catch (_err) {
          throw new Error(`readData file is unavailable: ${relativePath}`);
        }
        let text;
        try {
          text = await file.text();
        } catch (_err) {
          throw new Error(`readData file is unavailable: ${relativePath}`);
        }
        model.__readDataCache[relativePath] = parseCsvMatrix(text, relativePath);
      }
    }

    async function prepareReadDataCachesForModelTree(model, visited = new Set()) {
      if (!model || visited.has(model)) {
        return;
      }
      visited.add(model);
      await prepareReadDataCacheForModel(model);
      if (
        typeof isSubmodelNode !== "function"
        || typeof normalizeSubmodelPath !== "function"
        || typeof getSubmodelTemplate !== "function"
      ) {
        return;
      }
      for (const node of model.nodes || []) {
        if (!isSubmodelNode(node)) {
          continue;
        }
        const normalizedPath = normalizeSubmodelPath(node.modelPath);
        if (!normalizedPath) {
          continue;
        }
        const childModel = getSubmodelTemplate(normalizedPath);
        if (!childModel) {
          continue;
        }
        await prepareReadDataCachesForModelTree(childModel, visited);
      }
    }

    return {
      parseJsonText,
      collectReadDataPathsForModel,
      prepareReadDataCacheForModel,
      prepareReadDataCachesForModelTree,
    };
  }

  global.STGraphXRuntimeLoader = {
    createRuntimeLoader,
  };
})(globalThis);
