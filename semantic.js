/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function attachGraphSemantics(global) {
  const VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const RESERVED_WORDS = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in",
    "instanceof", "let", "new", "return", "super", "switch", "this", "throw", "try", "typeof",
    "var", "void", "while", "with", "yield", "enum", "await", "implements", "interface",
    "package", "private", "protected", "public", "static", "null", "true", "false", "time",
    "t0", "t1", "dt", "and", "or", "not",
  ]);
  const graphFunctions = global.GraphFunctions || {};
  const sameArrayShape = graphFunctions.helpers?.sameArrayShape || ((left, right) => JSON.stringify(left) === JSON.stringify(right));
  const countTruthyValues = graphFunctions.helpers?.countTruthyValues;
  const indicesWhereValues = graphFunctions.helpers?.indicesWhereValues;
  const attachAgentSchema = graphFunctions.helpers?.attachAgentSchema || ((value) => value);
  const getAgentFieldNames = graphFunctions.helpers?.getAgentFieldNames || (() => null);
  const collectAgentFieldAliasesFromContext = graphFunctions.helpers?.collectAgentFieldAliasesFromContext || (() => ({}));
  const EXPRESSION_CACHE_LIMIT = 1000;
  const expressionCache = new Map();

  function unavailablePropertyGetter() {
    throw new Error("getProperty is only available in node expressions");
  }

  function unavailablePropertySetter() {
    throw new Error("setProperty is only available in node expressions");
  }

  function unavailableModelPropertyGetter() {
    throw new Error("getModelProperty is unavailable");
  }

  function unavailableModelPropertySetter() {
    throw new Error("setModelProperty is unavailable");
  }

  function unavailableIntegral() {
    throw new Error("integral is only available in state node expressions");
  }

  function unavailableArrayConstructor() {
    throw new Error("array is a special expression form");
  }

  function unavailableMapOperator() {
    throw new Error("map is a special expression form");
  }

  function unavailableFilterOperator() {
    throw new Error("filter is a special expression form");
  }

  function unavailableReduceOperator() {
    throw new Error("reduce is a special expression form");
  }

  function unavailableAppendOperator() {
    throw new Error("append is a special expression form");
  }

  function buildPredicateMask(target, predicateAst, scope, hooks, localIndices = []) {
    if (!Array.isArray(target)) {
      const localScope = { ...scope, $value: target };
      localIndices.forEach((indexValue, idx) => {
        localScope[`$${idx}`] = indexValue;
      });
      return coerceBooleanToNumber(evaluateAstNode(predicateAst, localScope, hooks));
    }
    return target.map((item, idx) => buildPredicateMask(item, predicateAst, scope, hooks, [...localIndices, idx]));
  }

  function buildAgentLocalScope(scope, agentsValue, rowValue, rowIndex) {
    const localScope = {
      ...scope,
      self: rowValue,
      $i: rowIndex,
      $value: rowValue,
    };
    const fieldNames = getAgentFieldNames(agentsValue);
    if (Array.isArray(fieldNames)) {
      fieldNames.forEach((name, index) => {
        if (!Object.prototype.hasOwnProperty.call(localScope, name)) {
          localScope[name] = index;
        }
      });
    }
    return localScope;
  }

  const MATH_SCOPE = Object.freeze(graphFunctions.createMathScope({
    array: unavailableArrayConstructor,
    map: unavailableMapOperator,
    filter: unavailableFilterOperator,
    reduce: unavailableReduceOperator,
    append: unavailableAppendOperator,
    getProperty: unavailablePropertyGetter,
    setProperty: unavailablePropertySetter,
    getModelProperty: unavailableModelPropertyGetter,
    setModelProperty: unavailableModelPropertySetter,
    integral: unavailableIntegral,
  }));
  const FUNCTION_NAMES = new Set(
    Object.keys(MATH_SCOPE).filter((name) => typeof MATH_SCOPE[name] === "function"),
  );

  function normalizeLocalFunctionDefinitions(definitions = []) {
    if (!Array.isArray(definitions)) {
      return new Map();
    }
    const out = new Map();
    definitions.forEach((definition) => {
      const name = normalizeName(definition?.name);
      if (!name || out.has(name)) {
        return;
      }
      const params = Array.isArray(definition?.params)
        ? definition.params.map((param) => normalizeName(param)).filter(Boolean)
        : [];
      out.set(name, {
        name,
        params,
        expression: String(definition?.expression ?? ""),
        description: String(definition?.description ?? ""),
      });
    });
    return out;
  }

  function normalizeName(name) {
    return String(name ?? "").trim();
  }

  function isValidVariableName(name) {
    return VARIABLE_NAME_RE.test(normalizeName(name));
  }

  function isReservedWord(name) {
    return RESERVED_WORDS.has(normalizeName(name));
  }

  function isFunctionName(name) {
    return FUNCTION_NAMES.has(normalizeName(name));
  }

  function isUniqueNodeName(nodes, name, exceptId = null) {
    const target = normalizeName(name);
    return !nodes.some((node) => node.id !== exceptId && normalizeName(node.name) === target);
  }

  function validateNodeName(nodes, name, exceptId = null) {
    const normalized = normalizeName(name);
    if (!isValidVariableName(normalized)) {
      return { ok: false, reason: "invalid", name: normalized };
    }
    if (isFunctionName(normalized)) {
      return { ok: false, reason: "function", name: normalized };
    }
    if (isReservedWord(normalized)) {
      return { ok: false, reason: "reserved", name: normalized };
    }
    if (!isUniqueNodeName(nodes, normalized, exceptId)) {
      return { ok: false, reason: "duplicate", name: normalized };
    }
    return { ok: true, reason: null, name: normalized };
  }

  function makeUniqueName(nodes, baseName, exceptId = null, fallbackPrefix = "n") {
    const normalizedBase = normalizeName(baseName);
    const seed = isValidVariableName(normalizedBase) ? normalizedBase : fallbackPrefix;
    let candidate = seed;
    let index = 1;
    while (
      !isUniqueNodeName(nodes, candidate, exceptId) ||
      isReservedWord(candidate) ||
      isFunctionName(candidate)
    ) {
      index += 1;
      candidate = `${seed}_${index}`;
    }
    return candidate;
  }

  function sanitizeNodeNames(nodes, fallbackPrefix = "n") {
    const out = [];
    nodes.forEach((node) => {
      const candidate = normalizeName(node.name);
      const uniqueName = makeUniqueName(out, candidate, null, fallbackPrefix);
      out.push({ ...node, name: uniqueName });
    });
    return out;
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isComputedScalar(value) {
    return isFiniteNumber(value) || typeof value === "string";
  }

  function isNumericVector(value) {
    return Array.isArray(value) && value.every((item) => isFiniteNumber(item));
  }

  function isComputedVector(value) {
    return Array.isArray(value) && value.every((item) => isComputedScalar(item));
  }

  function isNumericMatrix(value) {
    if (!Array.isArray(value) || value.length === 0) {
      return false;
    }
    if (!value.every((row) => Array.isArray(row) && row.every((item) => isFiniteNumber(item)))) {
      return false;
    }
    const columns = value[0].length;
    return value.every((row) => row.length === columns);
  }

  function isComputedMatrix(value) {
    if (!Array.isArray(value) || value.length === 0) {
      return false;
    }
    if (!value.every((row) => Array.isArray(row) && row.every((item) => isComputedScalar(item)))) {
      return false;
    }
    const columns = value[0].length;
    return value.every((row) => row.length === columns);
  }

  function isNumericTensor(value) {
    if (isFiniteNumber(value)) {
      return true;
    }
    if (!Array.isArray(value)) {
      return false;
    }
    if (value.length === 0) {
      return true;
    }
    if (!value.every((item) => isNumericTensor(item))) {
      return false;
    }
    const first = value[0];
    if (!Array.isArray(first)) {
      return value.every((item) => !Array.isArray(item));
    }
    return value.every((item) => Array.isArray(item) && sameArrayShape(first, item));
  }

  function isNumericNestedArray(value) {
    if (isFiniteNumber(value)) {
      return true;
    }
    if (!Array.isArray(value)) {
      return false;
    }
    return value.every((item) => isNumericNestedArray(item));
  }

  function isComputedTensor(value) {
    if (isComputedScalar(value)) {
      return true;
    }
    if (!Array.isArray(value)) {
      return false;
    }
    if (value.length === 0) {
      return true;
    }
    if (!value.every((item) => isComputedTensor(item))) {
      return false;
    }
    const first = value[0];
    if (!Array.isArray(first)) {
      return value.every((item) => !Array.isArray(item) && isComputedScalar(item));
    }
    return value.every((item) => Array.isArray(item) && sameArrayShape(first, item));
  }

  function validateComputedValue(value) {
    if (isFiniteNumber(value)) {
      return { ok: true, kind: "number", value };
    }
    if (typeof value === "string") {
      return { ok: true, kind: "text", value };
    }
    if (Array.isArray(value) && value.length === 0) {
      const fieldNames = getAgentFieldNames(value);
      if (fieldNames) {
        const cloned = [];
        attachAgentSchema(cloned, fieldNames);
        return { ok: true, kind: "matrix", value: cloned };
      }
    }
    if (isNumericVector(value)) {
      const cloned = value.slice();
      const fieldNames = getAgentFieldNames(value);
      if (fieldNames) {
        attachAgentSchema(cloned, fieldNames);
      }
      return { ok: true, kind: "vector", value: cloned };
    }
    if (isComputedVector(value)) {
      const cloned = value.slice();
      const fieldNames = getAgentFieldNames(value);
      if (fieldNames) {
        attachAgentSchema(cloned, fieldNames);
      }
      return { ok: true, kind: "vector", value: cloned };
    }
    if (isNumericMatrix(value)) {
      const cloned = value.map((row) => row.slice());
      const fieldNames = getAgentFieldNames(value);
      if (fieldNames) {
        attachAgentSchema(cloned, fieldNames);
      }
      return { ok: true, kind: "matrix", value: cloned };
    }
    if (isComputedMatrix(value)) {
      const cloned = value.map((row) => row.slice());
      const fieldNames = getAgentFieldNames(value);
      if (fieldNames) {
        attachAgentSchema(cloned, fieldNames);
      }
      return { ok: true, kind: "matrix", value: cloned };
    }
    if (isNumericTensor(value)) {
      return { ok: true, kind: "array", value: JSON.parse(JSON.stringify(value)) };
    }
    if (isComputedTensor(value)) {
      return { ok: true, kind: "array", value: JSON.parse(JSON.stringify(value)) };
    }
    if (isNumericNestedArray(value)) {
      return { ok: true, kind: "array", value: JSON.parse(JSON.stringify(value)) };
    }
    if (value && typeof value === "object") {
      return { ok: true, kind: "object", value: JSON.parse(JSON.stringify(value)) };
    }
    return { ok: false, reason: "type" };
  }

  function collectIdentifierReferences(expression) {
    const src = String(expression ?? "");
    const refs = new Set();
    const skipped = new Set(["true", "false", "null", "this", "self", "__self", "$i", "$j", "$value", "time", "t0", "t1", "dt"]);
    let i = 0;
    let mode = "code";
    while (i < src.length) {
      const ch = src[i];
      if (mode === "code") {
        if (ch === "'" || ch === "\"" || ch === "`") {
          mode = ch;
          i += 1;
          continue;
        }
        if (/[A-Za-z_$]/u.test(ch)) {
          let j = i + 1;
          while (j < src.length && /[A-Za-z0-9_$]/u.test(src[j])) {
            j += 1;
          }
          const token = src.slice(i, j);
          const prev = i > 0 ? src[i - 1] : "";
          let k = j;
          while (k < src.length && /\s/u.test(src[k])) {
            k += 1;
          }
          const isFunctionCall = src[k] === "(";
          if (prev !== "." && !isFunctionCall && !skipped.has(token) && !/^\$[0-9]+$/u.test(token)) {
            refs.add(token);
          }
          i = j;
          continue;
        }
        i += 1;
        continue;
      }
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === mode) {
        mode = "code";
      }
      i += 1;
    }
    return refs;
  }

  function eulerIntegrateValue(currentValue, deltaValue, dtValue) {
    const dt = Number(dtValue);
    if (!Number.isFinite(dt)) {
      throw new Error("dt must be finite");
    }
    if (isFiniteNumber(currentValue) && isFiniteNumber(deltaValue)) {
      return currentValue + deltaValue * dt;
    }
    if (isNumericVector(currentValue) && isNumericVector(deltaValue) && currentValue.length === deltaValue.length) {
      return currentValue.map((item, idx) => item + deltaValue[idx] * dt);
    }
    if (
      isNumericMatrix(currentValue) &&
      isNumericMatrix(deltaValue) &&
      currentValue.length === deltaValue.length &&
      currentValue.every((row, rowIdx) => row.length === deltaValue[rowIdx].length)
    ) {
      return currentValue.map((row, rowIdx) => row.map((item, colIdx) => item + deltaValue[rowIdx][colIdx] * dt));
    }
    throw new Error("integral requires matching numeric state and derivative");
  }

  function createStateIntegral(node, globals = {}) {
    if (!node) {
      return unavailableIntegral;
    }
    return (value) => eulerIntegrateValue(node.computedValue, value, globals.dt);
  }

  function coerceBooleanToNumber(value) {
    if (value === true) {
      return 1;
    }
    if (value === false) {
      return 0;
    }
    if (Array.isArray(value)) {
      const normalized = value.map((item) => coerceBooleanToNumber(item));
      const fieldNames = getAgentFieldNames(value);
      if (fieldNames) {
        attachAgentSchema(normalized, fieldNames);
      }
      return normalized;
    }
    return value;
  }

  function parsePropertyStoredValue(raw) {
    const text = String(raw ?? "");
    const trimmed = text.trim();
    if (!trimmed) {
      return "";
    }
    if (trimmed === "true") {
      return 1;
    }
    if (trimmed === "false") {
      return 0;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        return text;
      }
    }
    return text;
  }

  function serializePropertyStoredValue(value) {
    const normalized = coerceBooleanToNumber(value);
    if (normalized === null || normalized === undefined) {
      return "";
    }
    if (typeof normalized === "number") {
      return String(normalized);
    }
    if (Array.isArray(normalized)) {
      return JSON.stringify(normalized);
    }
    if (typeof normalized === "object") {
      return JSON.stringify(normalized);
    }
    return String(normalized);
  }

  function ensureNodePropertyAccess(node) {
    if (!node || !Array.isArray(node.properties)) {
      return {
        getProperty: unavailablePropertyGetter,
        setProperty: unavailablePropertySetter,
      };
    }
    return {
      getProperty: (key, fallback = null) => {
        const name = String(key ?? "");
        const found = node.properties.find((prop) => String(prop?.key ?? "") === name);
        if (!found) {
          return fallback;
        }
        return parsePropertyStoredValue(found.value);
      },
      setProperty: (key, value) => {
        const name = String(key ?? "");
        const stored = serializePropertyStoredValue(value);
        const found = node.properties.find((prop) => String(prop?.key ?? "") === name);
        if (found) {
          found.value = stored;
        } else {
          node.properties.push({ key: name, value: stored });
        }
        return value;
      },
    };
  }

  function rewriteThisAlias(expression) {
    const src = String(expression ?? "");
    let out = "";
    let i = 0;
    let mode = "code";

    while (i < src.length) {
      const ch = src[i];

      if (mode === "code") {
        if (ch === "'" || ch === '"' || ch === "`") {
          mode = ch;
          out += ch;
          i += 1;
          continue;
        }
        if (src.slice(i, i + 4) === "this") {
          const prev = i > 0 ? src[i - 1] : "";
          const next = i + 4 < src.length ? src[i + 4] : "";
          const prevOk = !/[A-Za-z0-9_$]/.test(prev);
          const nextOk = !/[A-Za-z0-9_$]/.test(next);
          if (prevOk && nextOk) {
            out += "__self";
            i += 4;
            continue;
          }
        }
        out += ch;
        i += 1;
        continue;
      }

      out += ch;
      if (ch === "\\") {
        if (i + 1 < src.length) {
          out += src[i + 1];
          i += 2;
          continue;
        }
      }
      if (ch === mode) {
        mode = "code";
      }
      i += 1;
    }

    return out;
  }

  function containsIdentifierToken(expression, token) {
    const src = String(expression ?? "");
    const target = String(token ?? "");
    if (!target) {
      return false;
    }
    let i = 0;
    let mode = "code";
    while (i < src.length) {
      const ch = src[i];
      if (mode === "code") {
        if (ch === "'" || ch === '"' || ch === "`") {
          mode = ch;
          i += 1;
          continue;
        }
        if (src.slice(i, i + target.length) === target) {
          const prev = i > 0 ? src[i - 1] : "";
          const next = i + target.length < src.length ? src[i + target.length] : "";
          const prevOk = !/[A-Za-z0-9_$]/.test(prev);
          const nextOk = !/[A-Za-z0-9_$]/.test(next);
          if (prevOk && nextOk) {
            return true;
          }
        }
        i += 1;
        continue;
      }
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === mode) {
        mode = "code";
      }
      i += 1;
    }
    return false;
  }

  function containsThisAlias(expression) {
    return containsIdentifierToken(expression, "this");
  }

  function rewriteConditionalIfCalls(expression) {
    return String(expression ?? "").replace(/(^|[^A-Za-z0-9_$])if\s*\(/g, "$1__if(");
  }

  function rememberCompiledExpression(source, entry) {
    if (expressionCache.has(source)) {
      expressionCache.delete(source);
    }
    expressionCache.set(source, entry);
    if (expressionCache.size > EXPRESSION_CACHE_LIMIT) {
      const oldestKey = expressionCache.keys().next().value;
      expressionCache.delete(oldestKey);
    }
    return entry;
  }

  function getCompiledExpression(source) {
    const key = String(source ?? "");
    const cached = expressionCache.get(key);
    if (cached) {
      expressionCache.delete(key);
      expressionCache.set(key, cached);
      return cached;
    }

    const compiled = {
      hasThisAlias: containsThisAlias(key),
      hasSelfAlias: containsIdentifierToken(key, "self"),
      hasAgentIndex: containsIdentifierToken(key, "$i"),
      hasAgentColumnIndex: containsIdentifierToken(key, "$j"),
      hasIntegral: containsIdentifierToken(key, "integral"),
      ast: null,
      syntaxErrorMessage: null,
      integralArgAsts: [],
    };

    try {
      const normalizedSource = rewriteThisAlias(rewriteConditionalIfCalls(key));
      compiled.ast = parseExpressionAst(normalizedSource);
      compiled.integralArgAsts = collectIntegralArgAstsFromNode(compiled.ast, []);
    } catch (err) {
      if (err && err.name === "SyntaxError") {
        compiled.syntaxErrorMessage = String(err.message || "");
      } else {
        throw err;
      }
    }

    return rememberCompiledExpression(key, compiled);
  }

  function getPureIntegralArgAst(compiled) {
    const ast = compiled?.ast;
    if (!ast || ast.type !== "call" || ast.name !== "integral" || ast.args.length !== 1) {
      return null;
    }
    return ast.args[0];
  }

  function isImplicitExpressionIdentifier(name) {
    return (
      name === "__self" ||
      name === "self" ||
      name === "$i" ||
      name === "$j" ||
      name === "$value" ||
      name === "time" ||
      name === "t0" ||
      name === "t1" ||
      name === "dt" ||
      /^\$\d+$/.test(String(name || ""))
    );
  }

  function validateAstReferences(node, knownNames) {
    if (!node || typeof node !== "object") {
      return;
    }
    switch (node.type) {
      case "literal":
        return;
      case "array":
        node.elements.forEach((item) => validateAstReferences(item, knownNames));
        return;
      case "identifier":
        if (!knownNames.has(node.name) && !isImplicitExpressionIdentifier(node.name)) {
          throw new ReferenceError(`${node.name} is not defined`);
        }
        return;
      case "member":
        validateAstReferences(node.target, knownNames);
        return;
      case "index":
        validateAstReferences(node.target, knownNames);
        validateAstReferences(node.index, knownNames);
        return;
      case "slice":
        validateAstReferences(node.target, knownNames);
        if (node.start) {
          validateAstReferences(node.start, knownNames);
        }
        if (node.end) {
          validateAstReferences(node.end, knownNames);
        }
        if (node.step) {
          validateAstReferences(node.step, knownNames);
        }
        return;
      case "multi-access":
        validateAstReferences(node.target, knownNames);
        (node.accessors || []).forEach((accessor) => {
          if (accessor.kind === "index") {
            validateAstReferences(accessor.index, knownNames);
            return;
          }
          if (accessor.start) {
            validateAstReferences(accessor.start, knownNames);
          }
          if (accessor.end) {
            validateAstReferences(accessor.end, knownNames);
          }
          if (accessor.step) {
            validateAstReferences(accessor.step, knownNames);
          }
        });
        return;
      case "call":
        if (!knownNames.has(node.name)) {
          throw new ReferenceError(`${node.name} is not defined`);
        }
        (node.args || []).forEach((arg) => validateAstReferences(arg, knownNames));
        return;
      case "callable-ref":
        if (node.refKind === "function" && !knownNames.has(node.name)) {
          throw new ReferenceError(`${node.name} is not defined`);
        }
        return;
      case "unary":
        validateAstReferences(node.argument, knownNames);
        return;
      case "binary":
        validateAstReferences(node.left, knownNames);
        validateAstReferences(node.right, knownNames);
        return;
      default:
        return;
    }
  }

  function evaluateAstWithLocalSelf(compiled, baseScope, hooks = null) {
    const selfVector = baseScope?.__self;
    const needsLocalIteration = Boolean(
      compiled?.hasSelfAlias
      || compiled?.hasAgentIndex
      || compiled?.hasAgentColumnIndex,
    );
    if (!needsLocalIteration) {
      return evaluateAstNode(compiled.ast, baseScope, hooks);
    }
    if (compiled?.hasAgentColumnIndex && Array.isArray(selfVector)) {
      return selfVector.map((row, rowIndex) => {
        if (!Array.isArray(row)) {
          return evaluateAstNode(
            compiled.ast,
            {
              ...baseScope,
              self: row,
              $i: rowIndex,
              $j: Object.prototype.hasOwnProperty.call(baseScope || {}, "$j") ? baseScope.$j : 0,
            },
            hooks,
          );
        }
        return row.map((item, colIndex) => evaluateAstNode(
          compiled.ast,
          {
            ...baseScope,
            self: item,
            $i: rowIndex,
            $j: colIndex,
          },
          hooks,
        ));
      });
    }
    if (Array.isArray(selfVector)) {
      return selfVector.map((item, index) => evaluateAstNode(
        compiled.ast,
        {
          ...baseScope,
          self: item,
          $i: index,
        },
        hooks,
      ));
    }
    return evaluateAstNode(
      compiled.ast,
      {
        ...baseScope,
        self: Object.prototype.hasOwnProperty.call(baseScope || {}, "__self") ? baseScope.__self : undefined,
        $i: Object.prototype.hasOwnProperty.call(baseScope || {}, "$i") ? baseScope.$i : 0,
        ...(Object.prototype.hasOwnProperty.call(baseScope || {}, "$j")
          ? { $j: baseScope.$j }
          : {}),
      },
      hooks,
    );
  }

  function normalizeAgentFieldAliasMap(options = {}, context = {}) {
    const explicit = options?.agentFieldAliases && typeof options.agentFieldAliases === "object"
      ? options.agentFieldAliases
      : null;
    if (explicit && Object.keys(explicit).length) {
      return { ...explicit };
    }
    return collectAgentFieldAliasesFromContext(context);
  }

  function collectAgentFieldNamesFromAst(node, out = new Set()) {
    if (!node || typeof node !== "object") {
      return out;
    }
    if (node.type === "call" && node.name === "agents" && Array.isArray(node.args) && node.args.length >= 1) {
      const fieldArg = node.args[0];
      if (fieldArg?.type === "array" && Array.isArray(fieldArg.elements)) {
        fieldArg.elements.forEach((element) => {
          if (element?.type === "literal" && typeof element.value === "string") {
            const name = String(element.value || "").trim();
            if (name) {
              out.add(name);
            }
          }
        });
      }
    }
    Object.values(node).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => collectAgentFieldNamesFromAst(item, out));
        return;
      }
      if (value && typeof value === "object") {
        collectAgentFieldNamesFromAst(value, out);
      }
    });
    return out;
  }

  function extractAgentFieldNamesFromExpression(expression) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return [];
    }
    const compiled = getCompiledExpression(source);
    if (compiled.syntaxErrorMessage || !compiled.ast) {
      return [];
    }
    return [...collectAgentFieldNamesFromAst(compiled.ast)];
  }


  function collectIntegralArgAstsFromNode(node, out = []) {
    if (!node || typeof node !== "object") {
      return out;
    }
    if (node.type === "call" && node.name === "integral" && node.args.length === 1) {
      out.push(node.args[0]);
    }
    Object.values(node).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => collectIntegralArgAstsFromNode(item, out));
      } else if (value && typeof value === "object") {
        collectIntegralArgAstsFromNode(value, out);
      }
    });
    return out;
  }

  function vectorizedBinaryOperation(left, right, scalarFn) {
    if (Array.isArray(left) || Array.isArray(right)) {
      if (Array.isArray(left) && Array.isArray(right)) {
        if (!sameArrayShape(left, right)) {
          throw new Error("operator arguments must have matching shapes");
        }
        return left.map((item, idx) => vectorizedBinaryOperation(item, right[idx], scalarFn));
      }
      const arr = Array.isArray(left) ? left : right;
      const scalar = Array.isArray(left) ? right : left;
      return arr.map((item) => vectorizedBinaryOperation(
        Array.isArray(left) ? item : scalar,
        Array.isArray(left) ? scalar : item,
        scalarFn,
      ));
    }
    return scalarFn(left, right);
  }

  function vectorizedUnaryOperation(value, scalarFn) {
    if (Array.isArray(value)) {
      return value.map((item) => vectorizedUnaryOperation(item, scalarFn));
    }
    return scalarFn(value);
  }

  function vectorizedConditionalOperation(condition, whenTrue, whenFalse) {
    if (Array.isArray(condition) || Array.isArray(whenTrue) || Array.isArray(whenFalse)) {
      if (Array.isArray(condition)) {
        const ref = condition;
        if ((Array.isArray(whenTrue) && !sameArrayShape(ref, whenTrue)) || (Array.isArray(whenFalse) && !sameArrayShape(ref, whenFalse))) {
          throw new Error("if arguments must have matching shapes");
        }
        return condition.map((item, idx) => vectorizedConditionalOperation(
          item,
          Array.isArray(whenTrue) ? whenTrue[idx] : whenTrue,
          Array.isArray(whenFalse) ? whenFalse[idx] : whenFalse,
        ));
      }
      const ref = Array.isArray(whenTrue) ? whenTrue : whenFalse;
      const other = Array.isArray(whenTrue) ? whenFalse : whenTrue;
      if (Array.isArray(other) && !sameArrayShape(ref, other)) {
        throw new Error("if arguments must have matching shapes");
      }
      return ref.map((item, idx) => vectorizedConditionalOperation(
        condition,
        Array.isArray(whenTrue) ? whenTrue[idx] : whenTrue,
        Array.isArray(whenFalse) ? whenFalse[idx] : whenFalse,
      ));
    }
    return condition ? whenTrue : whenFalse;
  }

  function normalizeSliceIndex(value, size, fallback) {
    if (value == null) {
      return fallback;
    }
    let idx = Number(value);
    if (!Number.isInteger(idx)) {
      throw new Error("slice bounds must be integers");
    }
    if (idx < 0) {
      idx += size;
    }
    return idx;
  }

  function euclideanModulo(left, right) {
    const divisor = Number(right);
    if (!Number.isFinite(divisor) || divisor === 0) {
      return Number(left) % divisor;
    }
    const remainder = Number(left) % divisor;
    return ((remainder + divisor) % divisor);
  }

  function scalarBinaryOperation(op, left, right) {
    switch (op) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        return left / right;
      case "%":
        return euclideanModulo(left, right);
      case "**":
        return left ** right;
      case "<":
        return left < right;
      case ">":
        return left > right;
      case "<=":
        return left <= right;
      case ">=":
        return left >= right;
      case "==":
        return left == right;
      case "!=":
        return left != right;
      case "===":
        return left === right;
      case "!==":
        return left !== right;
      case "&&":
        return left && right;
      case "||":
        return left || right;
      default:
        throw new Error(`Unsupported reducer operator ${op}`);
    }
  }

  function applyReducer(accumulator, value, reducer, scope) {
    if (!reducer || typeof reducer !== "object") {
      throw new Error("invalid reducer");
    }
    if (reducer.refKind === "operator") {
      return scalarBinaryOperation(reducer.name, accumulator, value);
    }
    if (reducer.refKind === "function") {
      const fn = scope?.[reducer.name];
      if (typeof fn !== "function") {
        throw new Error(`${reducer.name} is not callable`);
      }
      return fn(accumulator, value);
    }
    throw new Error("invalid reducer");
  }

  function reduceArrayElements(values, reducer, scope, hasInit = false, initValue = null) {
    if (!Array.isArray(values)) {
      throw new Error("reduce expects a vector or matrix");
    }
    if (hasInit) {
      return values.reduce((acc, value) => applyReducer(acc, value, reducer, scope), initValue);
    }
    if (values.length === 0) {
      throw new Error("reduce requires a non-empty vector when no initial value is provided");
    }
    return values.slice(1).reduce((acc, value) => applyReducer(acc, value, reducer, scope), values[0]);
  }

  function reduceMatrixAlongAxis(matrix, axis, reducer, scope, hasInit = false, initValue = null) {
    if (!isNumericMatrix(matrix) && !Array.isArray(matrix)) {
      throw new Error("reduce expects a vector or matrix");
    }
    if (!Array.isArray(matrix) || matrix.length === 0 || !matrix.every((row) => Array.isArray(row))) {
      throw new Error("reduce axis requires a matrix");
    }
    const rowCount = matrix.length;
    const colCount = matrix[0].length;
    if (!matrix.every((row) => row.length === colCount)) {
      throw new Error("reduce axis requires a rectangular matrix");
    }
    if (!Number.isInteger(axis) || (axis !== 0 && axis !== 1)) {
      throw new Error("reduce matrix axis must be 0 or 1");
    }
    if (axis === 0) {
      return Array.from({ length: colCount }, (_, colIdx) => {
        const values = Array.from({ length: rowCount }, (_, rowIdx) => matrix[rowIdx][colIdx]);
        return reduceArrayElements(values, reducer, scope, hasInit, initValue);
      });
    }
    return matrix.map((row) => reduceArrayElements(row, reducer, scope, hasInit, initValue));
  }

  function appendArrayValues(target, value) {
    if (!Array.isArray(target)) {
      throw new Error("append expects a vector or matrix as first argument");
    }
    const fieldNames = getAgentFieldNames(target);
    const isMatrix = Boolean(fieldNames) || (target.length > 0 && target.every((row) => Array.isArray(row)));
    if (!isMatrix) {
      if (Array.isArray(value)) {
        const out = [...target, ...value];
        if (fieldNames) {
          attachAgentSchema(out, fieldNames);
        }
        return out;
      }
      const out = [...target, value];
      if (fieldNames) {
        attachAgentSchema(out, fieldNames);
      }
        return out;
    }
    if (!Array.isArray(value) || value.some((item) => Array.isArray(item))) {
      throw new Error("append on matrices expects a vector row as second argument");
    }
    const columnCount = target.length > 0 ? target[0].length : value.length;
    if (!target.every((row) => row.length === columnCount)) {
      throw new Error("append requires a rectangular matrix");
    }
    if (value.length !== columnCount) {
      throw new Error("appended row length does not match matrix column count");
    }
    const out = [...target.map((row) => row.slice()), value.slice()];
    if (fieldNames) {
      attachAgentSchema(out, fieldNames);
    }
    return out;
  }

  function tokenizeExpression(source) {
    const tokens = [];
    let i = 0;
    while (i < source.length) {
      const ch = source[i];
      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }
      const three = source.slice(i, i + 3);
      const two = source.slice(i, i + 2);
      if (three === "===" || three === "!==") {
        tokens.push({ type: "op", value: three });
        i += 3;
        continue;
      }
      if (["&&", "||", "==", "!=", "<=", ">=", "**"].includes(two)) {
        tokens.push({ type: "op", value: two });
        i += 2;
        continue;
      }
      if ("+-*/%^<>()[],!:. ".replace(/\s/g, "").includes(ch)) {
        tokens.push({ type: "op", value: ch });
        i += 1;
        continue;
      }
      if (ch === "'" || ch === "\"") {
        const quote = ch;
        let out = "";
        i += 1;
        while (i < source.length) {
          const cur = source[i];
          if (cur === "\\") {
            if (i + 1 >= source.length) {
              throw new SyntaxError("Unterminated string");
            }
            const next = source[i + 1];
            const map = { n: "\n", r: "\r", t: "\t", "\\": "\\", "'": "'", "\"": "\"" };
            out += Object.prototype.hasOwnProperty.call(map, next) ? map[next] : next;
            i += 2;
            continue;
          }
          if (cur === quote) {
            i += 1;
            break;
          }
          out += cur;
          i += 1;
        }
        if (source[i - 1] !== quote) {
          throw new SyntaxError("Unterminated string");
        }
        tokens.push({ type: "string", value: out });
        continue;
      }
      if (/[0-9.]/.test(ch)) {
        let j = i;
        while (j < source.length && /[0-9.]/.test(source[j])) {
          j += 1;
        }
        if (/[eE]/.test(source[j])) {
          j += 1;
          if (/[+-]/.test(source[j])) {
            j += 1;
          }
          while (j < source.length && /[0-9]/.test(source[j])) {
            j += 1;
          }
        }
        const text = source.slice(i, j);
        const value = Number(text);
        if (!Number.isFinite(value)) {
          throw new SyntaxError("Invalid number");
        }
        tokens.push({ type: "number", value });
        i = j;
        continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        let j = i + 1;
        while (j < source.length && /[A-Za-z0-9_$]/.test(source[j])) {
          j += 1;
        }
        const value = source.slice(i, j);
        if (value === "and") {
          tokens.push({ type: "op", value: "&&" });
        } else if (value === "or") {
          tokens.push({ type: "op", value: "||" });
        } else if (value === "not") {
          tokens.push({ type: "op", value: "!" });
        } else {
          tokens.push({ type: "identifier", value });
        }
        i = j;
        continue;
      }
      throw new SyntaxError(`Unexpected token ${ch}`);
    }
    tokens.push({ type: "eof", value: "" });
    return tokens;
  }

  function parseExpressionAst(source) {
    const tokens = tokenizeExpression(source);
    let index = 0;
    const peek = () => tokens[index];
    const next = () => tokens[index++];
    const match = (...values) => {
      const token = peek();
      if (token && values.includes(token.value)) {
        index += 1;
        return token;
      }
      return null;
    };
    const expect = (value) => {
      const token = next();
      if (!token || token.value !== value) {
        throw new SyntaxError(`Expected '${value}'`);
      }
      return token;
    };

    function parseReduceReference() {
      const token = peek();
      if (!token) {
        throw new SyntaxError("Missing reduce operator");
      }
      if (token.type === "identifier") {
        next();
        return { type: "callable-ref", refKind: "function", name: token.value };
      }
      if (
        token.type === "op" &&
        ["+", "-", "*", "/", "%", "**", "^", "<", ">", "<=", ">=", "==", "!=", "===", "!==", "&&", "||"].includes(token.value)
      ) {
        next();
        return { type: "callable-ref", refKind: "operator", name: token.value === "^" ? "**" : token.value };
      }
      throw new SyntaxError("reduce expects an operator or function as first argument");
    }

    function parseSingleBracketAccessor() {
      let start = null;
      let end = null;
      let step = null;

      if (match(":")) {
        if (!peek() || (peek().type === "op" && [",", "]"].includes(peek().value))) {
          return { kind: "slice", start, end, step };
        }
        if (!match(":")) {
          end = parseLogicalOr();
          if (match(":")) {
            if (!peek() || (peek().type === "op" && [",", "]"].includes(peek().value))) {
              return { kind: "slice", start, end, step };
            }
            step = parseLogicalOr();
          }
        } else if (!peek() || (peek().type === "op" && [",", "]"].includes(peek().value))) {
          return { kind: "slice", start, end, step };
        } else {
          step = parseLogicalOr();
        }
        return { kind: "slice", start, end, step };
      }

      const first = parseLogicalOr();
      if (!match(":")) {
        return { kind: "index", index: first };
      }

      start = first;
      if (!peek() || (peek().type === "op" && [",", "]"].includes(peek().value))) {
        return { kind: "slice", start, end, step };
      }
      if (!match(":")) {
        end = parseLogicalOr();
        if (match(":")) {
          if (!peek() || (peek().type === "op" && [",", "]"].includes(peek().value))) {
            return { kind: "slice", start, end, step };
          }
          step = parseLogicalOr();
        }
      } else if (!peek() || (peek().type === "op" && [",", "]"].includes(peek().value))) {
        return { kind: "slice", start, end, step };
      } else {
        step = parseLogicalOr();
      }
      return { kind: "slice", start, end, step };
    }

    function parseBracketAccessor(target) {
      if (match("]")) {
        throw new SyntaxError("Empty index");
      }

      const accessors = [parseSingleBracketAccessor()];
      while (match(",")) {
        if (match("]")) {
          throw new SyntaxError("Empty index after ','");
        }
        accessors.push(parseSingleBracketAccessor());
      }
      expect("]");

      if (accessors.length === 1) {
        const accessor = accessors[0];
        if (accessor.kind === "index") {
          return { type: "index", target, index: accessor.index };
        }
        return { type: "slice", target, start: accessor.start, end: accessor.end, step: accessor.step };
      }
      return { type: "multi-access", target, accessors };
    }

    function parsePrimary() {
      const token = peek();
      if (!token) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (match("(")) {
        const expr = parseLogicalOr();
        expect(")");
        return expr;
      }
      if (match("[")) {
        if (match("]")) {
          return { type: "array", elements: [] };
        }
        const elements = [parseLogicalOr()];
        while (match(",")) {
          elements.push(parseLogicalOr());
        }
        expect("]");
        return { type: "array", elements };
      }
      if (token.type === "number") {
        next();
        return { type: "literal", value: token.value };
      }
      if (token.type === "string") {
        next();
        return { type: "literal", value: token.value };
      }
      if (token.type === "identifier") {
        next();
        const name = token.value;
        if (match("(")) {
          const args = [];
          if (name === "reduce") {
            if (!match(")")) {
              args.push(parseReduceReference());
              while (match(",")) {
                args.push(parseLogicalOr());
              }
              expect(")");
            }
          } else if (!match(")")) {
            do {
              args.push(parseLogicalOr());
            } while (match(","));
            expect(")");
          }
          return { type: "call", name, args };
        }
        if (name === "true") {
          return { type: "literal", value: true };
        }
        if (name === "false") {
          return { type: "literal", value: false };
        }
        if (name === "null") {
          return { type: "literal", value: null };
        }
        return { type: "identifier", name };
      }
      throw new SyntaxError(`Unexpected token ${token.value}`);
    }

    function parsePostfix() {
      let expr = parsePrimary();
      while (true) {
        if (match(".")) {
          const token = next();
          if (!token || token.type !== "identifier") {
            throw new SyntaxError("Expected property name after '.'");
          }
          expr = { type: "member", target: expr, property: token.value };
          continue;
        }
        if (match("[")) {
          expr = parseBracketAccessor(expr);
          continue;
        }
        return expr;
      }
    }

    function parseUnary() {
      const token = peek();
      if (token && token.type === "op" && ["+", "-", "!"].includes(token.value)) {
        next();
        return { type: "unary", op: token.value, argument: parseUnary() };
      }
      return parsePostfix();
    }

    function parsePower() {
      let left = parseUnary();
      if (match("**", "^")) {
        left = { type: "binary", op: "**", left, right: parsePower() };
      }
      return left;
    }

    function parseMultiplicative() {
      let left = parsePower();
      while (true) {
        const op = match("*", "/", "%");
        if (!op) {
          return left;
        }
        left = { type: "binary", op: op.value, left, right: parsePower() };
      }
    }

    function parseAdditive() {
      let left = parseMultiplicative();
      while (true) {
        const op = match("+", "-");
        if (!op) {
          return left;
        }
        left = { type: "binary", op: op.value, left, right: parseMultiplicative() };
      }
    }

    function parseComparison() {
      let left = parseAdditive();
      while (true) {
        const op = match("<", ">", "<=", ">=");
        if (!op) {
          return left;
        }
        left = { type: "binary", op: op.value, left, right: parseAdditive() };
      }
    }

    function parseEquality() {
      let left = parseComparison();
      while (true) {
        const op = match("==", "!=", "===", "!==");
        if (!op) {
          return left;
        }
        left = { type: "binary", op: op.value, left, right: parseComparison() };
      }
    }

    function parseLogicalAnd() {
      let left = parseEquality();
      while (match("&&")) {
        left = { type: "binary", op: "&&", left, right: parseEquality() };
      }
      return left;
    }

    function parseLogicalOr() {
      let left = parseLogicalAnd();
      while (match("||")) {
        left = { type: "binary", op: "||", left, right: parseLogicalAnd() };
      }
      return left;
    }

    const ast = parseLogicalOr();
    if (peek().type !== "eof") {
      throw new SyntaxError(`Unexpected token ${peek().value}`);
    }
    return ast;
  }

  function evaluateAstNode(node, scope, hooks = null) {
    const applySliceAccessor = (target, accessor) => {
      const step = accessor.step == null ? 1 : Number(evaluateAstNode(accessor.step, scope, hooks));
      if (!Number.isInteger(step) || step === 0) {
        throw new Error("slice step must be a non-zero integer");
      }
      const size = target.length;
      const start = step > 0
        ? normalizeSliceIndex(accessor.start == null ? null : evaluateAstNode(accessor.start, scope, hooks), size, 0)
        : normalizeSliceIndex(accessor.start == null ? null : evaluateAstNode(accessor.start, scope, hooks), size, size - 1);
      const end = step > 0
        ? normalizeSliceIndex(accessor.end == null ? null : evaluateAstNode(accessor.end, scope, hooks), size, size)
        : normalizeSliceIndex(accessor.end == null ? null : evaluateAstNode(accessor.end, scope, hooks), size, -1);
      const out = [];
      if (step > 0) {
        for (let idx = Math.max(0, start); idx < Math.min(size, end); idx += step) {
          out.push(target[idx]);
        }
      } else {
        for (let idx = Math.min(size - 1, start); idx > Math.max(-1, end); idx += step) {
          out.push(target[idx]);
        }
      }
      return out;
    };

    const applyIndexAccessor = (target, accessor) => {
      if (!Array.isArray(target)) {
        if (accessor?.index?.type === "identifier" && accessor.index.name === "$i") {
          return target;
        }
        throw new Error("indexing requires an array or matrix");
      }
      const rawIndex = evaluateAstNode(accessor.index, scope, hooks);
      if (Array.isArray(rawIndex)) {
        if (
          rawIndex.length === 2 &&
          target.every((row) => Array.isArray(row))
        ) {
          let rowIdx = Number(rawIndex[0]);
          let colIdx = Number(rawIndex[1]);
          if (!Number.isInteger(rowIdx) || !Number.isInteger(colIdx)) {
            throw new Error("matrix index must be a pair of integers");
          }
          if (rowIdx < 0) {
            rowIdx += target.length;
          }
          if (rowIdx < 0 || rowIdx >= target.length) {
            throw new Error("matrix row index out of range");
          }
          const row = target[rowIdx];
          if (!Array.isArray(row)) {
            throw new Error("matrix index requires a matrix target");
          }
          if (colIdx < 0) {
            colIdx += row.length;
          }
          if (colIdx < 0 || colIdx >= row.length) {
            throw new Error("matrix column index out of range");
          }
          return row[colIdx];
        }
        throw new Error("array index must be an integer or a [row, col] pair");
      }
      let idx = Number(rawIndex);
      if (!Number.isInteger(idx)) {
        throw new Error("array index must be an integer");
      }
      if (idx < 0) {
        idx += target.length;
      }
      if (idx < 0 || idx >= target.length) {
        throw new Error("array index out of range");
      }
      return target[idx];
    };

    const applyAccessors = (target, accessors) => {
      if (!accessors.length) {
        return target;
      }
      const [first, ...rest] = accessors;
      if (first.kind === "index") {
        return applyAccessors(applyIndexAccessor(target, first), rest);
      }
      if (!Array.isArray(target)) {
        throw new Error("indexing requires an array or matrix");
      }
      const sliced = applySliceAccessor(target, first);
      if (!rest.length) {
        return sliced;
      }
      return sliced.map((item) => applyAccessors(item, rest));
    };

    switch (node.type) {
      case "literal":
        return node.value;
      case "array":
        return node.elements.map((item) => evaluateAstNode(item, scope, hooks));
      case "identifier":
        if (!Object.prototype.hasOwnProperty.call(scope, node.name)) {
          if (hooks?.agentFieldAliases && Object.prototype.hasOwnProperty.call(hooks.agentFieldAliases, node.name)) {
            return hooks.agentFieldAliases[node.name];
          }
          throw new ReferenceError(`${node.name} is not defined`);
        }
        return scope[node.name];
      case "member": {
        const target = evaluateAstNode(node.target, scope, hooks);
        if (target == null || (typeof target !== "object" && !Array.isArray(target))) {
          throw new Error("member access requires an object or array");
        }
        if (!Object.prototype.hasOwnProperty.call(target, node.property)) {
          throw new ReferenceError(`${node.property} is not defined`);
        }
        return target[node.property];
      }
      case "index": {
        const target = evaluateAstNode(node.target, scope, hooks);
        return applyIndexAccessor(target, { kind: "index", index: node.index });
      }
      case "slice": {
        const target = evaluateAstNode(node.target, scope, hooks);
        if (!Array.isArray(target)) {
          throw new Error("slicing requires an array or matrix");
        }
        return applySliceAccessor(target, { kind: "slice", start: node.start, end: node.end, step: node.step });
      }
      case "multi-access": {
        const target = evaluateAstNode(node.target, scope, hooks);
        return applyAccessors(target, node.accessors);
      }
      case "call": {
        if (node.name === "integral" && hooks?.onIntegralCall) {
          return hooks.onIntegralCall(node, scope);
        }
        if (node.name === "__if") {
          if (node.args.length !== 3) {
            throw new Error("if expects exactly 3 arguments");
          }
          const condition = evaluateAstNode(node.args[0], scope, hooks);
          if (!Array.isArray(condition)) {
            return condition
              ? evaluateAstNode(node.args[1], scope, hooks)
              : evaluateAstNode(node.args[2], scope, hooks);
          }
          const whenTrue = evaluateAstNode(node.args[1], scope, hooks);
          const whenFalse = evaluateAstNode(node.args[2], scope, hooks);
          return vectorizedConditionalOperation(condition, whenTrue, whenFalse);
        }
        if (node.name === "array") {
          if (node.args.length !== 2) {
            throw new Error("array expects exactly 2 arguments");
          }
          const dimsValue = evaluateAstNode(node.args[0], scope, hooks);
          const dims = Array.isArray(dimsValue) ? dimsValue.slice() : [dimsValue];
          if (!dims.length) {
            throw new Error("array requires at least one dimension");
          }
          const normalizedDims = dims.map((dim, idx) => {
            const value = Number(dim);
            if (!Number.isInteger(value) || value < 0) {
              throw new Error(`array dimension ${idx} must be a non-negative integer`);
            }
            return value;
          });
          const totalSize = normalizedDims.reduce((acc, value) => acc * Math.max(1, value), 1);
          if (totalSize > 100000) {
            throw new Error("array is too large");
          }
          const buildArray = (level, localIndices) => {
            if (level >= normalizedDims.length) {
              const localScope = { ...scope };
              localIndices.forEach((value, idx) => {
                localScope[`$${idx}`] = value;
              });
              return evaluateAstNode(node.args[1], localScope, hooks);
            }
            const size = normalizedDims[level];
            return Array.from({ length: size }, (_, idx) => buildArray(level + 1, [...localIndices, idx]));
          };
          return buildArray(0, []);
        }
        if (node.name === "map") {
          if (node.args.length !== 2) {
            throw new Error("map expects exactly 2 arguments");
          }
          const target = evaluateAstNode(node.args[1], scope, hooks);
          if (!Array.isArray(target)) {
            throw new Error("map expects a vector or matrix");
          }
          const mapArray = (value, localIndices) => {
            if (!Array.isArray(value)) {
              const localScope = { ...scope, $value: value };
              localIndices.forEach((indexValue, idx) => {
                localScope[`$${idx}`] = indexValue;
              });
              return evaluateAstNode(node.args[0], localScope, hooks);
            }
            return value.map((item, idx) => mapArray(item, [...localIndices, idx]));
          };
          return mapArray(target, []);
        }
        if (node.name === "filter") {
          if (node.args.length < 2 || node.args.length > 3) {
            throw new Error("filter expects 2 or 3 arguments");
          }
          const target = evaluateAstNode(node.args[1], scope, hooks);
          if (!Array.isArray(target)) {
            throw new Error("filter expects a vector or matrix");
          }
          const modeValue = node.args.length === 3 ? String(evaluateAstNode(node.args[2], scope, hooks) ?? "").trim().toLowerCase() : "elements";
          const mode = modeValue || "elements";
          if (!["elements", "rows", "cols", "columns"].includes(mode)) {
            throw new Error("filter mode must be 'elements', 'rows', or 'cols'");
          }
          const isMatrix = target.length > 0 && target.every((row) => Array.isArray(row));
          if (mode !== "elements") {
            if (!isMatrix) {
              throw new Error("filter mode 'rows' or 'cols' requires a matrix");
            }
            const rowCount = target.length;
            const colCount = rowCount > 0 ? target[0].length : 0;
            if (!target.every((row) => row.length === colCount)) {
              throw new Error("filter mode 'rows' or 'cols' requires a rectangular matrix");
            }
            if (mode === "rows") {
              return target.filter((row, rowIdx) => {
                const localScope = { ...scope, $value: row.slice(), $0: rowIdx };
                return coerceBooleanToNumber(evaluateAstNode(node.args[0], localScope, hooks));
              }).map((row) => row.slice());
            }
            const keptColumns = Array.from({ length: colCount }, (_, colIdx) => {
              const column = target.map((row) => row[colIdx]);
              const localScope = { ...scope, $value: column, $0: colIdx };
              return coerceBooleanToNumber(evaluateAstNode(node.args[0], localScope, hooks)) ? colIdx : null;
            }).filter((colIdx) => colIdx != null);
            return target.map((row) => keptColumns.map((colIdx) => row[colIdx]));
          }
          const filterArray = (value, localIndices) => {
            if (!Array.isArray(value)) {
              const localScope = { ...scope, $value: value };
              localIndices.forEach((indexValue, idx) => {
                localScope[`$${idx}`] = indexValue;
              });
              return coerceBooleanToNumber(evaluateAstNode(node.args[0], localScope, hooks)) ? value : undefined;
            }
            const out = value
              .map((item, idx) => filterArray(item, [...localIndices, idx]))
              .filter((item) => item !== undefined);
            return out;
          };
          return filterArray(target, []);
        }
        if (node.name === "reduce") {
          if (node.args.length < 2 || node.args.length > 4) {
            throw new Error("reduce expects 2 to 4 arguments");
          }
          const reducer = node.args[0];
          if (!reducer || reducer.type !== "callable-ref") {
            throw new Error("reduce expects an operator or function as first argument");
          }
          const target = evaluateAstNode(node.args[1], scope, hooks);
          const isMatrix = Array.isArray(target) && target.length > 0 && target.every((row) => Array.isArray(row));
          if (!Array.isArray(target)) {
            throw new Error("reduce expects a vector or matrix");
          }
          if (!isMatrix) {
            const hasInit = node.args.length >= 3;
            const initValue = hasInit ? evaluateAstNode(node.args[2], scope, hooks) : null;
            return reduceArrayElements(target, reducer, scope, hasInit, initValue);
          }
          if (node.args.length < 3) {
            throw new Error("reduce on matrices requires an axis argument");
          }
          const axis = Number(evaluateAstNode(node.args[2], scope, hooks));
          if (!Number.isInteger(axis)) {
            throw new Error("reduce matrix axis must be 0 or 1");
          }
          const hasInit = node.args.length >= 4;
          const initValue = hasInit ? evaluateAstNode(node.args[3], scope, hooks) : null;
          return reduceMatrixAlongAxis(target, axis, reducer, scope, hasInit, initValue);
        }
        if (node.name === "append") {
          if (node.args.length !== 2) {
            throw new Error("append expects exactly 2 arguments");
          }
          const target = evaluateAstNode(node.args[0], scope, hooks);
          const value = evaluateAstNode(node.args[1], scope, hooks);
          return appendArrayValues(target, value);
        }
        if (node.name === "count") {
          if (node.args.length < 1 || node.args.length > 3) {
            throw new Error("count expects 1 to 3 arguments");
          }
          if (node.args.length === 1) {
            return countTruthyValues(evaluateAstNode(node.args[0], scope, hooks));
          }
          if (node.args.length === 2) {
            const maybeTarget = evaluateAstNode(node.args[1], scope, hooks);
            if (Array.isArray(maybeTarget)) {
              const mask = buildPredicateMask(maybeTarget, node.args[0], scope, hooks);
              return countTruthyValues(mask);
            }
            const target = evaluateAstNode(node.args[0], scope, hooks);
            return countTruthyValues(target, Number(maybeTarget));
          }
          const target = evaluateAstNode(node.args[1], scope, hooks);
          if (!Array.isArray(target)) {
            throw new Error("count conditional form expects a vector or matrix");
          }
          const axis = Number(evaluateAstNode(node.args[2], scope, hooks));
          const mask = buildPredicateMask(target, node.args[0], scope, hooks);
          return countTruthyValues(mask, axis);
        }
        if (node.name === "indicesWhere") {
          if (node.args.length < 1 || node.args.length > 2) {
            throw new Error("indicesWhere expects 1 or 2 arguments");
          }
          if (node.args.length === 1) {
            return indicesWhereValues(evaluateAstNode(node.args[0], scope, hooks));
          }
          const target = evaluateAstNode(node.args[1], scope, hooks);
          if (!Array.isArray(target)) {
            throw new Error("indicesWhere conditional form expects a vector or matrix");
          }
          const mask = buildPredicateMask(target, node.args[0], scope, hooks);
          return indicesWhereValues(mask);
        }
        if (node.name === "agentIndicesWhere") {
          if (node.args.length !== 2) {
            throw new Error("agentIndicesWhere expects exactly 2 arguments");
          }
          const agentsValue = evaluateAstNode(node.args[1], scope, hooks);
          if (!Array.isArray(agentsValue) || !agentsValue.every((row) => Array.isArray(row))) {
            throw new Error("agentIndicesWhere expects a matrix of agents");
          }
          const rowCount = agentsValue.length;
          const colCount = rowCount > 0 ? agentsValue[0].length : (getAgentFieldNames(agentsValue)?.length || 0);
          if (!agentsValue.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
            throw new Error("agentIndicesWhere expects a rectangular agent matrix");
          }
          return agentsValue.flatMap((row, rowIndex) => (
            coerceBooleanToNumber(evaluateAstNode(node.args[0], buildAgentLocalScope(scope, agentsValue, row.slice(), rowIndex), hooks))
              ? [rowIndex]
              : []
          ));
        }
        if (node.name === "filterAgents") {
          if (node.args.length !== 2) {
            throw new Error("filterAgents expects exactly 2 arguments");
          }
          const agentsValue = evaluateAstNode(node.args[1], scope, hooks);
          if (!Array.isArray(agentsValue) || !agentsValue.every((row) => Array.isArray(row))) {
            throw new Error("filterAgents expects a matrix of agents");
          }
          const rowCount = agentsValue.length;
          const colCount = rowCount > 0 ? agentsValue[0].length : (getAgentFieldNames(agentsValue)?.length || 0);
          if (!agentsValue.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
            throw new Error("filterAgents expects a rectangular agent matrix");
          }
          const out = agentsValue.filter((row, rowIndex) => (
            coerceBooleanToNumber(evaluateAstNode(node.args[0], buildAgentLocalScope(scope, agentsValue, row.slice(), rowIndex), hooks))
          )).map((row) => row.slice());
          const fieldNames = getAgentFieldNames(agentsValue);
          if (fieldNames) {
            attachAgentSchema(out, fieldNames);
          }
          return out;
        }
        if (node.name === "mapAgents") {
          if (node.args.length !== 2) {
            throw new Error("mapAgents expects exactly 2 arguments");
          }
          const agentsValue = evaluateAstNode(node.args[1], scope, hooks);
          if (!Array.isArray(agentsValue) || !agentsValue.every((row) => Array.isArray(row))) {
            throw new Error("mapAgents expects a matrix of agents");
          }
          const rowCount = agentsValue.length;
          const colCount = rowCount > 0 ? agentsValue[0].length : (getAgentFieldNames(agentsValue)?.length || 0);
          if (!agentsValue.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
            throw new Error("mapAgents expects a rectangular agent matrix");
          }
          const out = agentsValue.map((row, rowIndex) => {
            const mappedRow = evaluateAstNode(node.args[0], buildAgentLocalScope(scope, agentsValue, row.slice(), rowIndex), hooks);
            if (!Array.isArray(mappedRow) || mappedRow.length !== colCount || mappedRow.some((item) => Array.isArray(item))) {
              throw new Error("mapAgents expects each transformed agent to be a row vector with matching length");
            }
            return mappedRow.slice();
          });
          const fieldNames = getAgentFieldNames(agentsValue);
          if (fieldNames) {
            attachAgentSchema(out, fieldNames);
          }
          return out;
        }
        const localFunctions = hooks?.localFunctions instanceof Map
          ? hooks.localFunctions
          : normalizeLocalFunctionDefinitions(hooks?.localFunctions || []);
        const localFunction = localFunctions.get(node.name) || null;
        if (localFunction) {
          const stack = Array.isArray(hooks?.localFunctionStack) ? hooks.localFunctionStack : [];
          if (stack.includes(node.name)) {
            throw new Error(`local function recursion is not allowed: ${node.name}`);
          }
          if (node.args.length !== localFunction.params.length) {
            throw new Error(`${node.name} expects exactly ${localFunction.params.length} arguments`);
          }
          const args = node.args.map((arg) => evaluateAstNode(arg, scope, hooks));
          const fnScope = { ...scope };
          localFunction.params.forEach((paramName, index) => {
            fnScope[paramName] = args[index];
          });
          const compiled = getCompiledExpression(String(localFunction.expression ?? ""));
          if (compiled.syntaxErrorMessage) {
            throw new SyntaxError(compiled.syntaxErrorMessage);
          }
          return evaluateAstNode(compiled.ast, fnScope, {
            ...(hooks || {}),
            localFunctions,
            localFunctionStack: [...stack, node.name],
          });
        }
        if (!Object.prototype.hasOwnProperty.call(scope, node.name)) {
          throw new ReferenceError(`${node.name} is not defined`);
        }
        const fn = scope[node.name];
        if (typeof fn !== "function") {
          throw new Error(`${node.name} is not callable`);
        }
        const args = node.args.map((arg) => evaluateAstNode(arg, scope, hooks));
        return fn(...args);
      }
      case "unary": {
        const value = evaluateAstNode(node.argument, scope, hooks);
        if (node.op === "+") {
          return vectorizedUnaryOperation(value, (item) => +item);
        }
        if (node.op === "-") {
          return vectorizedUnaryOperation(value, (item) => -item);
        }
        if (node.op === "!") {
          return vectorizedUnaryOperation(value, (item) => !item);
        }
        throw new Error(`Unsupported operator ${node.op}`);
      }
      case "binary": {
        const left = evaluateAstNode(node.left, scope, hooks);
        const right = evaluateAstNode(node.right, scope, hooks);
        switch (node.op) {
          case "+":
            return vectorizedBinaryOperation(left, right, (a, b) => a + b);
          case "-":
            return vectorizedBinaryOperation(left, right, (a, b) => a - b);
          case "*":
            return vectorizedBinaryOperation(left, right, (a, b) => a * b);
          case "/":
            return vectorizedBinaryOperation(left, right, (a, b) => a / b);
          case "%":
            return vectorizedBinaryOperation(left, right, (a, b) => euclideanModulo(a, b));
          case "**":
            return vectorizedBinaryOperation(left, right, (a, b) => a ** b);
          case "<":
            return vectorizedBinaryOperation(left, right, (a, b) => a < b);
          case ">":
            return vectorizedBinaryOperation(left, right, (a, b) => a > b);
          case "<=":
            return vectorizedBinaryOperation(left, right, (a, b) => a <= b);
          case ">=":
            return vectorizedBinaryOperation(left, right, (a, b) => a >= b);
          case "==":
            return vectorizedBinaryOperation(left, right, (a, b) => a == b);
          case "!=":
            return vectorizedBinaryOperation(left, right, (a, b) => a != b);
          case "===":
            return vectorizedBinaryOperation(left, right, (a, b) => a === b);
          case "!==":
            return vectorizedBinaryOperation(left, right, (a, b) => a !== b);
          case "&&":
            return vectorizedBinaryOperation(left, right, (a, b) => a && b);
          case "||":
            return vectorizedBinaryOperation(left, right, (a, b) => a || b);
          default:
            throw new Error(`Unsupported operator ${node.op}`);
        }
      }
      default:
        throw new Error(`Unsupported AST node ${node.type}`);
    }
  }

  function evaluateValueExpression(expression, context = {}, options = {}) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return { ok: true, kind: "empty", value: null };
    }
    const compiled = getCompiledExpression(source);
    if (!options.allowThisAlias && compiled.hasThisAlias) {
      return { ok: false, reason: "runtime", message: "'this' is only available in state transitions" };
    }
    if (!options.allowIntegral && compiled.hasIntegral) {
      return { ok: false, reason: "runtime", message: "'integral' is only available in state transitions" };
    }
    if (compiled.syntaxErrorMessage) {
      return { ok: false, reason: "syntax", message: compiled.syntaxErrorMessage };
    }

    let raw;
    try {
      raw = evaluateAstWithLocalSelf(
        compiled,
        { ...MATH_SCOPE, ...context },
        {
          ...(options?.hooks && typeof options.hooks === "object" ? options.hooks : {}),
          agentFieldAliases: normalizeAgentFieldAliasMap(options, context),
          localFunctions: normalizeLocalFunctionDefinitions(options?.localFunctions || []),
          localFunctionStack: [],
        },
      );
    } catch (err) {
      if (err && err.name === "ReferenceError") {
        return { ok: false, reason: "reference", message: String(err.message || "") };
      }
      if (err && err.name === "SyntaxError") {
        return { ok: false, reason: "syntax", message: String(err.message || "") };
      }
      return { ok: false, reason: "runtime", message: String(err?.message || "") };
    }

    const normalized = coerceBooleanToNumber(raw);
    const validated = validateComputedValue(normalized);
    if (!validated.ok) {
      return { ok: false, reason: "type" };
    }
    return { ok: true, kind: validated.kind, value: validated.value };
  }

  function analyzeStateTransitionExpression(expression) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return { ok: true, pureIntegral: false, usesIntegral: false, integralCount: 0 };
    }
    const compiled = getCompiledExpression(source);
    if (compiled.syntaxErrorMessage) {
      return {
        ok: false,
        reason: "syntax",
        message: compiled.syntaxErrorMessage,
        pureIntegral: false,
        usesIntegral: compiled.hasIntegral,
        integralCount: Array.isArray(compiled.integralArgAsts) ? compiled.integralArgAsts.length : 0,
      };
    }
    return {
      ok: true,
      pureIntegral: Boolean(getPureIntegralArgAst(compiled)),
      usesIntegral: compiled.hasIntegral,
      integralCount: Array.isArray(compiled.integralArgAsts) ? compiled.integralArgAsts.length : 0,
    };
  }

  function evaluateIntegralDerivativeExpression(expression, context = {}, options = {}) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return { ok: false, reason: "runtime", message: "empty integral expression" };
    }
    const compiled = getCompiledExpression(source);
    if (!options.allowThisAlias && compiled.hasThisAlias) {
      return { ok: false, reason: "runtime", message: "'this' is only available in state transitions" };
    }
    const derivativeAst = getPureIntegralArgAst(compiled);
    if (!derivativeAst) {
      return { ok: false, reason: "runtime", message: "integral derivative is unavailable" };
    }
    if (compiled.syntaxErrorMessage) {
      return { ok: false, reason: "syntax", message: compiled.syntaxErrorMessage };
    }

    let raw;
    try {
      raw = evaluateAstWithLocalSelf(
        { ...compiled, ast: derivativeAst },
        { ...MATH_SCOPE, integral: unavailableIntegral, ...context },
        {
          ...(options?.hooks && typeof options.hooks === "object" ? options.hooks : {}),
          agentFieldAliases: normalizeAgentFieldAliasMap(options, context),
          localFunctions: normalizeLocalFunctionDefinitions(options?.localFunctions || []),
          localFunctionStack: [],
        },
      );
    } catch (err) {
      if (err && err.name === "ReferenceError") {
        return { ok: false, reason: "reference", message: String(err.message || "") };
      }
      if (err && err.name === "SyntaxError") {
        return { ok: false, reason: "syntax", message: String(err.message || "") };
      }
      return { ok: false, reason: "runtime", message: String(err?.message || "") };
    }

    const normalized = coerceBooleanToNumber(raw);
    const validated = validateComputedValue(normalized);
    if (!validated.ok) {
      return { ok: false, reason: "type" };
    }
    return { ok: true, kind: validated.kind, value: validated.value };
  }

  function evaluateIntegralDerivativeList(expression, context = {}, options = {}) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return { ok: true, kind: "array", value: [] };
    }
    const compiled = getCompiledExpression(source);
    if (!options.allowThisAlias && compiled.hasThisAlias) {
      return { ok: false, reason: "runtime", message: "'this' is only available in state transitions" };
    }
    if (compiled.syntaxErrorMessage) {
      return { ok: false, reason: "syntax", message: compiled.syntaxErrorMessage };
    }

    const values = [];
    try {
      for (const derivativeAst of compiled.integralArgAsts || []) {
        const raw = evaluateAstWithLocalSelf(
          { ...compiled, ast: derivativeAst },
          { ...MATH_SCOPE, integral: unavailableIntegral, ...context },
          {
            ...(options?.hooks && typeof options.hooks === "object" ? options.hooks : {}),
            agentFieldAliases: normalizeAgentFieldAliasMap(options, context),
            localFunctions: normalizeLocalFunctionDefinitions(options?.localFunctions || []),
            localFunctionStack: [],
          },
        );
        const normalized = coerceBooleanToNumber(raw);
        const validated = validateComputedValue(normalized);
        if (!validated.ok) {
          return { ok: false, reason: "type" };
        }
        values.push(validated.value);
      }
    } catch (err) {
      if (err && err.name === "ReferenceError") {
        return { ok: false, reason: "reference", message: String(err.message || "") };
      }
      if (err && err.name === "SyntaxError") {
        return { ok: false, reason: "syntax", message: String(err.message || "") };
      }
      return { ok: false, reason: "runtime", message: String(err?.message || "") };
    }
    return { ok: true, kind: "array", value: values };
  }

  function evaluateStateTransitionExpressionWithIntegralValues(expression, context = {}, integralValues = [], options = {}) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return { ok: true, kind: "empty", value: null };
    }
    const compiled = getCompiledExpression(source);
    if (!options.allowThisAlias && compiled.hasThisAlias) {
      return { ok: false, reason: "runtime", message: "'this' is only available in state transitions" };
    }
    if (compiled.syntaxErrorMessage) {
      return { ok: false, reason: "syntax", message: compiled.syntaxErrorMessage };
    }

    let integralIndex = 0;
    let raw;
    try {
      const baseHooks = options?.hooks && typeof options.hooks === "object" ? options.hooks : null;
      raw = evaluateAstWithLocalSelf(
        compiled,
        { ...MATH_SCOPE, integral: unavailableIntegral, ...context },
        {
          ...(baseHooks || {}),
          agentFieldAliases: normalizeAgentFieldAliasMap(options, context),
          localFunctions: normalizeLocalFunctionDefinitions(options?.localFunctions || []),
          localFunctionStack: [],
          onIntegralCall(callNode) {
            if (callNode.args.length !== 1) {
              throw new Error("integral expects exactly 1 argument");
            }
            if (integralIndex >= integralValues.length) {
              throw new Error("integral value is unavailable");
            }
            const out = integralValues[integralIndex];
            integralIndex += 1;
            return out;
          },
        },
      );
    } catch (err) {
      if (err && err.name === "ReferenceError") {
        return { ok: false, reason: "reference", message: String(err.message || "") };
      }
      if (err && err.name === "SyntaxError") {
        return { ok: false, reason: "syntax", message: String(err.message || "") };
      }
      return { ok: false, reason: "runtime", message: String(err?.message || "") };
    }

    const normalized = coerceBooleanToNumber(raw);
    const validated = validateComputedValue(normalized);
    if (!validated.ok) {
      return { ok: false, reason: "type" };
    }
    return { ok: true, kind: validated.kind, value: validated.value };
  }

  function validateExpressionSyntax(expression, extraNames = [], options = {}) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return { ok: true };
    }
    const compiled = getCompiledExpression(source);
    if (!options.allowThisAlias && compiled.hasThisAlias) {
      return { ok: false, reason: "runtime", message: "'this' is only available in state transitions" };
    }
    if (!options.allowIntegral && compiled.hasIntegral) {
      return { ok: false, reason: "runtime", message: "'integral' is only available in state transitions" };
    }
    const scopeNames = [
      ...Object.keys(MATH_SCOPE),
      ...Array.from(normalizeLocalFunctionDefinitions(options?.localFunctions || []).keys()),
      ...extraNames.map((name) => String(name ?? "").trim()).filter(Boolean),
      "__self",
      "self",
      "$i",
      "$j",
      "$value",
      "time",
      "t0",
      "t1",
      "dt",
      ...Object.keys(options?.agentFieldAliases || {}),
    ];
    const knownNames = new Set(scopeNames);
    if (compiled.syntaxErrorMessage) {
      return { ok: false, reason: "syntax", message: compiled.syntaxErrorMessage };
    }
    try {
      validateAstReferences(compiled.ast, knownNames);
    } catch (err) {
      if (err && err.name === "ReferenceError") {
        return { ok: false, reason: "reference", message: String(err.message || "") };
      }
      return { ok: false, reason: "runtime", message: String(err?.message || "") };
    }
    return { ok: true };
  }

  function formatComputedValue(value) {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (typeof value === "string") {
      return value;
    }
    return JSON.stringify(value);
  }

  function isIdentifierStart(ch) {
    return /[A-Za-z_$]/.test(ch);
  }

  function isIdentifierPart(ch) {
    return /[A-Za-z0-9_$]/.test(ch);
  }

  function replaceIdentifierInExpression(expression, oldName, newName) {
    const src = String(expression ?? "");
    const from = String(oldName ?? "");
    const to = String(newName ?? "");
    if (!from || from === to) {
      return src;
    }

    let out = "";
    let i = 0;
    let mode = "code";
    while (i < src.length) {
      const ch = src[i];

      if (mode === "code") {
        if (ch === "'" || ch === '"' || ch === "`") {
          mode = ch;
          out += ch;
          i += 1;
          continue;
        }
        if (isIdentifierStart(ch)) {
          let j = i + 1;
          while (j < src.length && isIdentifierPart(src[j])) {
            j += 1;
          }
          const token = src.slice(i, j);
          const prev = i > 0 ? src[i - 1] : "";
          out += token === from && prev !== "." ? to : token;
          i = j;
          continue;
        }
        out += ch;
        i += 1;
        continue;
      }

      out += ch;
      if (ch === "\\") {
        if (i + 1 < src.length) {
          out += src[i + 1];
          i += 2;
          continue;
        }
      }
      if (ch === mode) {
        mode = "code";
      }
      i += 1;
    }
    return out;
  }

  function evaluateGraphExpressions(nodes, edges, globals = {}, options = {}) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const incoming = new Map();
    nodes.forEach((node) => incoming.set(node.id, []));
    edges.forEach((edge) => {
      if (incoming.has(edge.to) && nodeById.has(edge.from)) {
        incoming.get(edge.to).push(edge.from);
      }
    });

    const pending = new Set(nodes.map((node) => node.id));
    const results = new Map();
    const globalParameterNodes = nodes.filter((node) => isGlobalParameterNode(node));
    const globalReferences = new Map(
      nodes.map((node) => [
        node.id,
        globalParameterNodes.filter((globalNode) =>
          globalNode.id !== node.id && collectIdentifierReferences(node.valueExpression).has(globalNode.name)),
      ]),
    );
    let progressed = true;

    while (pending.size > 0 && progressed) {
      progressed = false;
      for (const nodeId of Array.from(pending)) {
        const node = nodeById.get(nodeId);
        if (!node) {
          pending.delete(nodeId);
          continue;
        }

        const predecessorIds = incoming.get(nodeId) || [];
        const context = { ...globals, ...ensureNodePropertyAccess(node) };
        let dependenciesReady = true;
        (globalReferences.get(node.id) || []).forEach((globalNode) => {
          if (!dependenciesReady || globalNode.id === node.id) {
            return;
          }
          const depResult = results.get(globalNode.id);
          if (!depResult || !depResult.ok) {
            dependenciesReady = false;
            return;
          }
          context[globalNode.name] = depResult.value;
        });
        if (!dependenciesReady) {
          continue;
        }
        predecessorIds.forEach((fromId) => {
          const fromNode = nodeById.get(fromId);
          if (!fromNode) {
            return;
          }
          const depResult = results.get(fromId);
          if (!depResult || !depResult.ok) {
            dependenciesReady = false;
            return;
          }
          context[fromNode.name] = depResult.value;
        });

        if (!dependenciesReady) {
          continue;
        }

        const result = evaluateValueExpression(node.valueExpression, context, {
          localFunctions: options?.localFunctions || [],
        });
        results.set(nodeId, result);
        pending.delete(nodeId);
        progressed = true;
      }
    }

    pending.forEach((nodeId) => {
      results.set(nodeId, { ok: false, reason: "dependency" });
    });

    return nodes.map((node) => ({
      id: node.id,
      result: results.get(node.id) || { ok: false, reason: "dependency" },
    }));
  }

  function isStateNode(node) {
    return String(node?.shape || "") === "rect";
  }

  function isParameterNode(node) {
    return String(node?.shape || "") === "diamond";
  }

  function isGlobalParameterNode(node) {
    return isParameterNode(node) && Boolean(node?.global);
  }

  function hasExternalValue(node) {
    return Boolean(node?.externalValueEnabled);
  }

  function prepareStatefulExecutionPlan(nodes, edges) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const incoming = new Map();
    nodes.forEach((node) => incoming.set(node.id, []));
    edges.forEach((edge) => {
      if (incoming.has(edge.to) && nodeById.has(edge.from)) {
        incoming.get(edge.to).push(edge.from);
      }
    });
    return {
      nodeById,
      incoming,
      stateNodes: nodes.filter((node) => isStateNode(node)),
      globalParameterNodes: nodes.filter((node) => isGlobalParameterNode(node)),
    };
  }

  function evaluateStatefulGraphStep(nodes, edges, globals = {}, plan = null, options = {}) {
    const runtimePlan = plan || prepareStatefulExecutionPlan(nodes, edges);
    const nodeById = runtimePlan.nodeById;
    const incoming = runtimePlan.incoming;
    const stateValueOverrides = options?.stateValueOverrides instanceof Map ? options.stateValueOverrides : null;
    const derivativeStateNodeIds = options?.derivativeStateNodeIds instanceof Set ? options.derivativeStateNodeIds : null;
    const customNodeEvaluator = typeof options?.customNodeEvaluator === "function"
      ? options.customNodeEvaluator
      : null;
    const globalParameterNodes = Array.isArray(runtimePlan.globalParameterNodes)
      ? runtimePlan.globalParameterNodes
      : [];
    const globalValueRefs = new Map(
      nodes.map((node) => [
        node.id,
        globalParameterNodes.filter((globalNode) =>
          globalNode.id !== node.id && collectIdentifierReferences(node.valueExpression).has(globalNode.name)),
      ]),
    );
    const resolvedStateValue = (node) => {
      if (stateValueOverrides && stateValueOverrides.has(node.id)) {
        return stateValueOverrides.get(node.id);
      }
      return node.computedValue;
    };
    const fixedNodes = nodes.filter((node) => !isStateNode(node) && hasExternalValue(node));
    const parameterNodes = nodes.filter((node) => isParameterNode(node) && !hasExternalValue(node));
    const algebraicNodes = nodes.filter((node) => !isStateNode(node) && !isParameterNode(node) && !hasExternalValue(node));
    const fixedResults = new Map();
    const stateNodes = runtimePlan.stateNodes;
    const parameterResults = new Map();
    const algebraicResults = new Map();

    fixedNodes.forEach((node) => {
      fixedResults.set(node.id, { ok: true, value: node.externalValue });
    });

    const getGlobalParameterResult = (globalNode) => {
      if (!globalNode) {
        return null;
      }
      if (hasExternalValue(globalNode)) {
        return fixedResults.get(globalNode.id) || null;
      }
      return parameterResults.get(globalNode.id) || null;
    };

    const pendingParameters = new Set(parameterNodes.map((node) => node.id));
    let parameterProgressed = true;
    while (pendingParameters.size > 0 && parameterProgressed) {
      parameterProgressed = false;
      for (const nodeId of Array.from(pendingParameters)) {
        const node = nodeById.get(nodeId);
        if (!node) {
          pendingParameters.delete(nodeId);
          continue;
        }
        if (node.computedError) {
          parameterResults.set(node.id, { ok: false, reason: node.computedError });
          pendingParameters.delete(nodeId);
          parameterProgressed = true;
          continue;
        }
        if (node.computedValue !== null && node.computedValue !== undefined) {
          parameterResults.set(node.id, { ok: true, value: node.computedValue });
          pendingParameters.delete(nodeId);
          parameterProgressed = true;
          continue;
        }
        const context = { ...globals };
        let dependenciesReady = true;
        (globalValueRefs.get(node.id) || []).forEach((globalNode) => {
          if (!dependenciesReady || globalNode.id === node.id) {
            return;
          }
          const depResult = getGlobalParameterResult(globalNode);
          if (!depResult || !depResult.ok) {
            dependenciesReady = false;
            return;
          }
          context[globalNode.name] = depResult.value;
        });
        if (!dependenciesReady) {
          continue;
        }
        parameterResults.set(node.id, evaluateValueExpression(node.valueExpression, context, {
          localFunctions: options?.localFunctions || [],
        }));
        pendingParameters.delete(nodeId);
        parameterProgressed = true;
      }
    }
    pendingParameters.forEach((nodeId) => {
      parameterResults.set(nodeId, { ok: false, reason: "dependency" });
    });

    const addGlobalParameterResultsToContext = (context, targetNodeId, referencedGlobals = globalParameterNodes) => {
      let ready = true;
      referencedGlobals.forEach((globalNode) => {
        if (!ready || globalNode.id === targetNodeId) {
          return;
        }
        const depResult = getGlobalParameterResult(globalNode);
        if (!depResult || !depResult.ok) {
          ready = false;
          return;
        }
        context[globalNode.name] = depResult.value;
      });
      return ready;
    };

    const pending = new Set(algebraicNodes.map((node) => node.id));
    let progressed = true;
    while (pending.size > 0 && progressed) {
      progressed = false;
      for (const nodeId of Array.from(pending)) {
        const node = nodeById.get(nodeId);
        if (!node) {
          pending.delete(nodeId);
          continue;
        }
        const context = { ...globals, ...ensureNodePropertyAccess(node) };
        const predecessors = incoming.get(nodeId) || [];
        let dependenciesReady = addGlobalParameterResultsToContext(context, node.id, globalParameterNodes);
        if (!dependenciesReady) {
          continue;
        }

        predecessors.forEach((fromId) => {
          if (!dependenciesReady) {
            return;
          }
          const fromNode = nodeById.get(fromId);
          if (!fromNode) {
            return;
          }
          if (isStateNode(fromNode)) {
            context[fromNode.name] = resolvedStateValue(fromNode);
            return;
          }
          if (hasExternalValue(fromNode)) {
            const depResult = fixedResults.get(fromId);
            if (!depResult || !depResult.ok) {
              dependenciesReady = false;
              return;
            }
            context[fromNode.name] = depResult.value;
            return;
          }
          if (isParameterNode(fromNode)) {
            const depResult = parameterResults.get(fromId);
            if (!depResult || !depResult.ok) {
              dependenciesReady = false;
              return;
            }
            context[fromNode.name] = depResult.value;
            return;
          }
          const depResult = algebraicResults.get(fromId);
          if (!depResult || !depResult.ok) {
            dependenciesReady = false;
            return;
          }
          context[fromNode.name] = depResult.value;
        });

        if (!dependenciesReady) {
          continue;
        }

        const customResult = customNodeEvaluator
          ? customNodeEvaluator(node, context, { globals, runtimePlan, predecessors })
          : null;
        const result = customResult || evaluateValueExpression(node.valueExpression, context, {
          localFunctions: options?.localFunctions || [],
        });
        algebraicResults.set(nodeId, result);
        pending.delete(nodeId);
        progressed = true;
      }
    }

    pending.forEach((nodeId) => {
      algebraicResults.set(nodeId, { ok: false, reason: "dependency" });
    });

    const stateTransitionResults = new Map();
    stateNodes.forEach((node) => {
      const context = {
        ...globals,
        __self: resolvedStateValue(node),
        ...ensureNodePropertyAccess(node),
        integral: createStateIntegral(node, globals),
      };
      const predecessors = incoming.get(node.id) || [];
      let dependenciesReady = addGlobalParameterResultsToContext(context, node.id, globalParameterNodes);
      if (!dependenciesReady) {
        stateTransitionResults.set(node.id, { ok: false, reason: "dependency" });
        return;
      }

      predecessors.forEach((fromId) => {
        if (!dependenciesReady) {
          return;
        }
        const fromNode = nodeById.get(fromId);
        if (!fromNode) {
          return;
        }
        if (isStateNode(fromNode)) {
          context[fromNode.name] = resolvedStateValue(fromNode);
          return;
        }
        if (hasExternalValue(fromNode)) {
          const depResult = fixedResults.get(fromId);
          if (!depResult || !depResult.ok) {
            dependenciesReady = false;
            return;
          }
          context[fromNode.name] = depResult.value;
          return;
        }
        if (isParameterNode(fromNode)) {
          const depResult = parameterResults.get(fromId);
          if (!depResult || !depResult.ok) {
            dependenciesReady = false;
            return;
          }
          context[fromNode.name] = depResult.value;
          return;
        }
        const depResult = algebraicResults.get(fromId);
        if (!depResult || !depResult.ok) {
          dependenciesReady = false;
          return;
        }
        context[fromNode.name] = depResult.value;
      });

      if (!dependenciesReady) {
        stateTransitionResults.set(node.id, { ok: false, reason: "dependency" });
        return;
      }
      if (derivativeStateNodeIds && derivativeStateNodeIds.has(node.id)) {
        stateTransitionResults.set(node.id, evaluateIntegralDerivativeList(node.valueExpression, context, {
          allowThisAlias: true,
          localFunctions: options?.localFunctions || [],
        }));
        return;
      }
      stateTransitionResults.set(node.id, evaluateValueExpression(node.valueExpression, context, {
        allowThisAlias: true,
        allowIntegral: true,
        localFunctions: options?.localFunctions || [],
      }));
    });

    return {
      algebraic: [
        ...fixedNodes.map((node) => ({
          id: node.id,
          result: fixedResults.get(node.id) || { ok: false, reason: "dependency" },
        })),
        ...parameterNodes.map((node) => ({
          id: node.id,
          result: parameterResults.get(node.id) || { ok: false, reason: "dependency" },
        })),
        ...algebraicNodes.map((node) => ({
          id: node.id,
          result: algebraicResults.get(node.id) || { ok: false, reason: "dependency" },
        })),
      ],
      stateTransitions: stateNodes.map((node) => ({
        id: node.id,
        result: stateTransitionResults.get(node.id) || { ok: false, reason: "dependency" },
      })),
    };
  }

  global.GraphSemantics = {
    normalizeName,
    isValidVariableName,
    isReservedWord,
    isFunctionName,
    isUniqueNodeName,
    validateNodeName,
    makeUniqueName,
    sanitizeNodeNames,
    validateComputedValue,
    evaluateValueExpression,
    validateExpressionSyntax,
    formatComputedValue,
    replaceIdentifierInExpression,
    analyzeStateTransitionExpression,
    evaluateIntegralDerivativeExpression,
    evaluateIntegralDerivativeList,
    evaluateStateTransitionExpressionWithIntegralValues,
    evaluateGraphExpressions,
    prepareStatefulExecutionPlan,
    evaluateStatefulGraphStep,
    normalizeLocalFunctionDefinitions,
    extractAgentFieldNamesFromExpression,
  };
})(window);
