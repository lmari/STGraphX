/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initValueFormattingModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXValueFormatting = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createValueFormattingExports() {
  function createValueFormattingHelpers(options = {}) {
    const translate = typeof options.t === "function" ? options.t : (key) => key;
    const clamp = typeof options.clamp === "function"
      ? options.clamp
      : (value, min, max) => Math.min(max, Math.max(min, value));
    const getDecimals = typeof options.getDecimals === "function" ? options.getDecimals : () => 0;

    function clampDisplayDecimals(value) {
      return clamp(Math.round(Number(value) || 0), 0, 12);
    }

    function formatNumberValue(value) {
      if (!Number.isFinite(value)) {
        return "-";
      }
      const decimals = clampDisplayDecimals(getDecimals());
      let text = value.toFixed(decimals);
      if (decimals > 0) {
        text = text.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
      }
      return text === "-0" ? "0" : text;
    }

    function isAgentSpaceValue(value) {
      return Boolean(
        value
        && typeof value === "object"
        && value.kind === "agentSpace"
        && Number.isInteger(Number(value.rowCount))
        && Number.isInteger(Number(value.colCount)),
      );
    }

    function formatAgentSpaceSummary(value) {
      return translate("text.agentSpaceSummary", {
        rows: Number(value?.rowCount) || 0,
        cols: Number(value?.colCount) || 0,
        agents: Number(value?.agentCount) || 0,
      });
    }

    function formatComputedValue(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      if (typeof value === "number") {
        return formatNumberValue(value);
      }
      if (isAgentSpaceValue(value)) {
        return formatAgentSpaceSummary(value);
      }
      if (Array.isArray(value)) {
        return `[${value.map((item) => formatComputedValue(item)).join(", ")}]`;
      }
      if (typeof value === "object") {
        const entries = Object.entries(value);
        try {
          return `{${entries.map(([key, item]) => `${key}: ${formatComputedValue(item)}`).join(", ")}}`;
        } catch (_err) {
          return String(value);
        }
      }
      return String(value);
    }

    function matrixShape(value) {
      if (!Array.isArray(value) || value.length === 0 || !value.every((row) => Array.isArray(row))) {
        return null;
      }
      const cols = value[0]?.length ?? 0;
      return value.every((row) => row.length === cols) ? { rows: value.length, cols } : null;
    }

    function summarizeTooltipValue(value) {
      if (isAgentSpaceValue(value)) {
        return formatAgentSpaceSummary(value);
      }
      if (Array.isArray(value)) {
        const matrix = matrixShape(value);
        if (matrix && (matrix.rows * matrix.cols) > 16) {
          return translate("text.matrixSummary", matrix);
        }
        if (!matrix && value.every((item) => !Array.isArray(item)) && value.length > 8) {
          return translate("text.vectorSummary", { size: value.length });
        }
      }
      return formatComputedValue(value);
    }

    function summarizeNodeRuntimeValue(node) {
      if (node?.computedError) {
        return { text: translate("text.nodeValueError"), error: true };
      }
      const value = node?.computedValue;
      if (isAgentSpaceValue(value)) {
        return { text: formatAgentSpaceSummary(value), error: false };
      }
      if (Array.isArray(value)) {
        const matrix = matrixShape(value);
        return matrix
          ? { text: `[${matrix.rows},${matrix.cols}]`, error: false }
          : { text: `[${value.length}]`, error: false };
      }
      if (value && typeof value === "object") {
        const keys = Object.keys(value);
        const visibleKeys = keys.slice(0, 3).join(", ");
        return { text: keys.length > 3 ? `{${visibleKeys}, ...}` : `{${visibleKeys}}`, error: false };
      }
      return { text: formatComputedValue(value), error: false };
    }

    function summarizeExpressionPreviewValue(value) {
      if (isAgentSpaceValue(value)) {
        return formatAgentSpaceSummary(value);
      }
      if (Array.isArray(value)) {
        const matrix = matrixShape(value);
        if (matrix && (matrix.rows * matrix.cols) > 25) {
          return translate("text.matrixSummary", matrix);
        }
        if (!matrix && value.every((item) => !Array.isArray(item)) && value.length > 12) {
          return translate("text.vectorSummary", { size: value.length });
        }
      }
      return formatComputedValue(value);
    }

    function describeExpressionPreviewShape(value) {
      if (value === null || value === undefined) {
        return translate("expr.preview.shape.empty");
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return translate("expr.preview.shape.scalar");
      }
      if (typeof value === "string") {
        return translate("expr.preview.shape.text");
      }
      if (Array.isArray(value)) {
        const matrix = matrixShape(value);
        if (matrix) {
          return translate("expr.preview.shape.matrix", matrix);
        }
        return value.every((item) => !Array.isArray(item))
          ? translate("expr.preview.shape.vector", { size: value.length })
          : translate("expr.preview.shape.array");
      }
      if (isAgentSpaceValue(value)) {
        return translate("expr.preview.shape.agentSpace", {
          rows: Number(value?.rowCount) || 0,
          cols: Number(value?.colCount) || 0,
        });
      }
      return typeof value === "object"
        ? translate("expr.preview.shape.object")
        : translate("expr.preview.shape.scalar");
    }

    function formatExecutionDuration(ms) {
      const value = Number(ms);
      if (!Number.isFinite(value) || value < 0) {
        return "-";
      }
      return value < 1000 ? `${Math.round(value)} ms` : `${formatNumberValue(value / 1000)} s`;
    }

    return {
      clampDisplayDecimals,
      describeExpressionPreviewShape,
      formatAgentSpaceSummary,
      formatComputedValue,
      formatExecutionDuration,
      formatNumberValue,
      isAgentSpaceValue,
      summarizeExpressionPreviewValue,
      summarizeNodeRuntimeValue,
      summarizeTooltipValue,
    };
  }

  return { createValueFormattingHelpers };
});
