/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initRuntimeSession(global) {
  function createRuntimeSession(options = {}) {
    const {
      core,
      model = null,
      rootExecution = null,
      isStateNode,
      beforeEvaluate = null,
      afterEvaluate = null,
      beforeInitialize = null,
      afterInitialize = null,
      beforePromote = null,
      afterPromote = null,
      beforeClearSubmodels = null,
      afterClearSubmodels = null,
    } = options;

    if (!core || !isStateNode) {
      throw new Error("STGraphXRuntimeSession requires core and isStateNode dependencies");
    }

    // A valid state may intentionally have a null value. Track initialization
    // explicitly instead of inferring it from computed values or errors.
    const initializedNodeLists = new WeakMap();

    const session = {
      model,
      rootExecution,
      setModel(nextModel) {
        this.model = nextModel;
        return this;
      },
      setRootExecution(nextExecution) {
        this.rootExecution = nextExecution;
        return this;
      },
      getModel() {
        return this.model;
      },
      getRootExecution() {
        return this.rootExecution || this.model?.execution || null;
      },
      hasInitializedStateSnapshot(targetModel = this.model) {
        const nodeList = targetModel?.nodes;
        return Boolean(
          targetModel
          && typeof targetModel === "object"
          && Array.isArray(nodeList)
          && initializedNodeLists.get(targetModel) === nodeList,
        );
      },
      initializeAt(timeValue, targetModel = this.model, execution = this.getRootExecution()) {
        if (typeof beforeInitialize === "function") {
          beforeInitialize({ session: this, model: targetModel, timeValue, execution });
        }
        core.initializeStateNodesForModel(targetModel, timeValue, execution);
        if (targetModel && typeof targetModel === "object" && Array.isArray(targetModel.nodes)) {
          initializedNodeLists.set(targetModel, targetModel.nodes);
        }
        if (typeof afterInitialize === "function") {
          afterInitialize({ session: this, model: targetModel, timeValue, execution });
        }
      },
      promotePending(targetModel = this.model) {
        if (typeof beforePromote === "function") {
          beforePromote({ session: this, model: targetModel });
        }
        core.promotePendingStateNodesForModel(targetModel);
        if (typeof afterPromote === "function") {
          afterPromote({ session: this, model: targetModel });
        }
      },
      clearSubmodelState(targetModel = this.model) {
        if (typeof beforeClearSubmodels === "function") {
          beforeClearSubmodels({ session: this, model: targetModel });
        }
        core.clearRuntimeSubmodelState(targetModel);
        if (typeof afterClearSubmodels === "function") {
          afterClearSubmodels({ session: this, model: targetModel });
        }
      },
      evaluateAtTime(timeValue, env = null, optionsForCore = {}) {
        const targetModel = this.model;
        const rootExec = this.getRootExecution();
        const effectiveEnv = env || { rootExecution: rootExec, stack: [] };
        if (typeof beforeEvaluate === "function") {
          beforeEvaluate({ session: this, model: targetModel, timeValue, env: effectiveEnv, options: optionsForCore });
        }
        const result = core.evaluateModelAtTimeRecursive(targetModel, timeValue, effectiveEnv, optionsForCore);
        if (typeof afterEvaluate === "function") {
          afterEvaluate({ session: this, model: targetModel, timeValue, env: effectiveEnv, options: optionsForCore, result });
        }
        return result;
      },
    };

    return session;
  }

  global.STGraphXRuntimeSession = {
    createRuntimeSession,
  };
})(globalThis);
