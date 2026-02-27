(function attachGraphSemantics(global) {
  const VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const RESERVED_WORDS = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in",
    "instanceof", "let", "new", "return", "super", "switch", "this", "throw", "try", "typeof",
    "var", "void", "while", "with", "yield", "enum", "await", "implements", "interface",
    "package", "private", "protected", "public", "static", "null", "true", "false", "time",
  ]);
  const MATH_SCOPE = Object.freeze({
    __if: (condition, whenTrue, whenFalse) => (condition ? whenTrue : whenFalse),
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    atan2: Math.atan2,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    exp: Math.exp,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    sqrt: Math.sqrt,
    pow: Math.pow,
    abs: Math.abs,
    min: Math.min,
    max: Math.max,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    trunc: Math.trunc,
    sign: Math.sign,
    rand: Math.random,
    random: Math.random,
    pi: Math.PI,
    e: Math.E,
  });
  const FUNCTION_NAMES = new Set(
    Object.keys(MATH_SCOPE).filter((name) => typeof MATH_SCOPE[name] === "function"),
  );

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

  function isNumericVector(value) {
    return Array.isArray(value) && value.every((item) => isFiniteNumber(item));
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

  function validateComputedValue(value) {
    if (isFiniteNumber(value)) {
      return { ok: true, kind: "number", value };
    }
    if (isNumericVector(value)) {
      return { ok: true, kind: "vector", value: value.slice() };
    }
    if (isNumericMatrix(value)) {
      return { ok: true, kind: "matrix", value: value.map((row) => row.slice()) };
    }
    return { ok: false, reason: "type" };
  }

  function coerceBooleanToNumber(value) {
    if (value === true) {
      return 1;
    }
    if (value === false) {
      return 0;
    }
    if (Array.isArray(value)) {
      return value.map((item) => coerceBooleanToNumber(item));
    }
    return value;
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

  function rewriteConditionalIfCalls(expression) {
    return String(expression ?? "").replace(/(^|[^A-Za-z0-9_$])if\s*\(/g, "$1__if(");
  }

  function evaluateValueExpression(expression, context = {}) {
    const source = String(expression ?? "").trim();
    if (!source) {
      return { ok: true, kind: "empty", value: null };
    }

    let raw;
    try {
      const evalScope = { ...MATH_SCOPE, ...context };
      const names = Object.keys(evalScope);
      const values = names.map((name) => evalScope[name]);
      const normalizedSource = rewriteThisAlias(rewriteConditionalIfCalls(source));
      raw = Function(...names, `"use strict"; return (${normalizedSource});`)(...values);
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

  function formatComputedValue(value) {
    if (value === null || value === undefined) {
      return "-";
    }
    if (typeof value === "number") {
      return String(value);
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
          out += token === from ? to : token;
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

  function evaluateGraphExpressions(nodes, edges, globals = {}) {
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
        const context = { ...globals };
        let dependenciesReady = true;
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

        const result = evaluateValueExpression(node.valueExpression, context);
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

  function evaluateStatefulGraphStep(nodes, edges, globals = {}) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const incoming = new Map();
    nodes.forEach((node) => incoming.set(node.id, []));
    edges.forEach((edge) => {
      if (incoming.has(edge.to) && nodeById.has(edge.from)) {
        incoming.get(edge.to).push(edge.from);
      }
    });

    const parameterNodes = nodes.filter((node) => isParameterNode(node));
    const algebraicNodes = nodes.filter((node) => !isStateNode(node) && !isParameterNode(node));
    const stateNodes = nodes.filter((node) => isStateNode(node));
    const parameterResults = new Map();
    const algebraicResults = new Map();

    parameterNodes.forEach((node) => {
      if (node.computedError) {
        parameterResults.set(node.id, { ok: false, reason: node.computedError });
        return;
      }
      if (node.computedValue !== null && node.computedValue !== undefined) {
        parameterResults.set(node.id, { ok: true, value: node.computedValue });
        return;
      }
      parameterResults.set(node.id, evaluateValueExpression(node.valueExpression, { ...globals }));
    });

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
        const context = { ...globals };
        const predecessors = incoming.get(nodeId) || [];
        let dependenciesReady = true;

        predecessors.forEach((fromId) => {
          if (!dependenciesReady) {
            return;
          }
          const fromNode = nodeById.get(fromId);
          if (!fromNode) {
            return;
          }
          if (isStateNode(fromNode)) {
            context[fromNode.name] = fromNode.computedValue;
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

        const result = evaluateValueExpression(node.valueExpression, context);
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
      const context = { ...globals, __self: node.computedValue };
      const predecessors = incoming.get(node.id) || [];
      let dependenciesReady = true;

      predecessors.forEach((fromId) => {
        if (!dependenciesReady) {
          return;
        }
        const fromNode = nodeById.get(fromId);
        if (!fromNode) {
          return;
        }
        if (isStateNode(fromNode)) {
          context[fromNode.name] = fromNode.computedValue;
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
      stateTransitionResults.set(node.id, evaluateValueExpression(node.valueExpression, context));
    });

    return {
      algebraic: [
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
    formatComputedValue,
    replaceIdentifierInExpression,
    evaluateGraphExpressions,
    evaluateStatefulGraphStep,
  };
})(window);
