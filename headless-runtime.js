/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initHeadlessRuntime(global) {
  const HEADLESS_LANGS = new Set(["it", "en"]);
  const NODE_RUNTIME_FILES = [
    "i18n-inline.js",
    "graph-functions.js",
    "semantic.js",
    "runtime-shared.js",
    "runtime-core.js",
    "runtime-loader.js",
    "runtime-session.js",
    "runtime-controller.js",
  ];

  function ensureNodeRuntimeModules() {
    if (
      global.STGraphXRuntimeShared
      && global.STGraphXRuntimeCore
      && global.STGraphXRuntimeLoader
      && global.STGraphXRuntimeSession
      && global.STGraphXRuntimeController
      && global.GraphSemantics
    ) {
      return;
    }
    if (typeof module === "undefined" || !module.exports || typeof require !== "function") {
      return;
    }
    const fs = require("fs");
    const path = require("path");
    const vm = require("vm");
    const baseDir = typeof __dirname === "string" ? __dirname : process.cwd();
    if (!global.window) {
      global.window = global;
    }
    NODE_RUNTIME_FILES.forEach((fileName) => {
      const absPath = path.join(baseDir, fileName);
      const source = fs.readFileSync(absPath, "utf8");
      vm.runInThisContext(source, { filename: absPath });
    });
  }

  ensureNodeRuntimeModules();

  function fillTemplate(template, vars = {}) {
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => (
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : ""
    ));
  }

  function normalizeLang(raw) {
    const text = String(raw || "").trim().toLowerCase();
    const base = text.split("-")[0];
    if (HEADLESS_LANGS.has(text)) {
      return text;
    }
    if (HEADLESS_LANGS.has(base)) {
      return base;
    }
    return "en";
  }

  function makeTranslator(lang) {
    const bundles = global.STGraphXI18nBundles || {};
    const fallback = bundles.en && typeof bundles.en === "object" ? bundles.en : {};
    const current = bundles?.[lang] && typeof bundles[lang] === "object"
      ? { ...fallback, ...bundles[lang] }
      : fallback;
    return (key, vars = {}) => fillTemplate(current?.[key] ?? key, vars);
  }

  function isStateNode(node) {
    return node?.shape === "rect";
  }

  function isSubmodelNode(node) {
    return node?.shape === "submodel";
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function formatNumberValue(execution, value) {
    if (!Number.isFinite(value)) {
      return "-";
    }
    const decimals = clamp(Math.round(Number(execution?.decimals) || 0), 0, 12);
    let text = value.toFixed(decimals);
    if (decimals > 0) {
      text = text.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
    }
    return text === "-0" ? "0" : text;
  }

  function buildNodeMap(model) {
    return new Map((model?.nodes || []).map((node) => [String(node?.name ?? ""), node]));
  }

  function nodeByName(model, name) {
    return model?.nodes?.find((node) => String(node?.name ?? "") === String(name ?? "")) || null;
  }

  function collectExpressionIdentifierReferences(expression) {
    const src = String(expression ?? "");
    const refs = new Set();
    const skipped = new Set(["true", "false", "null", "this", "self", "__self", "$i", "$j", "$value", "time", "t0", "t1", "dt"]);
    let i = 0;
    let mode = "code";
    while (i < src.length) {
      const ch = src[i];
      if (mode === "code") {
        if (ch === "'" || ch === "\"" || ch === "`") {
          mode = ch;
          i += 1;
          continue;
        }
        if (/[A-Za-z_$]/u.test(ch)) {
          let j = i + 1;
          while (j < src.length && /[A-Za-z0-9_$]/u.test(src[j])) {
            j += 1;
          }
          const token = src.slice(i, j);
          const prev = i > 0 ? src[i - 1] : "";
          let k = j;
          while (k < src.length && /\s/u.test(src[k])) {
            k += 1;
          }
          const isFunctionCall = src[k] === "(";
          if (prev !== "." && !isFunctionCall && !skipped.has(token) && !/^\$[0-9]+$/u.test(token)) {
            refs.add(token);
          }
          i = j;
          continue;
        }
        i += 1;
        continue;
      }
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === mode) {
        mode = "code";
      }
      i += 1;
    }
    return refs;
  }

  function isExternallySettableNode(node) {
    return Boolean(node && (node.shape === "diamond" || node.input));
  }

  function cloneValue(value) {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
      return value;
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_err) {
      return value;
    }
  }

  function csvEscape(value) {
    const text = value == null ? "" : String(value);
    if (/[",\r\n]/u.test(text)) {
      return `"${text.replace(/"/gu, "\"\"")}"`;
    }
    return text;
  }

  function isLikelyUrl(value) {
    return /^(https?:|file:)/i.test(String(value || ""));
  }

  function isNodeEnvironment() {
    return typeof process !== "undefined" && !!process.versions?.node && typeof require === "function";
  }

  async function loadTextResource(location) {
    if (location.kind === "url") {
      const response = await fetch(location.href);
      if (!response.ok) {
        throw new Error(`Failed to load ${location.href}: ${response.status}`);
      }
      return response.text();
    }
    if (location.kind === "path") {
      const fs = require("fs/promises");
      return fs.readFile(location.path, "utf8");
    }
    throw new Error("Unsupported resource location");
  }

  function resolveBaseLocation(options = {}) {
    if (options.baseUrl) {
      return { kind: "url", href: new URL(String(options.baseUrl), global.location?.href || "http://localhost/").href };
    }
    if (options.basePath) {
      if (isNodeEnvironment()) {
        const path = require("path");
        return { kind: "path", path: path.resolve(String(options.basePath)) };
      }
      return { kind: "url", href: new URL(String(options.basePath), global.location?.href || document.baseURI).href };
    }
    if (isNodeEnvironment()) {
      return { kind: "path", path: process.cwd() };
    }
    return { kind: "url", href: new URL(".", global.location?.href || document.baseURI).href };
  }

  function resolveModelLocation(src, baseLocation) {
    if (isLikelyUrl(src)) {
      return { kind: "url", href: new URL(String(src)).href };
    }
    if (baseLocation.kind === "url") {
      return { kind: "url", href: new URL(String(src), baseLocation.href).href };
    }
    const path = require("path");
    return { kind: "path", path: path.resolve(baseLocation.path, String(src)) };
  }

  function locationDirname(location) {
    if (location.kind === "url") {
      return { kind: "url", href: new URL(".", location.href).href };
    }
    const path = require("path");
    return { kind: "path", path: path.dirname(location.path) };
  }

  function resolveRelativeLocation(relativePath, baseLocation) {
    if (baseLocation.kind === "url") {
      return { kind: "url", href: new URL(String(relativePath), baseLocation.href).href };
    }
    const path = require("path");
    return { kind: "path", path: path.resolve(baseLocation.path, String(relativePath)) };
  }

  function createReadDataHandleProvider(baseLocation) {
    if (baseLocation.kind === "url") {
      return {
        async getFileHandle(relativePath) {
          const absoluteUrl = new URL(String(relativePath), baseLocation.href).href;
          return {
            name: String(relativePath),
            async getFile() {
              return {
                async text() {
                  const response = await fetch(absoluteUrl);
                  if (!response.ok) {
                    throw new Error(`Failed to load ${relativePath}`);
                  }
                  return response.text();
                },
              };
            },
          };
        },
      };
    }
    const path = require("path");
    const fs = require("fs/promises");
    return {
      async getFileHandle(relativePath) {
        const absolutePath = path.resolve(baseLocation.path, String(relativePath));
        return {
          name: String(relativePath),
          async getFile() {
            return {
              async text() {
                return fs.readFile(absolutePath, "utf8");
              },
            };
          },
        };
      },
    };
  }

  function parseCsvMatrix(text) {
    const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (!lines.length) {
      throw new Error("readData CSV is empty");
    }
    return lines.map((line) => line.split(",").map((cell) => {
      const trimmed = String(cell ?? "").trim();
      const value = Number(trimmed);
      return Number.isFinite(value) ? value : trimmed;
    }));
  }

  class STGraphXHeadlessRuntimeSession {
    static async load(options = {}) {
      const runtime = new STGraphXHeadlessRuntimeSession(options);
      await runtime.load(options);
      return runtime;
    }

    static async loadFromObject(data, options = {}) {
      return STGraphXHeadlessRuntimeSession.load({
        ...options,
        data,
      });
    }

    static async loadFromJsonText(jsonText, options = {}) {
      let data;
      try {
        data = JSON.parse(String(jsonText ?? "{}"));
      } catch (error) {
        throw new Error(error?.message || "Invalid JSON text");
      }
      return STGraphXHeadlessRuntimeSession.load({
        ...options,
        data,
      });
    }

    constructor(options = {}) {
      this.lang = normalizeLang(options.lang);
      this.t = makeTranslator(this.lang);
      this._shared = null;
      this._core = null;
      this._loader = null;
      this._session = null;
      this._controller = null;
      this._timedState = {
        timedRunHandle: null,
        timedStepRunning: false,
        timedRunStartedAt: 0,
        timedStepLastActivityAt: 0,
      };
      this._status = "";
      this._statusIsError = false;
      this._sourceSpec = null;
      this._modelLocation = null;
      this._modelBaseLocation = null;
      this._rawModel = null;
      this._runtimeModel = null;
      this._submodelTemplates = new Map();
      this._inputValues = new Map();
      this._outputHistory = [];
      this._suppressHistory = false;
      this._progressCallback = typeof options.onProgress === "function" ? options.onProgress : null;
      this._ready = Promise.resolve(this);
    }

    async load(options = {}) {
      this.lang = normalizeLang(options.lang || this.lang);
      this.t = makeTranslator(this.lang);
      this._sourceSpec = {
        src: options.src ?? this._sourceSpec?.src ?? null,
        data: options.data ?? this._sourceSpec?.data ?? null,
        baseUrl: options.baseUrl ?? this._sourceSpec?.baseUrl ?? null,
        basePath: options.basePath ?? this._sourceSpec?.basePath ?? null,
      };
      if (typeof options.onProgress === "function") {
        this._progressCallback = options.onProgress;
      }
      this._ready = this._loadInternal(this._sourceSpec);
      await this._ready;
      return this;
    }

    async reload() {
      if (!this._sourceSpec) {
        throw new Error("No model source is configured");
      }
      this._ready = this._loadInternal(this._sourceSpec);
      await this._ready;
      return this;
    }

    async _loadInternal(sourceSpec) {
      const runtimeSharedApi = global.STGraphXRuntimeShared;
      const runtimeCoreApi = global.STGraphXRuntimeCore;
      const runtimeLoaderApi = global.STGraphXRuntimeLoader;
      const runtimeSessionApi = global.STGraphXRuntimeSession;
      const runtimeControllerApi = global.STGraphXRuntimeController;
      const semanticsApi = global.GraphSemantics;
      if (
        !runtimeSharedApi
        || !runtimeCoreApi
        || !runtimeLoaderApi
        || !runtimeSessionApi
        || !runtimeControllerApi
        || !semanticsApi
      ) {
        throw new Error("STGraphX headless runtime dependencies are not available");
      }

      this._shared = runtimeSharedApi.createRuntimeShared({
        getCurrentLang: () => this.lang,
      });
      this._submodelTemplates = new Map();
      this._outputHistory = [];
      this._inputValues = new Map();

      this._core = runtimeCoreApi.createRuntimeCore({
        t: this.t.bind(this),
        semantics: semanticsApi,
        normalizeExecutionConfig: this._shared.normalizeExecutionConfig,
        deserializeNodeType: this._shared.deserializeNodeType,
        normalizeNodeDescriptionProperty: this._shared.normalizeNodeDescriptionProperty,
        normalizeNodeFormulaNotesProperty: this._shared.normalizeNodeFormulaNotesProperty,
        sanitizeLocalFunctionDefinition: this._shared.sanitizeLocalFunctionDefinition,
        clamp: this._shared.clamp,
        deepClone: this._shared.deepClone,
        localFunctionsForSemantics: (model) => Array.isArray(model?.localFunctions) ? model.localFunctions : [],
        globalParameterNodesForModel: (model, targetNodeId = null) => (model?.nodes || []).filter((node) =>
          node?.shape === "diamond" && node.global === true && (targetNodeId == null || node.id !== targetNodeId)),
        referencedGlobalParameterNodesForTarget: (model, targetNode, fieldKey = "value") => {
          if (!targetNode) {
            return [];
          }
          const expr = fieldKey === "initial"
            ? String(targetNode.initialStateExpression ?? "")
            : String(targetNode.valueExpression ?? "");
          const refs = collectExpressionIdentifierReferences(expr);
          return (model?.nodes || []).filter((node) =>
            node?.shape === "diamond"
            && node.global === true
            && node.id !== targetNode?.id
            && refs.has(String(node.name ?? "")));
        },
        isStateNode,
        getModelNodeById: (model, id) => model?.nodes?.find((node) => node.id === id) || null,
        isSubmodelNode,
        normalizeSubmodelPath: this._shared.normalizeSubmodelPath,
        normalizeReadDataPath: this._shared.normalizeReadDataPath,
        parseModelPropertyStoredValue: this._shared.parseModelPropertyStoredValue,
        serializeModelPropertyStoredValue: this._shared.serializeModelPropertyStoredValue,
        parseNodePropertyStoredValue: this._shared.parseNodePropertyStoredValue,
        serializeNodePropertyStoredValue: this._shared.serializeNodePropertyStoredValue,
        submodelBindingReferences: (node) => {
          const bindings = node?.inputBindings && typeof node.inputBindings === "object" ? node.inputBindings : {};
          return new Set(Object.values(bindings).map((value) => String(value ?? "").trim()).filter(Boolean));
        },
        applyRuntimeModelInputOverrides: (model, inputValueMap = new Map()) => {
          (model?.nodes || []).forEach((node) => {
            node.externalValueEnabled = false;
            node.externalValue = null;
          });
          inputValueMap.forEach((value, name) => {
            const node = nodeByName(model, name);
            if (!node) {
              return;
            }
            node.externalValueEnabled = true;
            node.externalValue = value;
            node.computedValue = value;
            node.computedError = "";
          });
        },
        getSubmodelTemplate: (modelPath) => {
          const normalized = this._shared.normalizeSubmodelPath(modelPath);
          return normalized ? this._submodelTemplates.get(normalized) || null : null;
        },
      });

      this._loader = runtimeLoaderApi.createRuntimeLoader({
        t: this.t.bind(this),
        normalizeReadDataPath: this._shared.normalizeReadDataPath,
        expressionUsesReadData: (expression) => /\breadData\s*\(/.test(String(expression ?? "")),
        validateReadDataExpressionUsage: (expression, options = {}) => {
          const text = String(expression ?? "");
          if (!/\breadData\s*\(/.test(text)) {
            return { ok: true };
          }
          if (!options.allowReadData) {
            return { ok: false, message: "readData is only available in parameters" };
          }
          const literalPattern = /\breadData\s*\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
          const callCount = (text.match(/\breadData\s*\(/g) || []).length;
          const paths = [];
          literalPattern.lastIndex = 0;
          let match = literalPattern.exec(text);
          while (match) {
            paths.push(String(match[2] ?? "").replace(/\\([\\'"nrt])/g, (_m, escaped) => (
              escaped === "n" ? "\n" : escaped === "r" ? "\r" : escaped === "t" ? "\t" : escaped
            )));
            match = literalPattern.exec(text);
          }
          if (paths.length !== callCount) {
            return { ok: false, message: "readData expects a string literal path" };
          }
          const invalidPath = paths.find((path) => !this._shared.normalizeReadDataPath(path));
          if (invalidPath !== undefined) {
            return { ok: false, message: "readData path is invalid" };
          }
          return { ok: true };
        },
        extractReadDataPaths: (expression) => {
          const literalPattern = /\breadData\s*\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
          const paths = [];
          literalPattern.lastIndex = 0;
          let match = literalPattern.exec(String(expression ?? ""));
          while (match) {
            paths.push(String(match[2] ?? "").replace(/\\([\\'"nrt])/g, (_m, escaped) => (
              escaped === "n" ? "\n" : escaped === "r" ? "\r" : escaped === "t" ? "\t" : escaped
            )));
            match = literalPattern.exec(String(expression ?? ""));
          }
          return paths;
        },
        parseCsvMatrix,
        normalizeSubmodelPath: this._shared.normalizeSubmodelPath,
        isSubmodelNode,
        getSubmodelTemplate: (modelPath) => {
          const normalized = this._shared.normalizeSubmodelPath(modelPath);
          return normalized ? this._submodelTemplates.get(normalized) || null : null;
        },
        getDirectoryHandleForModel: async (model) => createReadDataHandleProvider(model?.__headlessBaseLocation || this._modelBaseLocation),
      });

      if (sourceSpec.data && typeof sourceSpec.data === "object") {
        this._rawModel = sourceSpec.data;
        this._modelBaseLocation = resolveBaseLocation(sourceSpec);
        this._runtimeModel = this._core.buildRuntimeModelFromData(sourceSpec.data, {
          directoryPath: this._modelBaseLocation.kind === "url" ? this._modelBaseLocation.href : this._modelBaseLocation.path,
        });
        this._runtimeModel.__headlessBaseLocation = this._modelBaseLocation;
      } else if (sourceSpec.src) {
        const rootLocation = resolveModelLocation(sourceSpec.src, resolveBaseLocation(sourceSpec));
        const loaded = await this._loadModelTree(rootLocation);
        this._modelLocation = rootLocation;
        this._modelBaseLocation = locationDirname(rootLocation);
        this._rawModel = loaded.data;
        this._runtimeModel = loaded.runtimeModel;
      } else {
        throw new Error("Headless runtime requires either src or data");
      }

      await this._loader.prepareReadDataCachesForModelTree(this._runtimeModel);

      this._session = global.STGraphXRuntimeSession.createRuntimeSession({
        core: this._core,
        model: this._runtimeModel,
        rootExecution: this._runtimeModel.execution,
        isStateNode,
        beforeEvaluate: () => this._applyInputOverrides(),
        afterEvaluate: ({ timeValue }) => {
          if (!this._suppressHistory) {
            this._recordOutputSnapshot(timeValue);
          }
        },
      });

      this._controller = global.STGraphXRuntimeController.createRuntimeController({
        session: this._session,
        getExecution: () => this._runtimeModel.execution,
        timedState: this._timedState,
        t: this.t.bind(this),
        enforceStrictDefinitions: () => true,
        ensureBreakpointReady: () => true,
        prepareForExecution: async () => true,
        isExecutionEnded: (cfg) => {
          if (this._runtimeModel.execution.currentTime == null) {
            return false;
          }
          const nextTime = this._runtimeModel.execution.currentTime + cfg.dt;
          const epsilon = Math.max(1e-12, Math.abs(cfg.dt) * 1e-9);
          if (cfg.dt > 0) {
            return nextTime > cfg.t1 + epsilon;
          }
          return nextTime < cfg.t1 - epsilon;
        },
        refreshRuntimeView: () => {},
        render: () => {},
        updateEditingLockUi: () => {},
        setStatusKey: (key, vars) => this._setStatus(this.t(key, vars), false),
        setStatus: (message, isError) => this._setStatus(message, isError),
        formatNumberValue: (value) => formatNumberValue(this._runtimeModel.execution, value),
        formatExecutionDuration: (ms) => {
          if (!Number.isFinite(ms) || ms < 1000) {
            return `${Math.round(ms || 0)} ms`;
          }
          return `${formatNumberValue(this._runtimeModel.execution, ms / 1000)} s`;
        },
        evalReasonText: (reason) => this.t(`error.evalReason.${reason || "runtime"}`),
        evaluateBreakpointConditionAtTime: () => ({ hit: false, invalid: false }),
        openWatchDebugger: () => {},
        clearVisualHistory: () => this.clearOutputHistory(),
        clearSimulationHistory: () => this.clearOutputHistory(),
        hasStrictExecutionBlock: () => false,
        buildEvaluationEnv: () => ({ rootExecution: this._runtimeModel.execution, stack: [] }),
      });

      this._seedDefaultInputValues();
      await this.evaluate({ recordHistory: false });
      return this;
    }

    async _loadModelTree(rootLocation) {
      const loadRecursive = async (location) => {
        const text = await loadTextResource(location);
        const data = this._loader.parseJsonText(text);
        const runtimeModel = this._core.buildRuntimeModelFromData(data, {
          directoryPath: location.kind === "url" ? locationDirname(location).href : locationDirname(location).path,
        });
        runtimeModel.__headlessBaseLocation = locationDirname(location);
        for (const node of data.nodes || []) {
          if (String(node?.type ?? "") !== "submodel") {
            continue;
          }
          const normalized = this._shared.normalizeSubmodelPath(node.modelPath);
          if (!normalized || this._submodelTemplates.has(normalized)) {
            continue;
          }
          const childLocation = resolveRelativeLocation(String(node.modelPath), locationDirname(location));
          const child = await loadRecursive(childLocation);
          this._submodelTemplates.set(normalized, child.runtimeModel);
        }
        return { data, runtimeModel };
      };
      return loadRecursive(rootLocation);
    }

    _setStatus(message, isError = false) {
      this._status = String(message ?? "");
      this._statusIsError = Boolean(isError);
    }

    _seedDefaultInputValues() {
      this._inputValues.clear();
      const nodeMap = buildNodeMap(this._runtimeModel);
      for (const node of this._runtimeModel?.nodes || []) {
        if (!isExternallySettableNode(node)) {
          continue;
        }
        if (node.shape === "diamond") {
          const numeric = Number(node.computedValue);
          if (Number.isFinite(numeric)) {
            this._inputValues.set(node.name, numeric);
          }
        }
      }
      const rawWidgets = Array.isArray(this._rawModel?.widgets) ? this._rawModel.widgets : [];
      rawWidgets.forEach((widget) => {
        if (!widget?.source) {
          return;
        }
        const targetNode = nodeMap.get(String(widget.source));
        if (!isExternallySettableNode(targetNode)) {
          return;
        }
        if (widget.type === "slider" || widget.type === "select") {
          this._inputValues.set(widget.source, Number(widget.value));
        } else if (widget.type === "button") {
          this._inputValues.set(widget.source, widget.value ? 1 : 0);
        }
      });
    }

    _applyInputOverrides() {
      (this._runtimeModel?.nodes || []).forEach((node) => {
        node.externalValueEnabled = false;
        node.externalValue = null;
      });
      this._inputValues.forEach((value, name) => {
        const node = nodeByName(this._runtimeModel, name);
        if (!node) {
          return;
        }
        node.externalValueEnabled = true;
        node.externalValue = cloneValue(value);
        node.computedValue = cloneValue(value);
        node.computedError = "";
      });
    }

    _recordOutputSnapshot(timeValue) {
      const values = {};
      (this._runtimeModel?.nodes || []).forEach((node) => {
        if (!node?.output) {
          return;
        }
        values[node.name] = cloneValue(node.computedValue);
      });
      this._outputHistory.push({
        time: Number(timeValue),
        values,
      });
      this._emitProgress("history");
    }

    _emitProgress(phase = "update") {
      if (typeof this._progressCallback !== "function") {
        return;
      }
      try {
        this._progressCallback({
          phase,
          time: this.getTime(),
          outputs: this.getOutputs(),
          historyLength: this._outputHistory.length,
          status: this.getStatus(),
        });
      } catch (_err) {
        // Ignore progress callback failures to keep simulation execution deterministic.
      }
    }

    clearOutputHistory() {
      this._outputHistory = [];
    }

    setProgressCallback(callback) {
      this._progressCallback = typeof callback === "function" ? callback : null;
      return this;
    }

    currentTime() {
      const execution = this._runtimeModel?.execution;
      if (!execution) {
        return null;
      }
      return execution.currentTime == null ? Number(execution.t0) : Number(execution.currentTime);
    }

    async evaluate(options = {}) {
      const { recordHistory = false } = options;
      if (!this._runtimeModel || !this._session) {
        throw new Error("Runtime is not initialized");
      }
      const execution = this._runtimeModel.execution;
      const previewTime = execution.currentTime == null ? Number(execution.t0) : Number(execution.currentTime);
      const originalTime = execution.currentTime;
      this._suppressHistory = !recordHistory;
      try {
        if (originalTime == null) {
          this._session.clearSubmodelState();
          this._session.initializeAt(previewTime);
        }
        this._session.evaluateAtTime(previewTime, {
          rootExecution: execution,
          stack: [],
        });
      } finally {
        execution.currentTime = originalTime;
        this._suppressHistory = false;
      }
      this._emitProgress("evaluate");
      return this.getOutputs();
    }

    _requireSettableNode(name) {
      const node = nodeByName(this._runtimeModel, name);
      if (!node) {
        throw new Error(`Unknown node: ${name}`);
      }
      if (!isExternallySettableNode(node)) {
        throw new Error(`Node is not externally settable: ${name}`);
      }
      return node;
    }

    async setValue(name, value, options = {}) {
      this._requireSettableNode(name);
      this._inputValues.set(String(name), cloneValue(value));
      if (options.evaluate) {
        await this.evaluate({ recordHistory: false });
      }
      return this;
    }

    async setValues(values = {}, options = {}) {
      Object.entries(values || {}).forEach(([name, value]) => {
        this._requireSettableNode(name);
        this._inputValues.set(String(name), cloneValue(value));
      });
      if (options.evaluate) {
        await this.evaluate({ recordHistory: false });
      }
      return this;
    }

    getValue(name) {
      const node = nodeByName(this._runtimeModel, name);
      if (!node) {
        throw new Error(`Unknown node: ${name}`);
      }
      return cloneValue(node.computedValue);
    }

    getValues(names = []) {
      const result = {};
      names.forEach((name) => {
        result[name] = this.getValue(name);
      });
      return result;
    }

    getOutputs() {
      const result = {};
      (this._runtimeModel?.nodes || []).forEach((node) => {
        if (!node?.output) {
          return;
        }
        result[node.name] = this.getValue(node.name);
      });
      return result;
    }

    getOutputHistory() {
      return cloneValue(this._outputHistory);
    }

    getOutputHistoryCsv(options = {}) {
      const history = this.getOutputHistory();
      const names = Array.isArray(options.names) && options.names.length
        ? options.names.map((name) => String(name))
        : Array.from(new Set(history.flatMap((entry) => Object.keys(entry?.values || {}))));
      const rows = [];
      rows.push(["time", ...names].map(csvEscape).join(","));
      history.forEach((entry) => {
        const line = [
          csvEscape(entry?.time ?? ""),
          ...names.map((name) => csvEscape(
            entry?.values?.[name] == null ? "" : JSON.stringify(entry.values[name]),
          )),
        ];
        rows.push(line.join(","));
      });
      return rows.join("\n");
    }

    async writeOutputHistoryCsv(targetPath, options = {}) {
      if (!isNodeEnvironment()) {
        throw new Error("writeOutputHistoryCsv is only available in Node.js");
      }
      const pathText = String(targetPath ?? "").trim();
      if (!pathText) {
        throw new Error("writeOutputHistoryCsv requires a target path");
      }
      const fs = require("fs/promises");
      const path = require("path");
      const absolutePath = path.resolve(pathText);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, this.getOutputHistoryCsv(options), "utf8");
      return absolutePath;
    }

    getTime() {
      return this.currentTime();
    }

    getStatus() {
      return {
        message: this._status,
        isError: this._statusIsError,
      };
    }

    getSettableNames() {
      return (this._runtimeModel?.nodes || []).filter((node) => isExternallySettableNode(node)).map((node) => node.name);
    }

    async step() {
      if (!this._controller) {
        throw new Error("Runtime controller is not initialized");
      }
      await this._controller.runManualStep();
      this._emitProgress("step");
      return this.getOutputs();
    }

    async run() {
      if (!this._controller) {
        throw new Error("Runtime controller is not initialized");
      }
      await this._controller.executeAll();
      this._emitProgress("run");
      return this.getOutputs();
    }

    async runUntil(targetTime) {
      if (!this._controller || !this._runtimeModel) {
        throw new Error("Runtime controller is not initialized");
      }
      const numericTarget = Number(targetTime);
      if (!Number.isFinite(numericTarget)) {
        throw new Error("runUntil requires a finite target time");
      }
      const execution = this._runtimeModel.execution;
      const dt = Number(execution?.dt);
      const t0 = Number(execution?.t0);
      const t1 = Number(execution?.t1);
      if (!Number.isFinite(dt) || dt === 0 || !Number.isFinite(t0) || !Number.isFinite(t1)) {
        throw new Error("Execution time base is invalid");
      }
      const epsilon = Math.max(1e-12, Math.abs(dt) * 1e-9);
      if ((dt > 0 && (numericTarget < t0 - epsilon || numericTarget > t1 + epsilon))
        || (dt < 0 && (numericTarget > t0 + epsilon || numericTarget < t1 - epsilon))) {
        throw new Error("Target time is outside the model time bounds");
      }
      while (true) {
        const current = this.getTime();
        if (current != null) {
          if ((dt > 0 && current >= numericTarget - epsilon) || (dt < 0 && current <= numericTarget + epsilon)) {
            break;
          }
        }
        const next = current == null ? t0 : current + dt;
        if ((dt > 0 && next > numericTarget + epsilon) || (dt < 0 && next < numericTarget - epsilon)) {
          break;
        }
        await this.step();
      }
      this._emitProgress("runUntil");
      return this.getOutputs();
    }

    async reset() {
      if (!this._controller) {
        throw new Error("Runtime controller is not initialized");
      }
      await this._controller.resetExecution();
      this.clearOutputHistory();
      await this.evaluate({ recordHistory: false });
      this._emitProgress("reset");
      return this.getOutputs();
    }
  }

  const api = {
    STGraphXHeadlessRuntime: STGraphXHeadlessRuntimeSession,
    createHeadlessRuntime: (options = {}) => new STGraphXHeadlessRuntimeSession(options),
    loadHeadlessRuntimeFromObject: (data, options = {}) => STGraphXHeadlessRuntimeSession.loadFromObject(data, options),
    loadHeadlessRuntimeFromJsonText: (jsonText, options = {}) => STGraphXHeadlessRuntimeSession.loadFromJsonText(jsonText, options),
  };

  global.STGraphXHeadlessRuntime = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(globalThis);
