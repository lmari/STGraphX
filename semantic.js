(function attachGraphSemantics(global) {
  const VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const RESERVED_WORDS = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete",
    "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in",
    "instanceof", "let", "new", "return", "super", "switch", "this", "throw", "try", "typeof",
    "var", "void", "while", "with", "yield", "enum", "await", "implements", "interface",
    "package", "private", "protected", "public", "static", "null", "true", "false", "time",
    "t0", "t1", "dt",
  ]);
  const probability = global.GraphProbability || {};

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

  function unavailableDistribution(name) {
    return () => {
      throw new Error(`${name} is unavailable`);
    };
  }

  function sameArrayShape(left, right) {
    if (Array.isArray(left) !== Array.isArray(right)) {
      return false;
    }
    if (!Array.isArray(left)) {
      return true;
    }
    if (left.length !== right.length) {
      return false;
    }
    return left.every((item, idx) => sameArrayShape(item, right[idx]));
  }

  function mapFunctionArgs(args, scalarFn) {
    const ref = args.find((arg) => Array.isArray(arg));
    if (!ref) {
      return scalarFn(...args);
    }
    if (!args.every((arg) => !Array.isArray(arg) || sameArrayShape(ref, arg))) {
      throw new Error("function arguments must have matching shapes");
    }
    return ref.map((_, idx) => mapFunctionArgs(
      args.map((arg) => (Array.isArray(arg) ? arg[idx] : arg)),
      scalarFn,
    ));
  }

  function vectorizeFunction(fn) {
    return (...args) => mapFunctionArgs(args, (...scalarArgs) => fn(...scalarArgs));
  }

  const MATH_SCOPE = Object.freeze({
    __if: vectorizeFunction((condition, whenTrue, whenFalse) => (condition ? whenTrue : whenFalse)),
    sin: vectorizeFunction(Math.sin),
    cos: vectorizeFunction(Math.cos),
    tan: vectorizeFunction(Math.tan),
    asin: vectorizeFunction(Math.asin),
    acos: vectorizeFunction(Math.acos),
    atan: vectorizeFunction(Math.atan),
    atan2: vectorizeFunction(Math.atan2),
    sinh: vectorizeFunction(Math.sinh),
    cosh: vectorizeFunction(Math.cosh),
    tanh: vectorizeFunction(Math.tanh),
    exp: vectorizeFunction(Math.exp),
    log: vectorizeFunction(Math.log),
    log10: vectorizeFunction(Math.log10),
    log2: vectorizeFunction(Math.log2),
    sqrt: vectorizeFunction(Math.sqrt),
    pow: vectorizeFunction(Math.pow),
    abs: vectorizeFunction(Math.abs),
    min: vectorizeFunction(Math.min),
    max: vectorizeFunction(Math.max),
    round: vectorizeFunction(Math.round),
    floor: vectorizeFunction(Math.floor),
    ceil: vectorizeFunction(Math.ceil),
    trunc: vectorizeFunction(Math.trunc),
    int: vectorizeFunction(Math.trunc),
    sign: vectorizeFunction(Math.sign),
    rand: Math.random,
    random: Math.random,
    gaussian: typeof probability.gaussian === "function" ? probability.gaussian : unavailableDistribution("gaussian"),
    uniform: typeof probability.uniform === "function" ? probability.uniform : unavailableDistribution("uniform"),
    exponential: typeof probability.exponential === "function" ? probability.exponential : unavailableDistribution("exponential"),
    getProperty: unavailablePropertyGetter,
    setProperty: unavailablePropertySetter,
    getModelProperty: unavailableModelPropertyGetter,
    setModelProperty: unavailableModelPropertySetter,
    integral: unavailableIntegral,
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
      return value.map((item) => coerceBooleanToNumber(item));
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

  function buildNumericRange(startValue, endValue, stepValue = null) {
    const start = Number(startValue);
    const end = Number(endValue);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error("range bounds must be finite numbers");
    }
    let step = stepValue == null ? (end >= start ? 1 : -1) : Number(stepValue);
    if (!Number.isFinite(step) || step === 0) {
      throw new Error("range step must be a non-zero finite number");
    }
    if ((end > start && step < 0) || (end < start && step > 0)) {
      throw new Error("range step does not reach the end value");
    }
    const out = [];
    const epsilon = Math.abs(step) * 1e-9;
    const maxItems = 100000;
    if (step > 0) {
      for (let value = start; value <= end + epsilon; value += step) {
        out.push(Number(value.toFixed(12)));
        if (out.length > maxItems) {
          throw new Error("range is too large");
        }
      }
    } else {
      for (let value = start; value >= end - epsilon; value += step) {
        out.push(Number(value.toFixed(12)));
        if (out.length > maxItems) {
          throw new Error("range is too large");
        }
      }
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
      if ("+-*/%<>()[],!:".includes(ch)) {
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
        tokens.push({ type: "identifier", value: source.slice(i, j) });
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
        const first = parseLogicalOr();
        if (match(":")) {
          const second = parseLogicalOr();
          if (match(":")) {
            const third = parseLogicalOr();
            expect("]");
            return { type: "range", start: first, step: second, end: third };
          }
          expect("]");
          return { type: "range", start: first, step: null, end: second };
        }
        const elements = [first];
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
          if (!match(")")) {
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

    function parseUnary() {
      const token = peek();
      if (token && token.type === "op" && ["+", "-", "!"].includes(token.value)) {
        next();
        return { type: "unary", op: token.value, argument: parseUnary() };
      }
      return parsePrimary();
    }

    function parsePower() {
      let left = parseUnary();
      if (match("**")) {
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

  function evaluateAstNode(node, scope) {
    switch (node.type) {
      case "literal":
        return node.value;
      case "array":
        return node.elements.map((item) => evaluateAstNode(item, scope));
      case "range":
        return buildNumericRange(
          evaluateAstNode(node.start, scope),
          evaluateAstNode(node.end, scope),
          node.step == null ? null : evaluateAstNode(node.step, scope),
        );
      case "identifier":
        if (!Object.prototype.hasOwnProperty.call(scope, node.name)) {
          throw new ReferenceError(`${node.name} is not defined`);
        }
        return scope[node.name];
      case "call": {
        if (!Object.prototype.hasOwnProperty.call(scope, node.name)) {
          throw new ReferenceError(`${node.name} is not defined`);
        }
        const fn = scope[node.name];
        if (typeof fn !== "function") {
          throw new Error(`${node.name} is not callable`);
        }
        const args = node.args.map((arg) => evaluateAstNode(arg, scope));
        return fn(...args);
      }
      case "unary": {
        const value = evaluateAstNode(node.argument, scope);
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
        const left = evaluateAstNode(node.left, scope);
        const right = evaluateAstNode(node.right, scope);
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
            return vectorizedBinaryOperation(left, right, (a, b) => a % b);
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
    if (!options.allowThisAlias && containsThisAlias(source)) {
      return { ok: false, reason: "runtime", message: "'this' is only available in state transitions" };
    }
    if (!options.allowIntegral && containsIdentifierToken(source, "integral")) {
      return { ok: false, reason: "runtime", message: "'integral' is only available in state transitions" };
    }

    let raw;
    try {
      const normalizedSource = rewriteThisAlias(rewriteConditionalIfCalls(source));
      const ast = parseExpressionAst(normalizedSource);
      raw = evaluateAstNode(ast, { ...MATH_SCOPE, ...context });
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
    if (!options.allowThisAlias && containsThisAlias(source)) {
      return { ok: false, reason: "runtime", message: "'this' is only available in state transitions" };
    }
    if (!options.allowIntegral && containsIdentifierToken(source, "integral")) {
      return { ok: false, reason: "runtime", message: "'integral' is only available in state transitions" };
    }
    const scopeNames = [
      ...Object.keys(MATH_SCOPE),
      ...extraNames.map((name) => String(name ?? "").trim()).filter(Boolean),
    ];
    void scopeNames;
    try {
      const normalizedSource = rewriteThisAlias(rewriteConditionalIfCalls(source));
      parseExpressionAst(normalizedSource);
      return { ok: true };
    } catch (err) {
      if (err && err.name === "SyntaxError") {
        return { ok: false, reason: "syntax", message: String(err.message || "") };
      }
      return { ok: true };
    }
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
        const context = { ...globals, ...ensureNodePropertyAccess(node) };
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

  function hasExternalValue(node) {
    return Boolean(node?.externalValueEnabled);
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

    const fixedNodes = nodes.filter((node) => !isStateNode(node) && hasExternalValue(node));
    const parameterNodes = nodes.filter((node) => isParameterNode(node) && !hasExternalValue(node));
    const algebraicNodes = nodes.filter((node) => !isStateNode(node) && !isParameterNode(node) && !hasExternalValue(node));
    const fixedResults = new Map();
    const stateNodes = nodes.filter((node) => isStateNode(node));
    const parameterResults = new Map();
    const algebraicResults = new Map();

    fixedNodes.forEach((node) => {
      fixedResults.set(node.id, { ok: true, value: node.externalValue });
    });

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
        const context = { ...globals, ...ensureNodePropertyAccess(node) };
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
      const context = {
        ...globals,
        __self: node.computedValue,
        ...ensureNodePropertyAccess(node),
        integral: createStateIntegral(node, globals),
      };
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
      stateTransitionResults.set(node.id, evaluateValueExpression(node.valueExpression, context, {
        allowThisAlias: true,
        allowIntegral: true,
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
    evaluateGraphExpressions,
    evaluateStatefulGraphStep,
  };
})(window);
