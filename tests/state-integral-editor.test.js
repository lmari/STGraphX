"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createModelAnalysisCoreHelpers } = require("../model-analysis-core.js");

const context = vm.createContext({ window: {} });
for (const file of ["graph-functions.js", "semantic.js", "runtime-core.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
}
const semantics = context.window.GraphSemantics;
const runtime = context.STGraphXRuntimeCore.createRuntimeCore({ semantics, t: (key) => key });
const node = { id: 1, shape: "rect", valueExpression: "integral([1])", computedValue: 0 };
const graph = { nodes: [node], edges: [], execution: { dt: 1 } };
const previewState = { model: graph, globals: {} };
const analysis = createModelAnalysisCoreHelpers({
  semantics,
  getGraph: () => graph,
  isStateNode: () => true,
  getModelNodeById: () => node,
  addTensorValues: runtime.addTensorValues,
  scaleTensorValue: runtime.scaleTensorValue,
});

// Exercise the editor functions without booting the canvas and desktop shell.
const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
function loadAppFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = appSource.indexOf("\nfunction ", start + 1);
  assert(start >= 0 && end > start);
  vm.runInContext(appSource.slice(start, end), context, { filename: `app.js:${name}` });
}
let closed = false;
Object.assign(context, {
  semantics, graph,
  ui: { expressionEditor: { nodeId: 1, fieldKey: "value", syntaxOk: true } },
  expressionEditorTextarea: { value: node.valueExpression },
  expressionStateInitialInput: { value: "0" },
  expressionStateInitialBlock: { classList: { contains: () => false } },
  getNodeById: () => node,
  isStateNode: () => true,
  expressionFieldMeta: () => ({ key: "value", setValue: (value) => { node.valueExpression = value; } }),
  getExpressionPreviewInitializationState: () => previewState,
  buildExpressionPreviewBaseContext: () => ({ context: {}, node }),
  resolveStatePreviewCurrentValue: () => ({ ok: true, value: node.computedValue }),
  localFunctionsForSemantics: () => [],
  addTensorValues: runtime.addTensorValues,
  scaleTensorValue: runtime.scaleTensorValue,
  isEditingUiLocked: () => false,
  runAction: (action) => action(),
  analyzeModelStaticIssues: () => analysis.stateTransitionPreviewForAnalysis(node, previewState),
  recalculateAfterNodeDefinitionChange: () => {},
  updateExpressionFieldState: () => {},
  nodeInitialStateInput: null,
  nodeInitialStateStatus: null,
  closeExpressionEditor: () => { closed = true; },
});
loadAppFunction("buildExpressionPreviewEvaluation");
loadAppFunction("commitExpressionEditorValue");

for (const [initial, transition] of [
  [0, "integral([1])"],
  [[0], "integral(1)"],
  [[0, 0], "integral([1])"],
  [[[0]], "integral([1])"],
]) {
  node.computedValue = initial;
  node.valueExpression = transition;
  context.expressionEditorTextarea.value = transition;
  context.expressionStateInitialInput.value = JSON.stringify(initial);
  const preview = context.buildExpressionPreviewEvaluation();
  assert.equal(preview.ok, false);
  assert.equal(preview.message, "tensor shape mismatch");
  assert.equal(preview.currentValue, initial);
  const report = analysis.stateTransitionPreviewForAnalysis(node, previewState);
  assert.equal(report.ok, false);
  assert.equal(report.next.message, "tensor shape mismatch");
  closed = false;
  assert.equal(context.commitExpressionEditorValue(true), true);
  assert(closed, "Apply must close the editor even when integral shapes are incompatible");
  assert.equal(node.initialStateExpression, JSON.stringify(initial));
  assert.equal(node.valueExpression, transition);
}
for (const [initial, transition, expected] of [
  [0, "integral(1)", 1],
  [[0], "integral([1])", [1]],
  [[[0]], "integral([[1]])", [[1]]],
]) {
  node.computedValue = initial;
  node.valueExpression = transition;
  context.expressionEditorTextarea.value = transition;
  const preview = context.buildExpressionPreviewEvaluation();
  assert.equal(preview.ok, true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(preview.nextValue)), expected);
  const report = analysis.stateTransitionPreviewForAnalysis(node, previewState);
  assert.equal(report.ok, true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(report.next.value)), expected);
}
// Syntax diagnostics must not prevent saving, including an invalid initial state.
const classList = { toggle: () => {}, contains: () => false, remove: () => {} };
let locked = false;
let validation = { ok: false, reason: "syntax", message: "Unexpected token" };
let initialValidation = validation;
Object.assign(context, {
  expressionEditorTitle: null,
  expressionEditorApplyBtn: { disabled: true },
  expressionEditorSwitchApplyBtn: { disabled: true, focus: () => {} },
  expressionEditorSwitchModal: { classList },
  expressionEditorSwitchCancelBtn: null,
  expressionEditorStatus: {},
  expressionEditorSurface: { classList },
  expressionStateInitialStatus: {},
  expressionStateInitialHighlight: null,
  expressionStateTransitionStatus: {},
  validateExpressionDraft: () => validation,
  updateExpressionFieldState: () => initialValidation,
  showExpressionStatus: () => {},
  hideExpressionStatus: () => {},
  renderExpressionHighlight: () => {},
  renderExpressionAutocomplete: () => {},
  scheduleExpressionPreviewRefresh: () => {},
  isEditingUiLocked: () => locked,
});
context.expressionEditorTextarea.classList = classList;
loadAppFunction("refreshExpressionEditorValidation");
loadAppFunction("openExpressionEditorSwitchModal");
for (const [initial, transition] of [["0", "1+"], ["(", "this+1"], ["(", "1+"], ["", ""]]) {
  context.expressionStateInitialInput.value = initial;
  context.expressionEditorTextarea.value = transition;
  context.refreshExpressionEditorValidation();
  assert.equal(context.expressionEditorApplyBtn.disabled, false);
  context.openExpressionEditorSwitchModal();
  assert.equal(context.expressionEditorSwitchApplyBtn.disabled, false);
  closed = false;
  assert.equal(context.commitExpressionEditorValue(true), true);
  assert(closed);
  assert.equal(node.valueExpression, transition);
  assert.equal(node.initialStateExpression, initial);
}
locked = true;
context.refreshExpressionEditorValidation();
assert.equal(context.expressionEditorApplyBtn.disabled, true);
assert.equal(context.expressionEditorSwitchApplyBtn.disabled, true);
assert.equal(context.commitExpressionEditorValue(true), false);
locked = false;
// The shared custom editor (for example a watch expression) also accepts errors.
let customValue;
context.ui.expressionEditor = { fieldKey: "__custom__", onApplyCustom: (value) => { customValue = value; } };
context.expressionEditorTextarea.value = "1+";
context.refreshExpressionEditorValidation();
assert.equal(context.expressionEditorApplyBtn.disabled, false);
assert.equal(context.commitExpressionEditorValue(true), true);
assert.equal(customValue, "1+");
console.log("state-integral-editor.test.js: ok");
