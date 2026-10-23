"use strict";

const assert = require("assert");

require("../runtime-controller.js");

async function run() {
  let intervalCallback = null;
  let initialized = false;
  let refreshCount = 0;
  const timedProgress = [];
  const batchingStates = [];
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
      evaluateAtTime: () => {
        batchingStates.push(timedState.batchingVisualRefresh);
        return { successCount: 1, errorCount: 0 };
      },
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
    onExecutionProgress: ({ time }) => timedProgress.push(time),
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
  assert.deepEqual(batchingStates, [true, true, true], "all calculations in a timed batch defer visual refresh");
  assert.equal(timedState.batchingVisualRefresh, false, "the visual batch marker is cleared before rendering");
  assert.equal(refreshCount, 2, "each timed tick refreshes the view once");
  assert.deepEqual(timedProgress, [2], "a timed batch reports progress after its visual refresh");
  await intervalCallback();
  assert.equal(execution.currentTime, 5, "subsequent timed ticks retain the same step batch size");
  assert.equal(refreshCount, 3, "the visual refresh cadence remains the timer delay");
  assert.deepEqual(timedProgress, [2, 5], "each visual batch publishes its final progress");
  controller.stopTimedExecution(false);

  const errorExecution = {
    t0: 0,
    dt: 1,
    t1: 10,
    delayMs: 1,
    renderEverySteps: 1,
    stopOnRuntimeError: true,
    currentTime: null,
  };
  const errorTimedState = {
    timedRunHandle: null,
    timedStepRunning: false,
    timedRunStartedAt: 0,
    timedStepLastActivityAt: 0,
  };
  const errorStatuses = [];
  const errorController = globalThis.STGraphXRuntimeController.createRuntimeController({
    session: {
      hasInitializedStateSnapshot: () => false,
      clearSubmodelState: () => {},
      initializeAt: () => {},
      promotePending: () => {},
      evaluateAtTime: () => ({
        successCount: 0,
        errorCount: 1,
        firstErrorNode: "occupiedN",
        firstErrorReason: "runtime",
        firstErrorMessage: "neighbors expects a matrix",
      }),
    },
    getExecution: () => errorExecution,
    timedState: errorTimedState,
    t: (key) => key,
    enforceStrictDefinitions: () => true,
    ensureBreakpointReady: () => true,
    prepareForExecution: async () => true,
    isExecutionEnded: () => false,
    refreshRuntimeView: () => {},
    render: () => {},
    updateEditingLockUi: () => {},
    setStatusKey: (key, vars) => errorStatuses.push({ key, vars }),
    setStatus: () => {},
    formatNumberValue: (value) => String(value),
    evaluateBreakpointConditionAtTime: () => ({ hit: false, invalid: false }),
    clearVisualHistory: () => {},
    clearSimulationHistory: () => {},
  });
  const errorOutcome = await errorController.executeOneStep();
  assert.equal(errorOutcome.ok, false, "the option stops a step when evaluation fails");
  assert.equal(errorOutcome.runtimeError, true);
  assert.deepEqual(errorStatuses.at(-1), {
    key: "error.evalStepFailed",
    vars: { node: "occupiedN", reason: "neighbors expects a matrix", time: "0" },
  });

  let semanticMessage = "";
  let watchOpened = false;
  const semanticExecution = {
    t0: 0,
    dt: 1,
    t1: 10,
    delayMs: 1,
    renderEverySteps: 1,
    currentTime: null,
  };
  const semanticController = globalThis.STGraphXRuntimeController.createRuntimeController({
    session: {
      hasInitializedStateSnapshot: () => false,
      clearSubmodelState: () => {},
      initializeAt: () => {},
      promotePending: () => {},
      evaluateAtTime: () => ({ successCount: 1, errorCount: 0 }),
    },
    getExecution: () => semanticExecution,
    timedState: { timedRunHandle: null, timedStepRunning: false },
    t: (key) => key,
    enforceStrictDefinitions: () => true,
    ensureBreakpointReady: () => true,
    prepareForExecution: async () => true,
    isExecutionEnded: () => false,
    refreshRuntimeView: () => {},
    render: () => {},
    updateEditingLockUi: () => {},
    setStatusKey: () => {},
    setStatus: () => {},
    formatNumberValue: (value) => String(value),
    evaluateBreakpointConditionAtTime: () => ({ hit: true, message: "all agents are satisfied" }),
    openWatchDebugger: () => { watchOpened = true; },
    openSemanticBreakpointMessage: (message) => { semanticMessage = message; },
    clearVisualHistory: () => {},
    clearSimulationHistory: () => {},
  });
  const semanticOutcome = await semanticController.executeOneStep();
  assert.equal(semanticOutcome.breakpointHit, true);
  assert.equal(semanticMessage, "all agents are satisfied");
  assert.equal(watchOpened, false, "a semantic message replaces the generic Watch window");

  const fullProgress = [];
  let fullStarted = 0;
  let fullStopped = 0;
  const fullExecution = {
    t0: 0,
    dt: 1,
    t1: 2,
    currentTime: null,
  };
  let fullInitialized = false;
  const fullController = globalThis.STGraphXRuntimeController.createRuntimeController({
    session: {
      hasInitializedStateSnapshot: () => fullInitialized,
      clearSubmodelState: () => {},
      initializeAt: () => { fullInitialized = true; },
      promotePending: () => {},
      evaluateAtTime: () => ({ successCount: 1, errorCount: 0 }),
    },
    getExecution: () => fullExecution,
    timedState: { timedRunHandle: null, timedStepRunning: false },
    t: (key) => key,
    enforceStrictDefinitions: () => true,
    ensureBreakpointReady: () => true,
    prepareForExecution: async () => true,
    isExecutionEnded: () => false,
    refreshRuntimeView: () => {},
    render: () => {},
    updateEditingLockUi: () => {},
    setStatusKey: () => {},
    setStatus: () => {},
    formatNumberValue: (value) => String(value),
    formatExecutionDuration: () => "0 ms",
    evaluateBreakpointConditionAtTime: () => ({ hit: false, invalid: false }),
    clearVisualHistory: () => {},
    clearSimulationHistory: () => {},
    onFullExecutionStarted: () => { fullStarted += 1; },
    onFullExecutionStopped: () => { fullStopped += 1; },
    onExecutionProgress: ({ fraction }) => fullProgress.push(fraction),
  });
  await fullController.executeAll();
  assert.equal(fullStarted, 1, "a full execution announces its start");
  assert.equal(fullStopped, 1, "a full execution announces its end");
  assert.equal(fullProgress[0], 0, "a full execution starts progress at zero");
  assert.equal(fullProgress.at(-1), 1, "a full execution completes progress at one");
  console.log("runtime-controller.test.js: ok");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
