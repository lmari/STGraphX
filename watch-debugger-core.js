/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initWatchDebuggerCoreModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXWatchDebuggerCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createWatchDebuggerCoreExports() {
  function createWatchDebuggerCoreHelpers(options = {}) {
    const t = typeof options.t === "function" ? options.t : (key) => key;
    const getGraph = typeof options.getGraph === "function" ? options.getGraph : () => ({ nodes: [], debug: {} });
    const getNodeByName = typeof options.getNodeByName === "function" ? options.getNodeByName : () => null;
    const isStateNode = typeof options.isStateNode === "function" ? options.isStateNode : () => false;
    const buildExecutionGlobals = typeof options.buildExecutionGlobals === "function" ? options.buildExecutionGlobals : () => ({});
    const localFunctionsForSemantics = typeof options.localFunctionsForSemantics === "function"
      ? options.localFunctionsForSemantics
      : () => [];
    const semantics = options.semantics || null;
    const localizeExpressionErrorMessage = typeof options.localizeExpressionErrorMessage === "function"
      ? options.localizeExpressionErrorMessage
      : (message) => String(message ?? "");
    const summarizeWatchValue = typeof options.summarizeWatchValue === "function"
      ? options.summarizeWatchValue
      : (value) => String(value ?? "");

    function ensureDebugConfig(model = getGraph()) {
      if (!model.debug || typeof model.debug !== "object") {
        model.debug = {};
      }
      if (!Array.isArray(model.debug.watches)) {
        model.debug.watches = [];
      }
      model.debug.breakpointEnabled = Boolean(model.debug.breakpointEnabled);
      model.debug.breakpointExpression = String(model.debug.breakpointExpression ?? "");
      return model.debug;
    }

    function sanitizeDebugConfig(model = getGraph()) {
      const debug = ensureDebugConfig(model);
      const validNames = new Set((model?.nodes || []).map((node) => String(node?.name ?? "").trim()).filter(Boolean));
      debug.watches = [...new Set(
        debug.watches
          .map((name) => String(name ?? "").trim())
          .filter((name) => validNames.has(name)),
      )];
      debug.breakpointEnabled = Boolean(debug.breakpointEnabled);
      debug.breakpointExpression = String(debug.breakpointExpression ?? "");
      return debug;
    }

    function captureWatchSnapshot() {
      try {
        const debug = sanitizeDebugConfig();
        const snapshot = new Map();
        debug.watches.forEach((name) => {
          const node = getNodeByName(name);
          if (!node) {
            return;
          }
          snapshot.set(name, {
            summary: summarizeWatchValue(node.computedValue, node.computedError),
          });
        });
        return snapshot;
      } catch (_err) {
        return new Map();
      }
    }

    function breakpointAvailableNames() {
      return [...new Set([
        "time",
        "t0",
        "t1",
        "dt",
        ...(getGraph()?.nodes || []).map((node) => String(node?.name ?? "")).filter(Boolean),
      ])];
    }

    function validateBreakpointExpressionText(source = "") {
      const text = String(source ?? "").trim();
      if (!text) {
        return { ok: true, empty: true };
      }
      if (!semantics?.validateExpressionSyntax) {
        return { ok: false, message: "Expression validation is unavailable" };
      }
      return semantics.validateExpressionSyntax(text, breakpointAvailableNames(), {
        localFunctions: localFunctionsForSemantics(getGraph()),
      });
    }

    function breakpointResultTruthy(value) {
      if (typeof value === "number") {
        return value !== 0;
      }
      if (typeof value === "string") {
        return value.trim().length > 0 && value.trim().toLowerCase() !== "false";
      }
      return Boolean(value);
    }

    function breakpointNodeContextValue(node) {
      if (!node) {
        return undefined;
      }
      if (isStateNode(node) && node.pendingStateValue !== null && node.pendingStateValue !== undefined) {
        return node.pendingStateValue;
      }
      return node.computedValue;
    }

    function buildBreakpointContext(timeValue) {
      const context = buildExecutionGlobals(timeValue);
      (getGraph()?.nodes || []).forEach((node) => {
        const value = breakpointNodeContextValue(node);
        if (value !== undefined && value !== null) {
          context[node.name] = value;
        }
      });
      return context;
    }

    function evaluateBreakpointConditionAtTime(timeValue) {
      const debug = sanitizeDebugConfig();
      if (!debug.breakpointEnabled) {
        return { enabled: false, hit: false };
      }
      const expression = String(debug.breakpointExpression ?? "").trim();
      if (!expression) {
        return { enabled: true, hit: false, invalid: true, message: t("watch.breakpointEmpty") };
      }
      if (!semantics?.evaluateValueExpression) {
        return { enabled: true, hit: false, invalid: true, message: "Expression evaluation is unavailable" };
      }
      const result = semantics.evaluateValueExpression(expression, buildBreakpointContext(timeValue), {
        localFunctions: localFunctionsForSemantics(getGraph()),
      });
      if (!result.ok) {
        return {
          enabled: true,
          hit: false,
          invalid: true,
          message: localizeExpressionErrorMessage(result.message || result.reason || ""),
        };
      }
      return { enabled: true, hit: breakpointResultTruthy(result.value), value: result.value, expression };
    }

    return {
      breakpointAvailableNames,
      captureWatchSnapshot,
      ensureDebugConfig,
      evaluateBreakpointConditionAtTime,
      sanitizeDebugConfig,
      validateBreakpointExpressionText,
    };
  }

  return {
    createWatchDebuggerCoreHelpers,
  };
});
