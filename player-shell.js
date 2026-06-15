(function initPlayerShell(global) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const PLAYER_LANGS = new Set(["it", "en", "pt"]);

  function fillTemplate(template, vars = {}) {
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => (
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : ""
    ));
  }

  function makeTranslator(lang) {
    const bundles = global.STGraphXI18nBundles || {};
    const fallback = bundles.en && typeof bundles.en === "object" ? bundles.en : {};
    const current = bundles?.[lang] && typeof bundles[lang] === "object"
      ? { ...fallback, ...bundles[lang] }
      : fallback;
    return (key, vars = {}) => fillTemplate(current?.[key] ?? key, vars);
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function normalizeLang(raw) {
    const text = String(raw || "").trim().toLowerCase();
    const base = text.split("-")[0];
    if (PLAYER_LANGS.has(text)) {
      return text;
    }
    if (PLAYER_LANGS.has(base)) {
      return base;
    }
    return "en";
  }

  function normalizeZoom(raw, fallback = 1) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return clamp(value, 0.2, 4);
  }

  function isStateNode(node) {
    return node?.shape === "rect";
  }

  function isSubmodelNode(node) {
    return node?.shape === "submodel";
  }

  function isTimeWithinBounds(value, t0, dt, t1) {
    const epsilon = Math.max(1e-12, Math.abs(dt) * 1e-9);
    if (dt > 0) {
      return value <= t1 + epsilon && value >= t0 - epsilon;
    }
    return value >= t1 - epsilon && value <= t0 + epsilon;
  }

  function coerceTruthy(value) {
    if (typeof value === "number") {
      return value !== 0;
    }
    if (typeof value === "string") {
      const trimmed = value.trim().toLowerCase();
      return Boolean(trimmed && trimmed !== "false" && trimmed !== "0");
    }
    return Boolean(value);
  }

  function nodeByName(model, name) {
    return model?.nodes?.find((node) => String(node?.name ?? "") === String(name ?? "")) || null;
  }

  function isExternallySettableNode(node) {
    return Boolean(node && (node.shape === "diamond" || node.input));
  }

  function buildNodeMap(model) {
    return new Map((model?.nodes || []).map((node) => [String(node?.name ?? ""), node]));
  }

  function collectExpressionIdentifierReferences(expression) {
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

  function formatNumberValue(execution, value) {
    if (!Number.isFinite(value)) {
      return "-";
    }
    const decimals = clamp(Math.round(Number(execution?.decimals) || 0), 0, 12);
    let text = value.toFixed(decimals);
    if (decimals > 0) {
      text = text.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
    }
    return text === "-0" ? "0" : text;
  }

  function formatDuration(execution, ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) {
      return "-";
    }
    if (value < 1000) {
      return `${Math.round(value)} ms`;
    }
    return `${formatNumberValue(execution, value / 1000)} s`;
  }

  function formatValue(execution, value) {
    if (value === null || value === undefined) {
      return "—";
    }
    if (typeof value === "number") {
      return formatNumberValue(execution, value);
    }
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      try {
        return JSON.stringify(value);
      } catch (_err) {
        return "[…]";
      }
    }
    if (value && typeof value === "object" && value.kind === "agentSpace") {
      return `agentSpace ${value.rowCount}x${value.colCount}`;
    }
    try {
      return JSON.stringify(value);
    } catch (_err) {
      return String(value);
    }
  }

  function sanitizeWidgetList(widgets = []) {
    const parseNullablePositiveInt = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }
      const numeric = Math.floor(Number(value));
      return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    };
    return Array.isArray(widgets) ? widgets.map((widget) => ({
      id: Number(widget?.id) || 0,
      type: String(widget?.type || ""),
      customTitle: String(widget?.customTitle ?? ""),
      x: Number.isFinite(Number(widget?.x)) ? Number(widget.x) : 0,
      y: Number.isFinite(Number(widget?.y)) ? Number(widget.y) : 0,
      width: clamp(Number(widget?.width) || 280, 120, 1200),
      height: clamp(Number(widget?.height) || 120, 72, 900),
      minimized: Boolean(widget?.minimized),
      outputOnly: Boolean(widget?.outputOnly),
      showHistory: Boolean(widget?.showHistory),
      source: String(widget?.source ?? ""),
      showNumericValues: widget?.showNumericValues !== false,
      showIndices: widget?.showIndices !== false,
      autoFitCells: widget?.autoFitCells !== false,
      cellSize: Number.isFinite(Number(widget?.cellSize)) ? clamp(Number(widget.cellSize), 2, 96) : 28,
      colorScheme: String(widget?.colorScheme || "blue"),
      valueMin: Number.isFinite(Number(widget?.valueMin)) ? Number(widget.valueMin) : null,
      valueMax: Number.isFinite(Number(widget?.valueMax)) ? Number(widget.valueMax) : null,
      displayRows: parseNullablePositiveInt(widget?.displayRows),
      displayCols: parseNullablePositiveInt(widget?.displayCols),
      min: Number.isFinite(Number(widget?.min)) ? Number(widget.min) : 0,
      max: Number.isFinite(Number(widget?.max)) ? Number(widget.max) : 100,
      step: Number.isFinite(Number(widget?.step)) ? Number(widget.step) : 1,
      value: widget?.type === "button"
        ? Boolean(widget?.value)
        : (Number.isFinite(Number(widget?.value)) ? Number(widget.value) : 0),
      options: Array.isArray(widget?.options)
        ? widget.options.map((option) => ({
          label: String(option?.label ?? ""),
          value: Number.isFinite(Number(option?.value)) ? Number(option.value) : 0,
        }))
        : [],
      mappings: Array.isArray(widget?.mappings)
        ? widget.mappings.map((mapping) => ({
          label: String(mapping?.label ?? ""),
          value: Number.isFinite(Number(mapping?.value)) ? Number(mapping.value) : 0,
        }))
        : [],
      columns: Array.isArray(widget?.columns)
        ? widget.columns.map((name) => String(name ?? "")).filter(Boolean)
        : [],
      xyPairs: Array.isArray(widget?.xyPairs)
        ? widget.xyPairs.map((pair) => ({
          label: String(pair?.label ?? ""),
          xSource: String(pair?.xSource ?? "time"),
          ySource: String(pair?.ySource ?? ""),
          color: /^#[0-9a-fA-F]{6}$/.test(String(pair?.color ?? "")) ? String(pair.color) : "#2d7ff9",
          showLine: pair?.showLine !== false,
          lineWidth: Number.isFinite(Number(pair?.lineWidth)) ? clamp(Number(pair.lineWidth), 1, 8) : 2,
          lineStyle: String(pair?.lineStyle || "solid"),
          pointMode: String(pair?.pointMode || "last"),
          pointSize: Number.isFinite(Number(pair?.pointSize)) ? clamp(Number(pair.pointSize), 1, 10) : 2,
          points: [],
        }))
        : [],
    })) : [];
  }

  function agentSpaceToMatrix(space, mode = "count") {
    if (!space || typeof space !== "object" || space.kind !== "agentSpace") {
      return null;
    }
    const rowCount = Number(space.rowCount) || 0;
    const colCount = Number(space.colCount) || 0;
    const cells = Array.isArray(space.cells) ? space.cells : [];
    const normalizedMode = String(mode || "count").toLowerCase();
    return Array.from({ length: rowCount }, (_row, rowIdx) => Array.from({ length: colCount }, (_col, colIdx) => {
      const entries = Array.isArray(cells[rowIdx]?.[colIdx]) ? cells[rowIdx][colIdx] : [];
      if (normalizedMode === "presence") {
        return entries.length > 0 ? 1 : 0;
      }
      if (normalizedMode === "first") {
        return entries.length > 0 ? entries[0] : -1;
      }
      return entries.length;
    }));
  }

  function coerceMatrixCellValue(value) {
    if (value === true) {
      return 1;
    }
    if (value === false) {
      return 0;
    }
    return value;
  }

  function coerceMatrixValue(value) {
    if (Array.isArray(value) && value.every((row) => Array.isArray(row))) {
      return value.map((row) => row.map((cell) => coerceMatrixCellValue(cell)));
    }
    if (value && typeof value === "object" && value.kind === "agentSpace") {
      return agentSpaceToMatrix(value, "count");
    }
    return [];
  }

  function matrixPaletteColor(scheme, ratio) {
    const clamped = clamp(Number(ratio) || 0, 0, 1);
    const mode = String(scheme || "blue").toLowerCase();
    if (mode === "heat") {
      const hue = 44 - (44 * clamped);
      const sat = 90;
      const light = 94 - (46 * clamped);
      return `hsl(${hue.toFixed(1)} ${sat}% ${light.toFixed(1)}%)`;
    }
    if (mode === "grayscale") {
      const light = 98 - (68 * clamped);
      return `hsl(210 10% ${light.toFixed(1)}%)`;
    }
    if (mode === "diverging") {
      const hue = clamped < 0.5 ? 210 : 12;
      const distance = Math.abs(clamped - 0.5) * 2;
      const sat = 68;
      const light = 96 - (44 * distance);
      return `hsl(${hue} ${sat}% ${light.toFixed(1)}%)`;
    }
    const from = "#edf4fb";
    const to = "#2f7fd6";
    const parseHex = (hex) => [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    const [r1, g1, b1] = parseHex(from);
    const [r2, g2, b2] = parseHex(to);
    const lerp = (a, b) => Math.round(a + (b - a) * clamped);
    return `rgb(${lerp(r1, r2)}, ${lerp(g1, g2)}, ${lerp(b1, b2)})`;
  }

  function matrixCellBackgroundColor(value, minValue, maxValue, scheme, fixedRange = false) {
    if (String(scheme || "").toLowerCase() === "none") {
      return "";
    }
    if (!Number.isFinite(value)) {
      return "rgba(0,0,0,0.04)";
    }
    if (fixedRange && Number.isFinite(minValue) && Number.isFinite(maxValue)) {
      if (maxValue === minValue) {
        return matrixPaletteColor(scheme, 0.55);
      }
      return matrixPaletteColor(scheme, (value - minValue) / (maxValue - minValue));
    }
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue === minValue) {
      return matrixPaletteColor(scheme, 0.55);
    }
    return matrixPaletteColor(scheme, (value - minValue) / (maxValue - minValue));
  }

  function widgetTitle(widget, t) {
    const title = String(widget?.customTitle ?? "").trim();
    if (title) {
      return title;
    }
    if (widget.type === "slider" || widget.type === "button" || widget.type === "select") {
      return widget.source || t("text.unnamed");
    }
    if (widget.type === "text" || widget.type === "led" || widget.type === "matrix") {
      return widget.source || t("text.unnamed");
    }
    return {
      table: t("menu.insert.tableWidget"),
      xychart: t("menu.insert.xyChartWidget"),
      matrix: t("menu.insert.matrixWidget"),
      text: t("menu.insert.textWidget"),
      led: t("menu.insert.ledWidget"),
      slider: t("menu.insert.sliderWidget"),
      button: t("menu.insert.buttonWidget"),
      select: t("menu.insert.selectWidget"),
    }[widget.type] || widget.type;
  }

  function canvasTextDisplayHtml(item) {
    const html = String(item?.html ?? "");
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, "");
  }

  function chartLineDash(lineStyle) {
    switch (String(lineStyle || "solid").toLowerCase()) {
      case "dashed":
        return [8, 5];
      case "dotted":
        return [2, 4];
      default:
        return [];
    }
  }

  function drawSimpleXYChart(canvas, pairs, execution) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#d7e1eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const series = pairs
      .map((pair) => ({
        ...pair,
        points: Array.isArray(pair.points) ? pair.points.filter((pt) => Number.isFinite(pt?.x) && Number.isFinite(pt?.y)) : [],
      }))
      .filter((pair) => pair.points.length > 0);
    if (!series.length) {
      ctx.fillStyle = "#6b7a89";
      ctx.font = "12px sans-serif";
      ctx.fillText("—", width / 2 - 4, height / 2 + 4);
      return;
    }
    let minX = series[0].points[0].x;
    let maxX = minX;
    let minY = series[0].points[0].y;
    let maxY = minY;
    series.forEach((pair) => {
      pair.points.forEach((pt) => {
        minX = Math.min(minX, pt.x);
        maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y);
        maxY = Math.max(maxY, pt.y);
      });
    });
    if (minX === maxX) {
      minX -= 1;
      maxX += 1;
    }
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }
    const pad = 18;
    const sx = (width - pad * 2) / (maxX - minX);
    const sy = (height - pad * 2) / (maxY - minY);

    ctx.strokeStyle = "#9fb0c0";
    ctx.beginPath();
    ctx.moveTo(pad, height - pad);
    ctx.lineTo(width - pad, height - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, height - pad);
    ctx.stroke();

    series.forEach((pair) => {
      ctx.strokeStyle = pair.color || "#2d7ff9";
      ctx.lineWidth = pair.lineWidth || 2;
      ctx.setLineDash(chartLineDash(pair.lineStyle));
      if (pair.showLine !== false) {
        ctx.beginPath();
        pair.points.forEach((pt, idx) => {
          const x = pad + (pt.x - minX) * sx;
          const y = height - pad - (pt.y - minY) * sy;
          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }
      ctx.setLineDash([]);
      const pointMode = String(pair.pointMode || "last").toLowerCase();
      if (pointMode !== "none") {
        const pointsToDraw = pointMode === "all"
          ? pair.points
          : [pair.points[pair.points.length - 1]].filter(Boolean);
        pointsToDraw.forEach((pt) => {
          const x = pad + (pt.x - minX) * sx;
          const y = height - pad - (pt.y - minY) * sy;
          ctx.fillStyle = pair.color || "#2d7ff9";
          ctx.beginPath();
          ctx.arc(x, y, pair.pointSize || 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });

    ctx.fillStyle = "#506070";
    ctx.font = "11px sans-serif";
    ctx.fillText(formatNumberValue(execution, minX), pad, height - 4);
    ctx.fillText(formatNumberValue(execution, maxX), width - pad - 24, height - 4);
    ctx.fillText(formatNumberValue(execution, maxY), 4, pad + 4);
    ctx.fillText(formatNumberValue(execution, minY), 4, height - pad);

    const visibleLegend = series
      .map((pair, idx) => ({
        label: String(pair.label || `${pair.xSource || "x"} -> ${pair.ySource || "y"}`),
        color: pair.color || "#2d7ff9",
        lineWidth: pair.lineWidth || 2,
        lineStyle: pair.lineStyle || "solid",
        pointMode: pair.pointMode || "last",
        pointSize: pair.pointSize || 2,
        idx,
      }))
      .slice(0, 8);
    if (visibleLegend.length > 0) {
      const rowHeight = 16;
      const legendWidth = Math.min(width - 24, 148);
      const legendHeight = visibleLegend.length * rowHeight + 12;
      const left = width - legendWidth - 10;
      const top = 10;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.strokeStyle = "#d7e1eb";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(left, top, legendWidth, legendHeight, 8);
      ctx.fill();
      ctx.stroke();
      visibleLegend.forEach((item, idx) => {
        const y = top + 10 + idx * rowHeight + 5;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.lineWidth;
        ctx.setLineDash(chartLineDash(item.lineStyle));
        ctx.beginPath();
        ctx.moveTo(left + 8, y);
        ctx.lineTo(left + 26, y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (String(item.pointMode).toLowerCase() !== "none") {
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.arc(left + 17, y, Math.min(3, item.pointSize), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#334b60";
        ctx.font = "11px sans-serif";
        ctx.fillText(item.label.slice(0, 22), left + 32, y + 4);
      });
    }
  }

  function drawMatrixWidgetCanvas(canvas, widget, matrix, execution, zoom) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const showIndices = widget.showIndices !== false;
    const displayRows = Math.min(matrix.length, widget.displayRows ?? matrix.length);
    const displayCols = Math.min(matrix[0]?.length ?? 0, widget.displayCols ?? (matrix[0]?.length ?? 0));
    const headerOffset = showIndices ? 1 : 0;
    const availableWidth = Math.max(40, Math.floor(widget.width * zoom - 24));
    const availableHeight = Math.max(40, Math.floor(widget.height * zoom - 54));
    const fitSize = Math.floor(Math.min(
      availableWidth / Math.max(1, displayCols + headerOffset),
      availableHeight / Math.max(1, displayRows + headerOffset),
    ));
    const cellSize = widget.autoFitCells !== false
      ? clamp(fitSize || widget.cellSize || 28, 2, 96)
      : clamp(Number(widget.cellSize) || 28, 2, 96);
    const compactHeatmap = widget.showNumericValues === false && showIndices === false;
    if (compactHeatmap) {
      canvas.width = Math.max(1, displayCols);
      canvas.height = Math.max(1, displayRows);
      canvas.style.width = `${Math.max(1, displayCols) * cellSize}px`;
      canvas.style.height = `${Math.max(1, displayRows) * cellSize}px`;

      let minValue = Number.POSITIVE_INFINITY;
      let maxValue = Number.NEGATIVE_INFINITY;
      for (let rowIdx = 0; rowIdx < displayRows; rowIdx += 1) {
        for (let colIdx = 0; colIdx < displayCols; colIdx += 1) {
          const value = matrix[rowIdx]?.[colIdx];
          if (Number.isFinite(value)) {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
          }
        }
      }
      if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
        minValue = 0;
        maxValue = 0;
      }
      const fixedRange = Number.isFinite(widget.valueMin) && Number.isFinite(widget.valueMax);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let rowIdx = 0; rowIdx < displayRows; rowIdx += 1) {
        for (let colIdx = 0; colIdx < displayCols; colIdx += 1) {
          const value = matrix[rowIdx]?.[colIdx];
          const bg = matrixCellBackgroundColor(
            value,
            fixedRange ? widget.valueMin : minValue,
            fixedRange ? widget.valueMax : maxValue,
            widget.colorScheme,
            fixedRange,
          );
          ctx.fillStyle = bg || "#ffffff";
          ctx.fillRect(colIdx, rowIdx, 1, 1);
        }
      }
      return;
    }
    const width = Math.max(1, displayCols + headerOffset) * cellSize;
    const height = Math.max(1, displayRows + headerOffset) * cellSize;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    for (let rowIdx = 0; rowIdx < displayRows; rowIdx += 1) {
      for (let colIdx = 0; colIdx < displayCols; colIdx += 1) {
        const value = matrix[rowIdx]?.[colIdx];
        if (Number.isFinite(value)) {
          minValue = Math.min(minValue, value);
          maxValue = Math.max(maxValue, value);
        }
      }
    }
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      minValue = 0;
      maxValue = 0;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(8, Math.floor(cellSize * 0.45))}px Georgia, serif`;

    for (let rowIdx = 0; rowIdx < displayRows; rowIdx += 1) {
      for (let colIdx = 0; colIdx < displayCols; colIdx += 1) {
        const x = (colIdx + headerOffset) * cellSize;
        const y = (rowIdx + headerOffset) * cellSize;
        const value = matrix[rowIdx]?.[colIdx];
        const fixedRange = Number.isFinite(widget.valueMin) && Number.isFinite(widget.valueMax);
        const bg = matrixCellBackgroundColor(
          value,
          fixedRange ? widget.valueMin : minValue,
          fixedRange ? widget.valueMax : maxValue,
          widget.colorScheme,
          fixedRange,
        );
        ctx.fillStyle = bg || "#ffffff";
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = "#e1e9f1";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, cellSize - 1), Math.max(0, cellSize - 1));
        if (widget.showNumericValues !== false) {
          ctx.fillStyle = "#31495f";
          ctx.fillText(formatValue(execution, value), x + cellSize / 2, y + cellSize / 2);
        }
      }
    }

    if (showIndices) {
      ctx.fillStyle = "#f5f9fc";
      for (let colIdx = 0; colIdx < displayCols; colIdx += 1) {
        const x = (colIdx + headerOffset) * cellSize;
        ctx.fillRect(x, 0, cellSize, cellSize);
        ctx.strokeStyle = "#d9e3ee";
        ctx.strokeRect(x + 0.5, 0.5, Math.max(0, cellSize - 1), Math.max(0, cellSize - 1));
        ctx.fillStyle = "#52687d";
        ctx.fillText(String(colIdx), x + cellSize / 2, cellSize / 2);
        ctx.fillStyle = "#f5f9fc";
      }
      for (let rowIdx = 0; rowIdx < displayRows; rowIdx += 1) {
        const y = (rowIdx + headerOffset) * cellSize;
        ctx.fillRect(0, y, cellSize, cellSize);
        ctx.strokeStyle = "#d9e3ee";
        ctx.strokeRect(0.5, y + 0.5, Math.max(0, cellSize - 1), Math.max(0, cellSize - 1));
        ctx.fillStyle = "#52687d";
        ctx.fillText(String(rowIdx), cellSize / 2, y + cellSize / 2);
        ctx.fillStyle = "#f5f9fc";
      }
      ctx.fillRect(0, 0, cellSize, cellSize);
      ctx.strokeStyle = "#d9e3ee";
      ctx.strokeRect(0.5, 0.5, Math.max(0, cellSize - 1), Math.max(0, cellSize - 1));
    }
  }

  class STGraphXPlayer extends HTMLElement {
    static get observedAttributes() {
      return ["src", "lang", "zoom", "autostart", "controls", "show-graph", "show-widgets"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._lang = normalizeLang(this.getAttribute("lang") || "en");
      this._t = makeTranslator(this._lang);
      this._zoom = normalizeZoom(this.getAttribute("zoom"), 1);
      this._state = {
        srcUrl: null,
        rawModel: null,
        runtimeModel: null,
        runtimeCore: null,
        runtimeLoader: null,
        runtimeSession: null,
        runtimeController: null,
        submodelTemplates: new Map(),
        inputValues: new Map(),
        widgetState: new Map(),
        statusMessage: "",
        statusIsError: false,
        suppressWidgetHistory: false,
        pendingViewport: null,
      };
      this._view = {
        controls: "full",
        showGraph: true,
        showWidgets: true,
        autostart: false,
      };
      this._timedState = {
        timedRunHandle: null,
        timedStepRunning: false,
        timedRunStartedAt: 0,
        timedStepLastActivityAt: 0,
      };
      this.ready = Promise.resolve();
      this.syncViewOptionsFromAttributes();
    }

    connectedCallback() {
      if (!this.shadowRoot.innerHTML) {
        this.renderShell();
        this.bindShell();
      }
      this.ready = this.reload();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) {
        return;
      }
      if (name === "lang") {
        this._lang = normalizeLang(newValue || "en");
        this._t = makeTranslator(this._lang);
        if (this.shadowRoot.innerHTML) {
          this.refreshStaticTexts();
          this.renderAll();
        }
        return;
      }
      if (name === "zoom") {
        this._zoom = normalizeZoom(newValue, this._zoom);
        this.renderAll();
        return;
      }
      if (name === "autostart" || name === "controls" || name === "show-graph" || name === "show-widgets") {
        this.syncViewOptionsFromAttributes();
        this.renderAll();
        return;
      }
      if (this.isConnected) {
        this.ready = this.reload();
      }
    }

    t(key, vars = {}) {
      return this._t(key, vars);
    }

    syncViewOptionsFromAttributes() {
      const controls = String(this.getAttribute("controls") || "full").trim().toLowerCase();
      this._view.controls = ["full", "minimal", "none"].includes(controls) ? controls : "full";
      this._view.autostart = this.hasAttribute("autostart");
      this._view.showGraph = this.getAttribute("show-graph") !== "false";
      this._view.showWidgets = this.getAttribute("show-widgets") !== "false";
    }

    renderShell() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: Georgia, "Iowan Old Style", "Palatino Linotype", serif;
            color: #203040;
            background:
              radial-gradient(circle at top left, rgba(84, 126, 170, 0.14), transparent 30%),
              linear-gradient(180deg, #fbfcfe 0%, #eef3f8 100%);
            border: 1px solid #c8d5e2;
            border-radius: 14px;
            overflow: hidden;
          }
          .player {
            display: grid;
            grid-template-rows: auto 1fr;
            min-height: 420px;
          }
          .toolbar {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            background: rgba(255,255,255,0.78);
            border-bottom: 1px solid #d8e2ec;
            backdrop-filter: blur(8px);
          }
          .title {
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          .status {
            margin-left: auto;
            color: #5e7288;
            font-size: 0.92rem;
          }
          .status.error {
            color: #b33a3a;
          }
          .toolbar button {
            border: 1px solid #b7c7d8;
            background: white;
            color: #203040;
            border-radius: 999px;
            padding: 6px 12px;
            cursor: pointer;
            font: inherit;
          }
          .toolbar button:disabled {
            opacity: 0.45;
            cursor: default;
          }
          .surface {
            display: grid;
            grid-template-columns: minmax(320px, 1fr);
            gap: 16px;
            padding: 14px;
            overflow: auto;
          }
          .canvas {
            position: relative;
            border: 1px solid #d3ddea;
            border-radius: 12px;
            background: rgba(255,255,255,0.84);
            overflow: auto;
            min-height: 320px;
          }
          .canvas-content {
            position: relative;
          }
          svg {
            display: block;
          }
          .widgets {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }
          .widget {
            position: absolute;
            display: flex;
            flex-direction: column;
            background: rgba(255,255,255,0.96);
            border: 1px solid #d4dfeb;
            border-radius: 12px;
            box-shadow: 0 8px 22px rgba(34, 61, 95, 0.08);
            overflow: hidden;
            pointer-events: auto;
            --widget-scale: 1;
          }
          .widget-header {
            flex: 0 0 auto;
            padding: calc(8px * var(--widget-scale)) calc(10px * var(--widget-scale));
            font-size: calc(0.88rem * var(--widget-scale));
            font-weight: 700;
            background: #f4f8fb;
            border-bottom: 1px solid #e1e9f1;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .widget-body {
            flex: 1 1 auto;
            min-height: 0;
            padding: calc(10px * var(--widget-scale));
            font-size: calc(0.9rem * var(--widget-scale));
            overflow: auto;
            box-sizing: border-box;
          }
          .widget-value {
            white-space: pre-wrap;
            word-break: break-word;
          }
          .widget-table, .matrix-table {
            width: 100%;
            border-collapse: collapse;
            font-size: inherit;
          }
          .widget-table th, .widget-table td, .matrix-table td, .matrix-table th {
            border: 1px solid #d9e3ee;
            padding: calc(4px * var(--widget-scale)) calc(6px * var(--widget-scale));
            text-align: left;
            font-size: inherit;
          }
          .widget-table th, .matrix-table th {
            background: #f5f9fc;
          }
          .matrix-widget-grid {
            display: grid;
            gap: 0;
            width: max-content;
            max-width: 100%;
          }
          .matrix-widget-cell {
            box-sizing: border-box;
            min-width: var(--matrix-cell-size);
            min-height: var(--matrix-cell-size);
            width: var(--matrix-cell-size);
            height: var(--matrix-cell-size);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #e1e9f1;
            font-size: var(--matrix-font-size);
            line-height: 1;
            color: #31495f;
            overflow: hidden;
          }
          .matrix-widget-index {
            background: #f5f9fc;
            font-weight: 600;
            color: #52687d;
          }
          .matrix-widget-value {
            background: rgba(255,255,255,0.92);
          }
          .led-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .led {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 1px solid rgba(0,0,0,0.12);
            background: #c5d1db;
            box-shadow: inset 0 0 4px rgba(0,0,0,0.18);
          }
          .led.on {
            background: #38b26d;
          }
          .input-wrap {
            display: grid;
            gap: 8px;
          }
          .input-wrap input[type="range"], .input-wrap select, .input-wrap input[type="number"] {
            width: 100%;
            box-sizing: border-box;
            font: inherit;
          }
          .toggle-btn {
            border: 1px solid #b8c8d8;
            background: white;
            border-radius: 10px;
            padding: 10px 12px;
            cursor: pointer;
            font: inherit;
          }
          .toggle-btn.on {
            background: #1f7a52;
            color: white;
            border-color: #1f7a52;
          }
          .node-label {
            font-size: 12px;
            fill: #203040;
            text-anchor: middle;
            dominant-baseline: middle;
            font-weight: 700;
          }
          .node-value {
            font-size: 10px;
            fill: #567086;
            text-anchor: middle;
          }
          .node-shape {
            fill: #fdfefe;
            stroke: #37506b;
            stroke-width: 1.4;
          }
          .node.output .node-shape {
            stroke: #0f7a7a;
          }
          .node.parameter .node-shape {
            fill: #fff8e8;
          }
          .node.state .node-shape {
            fill: #f7fbff;
          }
          .node.error .node-shape {
            stroke: #c14747;
            stroke-width: 2;
          }
          .edge {
            fill: none;
            stroke: #6e8398;
            stroke-width: 1.6;
          }
          .canvas-text {
            font-size: 12px;
            fill: #42596f;
          }
          .canvas-text-frame {
            fill: rgba(255,255,255,0.92);
            stroke: #d7e1eb;
            stroke-width: 1;
          }
          .canvas-text-fo {
            overflow: hidden;
          }
          .canvas-text-content {
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            padding: 8px 10px;
            overflow: hidden;
            color: #42596f;
            font: 12px/1.35 Georgia, "Iowan Old Style", "Palatino Linotype", serif;
          }
          .canvas-text-content p,
          .canvas-text-content h1,
          .canvas-text-content h2,
          .canvas-text-content h3 {
            margin: 0 0 0.45em 0;
          }
          .canvas-text-content p:last-child,
          .canvas-text-content h1:last-child,
          .canvas-text-content h2:last-child,
          .canvas-text-content h3:last-child {
            margin-bottom: 0;
          }
          .empty {
            color: #70859b;
            font-style: italic;
          }
        </style>
        <div class="player">
          <div class="toolbar">
            <div class="title" data-role="title"></div>
            <button type="button" data-action="run"></button>
            <button type="button" data-action="step"></button>
            <button type="button" data-action="timed"></button>
            <button type="button" data-action="reset"></button>
            <div class="status" data-role="status"></div>
          </div>
          <div class="surface">
            <div class="canvas">
              <div class="canvas-content" data-role="canvasContent">
                <svg data-role="svg"></svg>
                <div class="widgets" data-role="widgets"></div>
              </div>
            </div>
          </div>
        </div>
      `;
      this.$title = this.shadowRoot.querySelector('[data-role="title"]');
      this.$status = this.shadowRoot.querySelector('[data-role="status"]');
      this.$svg = this.shadowRoot.querySelector('[data-role="svg"]');
      this.$widgets = this.shadowRoot.querySelector('[data-role="widgets"]');
      this.$canvasContent = this.shadowRoot.querySelector('[data-role="canvasContent"]');
      this.$canvas = this.shadowRoot.querySelector(".canvas");
      this.$run = this.shadowRoot.querySelector('[data-action="run"]');
      this.$step = this.shadowRoot.querySelector('[data-action="step"]');
      this.$timed = this.shadowRoot.querySelector('[data-action="timed"]');
      this.$reset = this.shadowRoot.querySelector('[data-action="reset"]');
      this.refreshStaticTexts();
      this.applyViewOptions();
    }

    refreshStaticTexts() {
      if (!this.$run) {
        return;
      }
      this.$run.textContent = this.t("menu.run.execute");
      this.$step.textContent = this.t("menu.run.step");
      this.$timed.textContent = this._timedState.timedRunHandle == null
        ? this.t("action.timedStart")
        : this.t("action.timedStop");
      this.$reset.textContent = this.t("menu.run.reset");
      this.$title.textContent = this._state.rawModel?.modelTitle || "STGraphX";
    }

    bindShell() {
      this.$run.addEventListener("click", () => {
        void this.run();
      });
      this.$step.addEventListener("click", () => {
        void this.step();
      });
      this.$timed.addEventListener("click", () => {
        void this.toggleTimed();
      });
      this.$reset.addEventListener("click", () => {
        void this.reset();
      });
    }

    async reload() {
      const src = String(this.getAttribute("src") || "").trim();
      if (!src) {
        this.setStatus("Missing src", true);
        return;
      }
      this.setBusy(true);
      this.setStatus(this.t("status.loading") || "Loading...");
      try {
        await this.loadModelTree(new URL(src, document.baseURI).href);
        this.seedInputValues();
        this.initializeRuntime();
        this.clearWidgetHistory();
        await this.refreshPreview({ resetHistory: true });
        this.refreshStaticTexts();
        this.renderAll();
        this.setStatus(this.t("status.loaded"));
        this.dispatchPlayerEvent("stgraphx-load", {
          src: this._state.srcUrl,
          title: this._state.rawModel?.modelTitle || "",
        });
        if (this._view.autostart) {
          void this.run();
        }
      } catch (err) {
        this.setStatus(err?.message || this.t("error.load", { message: "load failed" }), true);
        this.dispatchPlayerEvent("stgraphx-error", {
          phase: "load",
          message: err?.message || "load failed",
        });
      } finally {
        this.setBusy(false);
      }
    }

    async loadModelTree(rootUrl) {
      const submodelTemplates = new Map();
      const runtimeSharedApi = global.STGraphXRuntimeShared || globalThis.STGraphXRuntimeShared;
      const runtimeCoreApi = global.STGraphXRuntimeCore || globalThis.STGraphXRuntimeCore;
      const runtimeLoaderApi = global.STGraphXRuntimeLoader || globalThis.STGraphXRuntimeLoader;
      const semanticsApi = global.GraphSemantics || globalThis.GraphSemantics;
      const missingModules = [
        !runtimeSharedApi && "STGraphXRuntimeShared",
        !runtimeCoreApi && "STGraphXRuntimeCore",
        !runtimeLoaderApi && "STGraphXRuntimeLoader",
        !semanticsApi && "GraphSemantics",
      ].filter(Boolean);
      if (missingModules.length > 0) {
        throw new Error(`STGraphX runtime modules are not available: ${missingModules.join(", ")}`);
      }
      const runtimeShared = runtimeSharedApi.createRuntimeShared({
        getCurrentLang: () => this._lang,
      });
      const runtimeCore = runtimeCoreApi.createRuntimeCore({
        t: this.t.bind(this),
        semantics: semanticsApi,
        normalizeExecutionConfig: runtimeShared.normalizeExecutionConfig,
        deserializeNodeType: runtimeShared.deserializeNodeType,
        normalizeNodeDescriptionProperty: runtimeShared.normalizeNodeDescriptionProperty,
        normalizeNodeFormulaNotesProperty: runtimeShared.normalizeNodeFormulaNotesProperty,
        sanitizeLocalFunctionDefinition: runtimeShared.sanitizeLocalFunctionDefinition,
        clamp: runtimeShared.clamp,
        deepClone: runtimeShared.deepClone,
        localFunctionsForSemantics: (model) => Array.isArray(model?.localFunctions) ? model.localFunctions : [],
        globalParameterNodesForModel: (model, targetNodeId = null) => (model?.nodes || []).filter((node) =>
          node?.shape === "diamond" && node.global === true && (targetNodeId == null || node.id !== targetNodeId)),
        referencedGlobalParameterNodesForTarget: (model, targetNode, fieldKey = "value") => {
          if (!targetNode) {
            return [];
          }
          const expr = fieldKey === "initial"
            ? String(targetNode.initialStateExpression ?? "")
            : String(targetNode.valueExpression ?? "");
          const refs = collectExpressionIdentifierReferences(expr);
          return (model?.nodes || []).filter((node) =>
            node?.shape === "diamond"
            && node.global === true
            && node.id !== targetNode?.id
            && refs.has(String(node.name ?? "")));
        },
        isStateNode,
        getModelNodeById: (model, id) => model?.nodes?.find((node) => node.id === id) || null,
        isSubmodelNode,
        normalizeSubmodelPath: runtimeShared.normalizeSubmodelPath,
        normalizeReadDataPath: runtimeShared.normalizeReadDataPath,
        parseModelPropertyStoredValue: runtimeShared.parseModelPropertyStoredValue,
        serializeModelPropertyStoredValue: runtimeShared.serializeModelPropertyStoredValue,
        parseNodePropertyStoredValue: runtimeShared.parseNodePropertyStoredValue,
        serializeNodePropertyStoredValue: runtimeShared.serializeNodePropertyStoredValue,
        submodelBindingReferences: (node) => {
          const bindings = node?.inputBindings && typeof node.inputBindings === "object" ? node.inputBindings : {};
          return new Set(Object.values(bindings).map((value) => String(value ?? "").trim()).filter(Boolean));
        },
        applyRuntimeModelInputOverrides: (model, inputValueMap = new Map()) => {
          (model?.nodes || []).forEach((node) => {
            node.externalValueEnabled = false;
            node.externalValue = null;
          });
          inputValueMap.forEach((value, name) => {
            const node = nodeByName(model, name);
            if (!node) {
              return;
            }
            node.externalValueEnabled = true;
            node.externalValue = value;
            node.computedValue = value;
            node.computedError = "";
          });
        },
        getSubmodelTemplate: (modelPath) => {
          const normalized = runtimeShared.normalizeSubmodelPath(modelPath);
          return normalized ? submodelTemplates.get(normalized) || null : null;
        },
      });

      const runtimeLoader = runtimeLoaderApi.createRuntimeLoader({
        t: this.t.bind(this),
        normalizeReadDataPath: runtimeShared.normalizeReadDataPath,
        expressionUsesReadData: (expression) => /\breadData\s*\(/.test(String(expression ?? "")),
        validateReadDataExpressionUsage: (expression, options = {}) => {
          const text = String(expression ?? "");
          if (!/\breadData\s*\(/.test(text)) {
            return { ok: true };
          }
          if (!options.allowReadData) {
            return { ok: false, message: "readData is only available in parameters" };
          }
          const literalPattern = /\breadData\s*\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
          const callCount = (text.match(/\breadData\s*\(/g) || []).length;
          const paths = [];
          literalPattern.lastIndex = 0;
          let match = literalPattern.exec(text);
          while (match) {
            paths.push(String(match[2] ?? "").replace(/\\([\\'"nrt])/g, (_m, escaped) => (
              escaped === "n" ? "\n" : escaped === "r" ? "\r" : escaped === "t" ? "\t" : escaped
            )));
            match = literalPattern.exec(text);
          }
          if (paths.length !== callCount) {
            return { ok: false, message: "readData expects a string literal path" };
          }
          const invalidPath = paths.find((path) => !runtimeShared.normalizeReadDataPath(path));
          if (invalidPath !== undefined) {
            return { ok: false, message: "readData path is invalid" };
          }
          return { ok: true };
        },
        extractReadDataPaths: (expression) => {
          const literalPattern = /\breadData\s*\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
          const paths = [];
          literalPattern.lastIndex = 0;
          let match = literalPattern.exec(String(expression ?? ""));
          while (match) {
            paths.push(String(match[2] ?? "").replace(/\\([\\'"nrt])/g, (_m, escaped) => (
              escaped === "n" ? "\n" : escaped === "r" ? "\r" : escaped === "t" ? "\t" : escaped
            )));
            match = literalPattern.exec(String(expression ?? ""));
          }
          return paths;
        },
        parseCsvMatrix: (text) => {
          const lines = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
          if (!lines.length) {
            throw new Error("readData CSV is empty");
          }
          return lines.map((line) => line.split(",").map((cell) => {
            const trimmed = String(cell ?? "").trim();
            const value = Number(trimmed);
            return Number.isFinite(value) ? value : trimmed;
          }));
        },
        normalizeSubmodelPath: runtimeShared.normalizeSubmodelPath,
        isSubmodelNode,
        getSubmodelTemplate: (modelPath) => {
          const normalized = runtimeShared.normalizeSubmodelPath(modelPath);
          return normalized ? submodelTemplates.get(normalized) || null : null;
        },
        getDirectoryHandleForModel: async (model) => this.createUrlDirectoryHandle(String(model?.__playerBaseUrl ?? rootUrl)),
      });

      const loadRecursive = async (url) => {
        const text = await fetch(url).then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load model: ${response.status}`);
          }
          return response.text();
        });
        const data = runtimeLoader.parseJsonText(text);
        const runtimeModel = runtimeCore.buildRuntimeModelFromData(data, {
          directoryPath: new URL(".", url).href,
        });
        runtimeModel.__playerBaseUrl = new URL(".", url).href;
        for (const node of data.nodes || []) {
          if (String(node?.type ?? "") !== "submodel") {
            continue;
          }
          const normalized = runtimeShared.normalizeSubmodelPath(node.modelPath);
          if (!normalized || submodelTemplates.has(normalized)) {
            continue;
          }
          const childUrl = new URL(String(node.modelPath), new URL(".", url)).href;
          const child = await loadRecursive(childUrl);
          submodelTemplates.set(normalized, child.runtimeModel);
        }
        return { data, runtimeModel };
      };

      const root = await loadRecursive(rootUrl);
      await runtimeLoader.prepareReadDataCachesForModelTree(root.runtimeModel);
      this._state.srcUrl = rootUrl;
      this._state.rawModel = {
        ...root.data,
        widgets: sanitizeWidgetList(root.data.widgets),
      };
      this._state.runtimeModel = root.runtimeModel;
      this._state.runtimeCore = runtimeCore;
      this._state.runtimeLoader = runtimeLoader;
      this._state.submodelTemplates = submodelTemplates;
      this._state.pendingViewport = root.data?.view
        ? {
          scrollLeft: Math.max(0, Number(root.data.view.scrollLeft) || 0),
          scrollTop: Math.max(0, Number(root.data.view.scrollTop) || 0),
        }
        : null;
      if (!this.hasAttribute("zoom")) {
        const savedZoom = Number(root.data?.view?.zoom);
        this._zoom = normalizeZoom(savedZoom, this._zoom);
      }
    }

    createUrlDirectoryHandle(baseUrl) {
      return {
        async getFileHandle(relativePath) {
          const absoluteUrl = new URL(String(relativePath), baseUrl).href;
          return {
            name: String(relativePath),
            async getFile() {
              return {
                async text() {
                  const response = await fetch(absoluteUrl);
                  if (!response.ok) {
                    throw new Error(`Failed to load ${relativePath}`);
                  }
                  return response.text();
                },
              };
            },
          };
        },
      };
    }

    initializeRuntime() {
      const runtimeModel = this._state.runtimeModel;
      const inputValues = this._state.inputValues;
      const runtimeSession = global.STGraphXRuntimeSession.createRuntimeSession({
        core: this._state.runtimeCore,
        model: runtimeModel,
        rootExecution: runtimeModel.execution,
        isStateNode,
        beforeEvaluate: () => {
          this._state.runtimeCore && this._state.runtimeCore;
          (runtimeModel?.nodes || []).forEach((node) => {
            node.externalValueEnabled = false;
            node.externalValue = null;
          });
          inputValues.forEach((value, name) => {
            const node = nodeByName(runtimeModel, name);
            if (!node) {
              return;
            }
            node.externalValueEnabled = true;
            node.externalValue = value;
            node.computedValue = value;
            node.computedError = "";
          });
        },
        afterEvaluate: ({ timeValue }) => {
          if (!this._state.suppressWidgetHistory) {
            this.recordWidgetState(timeValue);
          }
          this.syncRuntimeToView();
        },
      });

      const runtimeController = global.STGraphXRuntimeController.createRuntimeController({
        session: runtimeSession,
        getExecution: () => runtimeModel.execution,
        timedState: this._timedState,
        t: this.t.bind(this),
        enforceStrictDefinitions: () => true,
        ensureBreakpointReady: () => true,
        prepareForExecution: async () => true,
        isExecutionEnded: (cfg) => {
          if (runtimeModel.execution.currentTime == null) {
            return false;
          }
          const nextTime = runtimeModel.execution.currentTime + cfg.dt;
          return !isTimeWithinBounds(nextTime, cfg.t0, cfg.dt, cfg.t1);
        },
        refreshRuntimeView: () => this.renderAll(),
        render: () => this.renderAll(),
        updateEditingLockUi: () => this.updateControlState(),
        setStatusKey: (key, vars) => this.setStatus(this.t(key, vars)),
        setStatus: (message, isError) => this.setStatus(message, isError),
        formatNumberValue: (value) => formatNumberValue(runtimeModel.execution, value),
        formatExecutionDuration: (ms) => formatDuration(runtimeModel.execution, ms),
        evalReasonText: (reason) => this.t(`error.evalReason.${reason || "runtime"}`),
        evaluateBreakpointConditionAtTime: () => ({ hit: false, invalid: false }),
        openWatchDebugger: () => {},
        clearVisualHistory: () => this.clearWidgetHistory(),
        clearSimulationHistory: () => this.clearWidgetHistory(),
        onTimedExecutionStarted: ({ delay }) => {
          this.dispatchPlayerEvent("stgraphx-run-start", {
            mode: "timed",
            delay,
            time: this.currentDisplayTime(),
          });
        },
        onTimedExecutionStopped: ({ reason }) => {
          this.dispatchPlayerEvent("stgraphx-run-stop", {
            mode: "timed",
            reason,
            time: this.currentDisplayTime(),
          });
        },
        hasStrictExecutionBlock: () => false,
        buildEvaluationEnv: () => ({ rootExecution: runtimeModel.execution, stack: [] }),
      });

      this._state.runtimeSession = runtimeSession;
      this._state.runtimeController = runtimeController;
    }

    dispatchPlayerEvent(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
      }));
    }

    seedInputValues() {
      this._state.inputValues.clear();
      (this._state.rawModel?.widgets || []).forEach((widget) => {
        if (!widget?.source) {
          return;
        }
        if (widget.type === "slider" || widget.type === "select") {
          this._state.inputValues.set(widget.source, Number(widget.value));
        } else if (widget.type === "button") {
          this._state.inputValues.set(widget.source, widget.value ? 1 : 0);
        }
      });
    }

    clearWidgetHistory() {
      this._state.widgetState = new Map();
      (this._state.rawModel?.widgets || []).forEach((widget) => {
        if (widget.type === "table") {
          this._state.widgetState.set(widget.id, { rows: [] });
        } else if (widget.type === "xychart") {
          this._state.widgetState.set(widget.id, {
            pairs: widget.xyPairs.map((pair) => ({ ...pair, points: [] })),
          });
        }
      });
    }

    recordWidgetState(timeValue) {
      const model = this._state.runtimeModel;
      const nodeMap = buildNodeMap(model);
      (this._state.rawModel?.widgets || []).forEach((widget) => {
        if (widget.type === "table") {
          const state = this._state.widgetState.get(widget.id) || { rows: [] };
          const row = {};
          widget.columns.forEach((name) => {
            if (name === "time") {
              row[name] = formatNumberValue(model.execution, Number(timeValue));
              return;
            }
            const node = nodeMap.get(name);
            row[name] = node ? formatValue(model.execution, node.computedValue) : "";
          });
          state.rows.push({ time: timeValue, values: row });
          this._state.widgetState.set(widget.id, state);
        } else if (widget.type === "xychart") {
          const state = this._state.widgetState.get(widget.id) || {
            pairs: widget.xyPairs.map((pair) => ({ ...pair, points: [] })),
          };
          state.pairs.forEach((pair) => {
            const xValue = pair.xSource === "time"
              ? Number(timeValue)
              : Number(nodeMap.get(pair.xSource)?.computedValue);
            const yValue = pair.ySource === "time"
              ? Number(timeValue)
              : Number(nodeMap.get(pair.ySource)?.computedValue);
            if (Number.isFinite(xValue) && Number.isFinite(yValue)) {
              pair.points.push({ x: xValue, y: yValue });
            }
          });
          this._state.widgetState.set(widget.id, state);
        }
      });
    }

    syncRuntimeToView() {
      const rawNodes = this._state.rawModel?.nodes || [];
      const runtimeByName = buildNodeMap(this._state.runtimeModel);
      rawNodes.forEach((node) => {
        const runtimeNode = runtimeByName.get(String(node?.name ?? ""));
        node.__runtimeValue = runtimeNode?.computedValue;
        node.__runtimeError = runtimeNode?.computedError;
      });
      this.updateControlState();
    }

    updateControlState() {
      const busy = Boolean(this._timedState.timedStepRunning);
      const hasController = Boolean(this._state.runtimeController);
      this.$run.disabled = !hasController || busy;
      this.$step.disabled = !hasController || busy || this._view.controls === "minimal" || this._view.controls === "none";
      this.$reset.disabled = !hasController || busy || this._view.controls === "none";
      this.$timed.disabled = !hasController || this._view.controls === "minimal" || this._view.controls === "none";
      this.$timed.textContent = this._timedState.timedRunHandle == null
        ? this.t("action.timedStart")
        : this.t("action.timedStop");
      this.applyViewOptions();
    }

    setBusy(busy) {
      [this.$run, this.$step, this.$timed, this.$reset].forEach((button) => {
        if (button) {
          button.disabled = busy;
        }
      });
    }

    setStatus(message, isError = false) {
      this._state.statusMessage = String(message ?? "");
      this._state.statusIsError = Boolean(isError);
      this.applyStatus();
    }

    applyStatus() {
      if (!this.$status) {
        return;
      }
      const base = String(this._state.statusMessage ?? "");
      let text = base;
      const execution = this._state.runtimeModel?.execution;
      const time = this.currentDisplayTime();
      if (execution && time != null && Number.isFinite(Number(time)) && !this._state.statusIsError) {
        const timeLabel = this.t("menu.time", { time: formatNumberValue(execution, time) });
        text = base ? `${base} · ${timeLabel}` : timeLabel;
      }
      this.$status.textContent = text;
      this.$status.classList.toggle("error", this._state.statusIsError);
    }

    applyViewOptions() {
      if (!this.$run) {
        return;
      }
      const controls = this._view.controls;
      this.$run.style.display = controls === "none" ? "none" : "";
      this.$step.style.display = controls === "full" ? "" : "none";
      this.$timed.style.display = controls === "full" ? "" : "none";
      this.$reset.style.display = controls === "none" ? "none" : "";
      if (this.$svg) {
        this.$svg.style.display = this._view.showGraph ? "" : "none";
      }
      if (this.$widgets) {
        this.$widgets.style.display = this._view.showWidgets ? "" : "none";
      }
    }

    async run() {
      if (!this._state.runtimeController) {
        return;
      }
      this.dispatchPlayerEvent("stgraphx-run-start", { mode: "full" });
      try {
        await this._state.runtimeController.executeAll();
        this.dispatchPlayerEvent("stgraphx-run-stop", {
          mode: "full",
          time: this.currentDisplayTime(),
        });
      } catch (err) {
        this.dispatchPlayerEvent("stgraphx-error", {
          phase: "run",
          message: err?.message || "run failed",
        });
        throw err;
      }
    }

    async runUntil(targetTime) {
      const numericTarget = Number(targetTime);
      if (!Number.isFinite(numericTarget)) {
        throw new Error("runUntil requires a finite target time");
      }
      const execution = this._state.runtimeModel?.execution;
      if (!execution) {
        throw new Error("Runtime is not initialized");
      }
      const dt = Number(execution.dt);
      const t0 = Number(execution.t0);
      const t1 = Number(execution.t1);
      const epsilon = Math.max(1e-12, Math.abs(dt) * 1e-9);
      if ((dt > 0 && (numericTarget < t0 - epsilon || numericTarget > t1 + epsilon))
        || (dt < 0 && (numericTarget > t0 + epsilon || numericTarget < t1 - epsilon))) {
        throw new Error("Target time is outside the model time bounds");
      }
      while (true) {
        const current = this.currentDisplayTime();
        if (current != null) {
          if ((dt > 0 && current >= numericTarget - epsilon) || (dt < 0 && current <= numericTarget + epsilon)) {
            break;
          }
        }
        const next = current == null ? t0 : current + dt;
        if ((dt > 0 && next > numericTarget + epsilon) || (dt < 0 && next < numericTarget - epsilon)) {
          break;
        }
        await this.step();
      }
      return this.getOutputs();
    }

    async step() {
      if (!this._state.runtimeController) {
        return;
      }
      this.dispatchPlayerEvent("stgraphx-run-start", { mode: "step" });
      try {
        await this._state.runtimeController.runManualStep();
        this.dispatchPlayerEvent("stgraphx-run-stop", {
          mode: "step",
          time: this.currentDisplayTime(),
        });
      } catch (err) {
        this.dispatchPlayerEvent("stgraphx-error", {
          phase: "step",
          message: err?.message || "step failed",
        });
        throw err;
      }
    }

    async reset() {
      if (!this._state.runtimeController) {
        return;
      }
      await this._state.runtimeController.resetExecution();
      await this.refreshPreview();
      this.dispatchPlayerEvent("stgraphx-run-stop", {
        mode: "reset",
        time: this.currentDisplayTime(),
      });
    }

    async toggleTimed() {
      if (!this._state.runtimeController) {
        return;
      }
      try {
        await this._state.runtimeController.toggleTimedExecution();
      } catch (err) {
        this.dispatchPlayerEvent("stgraphx-error", {
          phase: "timed",
          message: err?.message || "timed run failed",
        });
        throw err;
      }
    }

    async setZoom(value) {
      this._zoom = normalizeZoom(value, this._zoom);
      this.renderAll();
    }

    async evaluate() {
      await this.refreshPreview({ resetHistory: false });
      this.renderAll();
      return this.getOutputs();
    }

    async setValue(name, value, options = {}) {
      const node = nodeByName(this._state.runtimeModel, name);
      if (!node) {
        throw new Error(`Unknown node: ${name}`);
      }
      if (!isExternallySettableNode(node)) {
        throw new Error(`Node is not externally settable: ${name}`);
      }
      this._state.inputValues.set(String(name), value);
      if (options.evaluate) {
        await this.evaluate();
      } else {
        this.renderAll();
      }
      return this;
    }

    async setValues(values = {}, options = {}) {
      Object.entries(values || {}).forEach(([name, value]) => {
        const node = nodeByName(this._state.runtimeModel, name);
        if (!node) {
          throw new Error(`Unknown node: ${name}`);
        }
        if (!isExternallySettableNode(node)) {
          throw new Error(`Node is not externally settable: ${name}`);
        }
        this._state.inputValues.set(String(name), value);
      });
      if (options.evaluate) {
        await this.evaluate();
      } else {
        this.renderAll();
      }
      return this;
    }

    getValue(name) {
      const node = nodeByName(this._state.runtimeModel, name);
      if (!node) {
        throw new Error(`Unknown node: ${name}`);
      }
      return node.computedValue;
    }

    getValues(names = []) {
      const result = {};
      names.forEach((name) => {
        result[name] = this.getValue(name);
      });
      return result;
    }

    getOutputs() {
      const result = {};
      (this._state.runtimeModel?.nodes || []).forEach((node) => {
        if (!node?.output) {
          return;
        }
        result[node.name] = this.getValue(node.name);
      });
      return result;
    }

    getTime() {
      return this.currentDisplayTime();
    }

    currentDisplayTime() {
      const execution = this._state.runtimeModel?.execution;
      if (!execution) {
        return null;
      }
      return execution.currentTime == null ? Number(execution.t0) : Number(execution.currentTime);
    }

    graphBounds() {
      const model = this._state.rawModel;
      let minX = 0;
      let minY = 0;
      let maxX = 800;
      let maxY = 600;
      (model?.nodes || []).forEach((node) => {
        const w = Number(node?.width) || 120;
        const h = Number(node?.height) || 70;
        const x = Number(node?.x) || 0;
        const y = Number(node?.y) || 0;
        minX = Math.min(minX, x - w / 2 - 40);
        minY = Math.min(minY, y - h / 2 - 40);
        maxX = Math.max(maxX, x + w / 2 + 40);
        maxY = Math.max(maxY, y + h / 2 + 40);
      });
      (model?.widgets || []).forEach((widget) => {
        minX = Math.min(minX, widget.x - 20);
        minY = Math.min(minY, widget.y - 20);
        maxX = Math.max(maxX, widget.x + widget.width + 20);
        maxY = Math.max(maxY, widget.y + widget.height + 20);
      });
      return { minX, minY, width: maxX - minX, height: maxY - minY };
    }

    renderAll() {
      if (!this.$svg || !this._state.rawModel) {
        return;
      }
      this.refreshStaticTexts();
      this.applyStatus();
      this.renderGraph();
      this.renderWidgets();
      this.updateControlState();
      this.applyPendingViewport();
    }

    async refreshPreview(options = {}) {
      const { resetHistory = false } = options;
      const runtimeModel = this._state.runtimeModel;
      const runtimeSession = this._state.runtimeSession;
      if (!runtimeModel || !runtimeSession) {
        return;
      }
      const execution = runtimeModel.execution;
      const previewTime = execution.currentTime == null ? Number(execution.t0) : Number(execution.currentTime);
      if (!Number.isFinite(previewTime)) {
        return;
      }
      const originalTime = execution.currentTime;
      if (resetHistory) {
        this.clearWidgetHistory();
      }
      this._state.suppressWidgetHistory = true;
      try {
        if (originalTime == null) {
          runtimeSession.clearSubmodelState();
          runtimeSession.initializeAt(previewTime);
        }
        runtimeSession.evaluateAtTime(previewTime, {
          rootExecution: execution,
          stack: [],
        });
      } finally {
        execution.currentTime = originalTime;
        this._state.suppressWidgetHistory = false;
      }
      this.syncRuntimeToView();
    }

    queuePreviewRefresh(phase = "input") {
      void this.refreshPreview()
        .then(() => this.renderAll())
        .catch((err) => {
          const message = err?.message || this.t("error.evalReason.runtime");
          this.setStatus(message, true);
          this.dispatchPlayerEvent("stgraphx-error", { phase, message });
        });
    }

    applyPendingViewport() {
      const viewport = this._state.pendingViewport;
      if (!viewport || !this.$canvas) {
        return;
      }
      this._state.pendingViewport = null;
      requestAnimationFrame(() => {
        if (!this.$canvas) {
          return;
        }
        this.$canvas.scrollLeft = viewport.scrollLeft;
        this.$canvas.scrollTop = viewport.scrollTop;
      });
    }

    renderGraph() {
      const model = this._state.rawModel;
      const bounds = this.graphBounds();
      const zoom = this._zoom;
      this.$canvasContent.style.width = `${bounds.width * zoom}px`;
      this.$canvasContent.style.height = `${bounds.height * zoom}px`;
      this.$svg.setAttribute("viewBox", `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
      this.$svg.setAttribute("width", String(bounds.width * zoom));
      this.$svg.setAttribute("height", String(bounds.height * zoom));
      this.$svg.innerHTML = "";

      const defs = document.createElementNS(SVG_NS, "defs");
      const marker = document.createElementNS(SVG_NS, "marker");
      marker.setAttribute("id", "player-arrow");
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "9");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("orient", "auto-start-reverse");
      const arrowPath = document.createElementNS(SVG_NS, "path");
      arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      arrowPath.setAttribute("fill", "#6e8398");
      marker.appendChild(arrowPath);
      defs.appendChild(marker);
      this.$svg.appendChild(defs);

      (model.edges || []).forEach((edge) => {
        const from = (model.nodes || []).find((node) => node.id === edge.from);
        const to = (model.nodes || []).find((node) => node.id === edge.to);
        if (!from || !to) {
          return;
        }
        const path = document.createElementNS(SVG_NS, "path");
        const points = [{ x: from.x, y: from.y }, ...(edge.controlPoints || []), { x: to.x, y: to.y }];
        path.setAttribute("d", `M ${points.map((pt) => `${pt.x} ${pt.y}`).join(" L ")}`);
        path.setAttribute("class", "edge");
        path.setAttribute("marker-end", "url(#player-arrow)");
        this.$svg.appendChild(path);
      });

      (model.nodes || []).forEach((node) => {
        const g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("class", `node ${node.type || "state"}${node.__runtimeError ? " error" : ""}${node.output ? " output" : ""}`);
        let shape;
        if (node.type === "algebraic") {
          shape = document.createElementNS(SVG_NS, "ellipse");
          shape.setAttribute("cx", node.x);
          shape.setAttribute("cy", node.y);
          shape.setAttribute("rx", (node.width || 120) / 2);
          shape.setAttribute("ry", (node.height || 70) / 2);
        } else if (node.type === "parameter") {
          shape = document.createElementNS(SVG_NS, "polygon");
          const hw = (node.width || 120) / 2;
          const hh = (node.height || 70) / 2;
          shape.setAttribute("points", `${node.x},${node.y - hh} ${node.x + hw},${node.y} ${node.x},${node.y + hh} ${node.x - hw},${node.y}`);
        } else {
          shape = document.createElementNS(SVG_NS, "rect");
          shape.setAttribute("x", String(node.x - (node.width || 120) / 2));
          shape.setAttribute("y", String(node.y - (node.height || 70) / 2));
          shape.setAttribute("width", String(node.width || 120));
          shape.setAttribute("height", String(node.height || 70));
          shape.setAttribute("rx", node.type === "submodel" ? "4" : "8");
        }
        shape.setAttribute("class", "node-shape");
        const label = document.createElementNS(SVG_NS, "text");
        label.setAttribute("class", "node-label");
        label.setAttribute("x", node.x);
        label.setAttribute("y", node.y - 5);
        label.textContent = node.name;
        g.appendChild(shape);
        g.appendChild(label);
        this.$svg.appendChild(g);
      });

      (model.textItems || []).forEach((item) => {
        const g = document.createElementNS(SVG_NS, "g");
        g.setAttribute("transform", `translate(${Number(item.x) || 0}, ${Number(item.y) || 0})`);
        const frame = document.createElementNS(SVG_NS, "rect");
        frame.setAttribute("class", "canvas-text-frame");
        frame.setAttribute("x", "0");
        frame.setAttribute("y", "0");
        frame.setAttribute("width", String(Number(item.width) || 220));
        frame.setAttribute("height", String(Number(item.height) || 120));
        frame.setAttribute("rx", "6");
        frame.setAttribute("ry", "6");
        const foreignObject = document.createElementNS(SVG_NS, "foreignObject");
        foreignObject.setAttribute("x", "0");
        foreignObject.setAttribute("y", "0");
        foreignObject.setAttribute("width", String(Number(item.width) || 220));
        foreignObject.setAttribute("height", String(Number(item.height) || 120));
        foreignObject.setAttribute("class", "canvas-text-fo");
        const div = document.createElement("div");
        div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        div.className = "canvas-text-content";
        div.innerHTML = canvasTextDisplayHtml(item);
        foreignObject.appendChild(div);
        g.appendChild(frame);
        g.appendChild(foreignObject);
        this.$svg.appendChild(g);
      });
    }

    renderWidgets() {
      const model = this._state.rawModel;
      const bounds = this.graphBounds();
      const zoom = this._zoom;
      this.$widgets.innerHTML = "";
      (model.widgets || []).forEach((widget) => {
        const root = document.createElement("div");
        root.className = "widget";
        root.style.setProperty("--widget-scale", String(zoom));
        root.style.left = `${(widget.x - bounds.minX) * zoom}px`;
        root.style.top = `${(widget.y - bounds.minY) * zoom}px`;
        root.style.width = `${widget.width * zoom}px`;
        root.style.height = `${widget.height * zoom}px`;
        const header = document.createElement("div");
        header.className = "widget-header";
        header.textContent = widgetTitle(widget, this.t.bind(this));
        header.title = header.textContent;
        const body = document.createElement("div");
        body.className = "widget-body";
        this.renderWidgetBody(body, widget);
        root.appendChild(header);
        root.appendChild(body);
        this.$widgets.appendChild(root);
      });
    }

    renderWidgetBody(body, widget) {
      const model = this._state.runtimeModel;
      const execution = model.execution;
      const nodeMap = buildNodeMap(model);
      const widgetState = this._state.widgetState.get(widget.id) || null;
      if (widget.type === "text") {
        const node = nodeMap.get(widget.source);
        const value = node?.computedValue;
        const mapping = widget.mappings.find((item) => Number(item.value) === Number(value));
        const content = document.createElement("div");
        content.className = "widget-value";
        content.textContent = mapping ? mapping.label : formatValue(execution, value);
        body.appendChild(content);
        return;
      }
      if (widget.type === "led") {
        const node = nodeMap.get(widget.source);
        const wrap = document.createElement("div");
        wrap.className = "led-wrap";
        const led = document.createElement("div");
        led.className = `led${coerceTruthy(node?.computedValue) ? " on" : ""}`;
        const text = document.createElement("div");
        text.textContent = formatValue(execution, node?.computedValue);
        wrap.appendChild(led);
        wrap.appendChild(text);
        body.appendChild(wrap);
        return;
      }
      if (widget.type === "matrix") {
        const node = nodeMap.get(widget.source);
        if (!node || !widget.source) {
          body.innerHTML = `<div class="empty">${this.t("widget.matrixEmpty")}</div>`;
          return;
        }
        if (node.computedError) {
          if (Array.isArray(widget.lastMatrixValue)) {
            const fallbackMatrix = widget.lastMatrixValue;
            const fallbackGrid = document.createElement("div");
            fallbackGrid.className = "empty";
            fallbackGrid.textContent = this.t("text.valueError", { reason: this.t(`error.evalReason.${node.computedError || "runtime"}`) });
            body.appendChild(fallbackGrid);
          } else {
            body.innerHTML = `<div class="empty">${this.t("text.valueError", { reason: this.t(`error.evalReason.${node.computedError || "runtime"}`) })}</div>`;
          }
          return;
        }
        const matrix = coerceMatrixValue(node?.computedValue);
        if (!matrix.length) {
          body.innerHTML = `<div class="empty">—</div>`;
          return;
        }
        widget.lastMatrixValue = matrix;
        const canvas = document.createElement("canvas");
        canvas.style.display = "block";
        canvas.style.imageRendering = "pixelated";
        canvas.style.background = "#ffffff";
        canvas.style.border = "1px solid #e1e9f1";
        canvas.style.boxSizing = "border-box";
        drawMatrixWidgetCanvas(canvas, widget, matrix, execution, this._zoom);
        body.appendChild(canvas);
        return;
      }
      if (widget.type === "table") {
        const rows = Array.isArray(widgetState?.rows) ? widgetState.rows : [];
        const table = document.createElement("table");
        table.className = "widget-table";
        const thead = document.createElement("thead");
        const headRow = document.createElement("tr");
        widget.columns.forEach((name) => {
          const th = document.createElement("th");
          th.textContent = name;
          headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        rows.slice(-50).forEach((row) => {
          const tr = document.createElement("tr");
          widget.columns.forEach((name) => {
            const td = document.createElement("td");
            td.textContent = name === "time"
              ? formatNumberValue(execution, Number(row.time))
              : String(row.values?.[name] ?? "");
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        body.appendChild(table);
        return;
      }
      if (widget.type === "xychart") {
        const canvas = document.createElement("canvas");
        canvas.style.display = "block";
        canvas.width = Math.max(160, Math.floor(widget.width * this._zoom - 24));
        canvas.height = Math.max(120, Math.floor(widget.height * this._zoom - 54));
        drawSimpleXYChart(canvas, widgetState?.pairs || widget.xyPairs || [], execution);
        body.appendChild(canvas);
        return;
      }
      if (widget.type === "slider") {
        const wrap = document.createElement("div");
        wrap.className = "input-wrap";
        const range = document.createElement("input");
        range.type = "range";
        range.min = String(widget.min);
        range.max = String(widget.max);
        range.step = String(widget.step);
        range.value = String(this._state.inputValues.get(widget.source) ?? widget.value ?? 0);
        const number = document.createElement("input");
        number.type = "number";
        number.min = String(widget.min);
        number.max = String(widget.max);
        number.step = String(widget.step);
        number.value = range.value;
        const commit = (nextValue) => {
          const numeric = Number(nextValue);
          this._state.inputValues.set(widget.source, numeric);
          widget.value = numeric;
          range.value = String(numeric);
          number.value = String(numeric);
        };
        const commitAndRefresh = (nextValue) => {
          commit(nextValue);
          this.queuePreviewRefresh("input");
        };
        range.disabled = this._timedState.timedStepRunning || this._timedState.timedRunHandle != null;
        number.disabled = range.disabled;
        range.addEventListener("input", () => commit(range.value));
        range.addEventListener("change", () => commitAndRefresh(range.value));
        number.addEventListener("change", () => commitAndRefresh(number.value));
        wrap.appendChild(range);
        wrap.appendChild(number);
        body.appendChild(wrap);
        return;
      }
      if (widget.type === "button") {
        const button = document.createElement("button");
        const current = Boolean(this._state.inputValues.get(widget.source) ?? (widget.value ? 1 : 0));
        button.type = "button";
        button.className = `toggle-btn${current ? " on" : ""}`;
        button.textContent = current ? this.t("widget.buttonState.true") : this.t("widget.buttonState.false");
        button.disabled = this._timedState.timedStepRunning || this._timedState.timedRunHandle != null;
        button.addEventListener("click", () => {
          const next = current ? 0 : 1;
          this._state.inputValues.set(widget.source, next);
          widget.value = next === 1;
          this.queuePreviewRefresh("input");
        });
        body.appendChild(button);
        return;
      }
      if (widget.type === "select") {
        const wrap = document.createElement("div");
        wrap.className = "input-wrap";
        const select = document.createElement("select");
        const current = Number(this._state.inputValues.get(widget.source) ?? widget.value ?? 0);
        widget.options.forEach((option) => {
          const opt = document.createElement("option");
          opt.value = String(option.value);
          opt.textContent = option.label;
          select.appendChild(opt);
        });
        select.value = String(current);
        select.disabled = this._timedState.timedStepRunning || this._timedState.timedRunHandle != null;
        select.addEventListener("change", () => {
          const next = Number(select.value);
          this._state.inputValues.set(widget.source, next);
          widget.value = next;
          this.queuePreviewRefresh("input");
        });
        wrap.appendChild(select);
        body.appendChild(wrap);
        return;
      }
      body.innerHTML = `<div class="empty">${widget.type}</div>`;
    }
  }

  if (!global.customElements.get("stgraphx-player")) {
    global.customElements.define("stgraphx-player", STGraphXPlayer);
  }
})(window);
