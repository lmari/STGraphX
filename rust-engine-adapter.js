/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initRustEngineAdapter(global) {
  const DEFAULT_MODULE_URL = "./rust-engine-wasm/stgraphx_wasm.js";

  function parseJsonPayload(raw, label) {
    if (raw && typeof raw === "object") {
      return raw;
    }
    try {
      return JSON.parse(String(raw ?? ""));
    } catch (_error) {
      throw new Error(`${label} returned invalid JSON`);
    }
  }

  function validateNumericValue(value, path) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => validateNumericValue(entry, `${path}[${index}]`));
      return;
    }
    throw new Error(`Rust engine returned an invalid value at ${path}`);
  }

  function normalizeExecutionResult(raw) {
    const payload = parseJsonPayload(raw, "Rust engine");
    if (Number(payload?.schemaVersion) !== 1) {
      throw new Error("Rust engine returned an unsupported result schema");
    }
    if (Number(payload?.engine?.apiVersion) !== 1) {
      throw new Error("Rust engine API version is not compatible with this interface");
    }
    if (!Array.isArray(payload.snapshots) || payload.snapshots.length === 0) {
      throw new Error("Rust engine returned no simulation snapshots");
    }
    payload.snapshots.forEach((snapshot, snapshotIndex) => {
      if (!Number.isFinite(Number(snapshot?.time))) {
        throw new Error(`Rust engine returned an invalid time at snapshot ${snapshotIndex}`);
      }
      if (!snapshot?.values || typeof snapshot.values !== "object" || Array.isArray(snapshot.values)) {
        throw new Error(`Rust engine returned invalid values at snapshot ${snapshotIndex}`);
      }
      Object.entries(snapshot.values).forEach(([name, value]) => {
        validateNumericValue(value, `snapshots[${snapshotIndex}].values.${name}`);
      });
    });
    return payload;
  }

  function normalizeModule(module) {
    if (!module || typeof module !== "object") {
      throw new Error("Rust engine WebAssembly module is unavailable");
    }
    if (typeof module.engineInfoJson !== "function" || typeof module.executeModelJson !== "function") {
      throw new Error("Rust engine WebAssembly exports are incomplete");
    }
    return module;
  }

  function createRustEngineAdapter(options = {}) {
    const moduleUrl = String(options.moduleUrl || DEFAULT_MODULE_URL);
    const moduleLoader = typeof options.moduleLoader === "function"
      ? options.moduleLoader
      : (url) => import(url);
    let loadedModulePromise = null;

    async function load() {
      if (!loadedModulePromise) {
        loadedModulePromise = Promise.resolve(moduleLoader(moduleUrl)).then(async (module) => {
          if (typeof module?.default === "function") {
            await module.default();
          }
          return normalizeModule(module);
        });
      }
      try {
        return await loadedModulePromise;
      } catch (error) {
        loadedModulePromise = null;
        throw error;
      }
    }

    async function info() {
      const module = await load();
      const payload = parseJsonPayload(module.engineInfoJson(), "Rust engine");
      if (Number(payload?.apiVersion) !== 1) {
        throw new Error("Rust engine API version is not compatible with this interface");
      }
      return payload;
    }

    async function executeModel(modelDocument) {
      if (!modelDocument || typeof modelDocument !== "object" || Array.isArray(modelDocument)) {
        throw new Error("A complete STGraphX model document is required");
      }
      const module = await load();
      const source = JSON.stringify(modelDocument);
      return normalizeExecutionResult(module.executeModelJson(source));
    }

    return {
      moduleUrl,
      load,
      info,
      executeModel,
    };
  }

  global.STGraphXRustEngine = {
    createRustEngineAdapter,
    normalizeExecutionResult,
  };
})(globalThis);
