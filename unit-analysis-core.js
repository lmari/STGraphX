/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
(function initUnitAnalysisCore(globalScope, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); return; }
  globalScope.STGraphXUnitAnalysisCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createUnitAnalysisCore() {
  const EPSILON = 1e-10;
  const SI_UNIT_DEFINITIONS = Object.freeze([
    { symbol: "Hz", expression: "1/s" },
    { symbol: "N", expression: "kg*m/s^2" },
    { symbol: "Pa", expression: "N/m^2" },
    { symbol: "J", expression: "N*m" },
    { symbol: "W", expression: "J/s" },
    { symbol: "C", expression: "A*s" },
    { symbol: "V", expression: "W/A" },
    { symbol: "ohm", expression: "V/A" },
    { symbol: "S", expression: "1/ohm" },
    { symbol: "Wb", expression: "V*s" },
    { symbol: "T", expression: "Wb/m^2" },
    { symbol: "H", expression: "Wb/A" },
    { symbol: "lm", expression: "cd" },
    { symbol: "lx", expression: "lm/m^2" },
  ]);
  const SI_DERIVED_DIMENSIONS = Object.freeze([
    ["Hz", [["s", -1]]],
    ["N", [["kg", 1], ["m", 1], ["s", -2]]],
    ["Pa", [["kg", 1], ["m", -1], ["s", -2]]],
    ["J", [["kg", 1], ["m", 2], ["s", -2]]],
    ["W", [["kg", 1], ["m", 2], ["s", -3]]],
    ["C", [["A", 1], ["s", 1]]],
    ["V", [["kg", 1], ["m", 2], ["s", -3], ["A", -1]]],
    ["ohm", [["kg", 1], ["m", 2], ["s", -3], ["A", -2]]],
    ["S", [["kg", -1], ["m", -2], ["s", 3], ["A", 2]]],
    ["Wb", [["kg", 1], ["m", 2], ["s", -2], ["A", -1]]],
    ["T", [["kg", 1], ["s", -2], ["A", -1]]],
    ["H", [["kg", 1], ["m", 2], ["s", -2], ["A", -2]]],
  ]);
  const unknown = () => ({ kind: "unknown" });
  const zero = () => ({ kind: "zero" });
  const dimensionless = () => ({ kind: "unit", factors: new Map(), labels: new Map() });
  const clean = (factors) => {
    const out = new Map();
    factors.forEach((power, name) => { if (Math.abs(power) > EPSILON) out.set(name, power); });
    return out;
  };
  const unit = (factors, labels = new Map()) => {
    const normalizedFactors = clean(factors instanceof Map ? factors : new Map(factors));
    const normalizedLabels = new Map();
    normalizedFactors.forEach((_power, name) => {
      if (labels.has(name)) normalizedLabels.set(name, labels.get(name));
    });
    return { kind: "unit", factors: normalizedFactors, labels: normalizedLabels };
  };
  const isKnown = (value) => value?.kind === "unit" || value?.kind === "zero";
  const same = (a, b) => {
    if (!isKnown(a) || !isKnown(b) || a.kind === "zero" || b.kind === "zero") return true;
    if (a.factors.size !== b.factors.size) return false;
    return [...a.factors].every(([name, power]) => Math.abs(power - (b.factors.get(name) || 0)) < EPSILON);
  };
  const combine = (a, b, sign) => {
    if (!isKnown(a) || !isKnown(b)) return unknown();
    const out = new Map(a.kind === "unit" ? a.factors : []);
    const labels = new Map(a.kind === "unit" ? (a.labels || []) : []);
    if (b.kind === "unit") {
      b.factors.forEach((power, name) => out.set(name, (out.get(name) || 0) + sign * power));
      (b.labels || new Map()).forEach((label, name) => { if (!labels.has(name)) labels.set(name, label); });
    }
    return unit(out, labels);
  };
  const display = (value) => {
    if (value?.kind === "unknown") return "";
    if (value?.kind === "zero") return "1";
    const derived = SI_DERIVED_DIMENSIONS.find(([, factors]) => {
      const expected = new Map(factors);
      return value.factors.size === expected.size
        && [...expected].every(([name, power]) => Math.abs((value.factors.get(name) || 0) - power) < EPSILON);
    });
    if (derived) return derived[0];
    const positive = [], negative = [];
    value.factors.forEach((power, name) => {
      const label = value.labels?.get(name) || name;
      (power > 0 ? positive : negative).push(`${label}${Math.abs(power) === 1 ? "" : `^${Math.abs(power)}`}`);
    });
    return `${positive.length ? positive.join("*") : "1"}${negative.length ? `/${negative.map((item) => item.replace(/\^-/, "^")).join("*")}` : ""}`;
  };
  const UNIT_SYMBOL_RE = /^(?:[A-Za-z_][A-Za-z0-9_]*|°[CF]|[€$£¥₹₽₩])$/;

  function normalizedDefinitionMap(definitions) {
    if (definitions instanceof Map) return definitions;
    const out = new Map(SI_UNIT_DEFINITIONS.map(({ symbol, expression }) => [symbol, expression]));
    (Array.isArray(definitions) ? definitions : []).forEach((entry) => {
      const symbol = String(entry?.symbol ?? entry?.name ?? "").trim();
      const expression = String(entry?.expression ?? entry?.value ?? "").trim();
      if (symbol && expression && !out.has(symbol)) out.set(symbol, expression);
    });
    return out;
  }

  function parseUnit(source, options = {}) {
    const text = String(source || "").trim();
    if (!text || text === "1") return { ok: true, value: dimensionless() };
    const tokens = text.match(/[A-Za-z_][A-Za-z0-9_]*|°[CF]|[€$£¥₹₽₩]|1|\*|\/|\^|-?\d+/g);
    if (!tokens || tokens.join("") !== text.replace(/\s+/g, "")) return { ok: false, reason: "syntax" };
    const definitions = normalizedDefinitionMap(options.definitions);
    const resolving = options.resolving instanceof Set ? options.resolving : new Set();
    const factors = new Map(); const labels = new Map(); let sign = 1;
    for (let i = 0; i < tokens.length;) {
      if (tokens[i] === "*" || tokens[i] === "/") { sign = tokens[i++] === "/" ? -1 : 1; continue; }
      const name = tokens[i++];
      if (name === "1") continue;
      if (!UNIT_SYMBOL_RE.test(name)) return { ok: false, reason: "syntax" };
      let power = 1;
      if (tokens[i] === "^") { power = Number(tokens[i + 1]); i += 2; if (!Number.isInteger(power)) return { ok: false, reason: "syntax" }; }
      if (definitions.has(name)) {
        if (resolving.has(name)) return { ok: false, reason: "cycle", symbol: name };
        const nextResolving = new Set(resolving);
        nextResolving.add(name);
        const resolved = parseUnit(definitions.get(name), { definitions, resolving: nextResolving });
        if (!resolved.ok) return resolved;
        resolved.value.factors.forEach((resolvedPower, resolvedName) => {
          factors.set(resolvedName, (factors.get(resolvedName) || 0) + sign * power * resolvedPower);
        });
        (resolved.value.labels || new Map()).forEach((label, resolvedName) => {
          if (!labels.has(resolvedName)) labels.set(resolvedName, label);
        });
        sign = 1;
        continue;
      }
      // Textual and symbolic currency aliases compare as the same unit, while
      // the first declared spelling is retained for inferred-unit display.
      const currencyAliases = {
        euro: ["EUR", "€"], eur: ["EUR", "€"], "€": ["EUR", "€"],
        dollar: ["USD", "$"], usd: ["USD", "$"], "$":["USD", "$"],
        pound: ["GBP", "£"], gbp: ["GBP", "£"], "£": ["GBP", "£"],
        yen: ["JPY", "¥"], jpy: ["JPY", "¥"], "¥": ["JPY", "¥"],
        rupee: ["INR", "₹"], inr: ["INR", "₹"], "₹": ["INR", "₹"],
        ruble: ["RUB", "₽"], rub: ["RUB", "₽"], "₽": ["RUB", "₽"],
        won: ["KRW", "₩"], krw: ["KRW", "₩"], "₩": ["KRW", "₩"],
      };
      const temperatureAliases = {
        celsius: ["CELSIUS", "°C"], "°c": ["CELSIUS", "°C"],
        fahrenheit: ["FAHRENHEIT", "°F"], "°f": ["FAHRENHEIT", "°F"],
      };
      const alias = currencyAliases[String(name).toLowerCase()] || temperatureAliases[String(name).toLowerCase()];
      const canonicalName = alias ? alias[0] : name;
      if (!labels.has(canonicalName)) labels.set(canonicalName, name);
      factors.set(canonicalName, (factors.get(canonicalName) || 0) + sign * power); sign = 1;
    }
    return { ok: true, value: unit(factors, labels) };
  }

  function prepareDefinitions(entries) {
    const definitions = new Map(SI_UNIT_DEFINITIONS.map(({ symbol, expression }) => [symbol, expression]));
    const definedSymbols = new Set();
    const errors = [];
    (Array.isArray(entries) ? entries : []).forEach((entry, index) => {
      const symbol = String(entry?.symbol ?? entry?.name ?? "").trim();
      const expression = String(entry?.expression ?? entry?.value ?? "").trim();
      if (!symbol && !expression) return;
      if (!UNIT_SYMBOL_RE.test(symbol)) {
        errors.push({ index, symbol, expression, reason: "symbol" });
        return;
      }
      if (!expression) {
        errors.push({ index, symbol, expression, reason: "expression" });
        return;
      }
      if (definedSymbols.has(symbol)) {
        errors.push({ index, symbol, expression, reason: "duplicate" });
        return;
      }
      definedSymbols.add(symbol);
      definitions.set(symbol, expression);
    });
    definitions.forEach((expression, symbol) => {
      const parsed = parseUnit(expression, { definitions, resolving: new Set([symbol]) });
      if (!parsed.ok) errors.push({ symbol, expression, reason: parsed.reason || "syntax" });
    });
    return { definitions, errors };
  }
  function inferAst(ast, context = {}) {
    const resolve = context.resolve || (() => unknown());
    const fail = (reason, details = {}) => ({ kind: "unknown", reason, ...details });
    const visit = (node) => {
      if (!node) return unknown();
      if (node.type === "literal") return typeof node.value === "number" && node.value === 0 ? zero() : dimensionless();
      if (node.type === "identifier") return resolve(node.name);
      if (node.type === "unary") return visit(node.argument);
      if (node.type === "array") { const values = node.elements.map(visit); const known = values.filter(isKnown); return known.every((item) => same(item, known[0])) ? (known[0] || unknown()) : fail("array"); }
      if (node.type === "index" || node.type === "slice" || node.type === "multi-access" || node.type === "member") return visit(node.target);
      if (node.type === "binary") {
        const left = visit(node.left), right = visit(node.right);
        if (node.op === "*" || node.op === "/") return combine(left, right, node.op === "*" ? 1 : -1);
        if (node.op === "**" && node.right?.type === "literal" && Number.isFinite(Number(node.right.value)) && left.kind === "unit") return unit(new Map([...left.factors].map(([name, power]) => [name, power * Number(node.right.value)])), left.labels);
        if (["+", "-", "%"].includes(node.op)) return same(left, right) ? (left.kind === "zero" ? right : left) : fail("add", { left, right });
        if (["<", ">", "<=", ">=", "==", "!=", "===", "!=="].includes(node.op)) return same(left, right) ? dimensionless() : fail("compare", { left, right });
        return dimensionless();
      }
      if (node.type === "call") {
        const args = node.args.map(visit); const first = args[0] || unknown();
        if (["sin", "cos", "tan", "exp", "log", "log10", "log2"].includes(node.name)) return same(first, dimensionless()) ? dimensionless() : fail("dimensionless");
        if (["size", "rows", "cols", "count", "argmin", "argmax", "indicesWhere", "rand", "randInt"].includes(node.name)) return dimensionless();
        if (["sum", "mean", "min", "max", "abs", "pos", "neg", "floor", "ceil", "round", "int", "flatten", "resize", "col", "row", "append", "appendRow", "appendCol"].includes(node.name)) return first;
        if (node.name === "integral") {
          const timeUnit = isKnown(context.timeUnit) ? context.timeUnit : parseUnit("s").value;
          return combine(first, timeUnit, 1);
        }
        if (node.name === "if") { const values = args.filter((_v, i) => i % 2 === 1).concat(args.length % 2 ? [args.at(-1)] : []).filter(isKnown); return values.every((item) => same(item, values[0])) ? (values[0] || unknown()) : fail("if"); }
        return unknown();
      }
      return unknown();
    };
    return visit(ast);
  }
  return { dimensionless, display, inferAst, isKnown, parseUnit, prepareDefinitions, siUnitDefinitions: SI_UNIT_DEFINITIONS, same, unknown };
});
