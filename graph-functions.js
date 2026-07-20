/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function attachGraphFunctions(global) {
  const AGENT_SCHEMA_KEY = "__stgraphxAgentSchema";
  const AGENT_FIELD_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const AGENT_FIELD_RESERVED_NAMES = new Set([
    "this",
    "self",
    "__self",
    "time",
    "t0",
    "t1",
    "dt",
    "true",
    "false",
    "null",
    "and",
    "or",
    "not",
    "$i",
    "$j",
    "$value",
  ]);

  function cloneAgentSchema(fieldNames) {
    return Array.isArray(fieldNames) ? fieldNames.slice() : null;
  }

  function attachAgentSchema(value, fieldNames) {
    if (!Array.isArray(value) || !Array.isArray(fieldNames)) {
      return value;
    }
    Object.defineProperty(value, AGENT_SCHEMA_KEY, {
      value: cloneAgentSchema(fieldNames),
      configurable: true,
      enumerable: false,
      writable: true,
    });
    return value;
  }

  function getAgentFieldNames(value) {
    if (!Array.isArray(value) || !Array.isArray(value[AGENT_SCHEMA_KEY])) {
      return null;
    }
    return cloneAgentSchema(value[AGENT_SCHEMA_KEY]);
  }

  function isAgentStructuredValue(value) {
    return Array.isArray(getAgentFieldNames(value));
  }

  function cloneArrayPreservingAgentSchema(value) {
    if (!Array.isArray(value)) {
      return value;
    }
    const cloned = value.map((item) => (Array.isArray(item) ? item.slice() : item));
    const fieldNames = getAgentFieldNames(value);
    if (fieldNames) {
      attachAgentSchema(cloned, fieldNames);
    }
    return cloned;
  }

  function collectAgentFieldAliasesFromContext(context) {
    const out = {};
    Object.values(context || {}).forEach((value) => {
      const fieldNames = getAgentFieldNames(value);
      if (!fieldNames) {
        return;
      }
      fieldNames.forEach((name, index) => {
        if (!Object.prototype.hasOwnProperty.call(out, name)) {
          out[name] = index;
        }
      });
    });
    return out;
  }

  function normalizeNeighborhoodMode(value) {
    const normalized = String(value ?? "moore").trim().toLowerCase();
    if (!normalized || normalized === "moore") {
      return "moore";
    }
    if (normalized === "vonneumann" || normalized === "vonneumann" || normalized === "von_neumann" || normalized === "von-neumann") {
      return "vonNeumann";
    }
    throw new Error("agentSpace neighborhood must be 'moore' or 'vonNeumann'");
  }

  function toFiniteNumber(value, label) {
    const out = Number(value);
    if (!Number.isFinite(out)) {
      throw new Error(`${label || "value"} must be finite`);
    }
    return out;
  }

  function erfApprox(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function inverseStandardNormal(p) {
    const prob = toFiniteNumber(p, "probability");
    if (prob <= 0 || prob >= 1) {
      throw new Error("probability must be in (0, 1)");
    }

    const a = [
      -3.969683028665376e+01,
      2.209460984245205e+02,
      -2.759285104469687e+02,
      1.38357751867269e+02,
      -3.066479806614716e+01,
      2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01,
      1.615858368580409e+02,
      -1.556989798598866e+02,
      6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
      4.374664141464968e+00,
      2.938163982698783e+00,
    ];
    const d = [
      7.784695709041462e-03,
      3.224671290700398e-01,
      2.445134137142996e+00,
      3.754408661907416e+00,
    ];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q;
    let r;

    if (prob < plow) {
      q = Math.sqrt(-2 * Math.log(prob));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }

    if (prob > phigh) {
      q = Math.sqrt(-2 * Math.log(1 - prob));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }

    q = prob - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function parseDistributionCallArgs(argsLike, defaultParams) {
    const args = Array.from(argsLike);
    let params = defaultParams.slice();
    let valueArg;
    let modeArg = 0;

    if (Array.isArray(args[0])) {
      params = defaultParams.map((def, idx) => (
        args[0][idx] === undefined ? def : args[0][idx]
      ));
      valueArg = args[1];
      modeArg = args.length >= 3 ? args[2] : 0;
    } else {
      valueArg = args[0];
      modeArg = args.length >= 2 ? args[1] : 0;
    }

    const mode = Number(modeArg ?? 0);
    if (!Number.isFinite(mode) || ![0, 1, 2].includes(mode)) {
      throw new Error("mode must be 0 (pdf), 1 (cdf), or 2 (icdf)");
    }
    return { params, valueArg, mode };
  }

  function mapDistributionValue(value, scalarFn) {
    if (Array.isArray(value)) {
      return value.map((item) => mapDistributionValue(item, scalarFn));
    }
    return scalarFn(value);
  }

  function gaussianPdf(x, mean, sigma) {
    const xv = toFiniteNumber(x, "x");
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    const z = (xv - mu) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  }

  function gaussianCdf(x, mean, sigma) {
    const xv = toFiniteNumber(x, "x");
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    const z = (xv - mu) / (sd * Math.sqrt(2));
    return 0.5 * (1 + erfApprox(z));
  }

  function gaussianIcdf(p, mean, sigma) {
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    return mu + sd * inverseStandardNormal(p);
  }

  function gaussianSample(mean = 0, sigma = 1) {
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    let u1 = 0;
    let u2 = 0;
    while (u1 <= Number.EPSILON) {
      u1 = Math.random();
    }
    u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mu + sd * z;
  }

  function gaussian() {
    const { params, valueArg, mode } = parseDistributionCallArgs(arguments, [0, 1]);
    const [mean, sigma] = params;
    if (valueArg === undefined) {
      return gaussianSample(mean, sigma);
    }
    if (mode === 1) {
      return mapDistributionValue(valueArg, (item) => gaussianCdf(item, mean, sigma));
    }
    if (mode === 2) {
      return mapDistributionValue(valueArg, (item) => gaussianIcdf(item, mean, sigma));
    }
    return mapDistributionValue(valueArg, (item) => gaussianPdf(item, mean, sigma));
  }

  function uniformPdf(x, minValue, maxValue) {
    const xv = toFiniteNumber(x, "x");
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    return xv < lo || xv > hi ? 0 : 1 / (hi - lo);
  }

  function uniformCdf(x, minValue, maxValue) {
    const xv = toFiniteNumber(x, "x");
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    if (xv <= lo) {
      return 0;
    }
    if (xv >= hi) {
      return 1;
    }
    return (xv - lo) / (hi - lo);
  }

  function uniformIcdf(p, minValue, maxValue) {
    const prob = toFiniteNumber(p, "probability");
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    if (prob < 0 || prob > 1) {
      throw new Error("probability must be in [0, 1]");
    }
    return lo + prob * (hi - lo);
  }

  function uniformSample(minValue = 0, maxValue = 1) {
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    return lo + Math.random() * (hi - lo);
  }

  function uniform() {
    const { params, valueArg, mode } = parseDistributionCallArgs(arguments, [0, 1]);
    const [minValue, maxValue] = params;
    if (valueArg === undefined) {
      return uniformSample(minValue, maxValue);
    }
    if (mode === 1) {
      return mapDistributionValue(valueArg, (item) => uniformCdf(item, minValue, maxValue));
    }
    if (mode === 2) {
      return mapDistributionValue(valueArg, (item) => uniformIcdf(item, minValue, maxValue));
    }
    return mapDistributionValue(valueArg, (item) => uniformPdf(item, minValue, maxValue));
  }

  function exponentialPdf(x, rate) {
    const xv = toFiniteNumber(x, "x");
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    if (xv < 0) {
      return 0;
    }
    return lambda * Math.exp(-lambda * xv);
  }

  function exponentialCdf(x, rate) {
    const xv = toFiniteNumber(x, "x");
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    if (xv <= 0) {
      return 0;
    }
    return 1 - Math.exp(-lambda * xv);
  }

  function exponentialIcdf(p, rate) {
    const prob = toFiniteNumber(p, "probability");
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    if (prob < 0 || prob >= 1) {
      throw new Error("probability must be in [0, 1)");
    }
    return -Math.log(1 - prob) / lambda;
  }

  function exponentialSample(rate = 1) {
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    let u = 0;
    while (u <= Number.EPSILON) {
      u = Math.random();
    }
    return -Math.log(u) / lambda;
  }

  function exponential() {
    const { params, valueArg, mode } = parseDistributionCallArgs(arguments, [1]);
    const [rate] = params;
    if (valueArg === undefined) {
      return exponentialSample(rate);
    }
    if (mode === 1) {
      return mapDistributionValue(valueArg, (item) => exponentialCdf(item, rate));
    }
    if (mode === 2) {
      return mapDistributionValue(valueArg, (item) => exponentialIcdf(item, rate));
    }
    return mapDistributionValue(valueArg, (item) => exponentialPdf(item, rate));
  }

  const probability = Object.freeze({
    gaussian,
    uniform,
    exponential,
  });

  function normalizeCollectionValueKey(value) {
    if (Array.isArray(value)) {
      return `a:${JSON.stringify(value)}`;
    }
    return `${typeof value}:${String(value)}`;
  }

  function setArrayValues(values) {
    if (!Array.isArray(values) || values.some((item) => Array.isArray(item))) {
      throw new Error("set expects a vector");
    }
    const seen = new Set();
    const out = [];
    values.forEach((item) => {
      const key = normalizeCollectionValueKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    });
    return out;
  }

  function unionArrayValues(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.some((item) => Array.isArray(item)) || right.some((item) => Array.isArray(item))) {
      throw new Error("union expects two vectors");
    }
    return setArrayValues([...left, ...right]);
  }

  function intersectArrayValues(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.some((item) => Array.isArray(item)) || right.some((item) => Array.isArray(item))) {
      throw new Error("intersection expects two vectors");
    }
    const rightKeys = new Set(right.map((item) => normalizeCollectionValueKey(item)));
    const seen = new Set();
    const out = [];
    left.forEach((item) => {
      const key = normalizeCollectionValueKey(item);
      if (rightKeys.has(key) && !seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    });
    return out;
  }

  function flattenMatrixValues(value) {
    if (!Array.isArray(value) || !value.every((row) => Array.isArray(row))) {
      throw new Error("flatten expects a matrix");
    }
    return value.flat();
  }

  function ensureFlatVector(value, fnName) {
    if (!Array.isArray(value) || value.some((item) => Array.isArray(item))) {
      throw new Error(`${fnName} expects a vector`);
    }
    return value;
  }

  function ensureVectorLike(value, fnName) {
    if (!Array.isArray(value)) {
      throw new Error(`${fnName} expects a vector`);
    }
    if (!value.some((item) => Array.isArray(item))) {
      return value;
    }
    if (value.length === 1 && Array.isArray(value[0]) && value[0].every((item) => !Array.isArray(item))) {
      return value[0].slice();
    }
    if (value.every((row) => Array.isArray(row) && row.length === 1 && !Array.isArray(row[0]))) {
      return value.map((row) => row[0]);
    }
    throw new Error(`${fnName} expects a vector`);
  }

  function normalizeAgentFieldNames(fieldNamesValue) {
    const fieldNames = ensureFlatVector(fieldNamesValue, "agents").map((item) => String(item ?? "").trim());
    if (!fieldNames.length) {
      throw new Error("agents expects at least one field name");
    }
    const builtInNames = new Set(Object.keys(createMathScope()));
    const seen = new Set();
    fieldNames.forEach((name) => {
      if (!AGENT_FIELD_NAME_RE.test(name)) {
        throw new Error(`agents field name '${name}' is invalid`);
      }
      if (AGENT_FIELD_RESERVED_NAMES.has(name) || builtInNames.has(name)) {
        throw new Error(`agents field name '${name}' is reserved`);
      }
      if (seen.has(name)) {
        throw new Error(`agents field name '${name}' is duplicated`);
      }
      seen.add(name);
    });
    return fieldNames;
  }

  function validateAgentRows(rowsValue, fieldNames) {
    if (rowsValue == null) {
      return [];
    }
    if (typeof rowsValue === "number" && Number.isFinite(rowsValue)) {
      const count = Number(rowsValue);
      if (!Number.isInteger(count) || count < 0) {
        throw new Error("agents row count must be a non-negative integer");
      }
      return Array.from({ length: count }, () => Array.from({ length: fieldNames.length }, () => 0));
    }
    if (!Array.isArray(rowsValue) || !rowsValue.every((row) => Array.isArray(row))) {
      throw new Error("agents expects rows as a matrix");
    }
    const width = fieldNames.length;
    if (!rowsValue.every((row) => row.length === width && row.every((item) => !Array.isArray(item)))) {
      throw new Error("agents rows must match the number of field names");
    }
    return rowsValue.map((row) => row.slice());
  }

  function createAgentsMatrix(fieldNamesValue, rowsValue = undefined) {
    const fieldNames = normalizeAgentFieldNames(fieldNamesValue);
    const rows = validateAgentRows(rowsValue, fieldNames);
    return attachAgentSchema(rows, fieldNames);
  }

  function ensureRectangularMatrix(value, fnName) {
    if (!Array.isArray(value) || !value.every((row) => Array.isArray(row))) {
      throw new Error(`${fnName} expects a matrix`);
    }
    const rowCount = value.length;
    const fieldNames = getAgentFieldNames(value);
    const colCount = rowCount > 0 ? value[0].length : (fieldNames ? fieldNames.length : 0);
    if (!value.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
      throw new Error(`${fnName} expects a rectangular matrix`);
    }
    return { rowCount, colCount, fieldNames };
  }

  function resolveMatrixColumnIndex(indexValue, fieldNames, colCount, fnName) {
    if (typeof indexValue === "string" && fieldNames) {
      const normalized = indexValue.trim();
      const byName = fieldNames.indexOf(normalized);
      if (byName >= 0) {
        return byName;
      }
      throw new Error(`${fnName} field name '${normalized}' is unknown`);
    }
    return normalizeIndex(Number(indexValue), colCount, fnName);
  }

  function rowFromMatrix(matrixValue, rowIndexValue) {
    const { rowCount, fieldNames } = ensureRectangularMatrix(matrixValue, "row");
    const rowIndex = normalizeIndex(Number(rowIndexValue), rowCount, "row");
    const out = matrixValue[rowIndex].slice();
    if (fieldNames) {
      attachAgentSchema(out, fieldNames);
    }
    return out;
  }

  function colFromMatrix(matrixValue, colIndexValue) {
    const { rowCount, colCount, fieldNames } = ensureRectangularMatrix(matrixValue, "col");
    const colIndex = resolveMatrixColumnIndex(colIndexValue, fieldNames, colCount, "col");
    return Array.from({ length: rowCount }, (_, rowIdx) => matrixValue[rowIdx][colIndex]);
  }

  function nrowsOfMatrix(matrixValue) {
    return ensureRectangularMatrix(matrixValue, "nrows").rowCount;
  }

  function ncolsOfMatrix(matrixValue) {
    return ensureRectangularMatrix(matrixValue, "ncols").colCount;
  }

  function setMatrixRow(matrixValue, rowIndexValue, nextRowValue) {
    const { rowCount, colCount, fieldNames } = ensureRectangularMatrix(matrixValue, "setRow");
    const rowIndex = normalizeIndex(Number(rowIndexValue), rowCount, "setRow");
    const nextRow = ensureFlatVector(nextRowValue, "setRow");
    if (nextRow.length !== colCount) {
      throw new Error("setRow expects a row vector with matching length");
    }
    const out = matrixValue.map((row) => row.slice());
    out[rowIndex] = nextRow.slice();
    if (fieldNames) {
      attachAgentSchema(out, fieldNames);
    }
    return out;
  }

  function appendMatrixRow(matrixValue, nextRowValue) {
    const { colCount, fieldNames } = ensureRectangularMatrix(matrixValue, "appendRow");
    const nextRow = ensureFlatVector(nextRowValue, "appendRow");
    if (nextRow.length !== colCount) {
      throw new Error("appendRow expects a row vector with matching length");
    }
    const out = matrixValue.map((row) => row.slice());
    out.push(nextRow.slice());
    if (fieldNames) {
      attachAgentSchema(out, fieldNames);
    }
    return out;
  }

  function removeMatrixRow(matrixValue, rowIndexValue) {
    const { rowCount, fieldNames } = ensureRectangularMatrix(matrixValue, "removeRow");
    const rowIndex = normalizeIndex(Number(rowIndexValue), rowCount, "removeRow");
    const out = matrixValue.filter((_, idx) => idx !== rowIndex).map((row) => row.slice());
    if (fieldNames) {
      attachAgentSchema(out, fieldNames);
    }
    return out;
  }

  function setMatrixColumn(matrixValue, colIndexValue, nextColumnValue) {
    const { rowCount, colCount, fieldNames } = ensureRectangularMatrix(matrixValue, "setCol");
    const colIndex = resolveMatrixColumnIndex(colIndexValue, fieldNames, colCount, "setCol");
    const nextColumn = ensureFlatVector(nextColumnValue, "setCol");
    if (nextColumn.length !== rowCount) {
      throw new Error("setCol expects a vector with one value per matrix row");
    }
    const out = matrixValue.map((row, rowIdx) => {
      const nextRow = row.slice();
      nextRow[colIndex] = nextColumn[rowIdx];
      return nextRow;
    });
    if (fieldNames) {
      attachAgentSchema(out, fieldNames);
    }
    return out;
  }

  function normalizeAgentSpaceDimensions(sizeValue) {
    const dims = ensureVectorLike(sizeValue, "agentSpace");
    if (dims.length !== 2) {
      throw new Error("agentSpace explicit size expects [rows, cols]");
    }
    const rowCount = Number(dims[0]);
    const colCount = Number(dims[1]);
    if (!Number.isInteger(rowCount) || rowCount < 0 || !Number.isInteger(colCount) || colCount < 0) {
      throw new Error("agentSpace explicit size expects non-negative integer dimensions");
    }
    return { rowCount, colCount };
  }

  function normalizeAgentSpaceBase(agentsValue, fnName = "agentSpace") {
    const { rowCount, colCount, fieldNames } = ensureRectangularMatrix(agentsValue, fnName);
    return { rowCount, colCount, fieldNames };
  }

  function isNeighborhoodArg(value) {
    if (typeof value !== "string") {
      return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === "moore"
      || normalized === "vonneumann"
      || normalized === "von_neumann"
      || normalized === "von-neumann";
  }

  function parseAgentSpaceArgs(argsLike) {
    const args = Array.from(argsLike);
    if (args.length < 3 || args.length > 8) {
      throw new Error("agentSpace expects 3 to 8 arguments");
    }
    const [agentsValue, xColValue, yColValue, ...restArgs] = args;
    let rest = restArgs.slice();
    let idColValue = null;
    if (rest.length > 0 && !Array.isArray(rest[0]) && !isNeighborhoodArg(rest[0])) {
      idColValue = rest.shift();
    }
    const explicitSize = Array.isArray(rest[0]) ? normalizeAgentSpaceDimensions(rest.shift()) : null;
    const neighborhood = normalizeNeighborhoodMode(rest[0]);
    const toroidal = parseBooleanOption(rest[1], false, "agentSpace", "toroidal");
    const radiusRaw = rest[2];
    const radius = radiusRaw == null ? 1 : Number(radiusRaw);
    if (!Number.isInteger(radius) || radius < 1) {
      throw new Error("agentSpace radius must be a positive integer");
    }
    return { agentsValue, xColValue, yColValue, idColValue, explicitSize, neighborhood, toroidal, radius };
  }

  function buildAgentSpace() {
    const { agentsValue, xColValue, yColValue, idColValue, explicitSize, neighborhood, toroidal, radius } = parseAgentSpaceArgs(arguments);
    const { rowCount: agentCount, colCount: fieldCount, fieldNames } = normalizeAgentSpaceBase(agentsValue, "agentSpace");
    const xCol = resolveMatrixColumnIndex(xColValue, fieldNames, fieldCount, "agentSpace");
    const yCol = resolveMatrixColumnIndex(yColValue, fieldNames, fieldCount, "agentSpace");
    const idCol = idColValue == null ? null : resolveMatrixColumnIndex(idColValue, fieldNames, fieldCount, "agentSpace");
    const coords = Array.from({ length: agentCount }, (_, index) => {
      const row = Number(agentsValue[index][xCol]);
      const col = Number(agentsValue[index][yCol]);
      if (!Number.isInteger(row) || row < 0 || !Number.isInteger(col) || col < 0) {
        throw new Error("agentSpace expects non-negative integer coordinates");
      }
      return [row, col];
    });
    const agentRefs = Array.from({ length: agentCount }, (_, index) => {
      if (idCol == null) {
        return index;
      }
      const raw = agentsValue[index][idCol];
      if (raw == null || Array.isArray(raw) || typeof raw === "object") {
        throw new Error("agentSpace identifier column expects scalar identifiers");
      }
      if (typeof raw === "number" && !Number.isFinite(raw)) {
        throw new Error("agentSpace identifier column expects scalar identifiers");
      }
      return raw;
    });
    if (idCol != null && new Set(agentRefs).size !== agentRefs.length) {
      throw new Error("agentSpace identifier values must be unique");
    }
    const inferredRowCount = coords.length ? coords.reduce((max, item) => Math.max(max, item[0]), 0) + 1 : 0;
    const inferredColCount = coords.length ? coords.reduce((max, item) => Math.max(max, item[1]), 0) + 1 : 0;
    const rowCount = explicitSize ? explicitSize.rowCount : inferredRowCount;
    const colCount = explicitSize ? explicitSize.colCount : inferredColCount;
    if (explicitSize && (inferredRowCount > rowCount || inferredColCount > colCount)) {
      throw new Error("agentSpace coordinates exceed explicit matrix size");
    }
    const cells = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => []));
    coords.forEach(([row, col], agentIndex) => {
      if (rowCount > 0 && colCount > 0) {
        cells[row][col].push(agentRefs[agentIndex]);
      }
    });
    return {
      kind: "agentSpace",
      rowCount,
      colCount,
      agentCount,
      xCol,
      yCol,
      idCol,
      neighborhood,
      toroidal,
      radius,
      coords,
      agentRefs,
      cells,
    };
  }

  function ensureStandaloneAgentSpace(spaceValue, fnName = "spaceMatrix") {
    if (!spaceValue || typeof spaceValue !== "object" || spaceValue.kind !== "agentSpace" || !Array.isArray(spaceValue.cells)) {
      throw new Error(`${fnName} expects an agentSpace`);
    }
    return spaceValue;
  }

  function agentSpaceToMatrix(spaceValue, fnName = "spaceMatrix") {
    const space = ensureStandaloneAgentSpace(spaceValue, fnName);
    return space.cells.map((row) => (
      Array.isArray(row)
        ? row.map((cell) => (Array.isArray(cell) ? cell.length : 0))
        : []
    ));
  }

  function ensureAgentSpace(spaceValue, agentsValue, fnName) {
    if (!spaceValue || typeof spaceValue !== "object" || spaceValue.kind !== "agentSpace") {
      throw new Error(`${fnName} expects an agentSpace`);
    }
    const { rowCount } = normalizeAgentSpaceBase(agentsValue, fnName);
    if (rowCount !== Number(spaceValue.agentCount)) {
      throw new Error(`${fnName} expects agents and space built from the same population`);
    }
    return spaceValue;
  }

  function neighboringCellCoords(space, baseRow, baseCol) {
    const out = [];
    const seen = new Set();
    for (let dRow = -space.radius; dRow <= space.radius; dRow += 1) {
      for (let dCol = -space.radius; dCol <= space.radius; dCol += 1) {
        if (dRow === 0 && dCol === 0) {
          continue;
        }
        if (space.neighborhood === "vonNeumann" && (Math.abs(dRow) + Math.abs(dCol) > space.radius)) {
          continue;
        }
        let nextRow = baseRow + dRow;
        let nextCol = baseCol + dCol;
        if (space.toroidal) {
          if (space.rowCount <= 0 || space.colCount <= 0) {
            continue;
          }
          nextRow = ((nextRow % space.rowCount) + space.rowCount) % space.rowCount;
          nextCol = ((nextCol % space.colCount) + space.colCount) % space.colCount;
        } else if (nextRow < 0 || nextRow >= space.rowCount || nextCol < 0 || nextCol >= space.colCount) {
          continue;
        }
        const key = `${nextRow}:${nextCol}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        out.push([nextRow, nextCol]);
      }
    }
    return out;
  }

  function neighborIndicesForAgent(space, agentIndex) {
    const normalizedAgentIndex = normalizeIndex(Number(agentIndex), space.agentCount, "neighborsOf");
    const [baseRow, baseCol] = space.coords[normalizedAgentIndex] || [];
    const out = [];
    const seen = new Set();
    neighboringCellCoords(space, baseRow, baseCol).forEach(([row, col]) => {
      (space.cells[row]?.[col] || []).forEach((otherIndex) => {
        if (otherIndex === normalizedAgentIndex || seen.has(otherIndex)) {
          return;
        }
        seen.add(otherIndex);
        out.push(otherIndex);
      });
    });
    return out;
  }

  function agentNeighborsOf(agentsValue, spaceValue, agentIndex) {
    const space = ensureAgentSpace(spaceValue, agentsValue, "neighborsOf");
    return neighborIndicesForAgent(space, agentIndex);
  }

  function agentNeighborCountOf(agentsValue, spaceValue, agentIndex) {
    const space = ensureAgentSpace(spaceValue, agentsValue, "neighborCountOf");
    return neighborIndicesForAgent(space, agentIndex).length;
  }

  function allAgentNeighborCounts(agentsValue, spaceValue) {
    const space = ensureAgentSpace(spaceValue, agentsValue, "allNeighborCounts");
    return Array.from({ length: space.agentCount }, (_, agentIndex) => neighborIndicesForAgent(space, agentIndex).length);
  }

  function normalizeGridCollisionMode(modeValue) {
    const normalized = String(modeValue ?? "error").trim().toLowerCase();
    if (normalized === "" || normalized === "error") {
      return "error";
    }
    if (normalized === "first") {
      return "first";
    }
    if (normalized === "sum") {
      return "sum";
    }
    throw new Error("grid collision mode must be 'error', 'first', or 'sum'");
  }

  function chooseRandomElement(values) {
    if (!Array.isArray(values)) {
      throw new Error("choice expects a vector or matrix");
    }
    const isMatrix = values.every((row) => Array.isArray(row) && row.every((item) => !Array.isArray(item)));
    if (isMatrix) {
      if (!values.length) {
        throw new Error("choice expects a non-empty vector or matrix");
      }
      return values[Math.floor(Math.random() * values.length)].slice();
    }
    const vector = ensureFlatVector(values, "choice");
    if (!vector.length) {
      throw new Error("choice expects a non-empty vector or matrix");
    }
    return vector[Math.floor(Math.random() * vector.length)];
  }

  function shuffleVectorValues(values) {
    let vector = null;
    const isMatrix = Array.isArray(values) && values.every((row) => Array.isArray(row) && row.every((item) => !Array.isArray(item)));
    if (isMatrix) {
      vector = values.map((row) => row.slice());
    } else {
      vector = ensureFlatVector(values, "shuffle").slice();
    }
    for (let idx = vector.length - 1; idx > 0; idx -= 1) {
      const swapIdx = Math.floor(Math.random() * (idx + 1));
      [vector[idx], vector[swapIdx]] = [vector[swapIdx], vector[idx]];
    }
    return vector;
  }

  function sortVectorValues(values) {
    const vector = ensureFlatVector(values, "sort").slice();
    return vector.sort((left, right) => {
      if (left === right) {
        return 0;
      }
      return left < right ? -1 : 1;
    });
  }

  function sumArrayValues(value, axis = null) {
    if (!Array.isArray(value)) {
      throw new Error("sum expects a vector or matrix");
    }
    const isMatrix = value.every((row) => Array.isArray(row));
    if (!isMatrix) {
      const vector = ensureFlatVector(value, "sum");
      return vector.reduce((sum, item) => sum + Number(item || 0), 0);
    }
    const rowCount = value.length;
    const colCount = rowCount > 0 ? value[0].length : 0;
    if (!value.every((row) => row.length === colCount && row.every((item) => Number.isFinite(Number(item))))) {
      throw new Error("sum expects a rectangular numeric matrix");
    }
    if (axis == null) {
      return value.flat().reduce((sum, item) => sum + Number(item), 0);
    }
    if (!Number.isInteger(axis) || (axis !== 0 && axis !== 1)) {
      throw new Error("sum axis for matrices must be 0 or 1");
    }
    if (axis === 0) {
      return Array.from(
        { length: colCount },
        (_, colIdx) => value.reduce((sum, row) => sum + Number(row[colIdx]), 0),
      );
    }
    return value.map((row) => row.reduce((sum, item) => sum + Number(item), 0));
  }

  function countTruthyValues(value, axis = null) {
    if (!Array.isArray(value)) {
      throw new Error("count expects a vector or matrix");
    }
    const countScalar = (item) => (item ? 1 : 0);
    const isMatrix = value.every((row) => Array.isArray(row));
    if (!isMatrix) {
      const vector = ensureFlatVector(value, "count");
      return vector.reduce((sum, item) => sum + countScalar(item), 0);
    }
    const rowCount = value.length;
    const colCount = rowCount > 0 ? value[0].length : 0;
    if (!value.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
      throw new Error("count expects a rectangular matrix");
    }
    if (axis == null) {
      return value.flat().reduce((sum, item) => sum + countScalar(item), 0);
    }
    if (!Number.isInteger(axis) || (axis !== 0 && axis !== 1)) {
      throw new Error("count axis for matrices must be 0 or 1");
    }
    if (axis === 0) {
      return Array.from(
        { length: colCount },
        (_, colIdx) => value.reduce((sum, row) => sum + countScalar(row[colIdx]), 0),
      );
    }
    return value.map((row) => row.reduce((sum, item) => sum + countScalar(item), 0));
  }

  function indicesWhereValues(value) {
    if (!Array.isArray(value)) {
      throw new Error("indicesWhere expects a vector or matrix");
    }
    const isMatrix = value.every((row) => Array.isArray(row));
    if (!isMatrix) {
      const vector = ensureFlatVector(value, "indicesWhere");
      return vector.flatMap((item, idx) => (item ? [idx] : []));
    }
    const rowCount = value.length;
    const colCount = rowCount > 0 ? value[0].length : 0;
    if (!value.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
      throw new Error("indicesWhere expects a rectangular matrix");
    }
    const out = [];
    value.forEach((row, rowIdx) => {
      row.forEach((item, colIdx) => {
        if (item) {
          out.push([rowIdx, colIdx]);
        }
      });
    });
    return out;
  }

  function normalizeIndex(index, length, fnName) {
    if (!Number.isInteger(index)) {
      throw new Error(`${fnName} expects integer indices`);
    }
    const normalized = index < 0 ? length + index : index;
    if (normalized < 0 || normalized >= length) {
      throw new Error(`${fnName} index out of range`);
    }
    return normalized;
  }

  function setAtValue(target, indexOrIndices, nextValue) {
    if (!Array.isArray(target)) {
      throw new Error("setAt expects a vector or matrix");
    }
    const isMatrix = target.every((row) => Array.isArray(row));
    if (!isMatrix) {
      const vector = ensureFlatVector(target, "setAt").slice();
      const idx = normalizeIndex(Number(indexOrIndices), vector.length, "setAt");
      vector[idx] = nextValue;
      return vector;
    }
    const rowCount = target.length;
    const colCount = rowCount > 0 ? target[0].length : 0;
    if (!target.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
      throw new Error("setAt expects a rectangular matrix");
    }
    const matrix = target.map((row) => row.slice());
    const fieldNames = getAgentFieldNames(target);
    if (Array.isArray(indexOrIndices)) {
      if (indexOrIndices.length !== 2) {
        throw new Error("setAt expects [row, col] for matrix cell replacement");
      }
      const rowIdx = normalizeIndex(Number(indexOrIndices[0]), rowCount, "setAt");
      const colIdx = normalizeIndex(Number(indexOrIndices[1]), colCount, "setAt");
      matrix[rowIdx][colIdx] = nextValue;
      if (fieldNames) {
        attachAgentSchema(matrix, fieldNames);
      }
      return matrix;
    }
    const rowIdx = normalizeIndex(Number(indexOrIndices), rowCount, "setAt");
    if (!Array.isArray(nextValue) || nextValue.length !== colCount || nextValue.some((item) => Array.isArray(item))) {
      throw new Error("setAt expects a row vector with matching length");
    }
    matrix[rowIdx] = nextValue.slice();
    if (fieldNames) {
      attachAgentSchema(matrix, fieldNames);
    }
    return matrix;
  }

  function removeAtValue(target, indexValue, axis = null) {
    if (!Array.isArray(target)) {
      throw new Error("removeAt expects a vector or matrix");
    }
    const isMatrix = target.every((row) => Array.isArray(row));
    if (!isMatrix) {
      if (axis != null) {
        throw new Error("removeAt does not accept axis for vectors");
      }
      const vector = ensureFlatVector(target, "removeAt").slice();
      const idx = normalizeIndex(Number(indexValue), vector.length, "removeAt");
      vector.splice(idx, 1);
      return vector;
    }
    const rowCount = target.length;
    const colCount = rowCount > 0 ? target[0].length : 0;
    if (!target.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
      throw new Error("removeAt expects a rectangular matrix");
    }
    const normalizedAxis = axis == null ? 0 : Number(axis);
    if (!Number.isInteger(normalizedAxis) || (normalizedAxis !== 0 && normalizedAxis !== 1)) {
      throw new Error("removeAt axis for matrices must be 0 or 1");
    }
    if (normalizedAxis === 0) {
      const rowIdx = normalizeIndex(Number(indexValue), rowCount, "removeAt");
      const out = target.filter((_, idx) => idx !== rowIdx).map((row) => row.slice());
      const fieldNames = getAgentFieldNames(target);
      if (fieldNames) {
        attachAgentSchema(out, fieldNames);
      }
      return out;
    }
    const colIdx = normalizeIndex(Number(indexValue), colCount, "removeAt");
    const out = target.map((row) => row.filter((_, idx) => idx !== colIdx));
    const fieldNames = getAgentFieldNames(target);
    if (fieldNames) {
      const nextFieldNames = fieldNames.filter((_, idx) => idx !== colIdx);
      attachAgentSchema(out, nextFieldNames);
    }
    return out;
  }

  function sizeOfValue(value, axis = null) {
    if (!Array.isArray(value)) {
      throw new Error("size expects a vector or matrix");
    }
    const isMatrix = value.every((row) => Array.isArray(row));
    if (!isMatrix) {
      if (axis == null) {
        return value.length;
      }
      if (!Number.isInteger(axis) || axis !== 0) {
        throw new Error("size axis for vectors must be 0");
      }
      return value.length;
    }
    const rowCount = value.length;
    const fieldNames = getAgentFieldNames(value);
    const colCount = rowCount > 0 ? value[0].length : (fieldNames ? fieldNames.length : 0);
    if (!value.every((row) => row.length === colCount)) {
      throw new Error("size expects a rectangular matrix");
    }
    if (axis == null) {
      return [rowCount, colCount];
    }
    if (!Number.isInteger(axis) || (axis !== 0 && axis !== 1)) {
      throw new Error("size axis for matrices must be 0 or 1");
    }
    return axis === 0 ? rowCount : colCount;
  }

  function averageArrayValues(value, axis = null) {
    if (!Array.isArray(value)) {
      throw new Error("average expects a vector or matrix");
    }
    const isMatrix = value.every((row) => Array.isArray(row));
    if (!isMatrix) {
      const vector = ensureFlatVector(value, "average");
      if (!vector.length) {
        throw new Error("average expects a non-empty vector");
      }
      return vector.reduce((sum, item) => sum + Number(item), 0) / vector.length;
    }
    const rowCount = value.length;
    const colCount = rowCount > 0 ? value[0].length : 0;
    if (!value.every((row) => row.length === colCount && row.every((item) => Number.isFinite(Number(item))))) {
      throw new Error("average expects a rectangular numeric matrix");
    }
    if (axis == null) {
      const totalCount = rowCount * colCount;
      if (!totalCount) {
        throw new Error("average expects a non-empty matrix");
      }
      return value.flat().reduce((sum, item) => sum + Number(item), 0) / totalCount;
    }
    if (!Number.isInteger(axis) || (axis !== 0 && axis !== 1)) {
      throw new Error("average axis for matrices must be 0 or 1");
    }
    if (axis === 0) {
      return Array.from({ length: colCount }, (_, colIdx) => value.reduce((sum, row) => sum + Number(row[colIdx]), 0) / rowCount);
    }
    return value.map((row) => {
      if (!row.length) {
        throw new Error("average expects non-empty matrix rows");
      }
      return row.reduce((sum, item) => sum + Number(item), 0) / row.length;
    });
  }

  function stdevArrayValues(value, axis = null) {
    if (!Array.isArray(value)) {
      throw new Error("stdev expects a vector or matrix");
    }
    const isMatrix = value.every((row) => Array.isArray(row));
    const stdevOfVector = (vector) => {
      const flat = ensureFlatVector(vector, "stdev");
      if (!flat.length) {
        throw new Error("stdev expects a non-empty vector");
      }
      const mean = flat.reduce((sum, item) => sum + Number(item), 0) / flat.length;
      const variance = flat.reduce((sum, item) => sum + ((Number(item) - mean) ** 2), 0) / flat.length;
      return Math.sqrt(variance);
    };
    if (!isMatrix) {
      return stdevOfVector(value);
    }
    const rowCount = value.length;
    const colCount = rowCount > 0 ? value[0].length : 0;
    if (!value.every((row) => row.length === colCount && row.every((item) => Number.isFinite(Number(item))))) {
      throw new Error("stdev expects a rectangular numeric matrix");
    }
    if (axis == null) {
      return stdevOfVector(value.flat());
    }
    if (!Number.isInteger(axis) || (axis !== 0 && axis !== 1)) {
      throw new Error("stdev axis for matrices must be 0 or 1");
    }
    if (axis === 0) {
      return Array.from({ length: colCount }, (_, colIdx) => stdevOfVector(value.map((row) => row[colIdx])));
    }
    return value.map((row) => stdevOfVector(row));
  }

  function normalizeGridDimensions(sizeValue) {
    const dims = ensureVectorLike(sizeValue, "grid");
    if (dims.length !== 2) {
      throw new Error("grid explicit size expects [rows, cols]");
    }
    const rowCount = Number(dims[0]);
    const colCount = Number(dims[1]);
    if (!Number.isInteger(rowCount) || rowCount < 0 || !Number.isInteger(colCount) || colCount < 0) {
      throw new Error("grid explicit size expects non-negative integer dimensions");
    }
    return { rowCount, colCount };
  }

  function gridFromCoordinates(rowValues, colValues, arg3 = "error", arg4 = undefined, arg5 = undefined) {
    const rows = ensureVectorLike(rowValues, "grid");
    const cols = ensureVectorLike(colValues, "grid");
    if (rows.length !== cols.length) {
      throw new Error("grid expects row and column vectors with the same length");
    }
    const explicitSize = Array.isArray(arg3) ? normalizeGridDimensions(arg3) : null;
    const collisionMode = explicitSize
      ? (arg4 === undefined ? "error" : arg4)
      : arg3;
    const typeValues = explicitSize
      ? (arg5 === undefined ? 1 : arg5)
      : (arg4 === undefined ? 1 : arg4);
    const mode = normalizeGridCollisionMode(collisionMode);
    const hasTypeVector = Array.isArray(typeValues);
    const types = hasTypeVector ? ensureVectorLike(typeValues, "grid") : null;
    if (types && types.length !== rows.length) {
      throw new Error("grid expects type vector with the same length as row and column vectors");
    }
    if (!rows.length) {
      if (explicitSize) {
        return Array.from({ length: explicitSize.rowCount }, () => Array(explicitSize.colCount).fill(0));
      }
      return [];
    }

    const coords = rows.map((rowValue, idx) => {
      const row = Number(rowValue);
      const col = Number(cols[idx]);
      if (!Number.isInteger(row) || row < 0 || !Number.isInteger(col) || col < 0) {
        throw new Error("grid expects non-negative integer coordinates");
      }
      return { row, col };
    });

    const inferredRowCount = coords.reduce((max, coord) => Math.max(max, coord.row), 0) + 1;
    const inferredColCount = coords.reduce((max, coord) => Math.max(max, coord.col), 0) + 1;
    const rowCount = explicitSize ? explicitSize.rowCount : inferredRowCount;
    const colCount = explicitSize ? explicitSize.colCount : inferredColCount;
    if (explicitSize && (inferredRowCount > rowCount || inferredColCount > colCount)) {
      throw new Error("grid coordinates exceed explicit matrix size");
    }
    const matrix = Array.from({ length: rowCount }, () => Array(colCount).fill(0));
    const occupied = new Set();

    coords.forEach((coord, idx) => {
      const key = `${coord.row}:${coord.col}`;
      const nextValue = types ? types[idx] : typeValues;
      if (occupied.has(key)) {
        if (mode === "error") {
          throw new Error(`grid collision at [${coord.row}, ${coord.col}]`);
        }
        if (mode === "first") {
          return;
        }
        const current = Number(matrix[coord.row][coord.col]);
        const increment = Number(nextValue);
        if (!Number.isFinite(current) || !Number.isFinite(increment)) {
          throw new Error("grid sum mode expects numeric values on coincident coordinates");
        }
        matrix[coord.row][coord.col] = current + increment;
        return;
      }
      occupied.add(key);
      matrix[coord.row][coord.col] = nextValue;
    });

    return matrix;
  }

  function coordsFromGrid(matrixValue, targetValue) {
    if (!Array.isArray(matrixValue) || !matrixValue.every((row) => Array.isArray(row))) {
      throw new Error("coords expects a matrix");
    }
    const rowCount = matrixValue.length;
    const colCount = rowCount > 0 ? matrixValue[0].length : 0;
    if (!matrixValue.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
      throw new Error("coords expects a rectangular matrix");
    }
    const useTarget = arguments.length >= 2;
    const out = [];
    matrixValue.forEach((row, rowIdx) => {
      row.forEach((item, colIdx) => {
        if (useTarget ? item === targetValue : item !== 0) {
          out.push([rowIdx, colIdx]);
        }
      });
    });
    return out;
  }

  function parseBooleanOption(value, defaultValue, fnName, optionName) {
    if (value == null) {
      return defaultValue;
    }
    if (value === true || value === false) {
      return value;
    }
    if (value === 1 || value === 0) {
      return Boolean(value);
    }
    throw new Error(`${fnName} expects ${optionName} to be true, false, 1, or 0`);
  }

  function neighborsOfCell(matrixValue, rowValue, colValue, includeDiagonals = true, toroidal = false) {
    if (!Array.isArray(matrixValue) || !matrixValue.every((row) => Array.isArray(row))) {
      throw new Error("neighbors expects a matrix");
    }
    const rowCount = matrixValue.length;
    const colCount = rowCount > 0 ? matrixValue[0].length : 0;
    if (!matrixValue.every((row) => row.length === colCount && row.every((item) => !Array.isArray(item)))) {
      throw new Error("neighbors expects a rectangular matrix");
    }
    const row = normalizeIndex(Number(rowValue), rowCount, "neighbors");
    const col = normalizeIndex(Number(colValue), colCount, "neighbors");
    const diagonalMode = parseBooleanOption(includeDiagonals, true, "neighbors", "diagonals");
    const toroidalMode = parseBooleanOption(toroidal, false, "neighbors", "toroidal");
    const out = [];
    const seen = new Set();
    for (let dRow = -1; dRow <= 1; dRow += 1) {
      for (let dCol = -1; dCol <= 1; dCol += 1) {
        if (dRow === 0 && dCol === 0) {
          continue;
        }
        if (!diagonalMode && Math.abs(dRow) + Math.abs(dCol) !== 1) {
          continue;
        }
        let nextRow = row + dRow;
        let nextCol = col + dCol;
        if (toroidalMode) {
          nextRow = ((nextRow % rowCount) + rowCount) % rowCount;
          nextCol = ((nextCol % colCount) + colCount) % colCount;
        } else if (nextRow < 0 || nextRow >= rowCount || nextCol < 0 || nextCol >= colCount) {
          continue;
        }
        if (nextRow === row && nextCol === col) {
          continue;
        }
        const key = `${nextRow}:${nextCol}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        out.push(matrixValue[nextRow][nextCol]);
      }
    }
    return out;
  }

  function normalizeRandomBounds(args, fnName) {
    if (args.length > 2) {
      throw new Error(`${fnName} expects 0, 1, or 2 arguments`);
    }
    if (args.length === 0) {
      return { min: 0, max: 1 };
    }
    if (args.length === 1) {
      const max = Number(args[0]);
      if (!Number.isFinite(max)) {
        throw new Error(`${fnName} expects finite numeric bounds`);
      }
      return { min: 0, max };
    }
    const min = Number(args[0]);
    const max = Number(args[1]);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw new Error(`${fnName} expects finite numeric bounds`);
    }
    return { min, max };
  }

  function randomFloatInRange(...args) {
    const { min, max } = normalizeRandomBounds(args, "rand");
    return min + Math.random() * (max - min);
  }

  function randomIntInRange(...args) {
    if (args.length < 1 || args.length > 2) {
      throw new Error("randInt expects 1 or 2 arguments");
    }
    const bounds = normalizeRandomBounds(args, "randInt");
    const min = Math.ceil(bounds.min);
    const max = Math.floor(bounds.max);
    if (max < min) {
      throw new Error("randInt expects min <= max");
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
      for (let value = start; value < end - epsilon; value += step) {
        out.push(Number(value.toFixed(12)));
        if (out.length > maxItems) {
          throw new Error("range is too large");
        }
      }
    } else {
      for (let value = start; value > end + epsilon; value += step) {
        out.push(Number(value.toFixed(12)));
        if (out.length > maxItems) {
          throw new Error("range is too large");
        }
      }
    }
    return out;
  }

  function unavailable(name, message) {
    return () => {
      throw new Error(message || `${name} is unavailable`);
    };
  }

  function createMathScope(options = {}) {
    const scope = {
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
      rand: randomFloatInRange,
      randInt: randomIntInRange,
      range: (...args) => {
        if (args.length === 1) {
          return buildNumericRange(0, args[0], 1);
        }
        if (args.length === 2) {
          return buildNumericRange(args[0], args[1], null);
        }
        if (args.length === 3) {
          return buildNumericRange(args[0], args[1], args[2]);
        }
        throw new Error("range expects 1, 2, or 3 arguments");
      },
      array: options.array || unavailable("array", "array is a special expression form"),
      map: options.map || unavailable("map", "map is a special expression form"),
      filter: options.filter || unavailable("filter", "filter is a special expression form"),
      reduce: options.reduce || unavailable("reduce", "reduce is a special expression form"),
      append: options.append || unavailable("append", "append is a special expression form"),
      agentIndicesWhere: options.agentIndicesWhere || unavailable("agentIndicesWhere", "agentIndicesWhere is a special expression form"),
      filterAgents: options.filterAgents || unavailable("filterAgents", "filterAgents is a special expression form"),
      mapAgents: options.mapAgents || unavailable("mapAgents", "mapAgents is a special expression form"),
      set: setArrayValues,
      union: unionArrayValues,
      intersection: intersectArrayValues,
      flatten: flattenMatrixValues,
      removeAt: removeAtValue,
      choice: chooseRandomElement,
      shuffle: shuffleVectorValues,
      sort: sortVectorValues,
      sum: sumArrayValues,
      count: countTruthyValues,
      indicesWhere: indicesWhereValues,
      setAt: setAtValue,
      grid: gridFromCoordinates,
      agents: createAgentsMatrix,
      row: rowFromMatrix,
      col: colFromMatrix,
      nrows: nrowsOfMatrix,
      ncols: ncolsOfMatrix,
      setRow: setMatrixRow,
      appendRow: appendMatrixRow,
      removeRow: removeMatrixRow,
      setCol: setMatrixColumn,
      agentSpace: buildAgentSpace,
      spaceMatrix: (spaceValue) => agentSpaceToMatrix(spaceValue, "spaceMatrix"),
      neighborsOf: agentNeighborsOf,
      neighborCountOf: agentNeighborCountOf,
      allNeighborCounts: allAgentNeighborCounts,
      coords: coordsFromGrid,
      neighbors: neighborsOfCell,
      size: sizeOfValue,
      average: averageArrayValues,
      stdev: stdevArrayValues,
      gaussian,
      uniform,
      exponential,
      getProperty: options.getProperty || unavailable("getProperty", "getProperty is only available in node expressions"),
      setProperty: options.setProperty || unavailable("setProperty", "setProperty is only available in node expressions"),
      getModelProperty: options.getModelProperty || unavailable("getModelProperty", "getModelProperty is unavailable"),
      setModelProperty: options.setModelProperty || unavailable("setModelProperty", "setModelProperty is unavailable"),
      readData: options.readData || unavailable("readData", "readData is unavailable"),
      integral: options.integral || unavailable("integral", "integral is only available in state node expressions"),
      pi: Math.PI,
      e: Math.E,
      ...(options.extraScope || {}),
    };
    return Object.freeze(scope);
  }

  const expressionDocs = Object.freeze({
    variables: {
      this: { kind: "variable", signature: "this", descriptionKey: "expr.help.this" },
      self: { kind: "variable", signature: "self", descriptionKey: "expr.help.self", helpSection: "agent" },
      $i: { kind: "variable", signature: "$i", descriptionKey: "expr.help.agentIndex", helpSection: "agent" },
      $j: { kind: "variable", signature: "$j", descriptionKey: "expr.help.agentColumnIndex", helpSection: "agent" },
      time: { kind: "variable", signature: "time", descriptionKey: "expr.help.time" },
      t0: { kind: "variable", signature: "t0", descriptionKey: "expr.help.t0" },
      t1: { kind: "variable", signature: "t1", descriptionKey: "expr.help.t1" },
      dt: { kind: "variable", signature: "dt", descriptionKey: "expr.help.dt" },
    },
    functions: {
      if: { kind: "function", signature: "if(condition, whenTrue, whenFalse)", descriptionKey: "expr.help.if", insertText: "if()", cursorOffset: 3 },
      not: { kind: "function", signature: "not x", descriptionKey: "expr.help.not", insertText: "not ", cursorOffset: 4 },
      and: { kind: "function", signature: "a and b", descriptionKey: "expr.help.and", insertText: " and ", cursorOffset: 5 },
      or: { kind: "function", signature: "a or b", descriptionKey: "expr.help.or", insertText: " or ", cursorOffset: 4 },
      integral: { kind: "function", signature: "integral(x)", descriptionKey: "expr.help.integral", insertText: "integral()", cursorOffset: 9 },
      getProperty: { kind: "function", signature: "getProperty(name, fallback)", descriptionKey: "expr.help.getProperty", insertText: "getProperty()", cursorOffset: 12 },
      setProperty: { kind: "function", signature: "setProperty(name, value)", descriptionKey: "expr.help.setProperty", insertText: "setProperty()", cursorOffset: 12 },
      getModelProperty: { kind: "function", signature: "getModelProperty(name, fallback)", descriptionKey: "expr.help.getModelProperty", insertText: "getModelProperty()", cursorOffset: 17 },
      setModelProperty: { kind: "function", signature: "setModelProperty(name, value)", descriptionKey: "expr.help.setModelProperty", insertText: "setModelProperty()", cursorOffset: 17 },
      readData: { kind: "function", signature: "readData(path)", descriptionKey: "expr.help.readData", insertText: "readData()", cursorOffset: 9 },
      agents: { kind: "agent", signature: "agents(fieldNames[, rowsOrCount])", descriptionKey: "expr.help.agents", insertText: "agents()", cursorOffset: 7, helpSection: "agent" },
      row: { kind: "agent", signature: "row(matrix, i)", descriptionKey: "expr.help.row", insertText: "row()", cursorOffset: 4, helpSection: "agent" },
      col: { kind: "agent", signature: "col(matrix, j)", descriptionKey: "expr.help.col", insertText: "col()", cursorOffset: 4, helpSection: "agent" },
      nrows: { kind: "agent", signature: "nrows(matrix)", descriptionKey: "expr.help.nrows", insertText: "nrows()", cursorOffset: 6, helpSection: "agent" },
      ncols: { kind: "agent", signature: "ncols(matrix)", descriptionKey: "expr.help.ncols", insertText: "ncols()", cursorOffset: 6, helpSection: "agent" },
      setRow: { kind: "agent", signature: "setRow(matrix, i, row)", descriptionKey: "expr.help.setRow", insertText: "setRow()", cursorOffset: 7, helpSection: "agent" },
      appendRow: { kind: "agent", signature: "appendRow(matrix, row)", descriptionKey: "expr.help.appendRow", insertText: "appendRow()", cursorOffset: 10, helpSection: "agent" },
      removeRow: { kind: "agent", signature: "removeRow(matrix, i)", descriptionKey: "expr.help.removeRow", insertText: "removeRow()", cursorOffset: 10, helpSection: "agent" },
      setCol: { kind: "agent", signature: "setCol(matrix, j, vector)", descriptionKey: "expr.help.setCol", insertText: "setCol()", cursorOffset: 7, helpSection: "agent" },
      agentSpace: { kind: "agent", signature: "agentSpace(agents, xCol, yCol[, idCol][, [rows, cols][, neighborhood[, toroidal[, radius]]]])", descriptionKey: "expr.help.agentSpace", insertText: "agentSpace()", cursorOffset: 11, helpSection: "agent" },
      spaceMatrix: { kind: "agent", signature: "spaceMatrix(space)", descriptionKey: "expr.help.spaceMatrix", insertText: "spaceMatrix()", cursorOffset: 12, helpSection: "agent" },
      neighborsOf: { kind: "agent", signature: "neighborsOf(agents, space, i)", descriptionKey: "expr.help.neighborsOf", insertText: "neighborsOf()", cursorOffset: 12, helpSection: "agent" },
      neighborCountOf: { kind: "agent", signature: "neighborCountOf(agents, space, i)", descriptionKey: "expr.help.neighborCountOf", insertText: "neighborCountOf()", cursorOffset: 16, helpSection: "agent" },
      allNeighborCounts: { kind: "agent", signature: "allNeighborCounts(agents, space)", descriptionKey: "expr.help.allNeighborCounts", insertText: "allNeighborCounts()", cursorOffset: 18, helpSection: "agent" },
      agentIndicesWhere: { kind: "agent", signature: "agentIndicesWhere(cond, agents)", descriptionKey: "expr.help.agentIndicesWhere", insertText: "agentIndicesWhere()", cursorOffset: 18, helpSection: "agent" },
      filterAgents: { kind: "agent", signature: "filterAgents(cond, agents)", descriptionKey: "expr.help.filterAgents", insertText: "filterAgents()", cursorOffset: 13, helpSection: "agent" },
      mapAgents: { kind: "agent", signature: "mapAgents(expr, agents)", descriptionKey: "expr.help.mapAgents", insertText: "mapAgents()", cursorOffset: 10, helpSection: "agent" },
      array: { kind: "array", signature: "array(dim | [d0,d1,...], expr)", descriptionKey: "expr.help.array", insertText: "array()", cursorOffset: 6 },
      map: { kind: "function", signature: "map(expr, array)", descriptionKey: "expr.help.map", insertText: "map()", cursorOffset: 4 },
      filter: { kind: "array", signature: "filter(cond, array[, mode])", descriptionKey: "expr.help.filter", insertText: "filter()", cursorOffset: 7 },
      reduce: { kind: "function", signature: "reduce(op|fn, vector[, init]) | reduce(op|fn, matrix, axis[, init])", descriptionKey: "expr.help.reduce", insertText: "reduce()", cursorOffset: 7 },
      append: { kind: "array", signature: "append(vector, value|vector) | append(matrix, rowVector)", descriptionKey: "expr.help.append", insertText: "append()", cursorOffset: 7 },
      set: { kind: "array", signature: "set(vector)", descriptionKey: "expr.help.set", insertText: "set()", cursorOffset: 4 },
      union: { kind: "array", signature: "union(vectorA, vectorB)", descriptionKey: "expr.help.union", insertText: "union()", cursorOffset: 6 },
      intersection: { kind: "array", signature: "intersection(vectorA, vectorB)", descriptionKey: "expr.help.intersection", insertText: "intersection()", cursorOffset: 13 },
      flatten: { kind: "array", signature: "flatten(matrix)", descriptionKey: "expr.help.flatten", insertText: "flatten()", cursorOffset: 8 },
      sum: { kind: "array", signature: "sum(array[, axis])", descriptionKey: "expr.help.sum", insertText: "sum()", cursorOffset: 4 },
      count: { kind: "probability", signature: "count(array[, axis]) | count(cond, array[, axis])", descriptionKey: "expr.help.count", insertText: "count()", cursorOffset: 6 },
      indicesWhere: { kind: "array", signature: "indicesWhere(array) | indicesWhere(cond, array)", descriptionKey: "expr.help.indicesWhere", insertText: "indicesWhere()", cursorOffset: 13 },
      setAt: { kind: "array", signature: "setAt(vector, index, value) | setAt(matrix, [row,col], value) | setAt(matrix, row, rowVector)", descriptionKey: "expr.help.setAt", insertText: "setAt()", cursorOffset: 6 },
      removeAt: { kind: "array", signature: "removeAt(vector, index) | removeAt(matrix, index[, axis])", descriptionKey: "expr.help.removeAt", insertText: "removeAt()", cursorOffset: 9 },
      grid: { kind: "array", signature: "grid(rows, cols[, [nRows, nCols][, collisions[, value]]])", descriptionKey: "expr.help.grid", insertText: "grid()", cursorOffset: 5 },
      coords: { kind: "array", signature: "coords(matrix[, value])", descriptionKey: "expr.help.coords", insertText: "coords()", cursorOffset: 7 },
      neighbors: { kind: "array", signature: "neighbors(matrix, row, col[, diagonals[, toroidal]])", descriptionKey: "expr.help.neighbors", insertText: "neighbors()", cursorOffset: 10 },
      choice: { kind: "probability", signature: "choice(vector|matrix)", descriptionKey: "expr.help.choice", insertText: "choice()", cursorOffset: 7 },
      shuffle: { kind: "array", signature: "shuffle(vector|matrix)", descriptionKey: "expr.help.shuffle", insertText: "shuffle()", cursorOffset: 8 },
      sort: { kind: "array", signature: "sort(vector)", descriptionKey: "expr.help.sort", insertText: "sort()", cursorOffset: 5 },
      size: { kind: "array", signature: "size(array[, axis])", descriptionKey: "expr.help.size", insertText: "size()", cursorOffset: 5 },
      average: { kind: "probability", signature: "average(array[, axis])", descriptionKey: "expr.help.average", insertText: "average()", cursorOffset: 8 },
      stdev: { kind: "probability", signature: "stdev(array[, axis])", descriptionKey: "expr.help.stdev", insertText: "stdev()", cursorOffset: 6 },
      range: { kind: "function", signature: "range(stop) | range(start, stop[, step])", descriptionKey: "expr.help.range", insertText: "range()", cursorOffset: 6 },
      gaussian: { kind: "probability", signature: "gaussian([params], x, mode)", descriptionKey: "expr.help.gaussian", insertText: "gaussian()", cursorOffset: 9 },
      uniform: { kind: "probability", signature: "uniform([params], x, mode)", descriptionKey: "expr.help.uniform", insertText: "uniform()", cursorOffset: 8 },
      exponential: { kind: "probability", signature: "exponential([params], x, mode)", descriptionKey: "expr.help.exponential", insertText: "exponential()", cursorOffset: 12 },
      rand: { kind: "probability", signature: "rand([max]) | rand(min, max)", descriptionKey: "expr.help.rand", insertText: "rand()", cursorOffset: 5 },
      randInt: { kind: "probability", signature: "randInt(max) | randInt(min, max)", descriptionKey: "expr.help.randInt", insertText: "randInt()", cursorOffset: 8 },
      sin: { kind: "math", signature: "sin(x)", descriptionKey: "expr.help.sin", insertText: "sin()", cursorOffset: 4 },
      cos: { kind: "math", signature: "cos(x)", descriptionKey: "expr.help.cos", insertText: "cos()", cursorOffset: 4 },
      tan: { kind: "math", signature: "tan(x)", descriptionKey: "expr.help.tan", insertText: "tan()", cursorOffset: 4 },
      asin: { kind: "math", signature: "asin(x)", descriptionKey: "expr.help.asin", insertText: "asin()", cursorOffset: 5 },
      acos: { kind: "math", signature: "acos(x)", descriptionKey: "expr.help.acos", insertText: "acos()", cursorOffset: 5 },
      atan: { kind: "math", signature: "atan(x)", descriptionKey: "expr.help.atan", insertText: "atan()", cursorOffset: 5 },
      atan2: { kind: "math", signature: "atan2(y, x)", descriptionKey: "expr.help.atan2", insertText: "atan2()", cursorOffset: 6 },
      sinh: { kind: "math", signature: "sinh(x)", descriptionKey: "expr.help.sinh", insertText: "sinh()", cursorOffset: 5 },
      cosh: { kind: "math", signature: "cosh(x)", descriptionKey: "expr.help.cosh", insertText: "cosh()", cursorOffset: 5 },
      tanh: { kind: "math", signature: "tanh(x)", descriptionKey: "expr.help.tanh", insertText: "tanh()", cursorOffset: 5 },
      exp: { kind: "math", signature: "exp(x)", descriptionKey: "expr.help.exp", insertText: "exp()", cursorOffset: 4 },
      log: { kind: "math", signature: "log(x)", descriptionKey: "expr.help.log", insertText: "log()", cursorOffset: 4 },
      log10: { kind: "math", signature: "log10(x)", descriptionKey: "expr.help.log10", insertText: "log10()", cursorOffset: 6 },
      log2: { kind: "math", signature: "log2(x)", descriptionKey: "expr.help.log2", insertText: "log2()", cursorOffset: 5 },
      sqrt: { kind: "math", signature: "sqrt(x)", descriptionKey: "expr.help.sqrt", insertText: "sqrt()", cursorOffset: 5 },
      pow: { kind: "math", signature: "pow(base, exp)", descriptionKey: "expr.help.pow", insertText: "pow()", cursorOffset: 4 },
      abs: { kind: "math", signature: "abs(x)", descriptionKey: "expr.help.abs", insertText: "abs()", cursorOffset: 4 },
      min: { kind: "math", signature: "min(a, b, ...)", descriptionKey: "expr.help.min", insertText: "min()", cursorOffset: 4 },
      max: { kind: "math", signature: "max(a, b, ...)", descriptionKey: "expr.help.max", insertText: "max()", cursorOffset: 4 },
      round: { kind: "math", signature: "round(x)", descriptionKey: "expr.help.round", insertText: "round()", cursorOffset: 6 },
      floor: { kind: "math", signature: "floor(x)", descriptionKey: "expr.help.floor", insertText: "floor()", cursorOffset: 6 },
      ceil: { kind: "math", signature: "ceil(x)", descriptionKey: "expr.help.ceil", insertText: "ceil()", cursorOffset: 5 },
      trunc: { kind: "math", signature: "trunc(x)", descriptionKey: "expr.help.trunc", insertText: "trunc()", cursorOffset: 6 },
      int: { kind: "math", signature: "int(x)", descriptionKey: "expr.help.int", insertText: "int()", cursorOffset: 4 },
      sign: { kind: "math", signature: "sign(x)", descriptionKey: "expr.help.sign", insertText: "sign()", cursorOffset: 5 },
    },
  });

  global.GraphFunctions = Object.freeze({
    probability,
    helpers: Object.freeze({
      attachAgentSchema,
      getAgentFieldNames,
      isAgentStructuredValue,
      cloneArrayPreservingAgentSchema,
      collectAgentFieldAliasesFromContext,
      agentSpaceToMatrix,
      sameArrayShape,
      countTruthyValues,
      indicesWhereValues,
    }),
    createMathScope,
    expressionDocs,
  });
  global.GraphProbability = probability;
}(window));
