/* SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Luca Mari
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.STGraphXMathSource = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  class SourceError extends Error {
    constructor(code, location = {}, detail = "") {
      super(detail || code);
      this.code = code;
      this.line = location.line || 1;
      this.column = location.column || 1;
      this.definition = location.name || "";
      this.detail = detail;
    }
  }
  const fail = (code, location, detail) => { throw new SourceError(code, location, detail); };

  // Newlines end declarations only outside brackets and strings. Comments are
  // replaced by spaces so all diagnostics still refer to the original source.
  function statements(source) {
    const text = String(source).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const result = [];
    let buffer = "", quote = "", escaped = false, comment = false;
    let line = 1, column = 1, start = null;
    const stack = [];
    const flush = () => {
      if (buffer.trim()) result.push({ text: buffer.trim(), ...start });
      buffer = ""; start = null;
    };
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (comment && c !== "\n") { buffer += " "; column += 1; continue; }
      if (comment) comment = false;
      if (!quote && (c === "#" || (c === "/" && text[i + 1] === "/"))) {
        comment = true; buffer += " "; column += 1; continue;
      }
      if (!start && !/\s/.test(c)) start = { line, column };
      if (quote) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if ("([{".includes(c)) stack.push(c);
      else if (")]}".includes(c)) {
        if (stack.pop() !== { ")": "(", "]": "[", "}": "{" }[c]) fail("brackets", { line, column });
      }
      if (c === "\n" && !quote && stack.length === 0) flush();
      else buffer += c;
      if (c === "\n") { line += 1; column = 1; } else column += 1;
    }
    if (quote || stack.length) fail("unclosed", start);
    flush();
    return result;
  }

  function stateParts(text, location) {
    let quote = "", escaped = false, depth = 0, start = 0;
    const parts = [];
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (quote) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === quote) quote = "";
      } else if (c === '"' || c === "'") quote = c;
      else if ("([{".includes(c)) depth += 1;
      else if (")]}".includes(c)) depth -= 1;
      else if (c === ";" && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
    }
    parts.push(text.slice(start).trim());
    if (parts.length > 2 || parts.some((part) => !part)) fail("expression", location);
    return parts;
  }

  function createCodec(semantics) {
    function parse(source) {
      const version = /^\s*# STGraphX mathematical source v(\S+)/m.exec(String(source));
      if (version && version[1] !== "1") fail("version");
      const model = { version: 1, nodes: [], edges: [], execution: { t0: 0, t1: 10, dt: 1, integrator: "euler", randomSeed: null } };
      const declarations = statements(source);
      const locations = new Map();
      const settings = new Set();
      const units = new Map();
      for (const statement of declarations) {
        const match = /^(.*?)\s*=\s*([\s\S]*)$/.exec(statement.text);
        if (!match) fail("declaration", statement);
        const left = match[1].trim();
        const expression = match[2].trim();
        if (left === "@timeUnit" || /^@unit\s/.test(left)) {
          const unitName = left.slice(5).trim();
          const settingKey = left === "@timeUnit" ? left : `@unit ${unitName}`;
          if (settings.has(settingKey)) fail("duplicate", statement, settingKey);
          settings.add(settingKey);
          let unit;
          try { unit = JSON.parse(expression); } catch { fail("unit", statement); }
          if (typeof unit !== "string" || !unit.trim()) fail("unit", statement);
          if (left === "@timeUnit") model.execution.timeUnit = unit;
          else units.set(unitName, { unit, location: statement });
          continue;
        }
        if (["t0", "t1", "dt", "@integrator", "@seed"].includes(left)) {
          if (settings.has(left)) fail("duplicate", statement, left);
          settings.add(left);
          if (left === "@integrator") {
            if (!["euler", "rk4"].includes(expression)) fail("setting", statement, left);
            model.execution.integrator = expression;
          } else if (left === "@seed") {
            const seed = Number(expression);
            if (!/^\d+$/.test(expression) || !Number.isSafeInteger(seed) || seed > 0xffffffff) fail("setting", statement, left);
            model.execution.randomSeed = seed;
          } else {
            let ast;
            try { ast = semantics.parseExpressionAst(expression); }
            catch (error) { fail("setting", statement, left); }
            const constant = (node) => node.type === "literal" && typeof node.value === "number"
              || node.type === "unary" && constant(node.argument)
              || node.type === "binary" && constant(node.left) && constant(node.right);
            if (!constant(ast)) fail("setting", statement, left);
            const check = semantics.validateExpressionSyntax(expression);
            const value = check.ok && semantics.evaluateValueExpression(expression, {});
            if (!expression || !value?.ok || !Number.isFinite(value.value)) fail("setting", statement, left);
            model.execution[left] = value.value;
          }
          continue;
        }
        const words = left.split(/\s+/);
        const name = words.pop();
        const location = { ...statement, name };
        const flags = new Set(words);
        if (words.some((word) => !["parameter", "input", "output", "global"].includes(word)) || flags.size !== words.length) fail("qualifier", location);
        const valid = semantics.validateNodeName(model.nodes, name);
        if (!valid.ok) fail(valid.reason === "duplicate" ? "duplicate" : "name", location, name);
        const parts = stateParts(expression, location);
        const type = parts.length === 2 ? "state" : flags.has("parameter") ? "parameter" : "algebraic";
        if ((flags.has("parameter") && type === "state") || (flags.has("input") && type !== "algebraic") || (flags.has("global") && type !== "parameter")) fail("qualifier", location);
        const id = model.nodes.length + 1;
        const node = { id, name, type, output: flags.has("output"), input: flags.has("input"), global: flags.has("global"),
          x: 80 + ((id - 1) % 4) * 200, y: 80 + Math.floor((id - 1) / 4) * 140, width: 120, height: 70, properties: [] };
        if (type === "state") { node.initialState = parts[0]; node.stateTransition = parts[1]; }
        else node.valueExpression = parts[0];
        model.nodes.push(node);
        locations.set(name, location);
      }
      if (!model.nodes.length) fail("empty");
      const { t0, t1, dt } = model.execution;
      if (dt === 0 || (t1 - t0) * dt < 0) fail("time");
      const byName = new Map(model.nodes.map((node) => [node.name, node]));
      for (const [name, { unit, location }] of units) {
        if (!byName.has(name)) fail("name", location, name);
        byName.get(name).unit = unit;
      }
      const initialDependencies = new Map();
      for (const node of model.nodes) {
        const location = locations.get(node.name);
        const expressions = node.type === "state" ? [node.initialState, node.stateTransition] : [node.valueExpression];
        const dependencies = new Set();
        expressions.forEach((expression, index) => {
          // These functions require resources/metadata outside the first source format.
          let ast;
          try { ast = semantics.parseExpressionAst(expression); }
          catch (error) { fail("expression", location, error.message); }
          function checkCalls(value) {
            if (!value || typeof value !== "object") return;
            if (value.type === "call" && /^(readData|getProperty|setProperty|getModelProperty|setModelProperty)$/.test(value.name)) fail("unsupported", location, value.name);
            Object.values(value).forEach((child) => {
              if (Array.isArray(child)) child.forEach(checkCalls); else if (child && typeof child === "object") checkCalls(child);
            });
          }
          checkCalls(ast);
          const allowedNames = node.type === "parameter" ? model.nodes.filter((n) => n.type === "parameter").map((n) => n.name) : [...byName.keys()];
          const check = semantics.validateExpressionSyntax(expression, allowedNames, { allowThisAlias: node.type === "state" && index === 1, allowIntegral: node.type === "state" && index === 1 });
          if (!check.ok) fail("expression", location, check.message);
          const refs = [...semantics.collectIdentifierReferences(expression)].filter((name) => byName.has(name));
          if (index === 0) initialDependencies.set(node.name, refs);
          refs.forEach((name) => dependencies.add(name));
        });
        if (node.input && dependencies.size) fail("inputDependency", location);
        dependencies.forEach((name) => {
          const from = byName.get(name).id;
          if (from !== node.id) model.edges.push({ id: model.edges.length + 1, from, to: node.id });
        });
      }
      const pending = new Set(byName.keys());
      while (pending.size) {
        let progress = false;
        for (const name of pending) {
          if (initialDependencies.get(name).every((dependency) => !pending.has(dependency))) { pending.delete(name); progress = true; }
        }
        if (!progress) fail("cycle", locations.get(pending.values().next().value));
      }
      return model;
    }

    function serialize(model) {
      if ((model.unitDefinitions || []).length) fail("unsupported", {}, "unitDefinitions");
      if ((model.localFunctions || []).length) fail("unsupported", {}, "localFunctions");
      if ((model.modelProperties || []).length) fail("unsupported", {}, "modelProperties");
      const execution = model.execution || {};
      const lines = ["# STGraphX mathematical source v1", `t0 = ${execution.t0 ?? 0}`, `t1 = ${execution.t1 ?? 10}`, `dt = ${execution.dt ?? 1}`];
      if (execution.integrator && execution.integrator !== "euler") lines.push(`@integrator = ${execution.integrator}`);
      if (execution.randomSeed != null) lines.push(`@seed = ${execution.randomSeed}`);
      if (execution.timeUnit && execution.timeUnit !== "s") lines.push(`@timeUnit = ${JSON.stringify(execution.timeUnit)}`);
      lines.push("");
      for (const node of model.nodes || []) {
        if (!["parameter", "algebraic", "state"].includes(node.type)) fail("unsupported", { name: node.name }, node.type);
        const flags = [node.global && "global", node.input && "input", node.output && "output", node.type === "parameter" && "parameter"].filter(Boolean);
        // Parenthesize multiline expressions so declaration boundaries remain unambiguous.
        const format = (value) => {
          const text = String(value ?? "").trim();
          return /[\r\n]/.test(text) ? `(\n${text}\n)` : text;
        };
        const expression = node.type === "state" ? `${format(node.initialState)}; ${format(node.stateTransition)}` : format(node.valueExpression);
        lines.push(`${[...flags, node.name].join(" ")} = ${expression}`);
        if (String(node.unit || "").trim()) lines.push(`@unit ${node.name} = ${JSON.stringify(node.unit)}`);
      }
      const source = `${lines.join("\n")}\n`;
      // Export must never silently omit an unsupported mathematical dependency.
      parse(source);
      return source;
    }
    return { parse, serialize };
  }
  return { createCodec, SourceError };
});
