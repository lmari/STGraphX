/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari and Francesco Bertolotti.
 */

(function initSensitivityAnalysisCore(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXSensitivityAnalysisCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createSensitivityAnalysisCoreExports() {
  function createSensitivityAnalysisCore(deps = {}) {
    const cloneRuntimeModel = deps.cloneRuntimeModel;
    const initializeStateNodesForModel = deps.initializeStateNodesForModel;
    const promotePendingStateNodesForModel = deps.promotePendingStateNodesForModel;
    const evaluateModelAtTimeRecursive = deps.evaluateModelAtTimeRecursive;

    if (typeof cloneRuntimeModel !== "function"
      || typeof initializeStateNodesForModel !== "function"
      || typeof promotePendingStateNodesForModel !== "function"
      || typeof evaluateModelAtTimeRecursive !== "function") {
      throw new Error("STGraphX sensitivity analysis requires runtime evaluation dependencies");
    }

    function isSensitivityInput(node) {
      return node?.shape === "diamond" || (node?.shape === "ellipse" && node.input === true);
    }

    function sensitivityInputs(model) {
      return (model?.nodes || []).filter(isSensitivityInput);
    }

    function sensitivityOutputs(model) {
      return (model?.nodes || []).filter((node) => node?.output === true);
    }

    function sampleValues(min, max, samples) {
      const count = Math.round(Number(samples));
      const start = Number(min);
      const end = Number(max);
      if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isInteger(count) || count < 2 || end <= start) {
        return null;
      }
      return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1));
    }

    function sensitivityCsv(rows, inputName, outputName) {
      const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const hasErrors = (rows || []).some((row) => Boolean(row?.error));
      const header = [inputName, outputName, ...(hasErrors ? ["error"] : [])].map(escape).join(",");
      const body = (rows || []).map((row) => {
        const values = [row?.inputValue, row?.error ? "" : row?.outputValue];
        if (hasErrors) values.push(row?.error || "");
        return values.map(escape).join(",");
      });
      return [header, ...body].join("\n");
    }

    function runSample(model, inputName, outputName, inputValue) {
      const input = (model.nodes || []).find((node) => node?.name === inputName);
      const output = (model.nodes || []).find((node) => node?.name === outputName);
      if (!input || !output) return { inputValue, outputValue: null, error: "selection" };

      input.externalValueEnabled = true;
      input.externalValue = inputValue;
      input.computedValue = inputValue;
      input.computedError = "";

      const execution = model.execution || {};
      const t0 = Number(execution.t0);
      const dt = Number(execution.dt);
      const t1 = Number(execution.t1);
      const epsilon = Math.max(1e-12, Math.abs(dt) * 1e-9);
      try {
        initializeStateNodesForModel(model, t0, execution);
        let timeValue = t0;
        for (let step = 0; step < 100000; step += 1) {
          if (timeValue > t1 + epsilon) break;
          if (step > 0) promotePendingStateNodesForModel(model);
          evaluateModelAtTimeRecursive(model, timeValue, { rootExecution: execution, stack: [] });
          execution.currentTime = timeValue;
          if (timeValue >= t1 - epsilon) break;
          timeValue += dt;
        }
      } catch (_err) {
        return { inputValue, outputValue: null, error: "runtime" };
      }

      if (output.computedError) return { inputValue, outputValue: null, error: output.computedError };
      if (!Number.isFinite(Number(output.computedValue))) return { inputValue, outputValue: null, error: "nonNumeric" };
      return { inputValue, outputValue: Number(output.computedValue), error: "" };
    }

    async function runSampleAsync(model, inputName, outputName, inputValue, options = {}) {
      const input = (model.nodes || []).find((node) => node?.name === inputName);
      const output = (model.nodes || []).find((node) => node?.name === outputName);
      if (!input || !output) return { inputValue, outputValue: null, error: "selection" };

      input.externalValueEnabled = true;
      input.externalValue = inputValue;
      input.computedValue = inputValue;
      input.computedError = "";

      const execution = model.execution || {};
      const t0 = Number(execution.t0);
      const dt = Number(execution.dt);
      const t1 = Number(execution.t1);
      const epsilon = Math.max(1e-12, Math.abs(dt) * 1e-9);
      const shouldCancel = typeof options.shouldCancel === "function" ? options.shouldCancel : () => false;
      const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
      const yieldToUi = typeof options.yieldToUi === "function" ? options.yieldToUi : null;
      const shouldYield = typeof options.shouldYield === "function" ? options.shouldYield : null;
      const yieldEverySteps = Math.max(1, Math.round(Number(options.yieldEverySteps) || 64));
      try {
        initializeStateNodesForModel(model, t0, execution);
        let timeValue = t0;
        for (let step = 0; step < 100000; step += 1) {
          if (shouldCancel()) return { inputValue, outputValue: null, error: "cancelled", cancelled: true };
          if (timeValue > t1 + epsilon) break;
          if (step > 0) promotePendingStateNodesForModel(model);
          evaluateModelAtTimeRecursive(model, timeValue, { rootExecution: execution, stack: [] });
          execution.currentTime = timeValue;
          const completed = step + 1;
          const isLastStep = timeValue >= t1 - epsilon;
          if (isLastStep || completed % yieldEverySteps === 0) onProgress(completed);
          if (isLastStep) break;
          timeValue += dt;
          if (yieldToUi && completed % yieldEverySteps === 0 && (!shouldYield || shouldYield())) await yieldToUi();
        }
      } catch (_err) {
        return { inputValue, outputValue: null, error: "runtime" };
      }

      if (output.computedError) return { inputValue, outputValue: null, error: output.computedError };
      if (!Number.isFinite(Number(output.computedValue))) return { inputValue, outputValue: null, error: "nonNumeric" };
      return { inputValue, outputValue: Number(output.computedValue), error: "" };
    }

    function runSensitivity(model, options = {}) {
      const inputName = String(options.inputName || "");
      const outputName = String(options.outputName || "");
      const values = sampleValues(options.min, options.max, options.samples);
      const input = sensitivityInputs(model).find((node) => node.name === inputName);
      const output = sensitivityOutputs(model).find((node) => node.name === outputName);
      const execution = model?.execution || {};
      if (!input || !output) return { ok: false, error: "selection", rows: [] };
      if (!values) return { ok: false, error: "range", rows: [] };
      if (!Number.isFinite(Number(execution.t0)) || !Number.isFinite(Number(execution.dt)) || !Number.isFinite(Number(execution.t1))
        || Number(execution.dt) <= 0 || Number(execution.t1) <= Number(execution.t0)) {
        return { ok: false, error: "time", rows: [] };
      }
      return {
        ok: true,
        rows: values.map((inputValue) => runSample(cloneRuntimeModel(model), inputName, outputName, inputValue)),
      };
    }

    async function runSensitivityAsync(model, options = {}) {
      const inputName = String(options.inputName || "");
      const outputName = String(options.outputName || "");
      const values = sampleValues(options.min, options.max, options.samples);
      const input = sensitivityInputs(model).find((node) => node.name === inputName);
      const output = sensitivityOutputs(model).find((node) => node.name === outputName);
      const execution = model?.execution || {};
      if (!input || !output) return { ok: false, error: "selection", rows: [] };
      if (!values) return { ok: false, error: "range", rows: [] };
      const t0 = Number(execution.t0);
      const dt = Number(execution.dt);
      const t1 = Number(execution.t1);
      if (!Number.isFinite(t0) || !Number.isFinite(dt) || !Number.isFinite(t1) || dt <= 0 || t1 <= t0) {
        return { ok: false, error: "time", rows: [] };
      }

      const epsilon = Math.max(1e-12, Math.abs(dt) * 1e-9);
      const stepsPerSample = Math.min(100000, Math.max(1, Math.floor((t1 - t0 + epsilon) / dt) + 1));
      const totalSteps = values.length * stepsPerSample;
      const shouldCancel = typeof options.shouldCancel === "function" ? options.shouldCancel : () => false;
      const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
      const rows = [];
      let completedSteps = 0;
      onProgress({ completed: 0, total: totalSteps });

      for (const inputValue of values) {
        if (shouldCancel()) return { ok: false, error: "cancelled", rows };
        const row = await runSampleAsync(cloneRuntimeModel(model), inputName, outputName, inputValue, {
          shouldCancel,
          yieldToUi: options.yieldToUi,
          yieldEverySteps: options.yieldEverySteps,
          shouldYield: options.shouldYield,
          onProgress: (sampleSteps) => onProgress({ completed: completedSteps + sampleSteps, total: totalSteps }),
        });
        if (row.cancelled) return { ok: false, error: "cancelled", rows };
        rows.push(row);
        completedSteps += stepsPerSample;
        onProgress({ completed: completedSteps, total: totalSteps });
        if (typeof options.yieldToUi === "function" && (!options.shouldYield || options.shouldYield())) {
          await options.yieldToUi();
        }
      }
      return { ok: true, rows };
    }

    return {
      isSensitivityInput,
      sensitivityInputs,
      sensitivityOutputs,
      sampleValues,
      sensitivityCsv,
      runSensitivity,
      runSensitivityAsync,
    };
  }

  return { createSensitivityAnalysisCore };
});
