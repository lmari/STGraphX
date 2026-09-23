"use strict";

const assert = require("assert");

require("../runtime-session.js");
require("../runtime-controller.js");

const model = {
  nodes: [{ id: 1, shape: "rect", computedValue: null, computedError: "" }],
};
let initializeCalls = 0;
const session = globalThis.STGraphXRuntimeSession.createRuntimeSession({
  model,
  isStateNode: (node) => node?.shape === "rect",
  core: {
    initializeStateNodesForModel: () => {
      initializeCalls += 1;
      // An empty state definition is a valid, intentionally null state.
      model.nodes[0].computedValue = null;
      model.nodes[0].computedError = "";
    },
    promotePendingStateNodesForModel: () => {},
    clearRuntimeSubmodelState: () => {},
    evaluateModelAtTimeRecursive: () => ({ successCount: 0, errorCount: 0 }),
  },
});

assert.equal(session.hasInitializedStateSnapshot(), false);
session.initializeAt(0);
assert.equal(initializeCalls, 1);
assert.equal(session.hasInitializedStateSnapshot(), true, "an initialized null state must remain a valid snapshot");

// Replacing the node array happens when loading or creating another model.
model.nodes = [];
assert.equal(session.hasInitializedStateSnapshot(), false, "a replaced model must not retain the old initialization snapshot");

async function verifyManualStepsWithNullState() {
  const stepModel = {
    nodes: [{ id: 1, shape: "rect", computedValue: null, computedError: "" }],
  };
  const execution = { t0: 0, dt: 1, t1: 3, currentTime: null };
  let stepInitializations = 0;
  const stepSession = globalThis.STGraphXRuntimeSession.createRuntimeSession({
    model: stepModel,
    rootExecution: execution,
    isStateNode: (node) => node?.shape === "rect",
    core: {
      initializeStateNodesForModel: () => { stepInitializations += 1; },
      promotePendingStateNodesForModel: () => {},
      clearRuntimeSubmodelState: () => {},
      evaluateModelAtTimeRecursive: () => ({ successCount: 1, errorCount: 0 }),
    },
  });
  const controller = globalThis.STGraphXRuntimeController.createRuntimeController({
    session: stepSession,
    getExecution: () => execution,
    timedState: {},
    t: (key) => key,
    enforceStrictDefinitions: () => true,
    ensureBreakpointReady: () => true,
    prepareForExecution: async () => true,
    isExecutionEnded: (cfg) => execution.currentTime != null && execution.currentTime + cfg.dt > cfg.t1,
    refreshRuntimeView: () => {},
    render: () => {},
    updateEditingLockUi: () => {},
    setStatusKey: () => {},
    setStatus: () => {},
    formatNumberValue: String,
    evaluateBreakpointConditionAtTime: () => ({ hit: false, invalid: false }),
    clearVisualHistory: () => {},
    clearSimulationHistory: () => {},
  });

  await controller.runManualStep();
  await controller.runManualStep();
  assert.equal(stepInitializations, 1, "a null state must not reinitialize each manual step");
  assert.equal(execution.currentTime, 1, "manual execution must advance after a null state initialization");
}

verifyManualStepsWithNullState().then(() => {
  console.log("runtime-session.test.js: ok");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
