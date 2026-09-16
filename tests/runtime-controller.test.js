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
  assert.equal(execution.currentTime, 2, "a timed tick evaluates the configured number of steps");
  assert.equal(refreshCount, 2, "each timed tick refreshes the view once");
  await intervalCallback();
  assert.equal(execution.currentTime, 5, "subsequent timed ticks retain the same step batch size");
  assert.equal(refreshCount, 3, "the visual refresh cadence remains the timer delay");
  controller.stopTimedExecution(false);
  console.log("runtime-controller.test.js: ok");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
