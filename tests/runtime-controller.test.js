"use strict";

const assert = require("assert");

require("../runtime-controller.js");

async function run() {
  let intervalCallback = null;
  let initialized = false;
  let refreshCount = 0;
  const execution = {
    t0: 0,
    dt: 1,
    t1: 10,
    delayMs: 1,
    renderEverySteps: 3,
    currentTime: null,
  };
  const timedState = {
    timedRunHandle: null,
    timedStepRunning: false,
    timedRunStartedAt: 0,
    timedStepLastActivityAt: 0,
  };
  const controller = globalThis.STGraphXRuntimeController.createRuntimeController({
    session: {
      hasInitializedStateSnapshot: () => initialized,
      clearSubmodelState: () => {},
      initializeAt: () => { initialized = true; },
      promotePending: () => {},
      evaluateAtTime: () => ({ successCount: 1, errorCount: 0 }),
    },
    getExecution: () => execution,
    timedState,
    t: (key) => key,
    enforceStrictDefinitions: () => true,
    ensureBreakpointReady: () => true,
    prepareForExecution: async () => true,
    isExecutionEnded: () => false,
    refreshRuntimeView: () => { refreshCount += 1; },
    render: () => {},
    updateEditingLockUi: () => {},
    setStatusKey: () => {},
    setStatus: () => {},
    formatNumberValue: (value) => String(value),
    evaluateBreakpointConditionAtTime: () => ({ hit: false, invalid: false }),
    clearVisualHistory: () => {},
    clearSimulationHistory: () => {},
    setIntervalFn: (callback) => {
      intervalCallback = callback;
      return 1;
    },
    clearIntervalFn: () => {},
  });

  await controller.toggleTimedExecution();
  assert.equal(refreshCount, 1, "a timed run refreshes once before its first step");
  await intervalCallback();
  await intervalCallback();
  assert.equal(refreshCount, 1, "intermediate timed steps do not refresh the view");
  await intervalCallback();
  assert.equal(refreshCount, 2, "the third timed step refreshes the view");
  controller.stopTimedExecution(false);
  console.log("runtime-controller.test.js: ok");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
