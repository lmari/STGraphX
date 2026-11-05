/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initReadDataCore(global) {
  const MAX_XLSX_BYTES = 20 * 1024 * 1024;
  const MAX_XLSX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;

  function archiveLibrary() {
    if (global.fflate) return global.fflate;
    if (typeof require === "function") {
      try {
        return require("fflate");
      } catch (_error) {
        return null;
      }
    }
    return null;
  }

  function expressionUsesReadData(expression) {
    return /\breadData\s*\(/u.test(String(expression ?? ""));
  }

  function readDataCalls(expression) {
    if (!expressionUsesReadData(expression)) return { ok: true, calls: [] };
    const parser = global.GraphSemantics?.parseExpressionAst;
    if (typeof parser !== "function") {
      return { ok: false, message: "readData parser is unavailable", calls: [] };
    }
    let ast;
    try {
      ast = parser(String(expression ?? ""));
    } catch (error) {
      return { ok: false, message: error?.message || "readData expression is invalid", calls: [] };
    }
    const calls = [];
    const seen = new Set();
    const visit = (node) => {
      if (!node || typeof node !== "object" || seen.has(node)) return;
      seen.add(node);
      if (node.type === "call" && node.name === "readData") calls.push(node);
      Object.values(node).forEach((value) => {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      });
    };
    visit(ast);
    return { ok: true, calls };
  }

  function literalString(node) {
    return node?.type === "literal" && typeof node.value === "string" ? node.value : null;
  }

  function isXlsxPath(value) {
    return /\.xlsx$/iu.test(String(value ?? "").trim());
  }

  function normalizeReadDataCall(call, normalizeReadDataPath) {
    const args = Array.isArray(call?.args) ? call.args : [];
    if (args.length !== 4 && args.length !== 6) {
      return { ok: false, message: "readData expects 4 or 6 arguments" };
    }
    const path = literalString(args[0]);
    if (path == null) return { ok: false, message: "readData expects a string literal path" };
    const normalizedPath = normalizeReadDataPath(path);
    if (!normalizedPath) return { ok: false, message: "readData path is invalid" };
    if (!isXlsxPath(normalizedPath)) return { ok: false, message: "readData supports XLSX files only" };
    const sheet = literalString(args[1]);
    if (!sheet?.trim()) return { ok: false, message: "readData expects a string literal sheet name" };
    const literalCoordinates = args.slice(2).map((node) => node?.type === "literal" ? node.value : null);
    if (literalCoordinates.some((value) => value != null && (!Number.isInteger(value) || value <= 0))) {
      return { ok: false, message: "readData coordinates must be positive integers" };
    }
    if (
      literalCoordinates.length === 4
      && literalCoordinates.every((value) => value != null)
      && (literalCoordinates[2] < literalCoordinates[0] || literalCoordinates[3] < literalCoordinates[1])
    ) {
      return { ok: false, message: "readData range end must not precede its start" };
    }
    return {
      ok: true,
      path: normalizedPath,
      sheet: sheet.trim(),
    };
  }

  function validateReadDataExpressionUsage(expression, options = {}) {
    if (!expressionUsesReadData(expression)) return { ok: true, calls: [] };
    if (typeof options.normalizeReadDataPath !== "function") {
      return { ok: false, message: "readData path validation is unavailable" };
    }
    const parsed = readDataCalls(expression);
    if (!parsed.ok) return parsed;
    const calls = [];
    for (const call of parsed.calls) {
      const normalized = normalizeReadDataCall(call, options.normalizeReadDataPath);
      if (!normalized.ok) return normalized;
      calls.push(normalized);
    }
    return { ok: true, calls };
  }

  function extractReadDataPaths(expression, normalizeReadDataPath) {
    const result = validateReadDataExpressionUsage(expression, {
      normalizeReadDataPath,
    });
    return result.ok ? result.calls.map((call) => call.path) : [];
  }

  function cellKey(row, column) {
    return `${row}:${column}`;
  }

  function decodeXmlText(value) {
    const entities = { amp: "&", apos: "'", gt: ">", lt: "<", quot: "\"" };
    return String(value ?? "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gu, "$1")
      .replace(/&#x([0-9a-f]+);/giu, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
      .replace(/&#(\d+);/gu, (_match, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
      .replace(/&([a-z]+);/giu, (_match, name) => entities[name.toLowerCase()] ?? _match)
      .replace(/<[^>]*>/gu, "");
  }

  function xmlAttribute(fragment, name) {
    const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const match = new RegExp(`\\b${escapedName}\\s*=\\s*([\"'])([\\s\\S]*?)\\1`, "u").exec(fragment);
    return match ? decodeXmlText(match[2]) : null;
  }

  function resolveArchivePath(basePath, target) {
    const normalizedTarget = String(target ?? "").replace(/\\\\/gu, "/");
    if (normalizedTarget.startsWith("/")) return normalizedTarget.slice(1);
    const parts = basePath.split("/").filter(Boolean);
    parts.pop();
    for (const part of normalizedTarget.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return parts.join("/");
  }

  function spreadsheetColumn(columnName) {
    let result = 0;
    for (const character of String(columnName ?? "").toUpperCase()) {
      const value = character.charCodeAt(0) - 64;
      if (value < 1 || value > 26) return null;
      result = result * 26 + value;
    }
    return result || null;
  }

  function spreadsheetCellAddress(reference) {
    const match = /^([A-Z]+)([1-9]\d*)$/iu.exec(String(reference ?? ""));
    if (!match) return null;
    const column = spreadsheetColumn(match[1]);
    const row = Number(match[2]);
    return Number.isInteger(row) && column ? { row, column } : null;
  }

  function xmlTagValue(xml, tagName) {
    const escapedName = String(tagName).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const match = new RegExp(`<${escapedName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedName}>`, "u").exec(xml);
    return match ? decodeXmlText(match[1]) : null;
  }

  function parseSharedStrings(xml) {
    const strings = [];
    String(xml ?? "").replace(/<si\b[^>]*>([\s\S]*?)<\/si>/gu, (_match, item) => {
      let value = "";
      String(item).replace(/<t\b[^>]*>([\s\S]*?)<\/t>/gu, (_textMatch, text) => {
        value += decodeXmlText(text);
        return _textMatch;
      });
      strings.push(value);
      return _match;
    });
    return strings;
  }

  function parseWorksheet(xml, sharedStrings) {
    const cells = Object.create(null);
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/gu;
    let match;
    while ((match = cellPattern.exec(String(xml ?? "")))) {
      const attributes = match[1] || match[3] || "";
      const position = spreadsheetCellAddress(xmlAttribute(attributes, "r"));
      if (!position) continue;
      const type = xmlAttribute(attributes, "t") || "n";
      const content = match[2] || "";
      const rawValue = xmlTagValue(content, "v");
      let value = null;
      if (type === "s") {
        const index = Number.parseInt(rawValue, 10);
        value = Number.isInteger(index) ? (sharedStrings[index] ?? null) : null;
      } else if (type === "inlineStr") {
        value = xmlTagValue(content, "is") ?? "";
      } else if (type === "b") {
        value = rawValue === "1" || /^true$/iu.test(rawValue || "");
      } else if (type === "e") {
        value = { error: rawValue || "#ERROR", row: position.row, column: position.column };
      } else if (type === "str" || type === "d") {
        value = rawValue;
      } else if (rawValue != null && rawValue !== "") {
        const numericValue = Number(rawValue);
        value = Number.isFinite(numericValue) ? numericValue : rawValue;
      }
      cells[cellKey(position.row, position.column)] = value;
    }
    return { cells };
  }

  function workbookCellValue(cell, row, column) {
    if (!cell) return null;
    if (cell.t === "e") {
      return { error: String(cell.w || cell.v || "#ERROR"), row, column };
    }
    if (cell.v == null) return null;
    if (typeof cell.v === "number" || typeof cell.v === "string" || typeof cell.v === "boolean") return cell.v;
    return String(cell.v);
  }

  function parseXlsxWorkbook(bytes, sourcePath = "") {
    const archive = archiveLibrary();
    if (typeof archive?.unzipSync !== "function") {
      throw new Error("readData XLSX support is unavailable");
    }
    const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (!input.byteLength || input.byteLength > MAX_XLSX_BYTES) {
      throw new Error(`readData XLSX file is invalid: ${sourcePath}`);
    }
    let files;
    try {
      files = archive.unzipSync(input);
    } catch (_error) {
      throw new Error(`readData XLSX file is invalid: ${sourcePath}`);
    }
    const fileEntries = Object.entries(files || {});
    const uncompressedSize = fileEntries.reduce((total, [, value]) => total + value.byteLength, 0);
    if (uncompressedSize > MAX_XLSX_UNCOMPRESSED_BYTES) {
      throw new Error(`readData XLSX file is invalid: ${sourcePath}`);
    }
    const decoder = new TextDecoder("utf-8");
    const textFile = (name) => files?.[name] ? decoder.decode(files[name]) : null;
    const workbookXml = textFile("xl/workbook.xml");
    const relationshipsXml = textFile("xl/_rels/workbook.xml.rels");
    if (!workbookXml || !relationshipsXml) {
      throw new Error(`readData XLSX file is invalid: ${sourcePath}`);
    }
    const relationships = Object.create(null);
    relationshipsXml.replace(/<Relationship\b([^>]*)\/?\s*>/gu, (_match, attributes) => {
      const id = xmlAttribute(attributes, "Id");
      const target = xmlAttribute(attributes, "Target");
      if (id && target) relationships[id] = resolveArchivePath("xl/workbook.xml", target);
      return _match;
    });
    const sharedStrings = parseSharedStrings(textFile("xl/sharedStrings.xml"));
    const sheets = Object.create(null);
    workbookXml.replace(/<sheet\b([^>]*)\/?\s*>/gu, (_match, attributes) => {
      const sheetName = xmlAttribute(attributes, "name");
      const relationId = xmlAttribute(attributes, "r:id");
      const worksheetXml = relationId ? textFile(relationships[relationId]) : null;
      if (sheetName && worksheetXml != null) sheets[sheetName] = parseWorksheet(worksheetXml, sharedStrings);
      return _match;
    });
    if (!Object.keys(sheets).length) {
      throw new Error(`readData XLSX file has no worksheets: ${sourcePath}`);
    }
    return { sheets };
  }

  function positiveInteger(value) {
    return Number.isInteger(value) && value > 0;
  }

  function readDataFromWorkbook(workbook, sheetName, row1, column1, row2 = row1, column2 = column1) {
    const sheet = workbook?.sheets?.[String(sheetName ?? "")];
    if (!sheet) throw new Error(`readData worksheet is unavailable: ${String(sheetName ?? "")}`);
    const coordinates = [row1, column1, row2, column2];
    if (!coordinates.every(positiveInteger)) throw new Error("readData coordinates must be positive integers");
    if (row2 < row1 || column2 < column1) throw new Error("readData range end must not precede its start");
    const valueAt = (row, column) => {
      const value = sheet.cells?.[cellKey(row, column)] ?? null;
      if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "error")) {
        throw new Error(`readData XLSX cell error at [${row}, ${column}]: ${value.error}`);
      }
      return value;
    };
    if (row1 === row2 && column1 === column2) return valueAt(row1, column1);
    const matrix = [];
    for (let row = row1; row <= row2; row += 1) {
      const values = [];
      for (let column = column1; column <= column2; column += 1) values.push(valueAt(row, column));
      matrix.push(values);
    }
    if (matrix.length === 1) return matrix[0];
    if (matrix[0].length === 1) return matrix.map((row) => row[0]);
    return matrix;
  }

  const api = {
    expressionUsesReadData,
    validateReadDataExpressionUsage,
    extractReadDataPaths,
    parseXlsxWorkbook,
    readDataFromWorkbook,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  global.STGraphXReadDataCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
