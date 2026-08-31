#!/usr/bin/env node
"use strict";

/*
 * Converts the structural portion of a legacy STGraph .stg XML model to the
 * STGraphX JSON format. Widgets are deliberately reported, not converted.
 */

const fs = require("fs");
const path = require("path");

function decodeXml(value) {
  return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower === "amp") return "&";
    if (lower === "apos") return "'";
    if (lower === "gt") return ">";
    if (lower === "lt") return "<";
    if (lower === "quot") return '"';
    const numeric = lower.startsWith("#x")
      ? Number.parseInt(lower.slice(2), 16)
      : Number.parseInt(lower.slice(1), 10);
    return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : match;
  });
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(source))) {
    attributes[match[1]] = decodeXml(match[2] ?? match[3] ?? "");
  }
  return attributes;
}

function parseXml(xml) {
  const root = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [root];
  const tokenPattern = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[^]*?\?>|<!DOCTYPE[^>]*(?:\[[\s\S]*?\]\s*)?>|<([^>]+)>/gi;
  let cursor = 0;
  let match;
  while ((match = tokenPattern.exec(xml))) {
    const text = xml.slice(cursor, match.index);
    if (text) stack[stack.length - 1].text += decodeXml(text);
    cursor = tokenPattern.lastIndex;
    if (match[1] !== undefined) {
      stack[stack.length - 1].text += match[1];
      continue;
    }
    const tag = match[2];
    if (!tag || tag.startsWith("!") || tag.startsWith("?")) continue;
    if (tag.startsWith("/")) {
      const name = tag.slice(1).trim();
      if (stack.length === 1 || stack[stack.length - 1].name !== name) {
        throw new Error(`XML non valido: chiusura inattesa di <${name}>`);
      }
      stack.pop();
      continue;
    }
    const selfClosing = /\/$/.test(tag.trim());
    const content = tag.replace(/\/$/, "").trim();
    const separator = content.search(/\s/);
    const name = separator < 0 ? content : content.slice(0, separator);
    if (!name) throw new Error("XML non valido: tag senza nome");
    const node = {
      name,
      attrs: parseAttributes(separator < 0 ? "" : content.slice(separator + 1)),
      children: [],
      text: "",
    };
    stack[stack.length - 1].children.push(node);
    if (!selfClosing) stack.push(node);
  }
  const tail = xml.slice(cursor);
  if (tail) stack[stack.length - 1].text += decodeXml(tail);
  if (stack.length !== 1) throw new Error(`XML non valido: tag <${stack[stack.length - 1].name}> non chiuso`);
  if (root.children.length !== 1) throw new Error("XML non valido: atteso un solo elemento radice");
  return root.children[0];
}

function childrenNamed(node, name) {
  return (node?.children || []).filter((child) => child.name === name);
}

function childText(node, name) {
  const child = childrenNamed(node, name)[0];
  return child ? child.text.trim() : "";
}

function booleanValue(value) {
  return String(value).trim().toLowerCase() === "true";
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function colorValue(value) {
  const parts = String(value || "").split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return "";
  return `#${parts.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function customProperties(value) {
  return String(value || "").split(";").map((entry) => {
    const divider = entry.indexOf("=");
    if (divider < 1) return null;
    return { key: entry.slice(0, divider).trim(), value: entry.slice(divider + 1).trim() };
  }).filter((entry) => entry && entry.key && entry.key.toLowerCase() !== "name");
}

function findBalancedEnd(source, start, open, close) {
  let depth = 0;
  let quote = "";
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

function readLegacyReductionOperand(source, start) {
  let index = start;
  while (/\s/.test(source[index] || "")) index += 1;
  if (source[index] === "+" || source[index] === "*") {
    if (source[index + 1] === "/") {
      const nested = readLegacyReductionOperand(source, index + 2);
      if (!nested) return null;
      const identity = source[index] === "+" ? "0" : "1";
      return { expression: `reduce(${source[index]}, ${nested.expression}, ${identity})`, end: nested.end };
    }
  }
  if (source[index] === "(" || source[index] === "[") {
    const close = source[index] === "(" ? ")" : "]";
    const end = findBalancedEnd(source, index, source[index], close);
    return end > 0 ? { expression: source.slice(index, end), end } : null;
  }
  const identifier = /^(?:\$[A-Za-z0-9_]+|[A-Za-z_][A-Za-z0-9_]*)/.exec(source.slice(index));
  if (!identifier) return null;
  index += identifier[0].length;
  while (source[index] === "(" || source[index] === "[") {
    const close = source[index] === "(" ? ")" : "]";
    const end = findBalancedEnd(source, index, source[index], close);
    if (end < 0) return null;
    index = end;
  }
  return { expression: source.slice(start, index).trim(), end: index };
}

function splitTopLevel(source, separator) {
  const parts = [];
  let start = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth -= 1;
    else if (char === "[") bracketDepth += 1;
    else if (char === "]") bracketDepth -= 1;
    else if (char === separator && parenDepth === 0 && bracketDepth === 0) {
      parts.push(source.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

function nextLegacyRangeEnd(expression) {
  const numeric = Number(expression);
  return Number.isFinite(numeric) ? String(numeric + 1) : `(${expression}) + 1`;
}

function canConvertLegacyRange(source, index) {
  const previous = source[index - 1] || "";
  return !/[A-Za-z0-9_$\])]/.test(previous);
}

function adaptLegacyRanges(expression, location, warnings) {
  const source = String(expression || "");
  let output = "";
  let changed = false;
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      output += char;
      if (char === "\\") {
        output += source[index + 1] || "";
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      continue;
    }
    if (char !== "[") {
      output += char;
      continue;
    }
    const end = findBalancedEnd(source, index, "[", "]");
    if (end < 0) {
      output += char;
      continue;
    }
    if (!canConvertLegacyRange(source, index)) {
      output += source.slice(index, end);
      index = end - 1;
      continue;
    }
    const content = source.slice(index + 1, end - 1);
    const parts = splitTopLevel(content, ":").map((part) => part.trim());
    if ((parts.length === 2 || parts.length === 3) && parts.every(Boolean)) {
      const [start, middle, finish] = parts;
      output += parts.length === 2
        ? `range(${start}, ${nextLegacyRangeEnd(middle)})`
        : `range(${start}, ${nextLegacyRangeEnd(finish)}, ${middle})`;
      index = end - 1;
      changed = true;
      continue;
    }
    output += `[${adaptLegacyRanges(content, location, warnings)}]`;
    index = end - 1;
  }
  if (changed) warnings.push(`${location}: convertito un vettore legacy [inizio:fine] in range(...).`);
  return output;
}

function replaceLegacyArrayIndices(source) {
  let output = "";
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      output += char;
      if (char === "\\") {
        output += source[index + 1] || "";
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      continue;
    }
    const match = /^\$i(\d+)\b/.exec(source.slice(index));
    if (match) {
      output += `$${match[1]}`;
      index += match[0].length - 1;
      continue;
    }
    output += char;
  }
  return output;
}

function adaptLegacyArrayIndices(expression, location, warnings) {
  const source = String(expression || "");
  let output = "";
  let changed = false;
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      output += char;
      if (char === "\\") {
        output += source[index + 1] || "";
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      continue;
    }
    if (source.startsWith("array(", index) && !/[A-Za-z0-9_$]/.test(source[index - 1] || "")) {
      const open = index + "array".length;
      const end = findBalancedEnd(source, open, "(", ")");
      if (end > 0) {
        const content = source.slice(open + 1, end - 1);
        const parts = splitTopLevel(content, ",");
        if (parts.length >= 2) {
          const dimensions = parts.shift();
          const body = replaceLegacyArrayIndices(adaptLegacyArrayIndices(parts.join(","), location, warnings));
          const converted = `array(${dimensions},${body})`;
          output += converted;
          changed ||= converted !== source.slice(index, end);
          index = end - 1;
          continue;
        }
      }
    }
    output += char;
  }
  if (changed) warnings.push(`${location}: convertiti indici locali legacy $iN nel corpo di array(...).`);
  return output;
}

function adaptLegacySizeOperator(expression, location, warnings) {
  const source = String(expression || "");
  let output = "";
  let changed = false;
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      output += char;
      if (char === "\\") {
        output += source[index + 1] || "";
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      continue;
    }
    if (char === "@") {
      const operand = readLegacyReductionOperand(source, index + 1);
      if (operand) {
        output += `size(${operand.expression})`;
        index = operand.end - 1;
        changed = true;
        continue;
      }
      warnings.push(`${location}: operatore legacy @ non convertito per argomento non riconoscibile.`);
    }
    output += char;
  }
  if (changed) warnings.push(`${location}: convertito l'operatore legacy @ in size(...).`);
  return output;
}

function adaptLegacyReductions(expression, location, warnings) {
  const source = String(expression || "");
  let output = "";
  let changed = false;
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      output += char;
      if (char === "\\") {
        output += source[index + 1] || "";
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      continue;
    }
    if ((char === "+" || char === "*") && source[index + 1] === "/") {
      const operand = readLegacyReductionOperand(source, index + 2);
      if (operand) {
        const identity = char === "+" ? "0" : "1";
        output += `reduce(${char}, ${operand.expression}, ${identity})`;
        index = operand.end - 1;
        changed = true;
        continue;
      }
      warnings.push(`${location}: riduzione legacy \"${char}/\" non convertita per argomento non riconoscibile.`);
    }
    if ((char === "-" || char === "/") && source[index + 1] === "/") {
      warnings.push(`${location}: riduzione legacy \"${char}/\" non convertita: richiede una revisione semantica manuale.`);
    }
    output += char;
  }
  if (changed) warnings.push(`${location}: convertita una riduzione legacy in reduce(...).`);
  return output;
}

function convertLegacyAppendExpression(source) {
  const parts = splitTopLevel(source, "#");
  if (parts.length > 1 && parts.every((part) => part.trim())) {
    const convertedParts = parts.map((part) => convertLegacyAppendExpression(part.trim()));
    return {
      expression: convertedParts.slice(1).reduce(
        (result, part) => `append(${result}, ${part.expression})`,
        convertedParts[0].expression,
      ),
      changed: true,
    };
  }

  let output = "";
  let changed = false;
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      output += char;
      if (char === "\\") {
        output += source[index + 1] || "";
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      continue;
    }
    if (char === "(" || char === "[") {
      const close = char === "(" ? ")" : "]";
      const end = findBalancedEnd(source, index, char, close);
      if (end > 0) {
        const nested = convertLegacyAppendExpression(source.slice(index + 1, end - 1));
        output += `${char}${nested.expression}${close}`;
        changed ||= nested.changed;
        index = end - 1;
        continue;
      }
    }
    output += char;
  }
  return { expression: output, changed };
}

function adaptLegacyAppendOperator(expression, location, warnings) {
  const converted = convertLegacyAppendExpression(String(expression || ""));
  if (converted.changed) {
    warnings.push(`${location}: convertito l'operatore legacy # in append(...).`);
  }
  return converted.expression;
}

function adaptLegacyExpression(expression, location, warnings) {
  let converted = adaptLegacyRanges(expression, location, warnings);
  converted = adaptLegacyArrayIndices(converted, location, warnings);
  converted = adaptLegacySizeOperator(converted, location, warnings);
  converted = adaptLegacyReductions(converted, location, warnings);
  return adaptLegacyAppendOperator(converted, location, warnings);
}

function expressionWarnings(expression, location, warnings) {
  const value = String(expression || "");
  const checks = [
    [/\$i\d+\b/, "indici legacy $iN"],
    [/#/, "operatore legacy # non convertito"],
    [/\b(?:readFromXLS|readFromXLSX)\s*\(/i, "lettura legacy da foglio elettronico"],
    [/&&|\|\|/, "operatori JavaScript &&/|| da verificare"],
  ];
  for (const [pattern, description] of checks) {
    if (pattern.test(value)) warnings.push(`${location}: contiene ${description}; verificare l'espressione convertita.`);
  }
}

function nextId(counter) {
  const id = counter.value;
  counter.value += 1;
  return id;
}

function convertNode(legacyNode, idsByName, counter, warnings, sourceName) {
  const name = String(legacyNode.attrs.name || "").trim();
  if (!name) {
    warnings.push("Nodo senza nome ignorato.");
    return null;
  }
  if (idsByName.has(name)) {
    warnings.push(`Nodo duplicato \"${name}\" ignorato.`);
    return null;
  }
  const legacyType = legacyNode.attrs.type || "";
  const properties = customProperties(childText(legacyNode, "customprops"));
  const documentation = childText(legacyNode, "documentation");
  if (documentation) properties.push({ key: "description", value: documentation });
  const node = {
    id: nextId(counter),
    name,
    output: booleanValue(childText(legacyNode, "isOut")),
    global: false,
    type: "algebraic",
    x: numberValue(legacyNode.attrs["pos-x"]),
    y: numberValue(legacyNode.attrs["pos-y"]),
    width: numberValue(legacyNode.attrs.width, 120),
    height: numberValue(legacyNode.attrs.height, 70),
    fillColor: colorValue(childText(legacyNode, "backcol")),
    strokeColor: colorValue(childText(legacyNode, "forecol")),
    properties,
  };
  if (legacyType === "ValueNode" || legacyType === "AuxiliaryNode") {
    const valueType = Number.parseInt(childText(legacyNode, "valueType"), 10);
    const legacyExpression = childText(legacyNode, "expression") || childText(legacyNode, "fExpression");
    const expression = adaptLegacyExpression(legacyExpression, `Nodo \"${name}\"`, warnings);
    if (valueType === 1 || valueType === 2) {
      node.type = "state";
      node.initialState = adaptLegacyExpression(childText(legacyNode, "stateInit") || childText(legacyNode, "fStateInit"), `Nodo \"${name}\", stato iniziale`, warnings);
      node.stateTransition = adaptLegacyExpression(childText(legacyNode, "stateTrans") || childText(legacyNode, "fStateTrans"), `Nodo \"${name}\", stato prossimo`, warnings);
      expressionWarnings(node.initialState, `Nodo \"${name}\", stato iniziale`, warnings);
      expressionWarnings(node.stateTransition, `Nodo \"${name}\", stato prossimo`, warnings);
      if (valueType === 2 && expression) {
        node.properties.push({ key: "formula notes", value: `Espressione legacy di output dello stato: ${expression}` });
        warnings.push(`Nodo \"${name}\": STGraphX non ha un'espressione di output separata per gli stati; è stata conservata nelle note formula.`);
      }
    } else if (booleanValue(childText(legacyNode, "isIn"))) {
      node.type = "parameter";
      node.valueExpression = expression;
      node.global = booleanValue(childText(legacyNode, "isGlobal"));
      expressionWarnings(expression, `Parametro \"${name}\"`, warnings);
    } else {
      node.type = "algebraic";
      node.valueExpression = expression;
      node.input = booleanValue(childText(legacyNode, "isIn"));
      expressionWarnings(expression, `Nodo \"${name}\"`, warnings);
      if (booleanValue(childText(legacyNode, "isGlobal"))) {
        warnings.push(`Nodo \"${name}\": STGraphX rende globali solo i parametri; l'attributo legacy isGlobal è stato ignorato.`);
      }
    }
  } else if (legacyType === "SubmodelNode" || legacyType === "ModelNode") {
    node.type = "submodel";
    const legacyPath = childText(legacyNode, "systemName");
    node.submodelPath = legacyPath.replace(/\.stg$/i, ".json");
    node.inputBindings = {};
    const inputNames = childText(legacyNode, "subVarNames").split(",").map((item) => item.trim()).filter(Boolean);
    const legacyBindings = [];
    for (let index = 0; ; index += 1) {
      const expression = childText(legacyNode, `superExpression${index}`);
      if (!expression && index >= inputNames.length) break;
      legacyBindings.push(expression);
    }
    inputNames.forEach((inputName, index) => {
      const expression = legacyBindings[index] || "";
      if (expression) {
        node.inputBindings[inputName] = expression;
        expressionWarnings(expression, `Sottomodello \"${name}\", input \"${inputName}\"`, warnings);
      }
    });
    if (legacyPath) warnings.push(`Sottomodello \"${name}\": convertire separatamente \"${legacyPath}\"; il riferimento ora punta a \"${node.submodelPath}\".`);
  } else {
    warnings.push(`Nodo \"${name}\" di tipo legacy \"${legacyType || "sconosciuto"}\" ignorato.`);
    return null;
  }
  idsByName.set(name, node.id);
  return node;
}

function convertStGraphXml(xml, options = {}) {
  const document = parseXml(xml);
  if (document.name !== "stgraph") throw new Error("Il file non contiene un modello STGraph valido (<stgraph> mancante).");
  const warnings = [];
  const head = childrenNamed(document, "head")[0];
  const sourceName = options.sourceName || "modello.stg";
  const title = String(head?.attrs.systemName || "").trim() || path.basename(sourceName, path.extname(sourceName));
  const integrationMethod = Number.parseInt(head?.attrs.integrationMethod, 10);
  const modelProperties = [];
  const description = String(head?.attrs.description || "").trim();
  const timeUnit = String(head?.attrs.timeUnitDescription || "").trim();
  if (description) modelProperties.push({ key: "description", value: description });
  if (timeUnit) modelProperties.push({ key: "time unit", value: timeUnit });
  if (Number.isFinite(integrationMethod) && integrationMethod !== 0) {
    warnings.push(`Metodo di integrazione legacy ${integrationMethod} convertito in Eulero; verificare la configurazione temporale.`);
  }
  const idsByName = new Map();
  const nodeCounter = { value: 1 };
  const legacyNodes = childrenNamed(childrenNamed(document, "nodes")[0], "node");
  const nodes = legacyNodes.map((node) => convertNode(node, idsByName, nodeCounter, warnings, sourceName)).filter(Boolean);
  const edgeCounter = { value: 1 };
  const edges = [];
  for (const legacyEdge of childrenNamed(childrenNamed(document, "edges")[0], "edge")) {
    const source = legacyEdge.attrs.source;
    const target = legacyEdge.attrs.target;
    if (!idsByName.has(source) || !idsByName.has(target)) {
      warnings.push(`Freccia \"${source || "?"}\" -> \"${target || "?"}\" ignorata: nodo non convertito o mancante.`);
      continue;
    }
    const points = [];
    const pointCount = Math.max(0, Number.parseInt(legacyEdge.attrs.numpoints, 10) || 0);
    for (let index = 1; index < pointCount - 1; index += 1) {
      const x = Number(legacyEdge.attrs[`p${index}x`]);
      const y = Number(legacyEdge.attrs[`p${index}y`]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
    }
    edges.push({ id: nextId(edgeCounter), from: idsByName.get(source), to: idsByName.get(target), controlPoints: points });
  }
  const textCounter = { value: 1 };
  const textItems = childrenNamed(childrenNamed(document, "texts")[0], "text").map((legacyText) => ({
    id: nextId(textCounter),
    x: numberValue(legacyText.attrs["pos-x"]),
    y: numberValue(legacyText.attrs["pos-y"]),
    width: numberValue(legacyText.attrs.width, 160),
    height: numberValue(legacyText.attrs.height, 40),
    fillColor: "",
    strokeColor: "",
    html: String(legacyText.attrs.content || ""),
  }));
  const legacyWidgets = childrenNamed(childrenNamed(document, "widgets")[0], "widget");
  const widgetTypes = [...new Set(legacyWidgets.map((widget) => widget.attrs.type || "sconosciuto"))];
  if (legacyWidgets.length) warnings.push(`${legacyWidgets.length} widget legacy non convertiti (${widgetTypes.join(", ")}).`);
  if (childrenNamed(childrenNamed(document, "groups")[0], "group").length) warnings.push("I gruppi grafici legacy non sono stati convertiti.");
  if (childrenNamed(childrenNamed(document, "reports")[0], "report").length) warnings.push("I report legacy non sono stati convertiti.");
  const model = {
    version: 1,
    modelTitle: title,
    localFunctions: [],
    view: {
      zoom: Math.max(0.1, numberValue(head?.attrs.scale, 1)),
      showGrid: true,
      highlightNodeEdges: false,
      gridSize: 20,
      scrollLeft: 0,
      scrollTop: 0,
    },
    debug: { watches: [], breakpointEnabled: false, breakpointExpression: "" },
    modelProperties,
    nodeCounter: nodeCounter.value,
    edgeCounter: edgeCounter.value,
    widgetCounter: 1,
    textItemCounter: textCounter.value,
    execution: {
      t0: numberValue(head?.attrs.time0, 0),
      dt: numberValue(head?.attrs.timeD, 1),
      t1: numberValue(head?.attrs.time1, 1),
      delayMs: numberValue(head?.attrs.simulationDelay, 1),
      decimals: 3,
      integrator: "euler",
      strictDefinitions: false,
    },
    nodes,
    edges,
    textItems,
    widgets: [],
  };
  return {
    model,
    report: {
      source: sourceName,
      converted: { nodes: nodes.length, edges: edges.length, textItems: textItems.length },
      skipped: { widgets: { count: legacyWidgets.length, types: widgetTypes } },
      warnings,
    },
  };
}

function printUsage() {
  console.log("Uso: node scripts/convert-stgraph-xml.js <modello.stg> [modello.json] [--report <report.json>]");
}

function parseArguments(argv) {
  const positional = [];
  let reportPath = "";
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--report") {
      reportPath = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(argument);
  }
  if (!positional[0] || positional.length > 2 || (argv.includes("--report") && !reportPath)) {
    throw new Error("Argomenti non validi.");
  }
  const inputPath = positional[0];
  return {
    inputPath,
    outputPath: positional[1] || path.join(path.dirname(inputPath), `${path.basename(inputPath, path.extname(inputPath))}.json`),
    reportPath,
  };
}

function runCli() {
  let cliOptions;
  try {
    cliOptions = parseArguments(process.argv.slice(2));
    if (cliOptions.help) {
      printUsage();
      return;
    }
    const xml = fs.readFileSync(cliOptions.inputPath, "utf8");
    const result = convertStGraphXml(xml, { sourceName: path.basename(cliOptions.inputPath) });
    fs.writeFileSync(cliOptions.outputPath, `${JSON.stringify(result.model, null, 2)}\n`, "utf8");
    if (cliOptions.reportPath) fs.writeFileSync(cliOptions.reportPath, `${JSON.stringify(result.report, null, 2)}\n`, "utf8");
    console.error(`Convertito ${cliOptions.inputPath} -> ${cliOptions.outputPath}`);
    console.error(`Nodi: ${result.report.converted.nodes}; frecce: ${result.report.converted.edges}; testi: ${result.report.converted.textItems}; widget ignorati: ${result.report.skipped.widgets.count}.`);
    for (const warning of result.report.warnings) console.error(`Avviso: ${warning}`);
  } catch (error) {
    console.error(`Conversione non riuscita: ${error.message}`);
    printUsage();
    process.exitCode = 1;
  }
}

module.exports = { convertStGraphXml, parseXml };

if (require.main === module) runCli();
