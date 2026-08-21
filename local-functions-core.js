/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initLocalFunctionsCoreModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXLocalFunctionsCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createLocalFunctionsCoreExports() {
  function createLocalFunctionsCoreHelpers(options = {}) {
    const t = typeof options.t === "function" ? options.t : (key) => key;
    const getGraph = typeof options.getGraph === "function" ? options.getGraph : () => ({ nodes: [], localFunctions: [] });
    const sanitizeDefinition = typeof options.sanitizeDefinition === "function"
      ? options.sanitizeDefinition
      : (definition) => ({
        name: String(definition?.name ?? "").trim(),
        params: Array.isArray(definition?.params) ? definition.params.slice() : [],
        expression: String(definition?.expression ?? ""),
        description: String(definition?.description ?? ""),
      });
    const semantics = options.semantics || null;
    const localizeExpressionErrorMessage = typeof options.localizeExpressionErrorMessage === "function"
      ? options.localizeExpressionErrorMessage
      : (message) => String(message ?? "");

    function ensureLocalFunctions(model = getGraph()) {
      if (!Array.isArray(model.localFunctions)) {
        model.localFunctions = [];
      }
      return model.localFunctions;
    }

    function sanitizeLocalFunctionName(name) {
      return String(name ?? "").trim();
    }

    function sanitizeLocalFunctionParams(params) {
      if (Array.isArray(params)) {
        return params.map((param) => sanitizeLocalFunctionName(param)).filter(Boolean);
      }
      return String(params ?? "")
        .split(",")
        .map((param) => sanitizeLocalFunctionName(param))
        .filter(Boolean);
    }

    function sanitizeLocalFunctionDefinition(definition = {}) {
      return sanitizeDefinition(definition);
    }

    function sanitizeLocalFunctions(model = getGraph()) {
      const definitions = ensureLocalFunctions(model)
        .map((definition) => sanitizeLocalFunctionDefinition(definition))
        .filter((definition) => definition.name);
      model.localFunctions = definitions;
      return definitions;
    }

    function localFunctionMapForModel(model = getGraph()) {
      if (!semantics?.normalizeLocalFunctionDefinitions) {
        return new Map();
      }
      return semantics.normalizeLocalFunctionDefinitions(sanitizeLocalFunctions(model));
    }

    function localFunctionNamesForModel(model = getGraph()) {
      return Array.from(localFunctionMapForModel(model).keys());
    }

    function localFunctionSignature(definition) {
      const sanitized = sanitizeLocalFunctionDefinition(definition);
      return `${sanitized.name}(${sanitized.params.join(", ")})`;
    }

    function localFunctionCallNames(expression, availableNames) {
      const names = new Set();
      const source = String(expression ?? "");
      const pattern = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
      let match = null;
      while ((match = pattern.exec(source))) {
        const name = String(match[1] ?? "").trim();
        if (name && availableNames.has(name)) {
          names.add(name);
        }
      }
      return names;
    }

    function validateLocalFunctions(definitions, options = {}) {
      const sanitized = (definitions || []).map((definition) => sanitizeLocalFunctionDefinition(definition));
      const model = options.model || getGraph();
      const nodeNameSet = new Set((model?.nodes || []).map((node) => String(node?.name ?? "").trim()).filter(Boolean));
      const nameSet = new Set();
      const order = [];
      for (const definition of sanitized) {
        if (!definition.name) {
          return { ok: false, message: t("localFunctions.error.nameRequired") };
        }
        if (!semantics?.isValidVariableName || !semantics.isValidVariableName(definition.name)) {
          return { ok: false, message: t("localFunctions.error.invalidName", { name: definition.name }) };
        }
        if (semantics.isReservedWord(definition.name) || semantics.isFunctionName(definition.name)) {
          return { ok: false, message: t("localFunctions.error.reservedName", { name: definition.name }) };
        }
        if (nameSet.has(definition.name)) {
          return { ok: false, message: t("localFunctions.error.duplicateName", { name: definition.name }) };
        }
        if (nodeNameSet.has(definition.name)) {
          return { ok: false, message: t("localFunctions.error.conflictNode", { name: definition.name }) };
        }
        nameSet.add(definition.name);
        order.push(definition.name);
        const paramSet = new Set();
        for (const paramName of definition.params) {
          if (!semantics.isValidVariableName(paramName) || semantics.isReservedWord(paramName) || semantics.isFunctionName(paramName)) {
            return { ok: false, message: t("localFunctions.error.invalidParam", { name: paramName, fn: definition.name }) };
          }
          if (paramSet.has(paramName)) {
            return { ok: false, message: t("localFunctions.error.duplicateParam", { name: paramName, fn: definition.name }) };
          }
          paramSet.add(paramName);
        }
        if (!definition.expression) {
          return { ok: false, message: t("localFunctions.error.expressionRequired", { fn: definition.name }) };
        }
      }

      const dependencies = new Map();
      sanitized.forEach((definition) => {
        const validation = semantics.validateExpressionSyntax(definition.expression, definition.params, {
          allowThisAlias: false,
          allowIntegral: false,
          localFunctions: sanitized,
        });
        if (!validation.ok) {
          dependencies.set(definition.name, {
            error: t("localFunctions.error.invalidExpression", {
              fn: definition.name,
              reason: localizeExpressionErrorMessage(validation.message || ""),
            }),
          });
          return;
        }
        dependencies.set(definition.name, {
          calls: localFunctionCallNames(definition.expression, nameSet),
        });
      });
      for (const entry of dependencies.values()) {
        if (entry?.error) {
          return { ok: false, message: entry.error };
        }
      }

      const visiting = new Set();
      const visited = new Set();
      const visit = (name, stack = []) => {
        if (visiting.has(name)) {
          return stack.concat(name);
        }
        if (visited.has(name)) {
          return null;
        }
        visiting.add(name);
        const calls = dependencies.get(name)?.calls || new Set();
        for (const calledName of calls) {
          const cycle = visit(calledName, [...stack, name]);
          if (cycle) {
            return cycle;
          }
        }
        visiting.delete(name);
        visited.add(name);
        return null;
      };
      for (const name of order) {
        const cycle = visit(name, []);
        if (cycle) {
          return { ok: false, message: t("localFunctions.error.cycle", { chain: cycle.join(" -> ") }) };
        }
      }

      if (options.requireAtLeastOne && sanitized.length === 0) {
        return { ok: false, message: t("localFunctions.error.empty") };
      }
      return { ok: true, definitions: sanitized };
    }

    return {
      ensureLocalFunctions,
      localFunctionMapForModel,
      localFunctionNamesForModel,
      localFunctionSignature,
      sanitizeLocalFunctionDefinition,
      sanitizeLocalFunctionName,
      sanitizeLocalFunctionParams,
      sanitizeLocalFunctions,
      validateLocalFunctions,
    };
  }

  return {
    createLocalFunctionsCoreHelpers,
  };
});
