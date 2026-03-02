const svg = document.getElementById("graphCanvas");
const graphViewport = document.getElementById("graphViewport");
const sidebar = document.getElementById("sidebar");
const statusText = document.getElementById("statusText");
const fileStatusText = document.getElementById("fileStatusText");
const topMenuBar = document.getElementById("topMenuBar");
const menuRoots = Array.from(document.querySelectorAll(".menu-root"));
const menuTitles = Array.from(document.querySelectorAll(".menu-title"));
const menuCommands = Array.from(document.querySelectorAll(".menu-command"));
const addRectNodeItem = document.getElementById("addRectNodeItem");
const addEllipseNodeItem = document.getElementById("addEllipseNodeItem");
const addDiamondNodeItem = document.getElementById("addDiamondNodeItem");
const addSliderWidgetItem = document.getElementById("addSliderWidgetItem");
const addTableWidgetItem = document.getElementById("addTableWidgetItem");
const addXYChartWidgetItem = document.getElementById("addXYChartWidgetItem");
const fitContentItem = document.getElementById("fitContentItem");
const zoomInItem = document.getElementById("zoomInItem");
const zoomOutItem = document.getElementById("zoomOutItem");
const zoomResetItem = document.getElementById("zoomResetItem");
const toggleGraphItem = document.getElementById("toggleGraphItem");
const toggleWidgetsItem = document.getElementById("toggleWidgetsItem");
const toggleGraphBtn = document.getElementById("toggleGraphBtn");
const toggleWidgetsBtn = document.getElementById("toggleWidgetsBtn");
const runEvalBtn = document.getElementById("runEvalBtn");
const runStepBtn = document.getElementById("runStepBtn");
const runTimedToggleBtn = document.getElementById("runTimedToggleBtn");
const runResetBtn = document.getElementById("runResetBtn");
const cutBtn = document.getElementById("cutBtn");
const copyBtn = document.getElementById("copyBtn");
const pasteBtn = document.getElementById("pasteBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const deleteBtn = document.getElementById("deleteBtn");
const newGraphBtn = document.getElementById("newGraphBtn");
const saveJsonBtn = document.getElementById("saveJsonBtn");
const saveAsJsonBtn = document.getElementById("saveAsJsonBtn");
const loadJsonBtn = document.getElementById("loadJsonBtn");
const loadJsonInput = document.getElementById("loadJsonInput");
const snapToGridInput = document.getElementById("snapToGridInput");
const gridSizeInput = document.getElementById("gridSizeInput");

const noSelection = document.getElementById("noSelection");
const globalPanel = document.getElementById("globalPanel");
const nodePanel = document.getElementById("nodePanel");
const edgePanel = document.getElementById("edgePanel");
const widgetPanel = document.getElementById("widgetPanel");
const widgetPanelTitle = document.getElementById("widgetPanelTitle");
const modelTitleInput = document.getElementById("modelTitleInput");
const timeStartInput = document.getElementById("timeStartInput");
const timeStepInput = document.getElementById("timeStepInput");
const timeEndInput = document.getElementById("timeEndInput");
const timeDelayInput = document.getElementById("timeDelayInput");
const decimalDigitsInput = document.getElementById("decimalDigitsInput");
const timeCurrentOutput = document.getElementById("timeCurrentOutput");
const modelPropsList = document.getElementById("modelPropsList");
const addModelPropBtn = document.getElementById("addModelPropBtn");
const runFullModelBtn = document.getElementById("runFullModelBtn");
const manualStepBtn = document.getElementById("manualStepBtn");
const timedToggleBtn = document.getElementById("timedToggleBtn");
const resetExecBtn = document.getElementById("resetExecBtn");

const nodeNameInput = document.getElementById("nodeNameInput");
const nodeShapeInput = document.getElementById("nodeShapeInput");
const nodeInputInput = document.getElementById("nodeInputInput");
const nodeInputLabel = nodeInputInput?.closest("label");
const nodeOutputInput = document.getElementById("nodeOutputInput");
const nodeValueExprLabel = document.getElementById("nodeValueExprLabel");
const nodeValueExprInput = document.getElementById("nodeValueExprInput");
const editNodeValueExprBtn = document.getElementById("editNodeValueExprBtn");
const nodeValueExprStatus = document.getElementById("nodeValueExprStatus");
const nodeInitialStateLabel = document.getElementById("nodeInitialStateLabel");
const nodeInitialStateInput = document.getElementById("nodeInitialStateInput");
const editNodeInitialStateBtn = document.getElementById("editNodeInitialStateBtn");
const nodeInitialStateStatus = document.getElementById("nodeInitialStateStatus");
const nodeValueOutput = document.getElementById("nodeValueOutput");
const propsList = document.getElementById("propsList");
const addPropBtn = document.getElementById("addPropBtn");

const edgeInfo = document.getElementById("edgeInfo");
const widgetConfig = document.getElementById("widgetConfig");
const contextMenu = document.getElementById("contextMenu");
const canvasContent = document.getElementById("canvasContent");
const widgetLayer = document.getElementById("widgetLayer");
const expressionEditorModal = document.getElementById("expressionEditorModal");
const expressionEditorTitle = document.getElementById("expressionEditorTitle");
const expressionEditorTextarea = document.getElementById("expressionEditorTextarea");
const expressionAutocomplete = document.getElementById("expressionAutocomplete");
const expressionHelp = document.getElementById("expressionHelp");
const expressionEditorHint = document.getElementById("expressionEditorHint");
const expressionEditorStatus = document.getElementById("expressionEditorStatus");
const expressionEditorCloseBtn = document.getElementById("expressionEditorCloseBtn");
const expressionEditorCancelBtn = document.getElementById("expressionEditorCancelBtn");
const expressionEditorApplyBtn = document.getElementById("expressionEditorApplyBtn");

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_HISTORY = 100;
const BASE_CANVAS_WIDTH = 1200;
const BASE_CANVAS_HEIGHT = 800;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const SUPPORTED_LANGS = new Set(["it", "en"]);
const CHART_SERIES_PALETTE = ["#0e7ac4", "#e67e22", "#27ae60", "#8e44ad", "#c0392b", "#16a085"];

let nodeCounter = 1;
let edgeCounter = 1;
let widgetCounter = 1;
let currentLang = "it";
let i18n = {};
let lastSavedSnapshot = "";
let currentFileHandle = null;
let currentFileName = "";
let dirtySinceLastSave = false;
let fileStatusRefreshTimer = null;

const graph = {
  modelTitle: "",
  properties: [],
  nodes: [],
  edges: [],
  widgets: [],
  execution: {
    t0: 0,
    dt: 1,
    t1: 10,
    delayMs: 1000,
    decimals: 3,
    currentTime: null,
  },
};

const ui = {
  selected: null,
  selectedNodes: new Set(),
  selectedControlPoint: null,
  lastControlPointTap: null,
  drag: null,
  resize: null,
  edgeCreate: null,
  edgeCreateHoverId: null,
  edgeCreateLastPoint: null,
  controlPointDrag: null,
  marquee: null,
  snapToGrid: true,
  gridSize: 20,
  zoom: 1,
  nodeNameEditStart: null,
  timedRunHandle: null,
  widgetDrag: null,
  widgetResize: null,
  sliderInteraction: null,
  showGraph: true,
  showWidgets: true,
  expressionEditor: null,
};

const history = {
  undo: [],
  redo: [],
  transactionStart: null,
};

const clipboard = {
  data: null,
  pasteCount: 0,
};

const defs = document.createElementNS(SVG_NS, "defs");
const marker = document.createElementNS(SVG_NS, "marker");
marker.setAttribute("id", "arrow");
marker.setAttribute("viewBox", "0 0 10 10");
marker.setAttribute("refX", "9");
marker.setAttribute("refY", "5");
marker.setAttribute("markerWidth", "8");
marker.setAttribute("markerHeight", "8");
marker.setAttribute("orient", "auto-start-reverse");
const arrowPath = document.createElementNS(SVG_NS, "path");
arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
arrowPath.setAttribute("fill", "#3b4e61");
marker.appendChild(arrowPath);
defs.appendChild(marker);
svg.appendChild(defs);

const edgesLayer = document.createElementNS(SVG_NS, "g");
const previewLayer = document.createElementNS(SVG_NS, "g");
const marqueeLayer = document.createElementNS(SVG_NS, "g");
const nodesLayer = document.createElementNS(SVG_NS, "g");
const controlsLayer = document.createElementNS(SVG_NS, "g");
svg.appendChild(edgesLayer);
svg.appendChild(previewLayer);
svg.appendChild(nodesLayer);
svg.appendChild(controlsLayer);
svg.appendChild(marqueeLayer);
const semantics = window.GraphSemantics;

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function svgPointFromClient(clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function snap(value) {
  if (!ui.snapToGrid) {
    return value;
  }
  return Math.round(value / ui.gridSize) * ui.gridSize;
}

function snapPoint(p) {
  return { x: snap(p.x), y: snap(p.y) };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function parseProperties(text) {
  const out = {};
  text.split(/\r?\n/).forEach((lineRaw) => {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) {
      return;
    }
    const idx = line.indexOf("=");
    if (idx < 0) {
      return;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) {
      out[key] = value;
    }
  });
  return out;
}

function resolveLangFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("lang") || "it").trim().toLowerCase();
  const base = raw.split("-")[0];
  if (SUPPORTED_LANGS.has(raw)) {
    return raw;
  }
  if (SUPPORTED_LANGS.has(base)) {
    return base;
  }
  return "it";
}

function fillTemplate(template, vars = {}) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return `{${name}}`;
  });
}

function t(key, vars = null) {
  const value = i18n[key] ?? key;
  return vars ? fillTemplate(value, vars) : value;
}

function hideExpressionStatus(statusEl) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = "";
  statusEl.classList.add("hidden");
  statusEl.classList.remove("ok", "error");
}

function showExpressionStatus(statusEl, syntaxResult, showOk = true) {
  if (!statusEl) {
    return;
  }
  if (!syntaxResult || syntaxResult.empty) {
    hideExpressionStatus(statusEl);
    return;
  }
  statusEl.classList.remove("hidden", "ok", "error");
  if (syntaxResult.ok) {
    if (!showOk) {
      hideExpressionStatus(statusEl);
      return;
    }
    statusEl.classList.add("ok");
    statusEl.textContent = t("expr.syntaxOk");
    return;
  }
  statusEl.classList.add("error");
  statusEl.textContent = t("expr.syntaxError", {
    message: localizeExpressionErrorMessage(syntaxResult.message || t("error.evalReason.syntax")),
  });
}

function localizeExpressionErrorMessage(message) {
  const raw = String(message ?? "").trim();
  if (!raw) {
    return t("error.evalReason.syntax");
  }
  const lower = raw.toLowerCase();
  if (lower === "'this' is only available in state transitions") {
    return t("expr.error.thisOnlyState");
  }
  if (lower === "'integral' is only available in state transitions") {
    return t("expr.error.integralOnlyState");
  }
  if (lower.includes("missing ) after argument list") || lower.includes("missing ) in parenthetical")) {
    return t("expr.error.missingCloseParen");
  }
  if (lower.includes("missing ] after element list")) {
    return t("expr.error.missingCloseBracket");
  }
  if (lower.includes("missing } after property list")) {
    return t("expr.error.missingCloseBrace");
  }
  if (lower.includes("unexpected end of input")) {
    return t("expr.error.unexpectedEnd");
  }
  if (lower.includes("unexpected token")) {
    return t("expr.error.unexpectedToken");
  }
  if (lower.includes("invalid or unexpected token")) {
    return t("expr.error.invalidToken");
  }
  if (lower.includes("unterminated string") || lower.includes("string literal contains an unescaped line break")) {
    return t("expr.error.unterminatedString");
  }
  if (lower.includes("missing : after property id")) {
    return t("expr.error.objectColon");
  }
  return raw;
}

function validateExpressionDraft(value, fieldKey = null) {
  const text = String(value ?? "");
  if (!text.trim()) {
    return { ok: true, empty: true };
  }
  const modalMeta = ui.expressionEditor ? expressionEditorMeta() : null;
  const meta = modalMeta || (fieldKey ? expressionFieldMeta(fieldKey) : null);
  const node = modalMeta
    ? getNodeById(ui.expressionEditor.nodeId)
    : selectedNodeForSidebar();
  const allowStateTransitionOnly = Boolean(meta && meta.key === "value" && node && isStateNode(node));
  const result = semantics.validateExpressionSyntax(text, [], {
    allowThisAlias: allowStateTransitionOnly,
    allowIntegral: allowStateTransitionOnly,
  });
  return result.ok
    ? { ok: true, empty: false }
    : { ok: false, empty: false, message: localizeExpressionErrorMessage(result.message || t("error.evalReason.syntax")) };
}

function updateExpressionFieldState(inputEl, statusEl, value, showOk = false, fieldKey = null) {
  if (!inputEl) {
    return { ok: true, empty: true };
  }
  const syntaxResult = validateExpressionDraft(value, fieldKey);
  inputEl.classList.toggle("invalid", !syntaxResult.ok);
  showExpressionStatus(statusEl, syntaxResult, showOk);
  return syntaxResult;
}

function selectedNodeForSidebar() {
  if (ui.selectedNodes.size !== 1) {
    return null;
  }
  const nodeId = [...ui.selectedNodes][0];
  return getNodeById(nodeId) || null;
}

function expressionFieldMeta(fieldKey, node = selectedNodeForSidebar()) {
  if (!node) {
    return null;
  }
  if (fieldKey === "value") {
    const title = node.shape === "diamond"
      ? t("label.value")
      : (isStateNode(node) ? t("label.stateTransition") : t("label.behaviorFunction"));
    return {
      key: "value",
      title,
      value: String(node.valueExpression ?? ""),
      setValue: (nextValue) => {
        node.valueExpression = String(nextValue ?? "");
      },
      inputEl: nodeValueExprInput,
      statusEl: nodeValueExprStatus,
    };
  }
  if (fieldKey === "initial" && isStateNode(node)) {
    return {
      key: "initial",
      title: t("label.initialState"),
      value: String(node.initialStateExpression ?? "0"),
      setValue: (nextValue) => {
        node.initialStateExpression = String(nextValue ?? "");
      },
      inputEl: nodeInitialStateInput,
      statusEl: nodeInitialStateStatus,
    };
  }
  return null;
}

function expressionEditorMeta() {
  if (!ui.expressionEditor) {
    return null;
  }
  const node = getNodeById(ui.expressionEditor.nodeId);
  return expressionFieldMeta(ui.expressionEditor.fieldKey, node);
}

function expressionDocMap() {
  return {
    this: { kind: "variable", signature: "this", description: t("expr.help.this") },
    time: { kind: "variable", signature: "time", description: t("expr.help.time") },
    t0: { kind: "variable", signature: "t0", description: t("expr.help.t0") },
    t1: { kind: "variable", signature: "t1", description: t("expr.help.t1") },
    dt: { kind: "variable", signature: "dt", description: t("expr.help.dt") },
    if: { kind: "function", signature: "if(condition, whenTrue, whenFalse)", description: t("expr.help.if"), insertText: "if()", cursorOffset: 3 },
    integral: { kind: "function", signature: "integral(x)", description: t("expr.help.integral"), insertText: "integral()", cursorOffset: 9 },
    getProperty: { kind: "property", signature: "getProperty(name, fallback)", description: t("expr.help.getProperty"), insertText: "getProperty()", cursorOffset: 12 },
    setProperty: { kind: "property", signature: "setProperty(name, value)", description: t("expr.help.setProperty"), insertText: "setProperty()", cursorOffset: 12 },
    getModelProperty: { kind: "property", signature: "getModelProperty(name, fallback)", description: t("expr.help.getModelProperty"), insertText: "getModelProperty()", cursorOffset: 17 },
    setModelProperty: { kind: "property", signature: "setModelProperty(name, value)", description: t("expr.help.setModelProperty"), insertText: "setModelProperty()", cursorOffset: 17 },
    gaussian: { kind: "function", signature: "gaussian([params], x, mode)", description: t("expr.help.gaussian"), insertText: "gaussian()", cursorOffset: 9 },
    uniform: { kind: "function", signature: "uniform([params], x, mode)", description: t("expr.help.uniform"), insertText: "uniform()", cursorOffset: 8 },
    exponential: { kind: "function", signature: "exponential([params], x, mode)", description: t("expr.help.exponential"), insertText: "exponential()", cursorOffset: 12 },
    rand: { kind: "function", signature: "rand()", description: t("expr.help.rand"), insertText: "rand()", cursorOffset: 4 },
    random: { kind: "function", signature: "random()", description: t("expr.help.rand"), insertText: "random()", cursorOffset: 6 },
    sin: { kind: "math", signature: "sin(x)", description: t("expr.help.sin"), insertText: "sin()", cursorOffset: 4 },
    cos: { kind: "math", signature: "cos(x)", description: t("expr.help.cos"), insertText: "cos()", cursorOffset: 4 },
    tan: { kind: "math", signature: "tan(x)", description: t("expr.help.tan"), insertText: "tan()", cursorOffset: 4 },
    asin: { kind: "math", signature: "asin(x)", description: t("expr.help.asin"), insertText: "asin()", cursorOffset: 5 },
    acos: { kind: "math", signature: "acos(x)", description: t("expr.help.acos"), insertText: "acos()", cursorOffset: 5 },
    atan: { kind: "math", signature: "atan(x)", description: t("expr.help.atan"), insertText: "atan()", cursorOffset: 5 },
    atan2: { kind: "math", signature: "atan2(y, x)", description: t("expr.help.atan2"), insertText: "atan2()", cursorOffset: 6 },
    sinh: { kind: "math", signature: "sinh(x)", description: t("expr.help.sinh"), insertText: "sinh()", cursorOffset: 5 },
    cosh: { kind: "math", signature: "cosh(x)", description: t("expr.help.cosh"), insertText: "cosh()", cursorOffset: 5 },
    tanh: { kind: "math", signature: "tanh(x)", description: t("expr.help.tanh"), insertText: "tanh()", cursorOffset: 5 },
    exp: { kind: "math", signature: "exp(x)", description: t("expr.help.exp"), insertText: "exp()", cursorOffset: 4 },
    log: { kind: "math", signature: "log(x)", description: t("expr.help.log"), insertText: "log()", cursorOffset: 4 },
    log10: { kind: "math", signature: "log10(x)", description: t("expr.help.log10"), insertText: "log10()", cursorOffset: 6 },
    log2: { kind: "math", signature: "log2(x)", description: t("expr.help.log2"), insertText: "log2()", cursorOffset: 5 },
    sqrt: { kind: "math", signature: "sqrt(x)", description: t("expr.help.sqrt"), insertText: "sqrt()", cursorOffset: 5 },
    pow: { kind: "math", signature: "pow(base, exp)", description: t("expr.help.pow"), insertText: "pow()", cursorOffset: 4 },
    abs: { kind: "math", signature: "abs(x)", description: t("expr.help.abs"), insertText: "abs()", cursorOffset: 4 },
    min: { kind: "math", signature: "min(a, b, ...)", description: t("expr.help.min"), insertText: "min()", cursorOffset: 4 },
    max: { kind: "math", signature: "max(a, b, ...)", description: t("expr.help.max"), insertText: "max()", cursorOffset: 4 },
    round: { kind: "math", signature: "round(x)", description: t("expr.help.round"), insertText: "round()", cursorOffset: 6 },
    floor: { kind: "math", signature: "floor(x)", description: t("expr.help.floor"), insertText: "floor()", cursorOffset: 6 },
    ceil: { kind: "math", signature: "ceil(x)", description: t("expr.help.ceil"), insertText: "ceil()", cursorOffset: 5 },
    trunc: { kind: "math", signature: "trunc(x)", description: t("expr.help.trunc"), insertText: "trunc()", cursorOffset: 6 },
    int: { kind: "math", signature: "int(x)", description: t("expr.help.int"), insertText: "int()", cursorOffset: 4 },
    sign: { kind: "math", signature: "sign(x)", description: t("expr.help.sign"), insertText: "sign()", cursorOffset: 5 },
  };
}

function expressionCatalogForEditor() {
  const meta = expressionEditorMeta();
  if (!meta) {
    return [];
  }
  const docs = expressionDocMap();
  const node = getNodeById(ui.expressionEditor.nodeId);
  const allowStateAliases = Boolean(meta.key === "value" && node && isStateNode(node));
  const out = [];
  const seen = new Set();
  const pushEntry = (name, entry) => {
    if (!name || seen.has(name)) {
      return;
    }
    seen.add(name);
    out.push({ name, ...entry });
  };

  Object.entries(docs).forEach(([name, entry]) => {
    if (name === "integral" && !allowStateAliases) {
      return;
    }
    if (name === "this" && !allowStateAliases) {
      return;
    }
    pushEntry(name, entry);
  });

  if (meta.key === "value" && node) {
    graph.edges
      .filter((edge) => edge.to === node.id)
      .map((edge) => getNodeById(edge.from))
      .filter(Boolean)
      .forEach((depNode) => {
        pushEntry(depNode.name, {
          kind: "node",
          signature: depNode.name,
          description: depNode.name,
          insertText: depNode.name,
          cursorOffset: depNode.name.length,
        });
      });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function identifierPrefixAtCaret(text, caret) {
  const src = String(text ?? "");
  const pos = Math.max(0, Math.min(caret, src.length));
  let start = pos;
  while (start > 0 && /[A-Za-z0-9_$]/.test(src[start - 1])) {
    start -= 1;
  }
  const prefix = src.slice(start, pos);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(prefix) ? { start, end: pos, prefix } : null;
}

function identifierAtCaret(text, caret) {
  const src = String(text ?? "");
  const pos = Math.max(0, Math.min(caret, src.length));
  let start = pos;
  while (start > 0 && /[A-Za-z0-9_$]/.test(src[start - 1])) {
    start -= 1;
  }
  let end = pos;
  while (end < src.length && /[A-Za-z0-9_$]/.test(src[end])) {
    end += 1;
  }
  const name = src.slice(start, end);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : "";
}

function setExpressionHelp(entry = null) {
  if (!expressionHelp) {
    return;
  }
  if (!entry) {
    expressionHelp.textContent = t("expr.help.empty");
    return;
  }
  const kindKey = `expr.help.kind.${entry.kind || "function"}`;
  const kindLabel = t(kindKey);
  const lines = [
    `${entry.name}  (${kindLabel})`,
    entry.signature || entry.name,
    entry.description || "",
  ].filter(Boolean);
  expressionHelp.textContent = lines.join("\n");
}

function renderExpressionAutocomplete() {
  if (!expressionAutocomplete || !expressionEditorTextarea) {
    return;
  }
  if (!ui.expressionEditor) {
    expressionAutocomplete.innerHTML = "";
    expressionAutocomplete.classList.add("hidden");
    setExpressionHelp(null);
    return;
  }

  const caret = expressionEditorTextarea.selectionStart ?? 0;
  const tokenInfo = identifierPrefixAtCaret(expressionEditorTextarea.value, caret);
  const exactToken = identifierAtCaret(expressionEditorTextarea.value, caret);
  const allEntries = expressionCatalogForEditor();
  ui.expressionEditor.catalog = allEntries;

  let helpEntry = null;
  if (tokenInfo && tokenInfo.prefix.length > 0) {
    const prefixLower = tokenInfo.prefix.toLowerCase();
    const suggestions = allEntries.filter((entry) => entry.name.toLowerCase().startsWith(prefixLower) && entry.name !== tokenInfo.prefix);
    ui.expressionEditor.completion = {
      tokenStart: tokenInfo.start,
      tokenEnd: tokenInfo.end,
      entries: suggestions.slice(0, 8),
      activeIndex: 0,
    };
    if (ui.expressionEditor.completion.entries.length > 0) {
      expressionAutocomplete.innerHTML = "";
      ui.expressionEditor.completion.entries.forEach((entry, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.toggle("active", idx === ui.expressionEditor.completion.activeIndex);
        btn.innerHTML = `<span class="expr-suggest-name">${entry.name}</span><span class="expr-suggest-meta">${entry.signature || ""}</span>`;
        btn.addEventListener("mouseenter", () => {
          if (!ui.expressionEditor?.completion) {
            return;
          }
          ui.expressionEditor.completion.activeIndex = idx;
          renderExpressionAutocomplete();
        });
        btn.addEventListener("mousedown", (evt) => {
          evt.preventDefault();
          acceptExpressionAutocomplete(idx);
        });
        expressionAutocomplete.appendChild(btn);
      });
      expressionAutocomplete.classList.remove("hidden");
      if (!exactToken) {
        helpEntry = ui.expressionEditor.completion.entries[ui.expressionEditor.completion.activeIndex] || null;
      }
    } else {
      expressionAutocomplete.innerHTML = "";
      expressionAutocomplete.classList.add("hidden");
    }
  } else {
    ui.expressionEditor.completion = null;
    expressionAutocomplete.innerHTML = "";
    expressionAutocomplete.classList.add("hidden");
  }

  if (!helpEntry) {
    if (exactToken) {
      helpEntry = allEntries.find((entry) => entry.name === exactToken) || null;
    }
  }
  setExpressionHelp(helpEntry);
}

function acceptExpressionAutocomplete(index = null) {
  if (!ui.expressionEditor?.completion || !expressionEditorTextarea) {
    return false;
  }
  const { entries, activeIndex, tokenStart, tokenEnd } = ui.expressionEditor.completion;
  if (!entries.length) {
    return false;
  }
  const chosen = entries[index == null ? activeIndex : index];
  if (!chosen) {
    return false;
  }
  const replacement = chosen.insertText || chosen.name;
  const before = expressionEditorTextarea.value.slice(0, tokenStart);
  const after = expressionEditorTextarea.value.slice(tokenEnd);
  expressionEditorTextarea.value = `${before}${replacement}${after}`;
  const caret = tokenStart + (chosen.cursorOffset == null ? replacement.length : chosen.cursorOffset);
  expressionEditorTextarea.focus();
  expressionEditorTextarea.setSelectionRange(caret, caret);
  refreshExpressionEditorValidation();
  renderExpressionAutocomplete();
  return true;
}

function closeExpressionEditor() {
  if (!expressionEditorModal) {
    return;
  }
  expressionEditorModal.classList.add("hidden");
  ui.expressionEditor = null;
  if (expressionEditorTextarea) {
    expressionEditorTextarea.value = "";
    expressionEditorTextarea.classList.remove("invalid");
  }
  if (expressionAutocomplete) {
    expressionAutocomplete.innerHTML = "";
    expressionAutocomplete.classList.add("hidden");
  }
  setExpressionHelp(null);
  hideExpressionStatus(expressionEditorStatus);
}

function refreshExpressionEditorValidation() {
  if (!ui.expressionEditor || !expressionEditorTextarea || !expressionEditorApplyBtn) {
    return { ok: true, empty: true };
  }
  if (expressionEditorTitle) {
    const dirty = expressionEditorTextarea.value !== String(ui.expressionEditor.initialValue ?? "");
    expressionEditorTitle.textContent = `${ui.expressionEditor.baseTitle}${dirty ? " *" : ""}`;
  }
  const syntaxResult = updateExpressionFieldState(
    expressionEditorTextarea,
    expressionEditorStatus,
    expressionEditorTextarea.value,
    true,
    null,
  );
  expressionEditorApplyBtn.disabled = !syntaxResult.ok;
  ui.expressionEditor.syntaxOk = syntaxResult.ok;
  renderExpressionAutocomplete();
  return syntaxResult;
}

function lineRangeAroundSelection(textarea) {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  const value = textarea.value;
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd < 0) {
    lineEnd = value.length;
  }
  return { start, end, lineStart, lineEnd };
}

function indentExpressionSelection(textarea, outdent = false) {
  if (!textarea) {
    return;
  }
  const { start, end, lineStart, lineEnd } = lineRangeAroundSelection(textarea);
  const value = textarea.value;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  let removedBeforeStart = 0;
  let removedTotal = 0;
  const nextLines = lines.map((line, idx) => {
    if (!outdent) {
      return `  ${line}`;
    }
    let removed = 0;
    if (line.startsWith("  ")) {
      removed = 2;
    } else if (line.startsWith("\t")) {
      removed = 1;
    } else if (line.startsWith(" ")) {
      removed = 1;
    }
    if (idx === 0) {
      removedBeforeStart = removed;
    }
    removedTotal += removed;
    return line.slice(removed);
  });
  const replacement = nextLines.join("\n");
  textarea.value = `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`;
  if (start === end && !outdent) {
    const caret = start + 2;
    textarea.setSelectionRange(caret, caret);
  } else {
    const nextStart = Math.max(lineStart, start + (outdent ? -removedBeforeStart : 2));
    const delta = outdent ? -removedTotal : (2 * lines.length);
    const nextEnd = Math.max(nextStart, end + delta);
    textarea.setSelectionRange(nextStart, nextEnd);
  }
}

function insertExpressionNewlineWithIndent(textarea) {
  if (!textarea) {
    return;
  }
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? start;
  const value = textarea.value;
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const currentLine = value.slice(lineStart, start);
  const indent = (currentLine.match(/^[ \t]*/) || [""])[0];
  const extraIndent = /[(\[{]$/.test(currentLine.trimEnd()) ? "  " : "";
  const insertion = `\n${indent}${extraIndent}`;
  textarea.value = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
  const caret = start + insertion.length;
  textarea.setSelectionRange(caret, caret);
}

function openExpressionEditor(fieldKey) {
  const node = selectedNodeForSidebar();
  const meta = expressionFieldMeta(fieldKey, node);
  if (!node || !meta || !expressionEditorModal || !expressionEditorTextarea || !expressionEditorTitle) {
    return;
  }
  ui.expressionEditor = {
    nodeId: node.id,
    fieldKey: meta.key,
    syntaxOk: true,
    baseTitle: meta.title,
    initialValue: meta.value,
  };
  expressionEditorTitle.textContent = meta.title;
  expressionEditorTextarea.value = meta.value;
  expressionEditorModal.classList.remove("hidden");
  refreshExpressionEditorValidation();
  expressionEditorTextarea.focus();
  expressionEditorTextarea.select();
}

function applyExpressionEditor() {
  if (!ui.expressionEditor || !ui.expressionEditor.syntaxOk) {
    return;
  }
  const node = getNodeById(ui.expressionEditor.nodeId);
  const meta = expressionFieldMeta(ui.expressionEditor.fieldKey, node);
  if (!node || !meta || !expressionEditorTextarea) {
    closeExpressionEditor();
    return;
  }
  const nextValue = expressionEditorTextarea.value;
  runAction(() => {
    meta.setValue(nextValue);
  });
  if (meta.inputEl && document.activeElement !== meta.inputEl) {
    meta.inputEl.value = nextValue;
  }
  updateExpressionFieldState(meta.inputEl, meta.statusEl, nextValue, false, meta.key);
  closeExpressionEditor();
}

function isFirefoxBrowser() {
  return /firefox/i.test(navigator.userAgent || "");
}

function applyI18nToDom() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) {
      return;
    }
    const text = t(key);
    if (el.tagName === "TITLE") {
      document.title = text;
    } else {
      el.textContent = text;
    }
  });
  updateFileStatusLabel(dirtySinceLastSave);
}

async function loadI18n() {
  currentLang = resolveLangFromUrl();
  try {
    const resp = await fetch(`i18n/messages_${currentLang}.properties`, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    i18n = parseProperties(await resp.text());
  } catch (_err) {
    if (currentLang !== "it") {
      currentLang = "it";
      try {
        const fallback = await fetch("i18n/messages_it.properties", { cache: "no-store" });
        i18n = fallback.ok ? parseProperties(await fallback.text()) : {};
      } catch (_fallbackErr) {
        i18n = {};
      }
    } else {
      i18n = {};
    }
  }
  applyI18nToDom();
  if (!expressionEditorModal?.classList.contains("hidden")) {
    refreshExpressionEditorValidation();
  }
}

function setStatus(text) {
  statusText.textContent = text;
}

function setStatusKey(key, vars = null) {
  setStatus(t(key, vars));
}

function displayFileName() {
  return currentFileName || t("file.unnamed");
}

function updateFileStatusLabel(dirty = dirtySinceLastSave) {
  if (!fileStatusText) {
    return;
  }
  const key = dirty ? "file.status.dirty" : "file.status.clean";
  fileStatusText.textContent = t(key, { name: displayFileName() });
  if (saveJsonBtn) {
    saveJsonBtn.disabled = !dirty;
  }
}

function scheduleFileStatusRefresh() {
  if (fileStatusRefreshTimer != null) {
    return;
  }
  fileStatusRefreshTimer = window.setTimeout(() => {
    fileStatusRefreshTimer = null;
    dirtySinceLastSave = hasUnsavedChanges();
    updateFileStatusLabel(dirtySinceLastSave);
  }, 120);
}

function evalReasonText(reason) {
  return t(`error.evalReason.${reason || "runtime"}`);
}

function clampDisplayDecimals(value) {
  return clamp(Math.round(Number(value) || 0), 0, 12);
}

function formatNumberValue(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const decimals = clampDisplayDecimals(graph.execution.decimals);
  let text = value.toFixed(decimals);
  if (decimals > 0) {
    text = text.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
  }
  if (text === "-0") {
    return "0";
  }
  return text;
}

function formatComputedValue(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number") {
    return formatNumberValue(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatComputedValue(item)).join(", ")}]`;
  }
  return String(value);
}

function normalizeExecutionConfig(raw) {
  const t0 = Number(raw?.t0);
  const dt = Number(raw?.dt);
  const t1 = Number(raw?.t1);
  const delayMs = Number(raw?.delayMs);
  const decimals = Number(raw?.decimals);
  const currentTime = raw?.currentTime;
  return {
    t0: Number.isFinite(t0) ? t0 : 0,
    dt: Number.isFinite(dt) && dt !== 0 ? dt : 1,
    t1: Number.isFinite(t1) ? t1 : 10,
    delayMs: Number.isFinite(delayMs) && delayMs > 0 ? Math.round(delayMs) : 1000,
    decimals: Number.isFinite(decimals) ? clampDisplayDecimals(decimals) : 3,
    currentTime: Number.isFinite(Number(currentTime)) ? Number(currentTime) : null,
  };
}

function propagateNodeRenameInExpressions(oldName, newName) {
  if (!oldName || !newName || oldName === newName) {
    return;
  }
  graph.nodes.forEach((node) => {
    node.valueExpression = semantics.replaceIdentifierInExpression(
      node.valueExpression,
      oldName,
      newName,
    );
    node.initialStateExpression = semantics.replaceIdentifierInExpression(
      node.initialStateExpression,
      oldName,
      newName,
    );
  });
  graph.widgets.forEach((widget) => {
    if (widget.type === "table" && Array.isArray(widget.columns)) {
      widget.columns = widget.columns.map((name) => (name === oldName ? newName : name));
    }
    if (widget.type === "xychart") {
      if (Array.isArray(widget.xyPairs)) {
        widget.xyPairs = widget.xyPairs.map((pair) => ({
          ...pair,
          xSource: pair.xSource === oldName ? newName : pair.xSource,
          ySource: pair.ySource === oldName ? newName : pair.ySource,
        }));
      }
    }
    if (widget.type === "slider" && widget.source === oldName) {
      widget.source = newName;
    }
  });
}

function removeNodeFromAllWidgetDisplays(nodeName) {
  if (!nodeName) {
    return;
  }
  graph.widgets.forEach((widget) => {
    if (widget.type === "table" && Array.isArray(widget.columns)) {
      widget.columns = widget.columns.filter((name) => name !== nodeName);
    }
    if (widget.type === "xychart") {
      if (Array.isArray(widget.xyPairs)) {
        widget.xyPairs = widget.xyPairs.filter((pair) => pair.xSource !== nodeName && pair.ySource !== nodeName);
      }
    }
  });
}

function removeNodeFromSliderBindings(nodeName) {
  if (!nodeName) {
    return;
  }
  graph.widgets.forEach((widget) => {
    if (widget.type === "slider" && widget.source === nodeName) {
      widget.source = "";
    }
  });
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function isStateNode(node) {
  return node?.shape === "rect";
}

function isAlgebraicNode(node) {
  return node?.shape === "ellipse";
}

function nodeHasIncomingEdges(nodeId) {
  return graph.edges.some((edge) => edge.to === nodeId);
}

function canMarkNodeAsInput(node) {
  return isAlgebraicNode(node) && !nodeHasIncomingEdges(node.id);
}

function canBindSliderToNode(node) {
  return Boolean(node && (node.shape === "diamond" || node.input));
}

function normalizeInputNodeFlags() {
  graph.nodes.forEach((node) => {
    if (!canMarkNodeAsInput(node)) {
      node.input = false;
    }
  });
}

function sliderBindableNodeNames() {
  return graph.nodes.filter((node) => canBindSliderToNode(node)).map((node) => node.name);
}

function serializeNodeType(shape) {
  if (shape === "ellipse") {
    return "algebraic";
  }
  if (shape === "diamond") {
    return "parameter";
  }
  return "state";
}

function deserializeNodeType(type) {
  if (type === "algebraic") {
    return "ellipse";
  }
  if (type === "parameter") {
    return "diamond";
  }
  return "rect";
}

function graphBounds() {
  let minX = 0;
  let minY = 0;
  let maxX = BASE_CANVAS_WIDTH;
  let maxY = BASE_CANVAS_HEIGHT;

  graph.nodes.forEach((node) => {
    const hw = node.width / 2;
    const hh = node.height / 2;
    minX = Math.min(minX, node.x - hw);
    minY = Math.min(minY, node.y - hh);
    maxX = Math.max(maxX, node.x + hw);
    maxY = Math.max(maxY, node.y + hh);
  });

  graph.edges.forEach((edge) => {
    (edge.controlPoints || []).forEach((cp) => {
      minX = Math.min(minX, cp.x);
      minY = Math.min(minY, cp.y);
      maxX = Math.max(maxX, cp.x);
      maxY = Math.max(maxY, cp.y);
    });
  });

  const margin = 180;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;

  return {
    minX,
    minY,
    width: Math.max(200, maxX - minX),
    height: Math.max(200, maxY - minY),
  };
}

function updateCanvasSize(anchorClientX = null, anchorClientY = null, force = false) {
  const rect = graphViewport.getBoundingClientRect();
  const ax = anchorClientX ?? rect.left;
  const ay = anchorClientY ?? rect.top;
  const localX = Math.max(0, Math.min(rect.width, ax - rect.left));
  const localY = Math.max(0, Math.min(rect.height, ay - rect.top));

  const oldVB = svg.viewBox.baseVal;
  const oldView = {
    x: oldVB?.x ?? 0,
    y: oldVB?.y ?? 0,
    width: oldVB?.width || BASE_CANVAS_WIDTH,
    height: oldVB?.height || BASE_CANVAS_HEIGHT,
  };

  const oldPixelWidth = svg.clientWidth || Math.round(oldView.width * ui.zoom);
  const oldPixelHeight = svg.clientHeight || Math.round(oldView.height * ui.zoom);
  const oldContentX = graphViewport.scrollLeft + localX;
  const oldContentY = graphViewport.scrollTop + localY;
  const worldX = oldView.x + (oldContentX / Math.max(1, oldPixelWidth)) * oldView.width;
  const worldY = oldView.y + (oldContentY / Math.max(1, oldPixelHeight)) * oldView.height;

  const bounds = graphBounds();
  const zoomedWidth = Math.round(bounds.width * ui.zoom);
  const zoomedHeight = Math.round(bounds.height * ui.zoom);
  const targetWidth = Math.max(1, zoomedWidth);
  const targetHeight = Math.max(1, zoomedHeight);

  const currentWidth = parseInt(svg.style.width, 10) || svg.clientWidth;
  const currentHeight = parseInt(svg.style.height, 10) || svg.clientHeight;
  const sameView =
    Math.abs(oldView.x - bounds.minX) < 0.001 &&
    Math.abs(oldView.y - bounds.minY) < 0.001 &&
    Math.abs(oldView.width - bounds.width) < 0.001 &&
    Math.abs(oldView.height - bounds.height) < 0.001;
  const sameSize = currentWidth === targetWidth && currentHeight === targetHeight;
  if (!force && sameView && sameSize) {
    return;
  }

  svg.setAttribute("viewBox", `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);

  svg.style.width = `${targetWidth}px`;
  svg.style.height = `${targetHeight}px`;

  const newContentX = ((worldX - bounds.minX) / bounds.width) * targetWidth;
  const newContentY = ((worldY - bounds.minY) / bounds.height) * targetHeight;
  graphViewport.scrollLeft = newContentX - localX;
  graphViewport.scrollTop = newContentY - localY;
}

function updateZoomButtons() {
  zoomInItem.disabled = ui.zoom >= MAX_ZOOM;
  zoomOutItem.disabled = ui.zoom <= MIN_ZOOM;
  zoomResetItem.disabled = Math.abs(ui.zoom - 1) < 0.001;
}

function applyCanvasVisibility() {
  svg.style.display = ui.showGraph ? "block" : "none";
  widgetLayer.style.display = ui.showWidgets ? "" : "none";
  const graphLabel = ui.showGraph ? t("view.btn.hideGraph") : t("view.btn.showGraph");
  const widgetsLabel = ui.showWidgets ? t("view.btn.hideWidgets") : t("view.btn.showWidgets");
  if (toggleGraphBtn) {
    toggleGraphBtn.textContent = graphLabel;
  }
  if (toggleWidgetsBtn) {
    toggleWidgetsBtn.textContent = widgetsLabel;
  }
  if (toggleGraphItem) {
    toggleGraphItem.textContent = graphLabel;
  }
  if (toggleWidgetsItem) {
    toggleWidgetsItem.textContent = widgetsLabel;
  }
}

function updateModelRunButtons() {
  if (runFullModelBtn) {
    runFullModelBtn.title = `${t("menu.run.execute")} (F7)`;
  }
  if (manualStepBtn) {
    manualStepBtn.title = `${t("menu.run.step")} (F8)`;
  }
  if (timedToggleBtn) {
    const timedKey = ui.timedRunHandle == null ? "action.timedStart" : "action.timedStop";
    timedToggleBtn.textContent = ui.timedRunHandle == null ? "⏱" : "⏸";
    timedToggleBtn.title = `${t(timedKey)} (F9)`;
  }
  if (resetExecBtn) {
    resetExecBtn.title = `${t("menu.run.reset")} (F10)`;
  }
}

function toggleGraphVisibility() {
  ui.showGraph = !ui.showGraph;
  applyCanvasVisibility();
}

function toggleWidgetsVisibility() {
  ui.showWidgets = !ui.showWidgets;
  applyCanvasVisibility();
}

function applyZoom(nextZoom, anchorClientX = null, anchorClientY = null) {
  const targetZoom = clampZoom(nextZoom);
  if (Math.abs(targetZoom - ui.zoom) < 0.0001) {
    return;
  }

  ui.zoom = targetZoom;
  updateCanvasSize(anchorClientX, anchorClientY, true);
  renderWidgets();

  updateZoomButtons();
  setStatusKey("status.zoom", { value: Math.round(ui.zoom * 100) });
}

function fitToContent() {
  const rect = graphViewport.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) {
    return;
  }

  const bounds = graphBounds();
  const zx = rect.width / Math.max(1, bounds.width);
  const zy = rect.height / Math.max(1, bounds.height);
  ui.zoom = clampZoom(Math.min(zx, zy));
  updateCanvasSize(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
  renderWidgets();

  graphViewport.scrollLeft = Math.max(0, (svg.clientWidth - rect.width) / 2);
  graphViewport.scrollTop = Math.max(0, (svg.clientHeight - rect.height) / 2);

  updateZoomButtons();
  setStatusKey("status.fit", { value: Math.round(ui.zoom * 100) });
}

function closeTopMenus() {
  menuRoots.forEach((root) => root.classList.remove("open"));
}

function toggleTopMenu(root) {
  const wasOpen = root.classList.contains("open");
  closeTopMenus();
  if (!wasOpen) {
    root.classList.add("open");
  }
}

function hideContextMenu() {
  contextMenu.classList.add("hidden");
  contextMenu.innerHTML = "";
}

function showContextMenu(clientX, clientY, items) {
  closeTopMenus();
  contextMenu.innerHTML = "";
  items.forEach((item) => {
    if (item?.separator) {
      const sep = document.createElement("hr");
      sep.className = "context-menu-sep";
      contextMenu.appendChild(sep);
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.label;
    btn.disabled = Boolean(item.disabled);
    btn.addEventListener("click", () => {
      hideContextMenu();
      item.action();
    });
    contextMenu.appendChild(btn);
  });

  contextMenu.classList.remove("hidden");
  const rect = contextMenu.getBoundingClientRect();
  const left = Math.min(clientX, window.innerWidth - rect.width - 8);
  const top = Math.min(clientY, window.innerHeight - rect.height - 8);
  contextMenu.style.left = `${Math.max(8, left)}px`;
  contextMenu.style.top = `${Math.max(8, top)}px`;
}

function getNodeById(id) {
  return graph.nodes.find((n) => n.id === id);
}

function getEdgeById(id) {
  return graph.edges.find((e) => e.id === id);
}

function getWidgetById(id) {
  return graph.widgets.find((w) => w.id === id);
}

function nodeExists(id) {
  return graph.nodes.some((n) => n.id === id);
}

function clearAllSelection() {
  ui.selected = null;
  ui.selectedNodes.clear();
  ui.selectedControlPoint = null;
  ui.lastControlPointTap = null;
}

function syncNodeSelectionFocus() {
  if (ui.selected?.type === "widget") {
    const widget = getWidgetById(ui.selected.id);
    if (!widget) {
      ui.selected = null;
    }
    ui.selectedNodes.clear();
    return;
  }

  ui.selectedNodes = new Set([...ui.selectedNodes].filter(nodeExists));

  if (ui.selected?.type === "edge") {
    ui.selectedNodes.clear();
    return;
  }

  if (ui.selectedNodes.size === 1) {
    const id = [...ui.selectedNodes][0];
    ui.selected = { type: "node", id };
  } else {
    if (ui.selected?.type === "node") {
      ui.selected = null;
    }
  }
}

function selectEdge(id) {
  ui.selected = { type: "edge", id };
  ui.selectedNodes.clear();
  ui.selectedControlPoint = null;
  refreshSidebar();
}

function selectWidget(id) {
  ui.selected = { type: "widget", id };
  ui.selectedNodes.clear();
  ui.selectedControlPoint = null;
  refreshSidebar();
}

function selectSingleNode(id) {
  ui.selected = { type: "node", id };
  ui.selectedNodes = new Set([id]);
  ui.selectedControlPoint = null;
  refreshSidebar();
}

function toggleNodeSelection(id) {
  if (ui.selectedNodes.has(id)) {
    ui.selectedNodes.delete(id);
  } else {
    ui.selectedNodes.add(id);
  }
  ui.selectedControlPoint = null;
  ui.selected = null;
  syncNodeSelectionFocus();
  refreshSidebar();
}

function setNodeSelection(ids, additive = false) {
  if (!additive) {
    ui.selectedNodes.clear();
  }
  ids.forEach((id) => ui.selectedNodes.add(id));
  ui.selected = null;
  ui.selectedControlPoint = null;
  syncNodeSelectionFocus();
  refreshSidebar();
}

function exportGraphData() {
  return {
    version: 1,
    modelTitle: String(graph.modelTitle ?? ""),
    modelProperties: graph.properties.map((p) => ({ key: String(p.key), value: String(p.value) })),
    nodeCounter,
    edgeCounter,
    widgetCounter,
    execution: {
      t0: graph.execution.t0,
      dt: graph.execution.dt,
      t1: graph.execution.t1,
      delayMs: graph.execution.delayMs,
      decimals: clampDisplayDecimals(graph.execution.decimals),
    },
    nodes: graph.nodes.map((n) => {
      const type = serializeNodeType(n.shape);
      const out = {
        id: n.id,
        name: n.name,
        output: Boolean(n.output),
        type,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        properties: n.properties.map((p) => ({ key: String(p.key), value: String(p.value) })),
      };
      if (type === "algebraic") {
        out.input = Boolean(n.input);
        out.valueExpression = String(n.valueExpression ?? "");
      } else if (type === "state") {
        out.stateTransition = String(n.valueExpression ?? "");
        out.initialState = String(n.initialStateExpression ?? "");
      } else {
        out.valueExpression = String(n.valueExpression ?? "");
      }
      return out;
    }),
    edges: graph.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      controlPoints: (e.controlPoints || []).map((cp) => ({ x: cp.x, y: cp.y })),
    })),
    widgets: graph.widgets.map((w) => ({
      id: w.id,
      type: w.type,
      customTitle: String(w.customTitle ?? ""),
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      minimized: Boolean(w.minimized),
      outputOnly: Boolean(w.outputOnly),
      showHistory: Boolean(w.showHistory),
      xMin: Number.isFinite(Number(w.xMin)) ? Number(w.xMin) : null,
      xMax: Number.isFinite(Number(w.xMax)) ? Number(w.xMax) : null,
      yMin: Number.isFinite(Number(w.yMin)) ? Number(w.yMin) : null,
      yMax: Number.isFinite(Number(w.yMax)) ? Number(w.yMax) : null,
      showGrid: w.showGrid !== false,
      source: String(w.source ?? ""),
      min: Number.isFinite(Number(w.min)) ? Number(w.min) : 0,
      max: Number.isFinite(Number(w.max)) ? Number(w.max) : 100,
      step: Number.isFinite(Number(w.step)) ? Number(w.step) : 1,
      value: Number.isFinite(Number(w.value)) ? Number(w.value) : 0,
      columns: Array.isArray(w.columns) ? w.columns.map((c) => String(c)) : [],
      xyPairs: Array.isArray(w.xyPairs)
        ? w.xyPairs.map((pair, idx) => ({
          xSource: String(pair.xSource ?? "time"),
          ySource: String(pair.ySource ?? ""),
          color: /^#[0-9a-fA-F]{6}$/.test(String(pair?.color ?? "")) ? String(pair.color) : defaultChartSeriesColor(idx),
          showLine: pair?.showLine !== false,
          showPoints: pair?.showPoints !== false,
        }))
        : [],
    })),
  };
}

function currentSnapshot() {
  return JSON.stringify(exportGraphData());
}

function markSavedSnapshot() {
  lastSavedSnapshot = currentSnapshot();
  dirtySinceLastSave = false;
  updateFileStatusLabel(false);
}

function hasUnsavedChanges() {
  return currentSnapshot() !== lastSavedSnapshot;
}

function applyGraphData(data) {
  const execCfg = normalizeExecutionConfig(data.execution);
  graph.modelTitle = String(data?.modelTitle ?? "");
  graph.properties = Array.isArray(data?.modelProperties)
    ? data.modelProperties.map((p) => ({ key: String(p?.key ?? ""), value: String(p?.value ?? "") }))
    : [];
  graph.execution = {
    t0: execCfg.t0,
    dt: execCfg.dt,
    t1: execCfg.t1,
    delayMs: execCfg.delayMs,
    decimals: execCfg.decimals,
    currentTime: null,
  };

  graph.nodes = data.nodes.map((n) => {
    const shape = deserializeNodeType(n.type);
    return {
      id: n.id,
      name: n.name,
      input: shape === "ellipse" ? Boolean(n.input) : false,
      output: Boolean(n.output),
      shape,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      valueExpression: shape === "rect"
        ? String(n.stateTransition ?? "this") || "this"
        : String(n.valueExpression ?? ""),
      initialStateExpression: shape === "rect"
        ? String(n.initialState ?? "0")
        : String(n.initialStateExpression ?? ""),
      computedValue: null,
      computedError: "",
      pendingStateValue: null,
      pendingStateError: "",
      properties: n.properties.map((p) => ({ key: p.key, value: p.value })),
    };
  });
  graph.edges = data.edges.map((e) => ({
    id: e.id,
    from: e.from,
    to: e.to,
    controlPoints: (e.controlPoints || []).map((cp) => ({ x: cp.x, y: cp.y })),
  }));
  graph.widgets = Array.isArray(data.widgets)
    ? data.widgets
      .filter((w) => Number.isInteger(w.id) && (w.type === "table" || w.type === "xychart" || w.type === "slider"))
      .map((w) => ({
        id: w.id,
        type: w.type,
        customTitle: String(w.customTitle ?? ""),
        x: Number.isFinite(Number(w.x)) ? Number(w.x) : 40,
        y: Number.isFinite(Number(w.y)) ? Number(w.y) : 40,
        width: clamp(Number(w.width) || 320, 220, 1200),
        height: clamp(Number(w.height) || 160, 110, 900),
        minimized: Boolean(w.minimized),
        outputOnly: Boolean(w.outputOnly),
        showHistory: Boolean(w.showHistory),
        xMin: Number.isFinite(Number(w.xMin)) ? Number(w.xMin) : null,
        xMax: Number.isFinite(Number(w.xMax)) ? Number(w.xMax) : null,
        yMin: Number.isFinite(Number(w.yMin)) ? Number(w.yMin) : null,
        yMax: Number.isFinite(Number(w.yMax)) ? Number(w.yMax) : null,
        showGrid: w.showGrid !== false,
        source: String(w.source ?? ""),
        min: Number.isFinite(Number(w.min)) ? Number(w.min) : 0,
        max: Number.isFinite(Number(w.max)) ? Number(w.max) : 100,
        step: Number.isFinite(Number(w.step)) ? Number(w.step) : 1,
        value: Number.isFinite(Number(w.value)) ? Number(w.value) : 0,
        rows: [],
        columns: Array.isArray(w.columns) ? w.columns.map((c) => String(c)) : [],
        xyPairs: Array.isArray(w.xyPairs)
          ? w.xyPairs.map((pair, idx) => ({
            xSource: String(pair.xSource ?? "time"),
            ySource: String(pair.ySource ?? ""),
            color: /^#[0-9a-fA-F]{6}$/.test(String(pair?.color ?? "")) ? String(pair.color) : defaultChartSeriesColor(idx),
            showLine: pair?.showLine !== false,
            showPoints: pair?.showPoints !== false,
            points: [],
          }))
          : (() => {
            const legacyX = String(w.xSource ?? w.xNode ?? "time");
            const legacyYNodes = Array.isArray(w.yNodes)
              ? w.yNodes.map((n) => String(n))
              : (w.yNode ? [String(w.yNode)] : []);
            return legacyYNodes.map((yNode, idx) => ({
              xSource: legacyX,
              ySource: yNode,
              color: defaultChartSeriesColor(idx),
              showLine: true,
              showPoints: true,
              points: [],
            }));
          })(),
      }))
    : [];

  nodeCounter = Number(data.nodeCounter) || 1;
  edgeCounter = Number(data.edgeCounter) || 1;
  widgetCounter = Number(data.widgetCounter) || 1;
  normalizeInputNodeFlags();
  initializeStateNodes(graph.execution.t0);

  ui.drag = null;
  ui.resize = null;
  ui.edgeCreate = null;
  ui.edgeCreateHoverId = null;
  ui.edgeCreateLastPoint = null;
  ui.controlPointDrag = null;
  ui.marquee = null;
  ui.widgetDrag = null;
  ui.widgetResize = null;
  clearAllSelection();
}

function pushUndoState(state) {
  history.undo.push(deepClone(state));
  if (history.undo.length > MAX_HISTORY) {
    history.undo.shift();
  }
}

function beginTransaction() {
  if (!history.transactionStart) {
    history.transactionStart = exportGraphData();
  }
}

function commitTransaction() {
  if (!history.transactionStart) {
    return;
  }

  const before = JSON.stringify(history.transactionStart);
  const afterState = exportGraphData();
  const after = JSON.stringify(afterState);
  if (before !== after) {
    pushUndoState(history.transactionStart);
    history.redo = [];
    dirtySinceLastSave = true;
    updateFileStatusLabel(true);
  }
  history.transactionStart = null;
  updateHistoryButtons();
}

function cancelTransaction() {
  history.transactionStart = null;
}

function runAction(mutator) {
  beginTransaction();
  mutator();
  commitTransaction();
  render();
}

function updateHistoryButtons() {
  undoBtn.disabled = history.undo.length === 0;
  redoBtn.disabled = history.redo.length === 0;
  pasteBtn.disabled = !clipboard.data;
}

function collectSelectedForClipboard() {
  if (ui.selectedNodes.size === 0) {
    return null;
  }
  const ids = new Set(ui.selectedNodes);
  const nodes = graph.nodes
    .filter((n) => ids.has(n.id))
    .map((n) => ({
      id: n.id,
      name: n.name,
      input: Boolean(n.input),
      output: Boolean(n.output),
      shape: n.shape,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      valueExpression: n.valueExpression,
      initialStateExpression: n.initialStateExpression,
      computedValue: n.computedValue,
      computedError: n.computedError,
      pendingStateValue: n.pendingStateValue,
      pendingStateError: n.pendingStateError,
      properties: n.properties.map((p) => ({ key: p.key, value: p.value })),
    }));
  const edges = graph.edges
    .filter((e) => ids.has(e.from) && ids.has(e.to))
    .map((e) => ({
      from: e.from,
      to: e.to,
      controlPoints: (e.controlPoints || []).map((cp) => ({ x: cp.x, y: cp.y })),
    }));
  return { nodes, edges };
}

function copySelectionToClipboard() {
  const payload = collectSelectedForClipboard();
  if (!payload || payload.nodes.length === 0) {
    setStatusKey("status.clipboardNothingToCopy");
    return false;
  }
  clipboard.data = deepClone(payload);
  clipboard.pasteCount = 0;
  updateHistoryButtons();
  setStatusKey("status.clipboardCopied", { count: payload.nodes.length });
  return true;
}

function cutSelectionToClipboard() {
  const copied = copySelectionToClipboard();
  if (!copied) {
    return;
  }
  removeSelected();
  setStatusKey("status.clipboardCut");
}

function pasteFromClipboard() {
  if (!clipboard.data || !Array.isArray(clipboard.data.nodes) || clipboard.data.nodes.length === 0) {
    setStatusKey("status.clipboardEmpty");
    return;
  }

  const offset = 30 * (clipboard.pasteCount + 1);
  let pastedCount = 0;
  runAction(() => {
    const idMap = new Map();
    const newNodeIds = [];

    clipboard.data.nodes.forEach((n) => {
      const newId = nodeCounter++;
      const uniqueName = semantics.makeUniqueName(graph.nodes, n.name, null, "n");
      const node = {
        id: newId,
        name: uniqueName,
        input: Boolean(n.input),
        output: Boolean(n.output),
        shape: n.shape,
        x: snap(n.x + offset),
        y: snap(n.y + offset),
        width: n.width,
        height: n.height,
        valueExpression: String(n.valueExpression ?? ""),
        initialStateExpression: String(n.initialStateExpression ?? "0"),
        computedValue: n.computedValue ?? null,
        computedError: String(n.computedError ?? ""),
        pendingStateValue: n.pendingStateValue ?? null,
        pendingStateError: String(n.pendingStateError ?? ""),
        properties: (n.properties || []).map((p) => ({ key: String(p.key), value: String(p.value) })),
      };
      graph.nodes.push(node);
      idMap.set(n.id, newId);
      newNodeIds.push(newId);
    });

    clipboard.data.edges.forEach((e) => {
      const from = idMap.get(e.from);
      const to = idMap.get(e.to);
      if (!from || !to || from === to) {
        return;
      }
      graph.edges.push({
        id: edgeCounter++,
        from,
        to,
        controlPoints: (e.controlPoints || []).map((cp) => ({
          x: snap(cp.x + offset),
          y: snap(cp.y + offset),
        })),
      });
    });

    normalizeInputNodeFlags();
    setNodeSelection(newNodeIds, false);
    pastedCount = newNodeIds.length;
  });

  clipboard.pasteCount += 1;
  updateHistoryButtons();
  setStatusKey("status.clipboardPasted", { count: pastedCount });
}

function undo() {
  if (history.undo.length === 0) {
    return;
  }
  const current = exportGraphData();
  history.redo.push(current);
  const prev = history.undo.pop();
  applyGraphData(prev);
  render();
  setStatusKey("status.undo");
  updateHistoryButtons();
}

function redo() {
  if (history.redo.length === 0) {
    return;
  }
  const current = exportGraphData();
  pushUndoState(current);
  const next = history.redo.pop();
  applyGraphData(next);
  render();
  setStatusKey("status.redo");
  updateHistoryButtons();
}

function diamondPoints(node) {
  const w = node.width / 2;
  const h = node.height / 2;
  return [
    `${node.x},${node.y - h}`,
    `${node.x + w},${node.y}`,
    `${node.x},${node.y + h}`,
    `${node.x - w},${node.y}`,
  ].join(" ");
}

function nodeBoundaryPoint(node, targetX, targetY) {
  const dx = targetX - node.x;
  const dy = targetY - node.y;
  if (dx === 0 && dy === 0) {
    return { x: node.x, y: node.y };
  }

  const hw = node.width / 2;
  const hh = node.height / 2;
  let scale = 1;

  if (node.shape === "ellipse") {
    const denom = Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh)) || 1;
    scale = 1 / denom;
  } else if (node.shape === "diamond") {
    const denom = Math.abs(dx) / hw + Math.abs(dy) / hh || 1;
    scale = 1 / denom;
  } else {
    const denom = Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh) || 1;
    scale = 1 / denom;
  }

  return {
    x: node.x + dx * scale,
    y: node.y + dy * scale,
  };
}

function buildSplinePath(points) {
  if (points.length < 2) {
    return "";
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  if (points.length === 3) {
    return `M ${points[0].x} ${points[0].y} Q ${points[1].x} ${points[1].y} ${points[2].x} ${points[2].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const p = points[i];
    const next = points[i + 1];
    if (i < points.length - 2) {
      const mx = (p.x + next.x) / 2;
      const my = (p.y + next.y) / 2;
      d += ` Q ${p.x} ${p.y} ${mx} ${my}`;
    } else {
      d += ` Q ${p.x} ${p.y} ${next.x} ${next.y}`;
    }
  }
  return d;
}

function buildEdgeGeometry(edge) {
  const fromNode = getNodeById(edge.from);
  const toNode = getNodeById(edge.to);
  if (!fromNode || !toNode) {
    return null;
  }

  const cps = edge.controlPoints || [];
  const firstTarget = cps[0] || { x: toNode.x, y: toNode.y };
  const lastTarget = cps[cps.length - 1] || { x: fromNode.x, y: fromNode.y };

  const start = nodeBoundaryPoint(fromNode, firstTarget.x, firstTarget.y);
  const end = nodeBoundaryPoint(toNode, lastTarget.x, lastTarget.y);
  const points = [start, ...cps, end];

  const path = buildSplinePath(points);

  return { path, points };
}

function addNode(shape, atPoint = null) {
  const id = nodeCounter++;
  const px = snap(atPoint ? atPoint.x : 180 + (id % 5) * 120);
  const py = snap(atPoint ? atPoint.y : 140 + Math.floor(id / 5) * 90);
  const defaultName = semantics.makeUniqueName(graph.nodes, t("node.defaultName", { id }), null, "n");
  const node = {
    id,
    name: defaultName,
    input: false,
    output: false,
    shape,
    x: px,
    y: py,
    width: 120,
    height: 70,
    valueExpression: shape === "rect" ? "this" : "",
    initialStateExpression: shape === "rect" ? "0" : "",
    computedValue: shape === "rect" ? 0 : null,
    computedError: "",
    pendingStateValue: null,
    pendingStateError: "",
    properties: [],
  };
  graph.nodes.push(node);
  selectSingleNode(node.id);
}

function addEdge(fromId, toId) {
  if (fromId === toId) {
    setStatusKey("error.edgeDifferentNodes");
    return null;
  }

  const targetNode = getNodeById(toId);
  if (targetNode?.shape === "diamond") {
    setStatusKey("error.parameterIncomingEdge");
    return null;
  }

  const exists = graph.edges.some((e) => e.from === fromId && e.to === toId);
  if (exists) {
    setStatusKey("error.edgeExists");
    return null;
  }

  const edge = {
    id: edgeCounter++,
    from: fromId,
    to: toId,
    controlPoints: [],
  };
  graph.edges.push(edge);
  if (targetNode?.input) {
    removeNodeFromSliderBindings(targetNode.name);
    targetNode.input = false;
  }
  selectEdge(edge.id);
  return edge;
}

function addTableWidget(at = null) {
  const id = widgetCounter++;
  const z = Math.max(0.0001, ui.zoom || 1);
  const x = at?.x ?? (graphViewport.scrollLeft + 40) / z;
  const y = at?.y ?? (graphViewport.scrollTop + 40) / z;
  graph.widgets.push({
    id,
    type: "table",
    customTitle: "",
    x,
    y,
    width: 360,
    height: 180,
    minimized: false,
    outputOnly: false,
    showHistory: false,
    rows: [],
    columns: [],
  });
}

function addSliderWidget(at = null) {
  const id = widgetCounter++;
  const z = Math.max(0.0001, ui.zoom || 1);
  const x = at?.x ?? (graphViewport.scrollLeft + 80) / z;
  const y = at?.y ?? (graphViewport.scrollTop + 80) / z;
  const bindableNames = sliderBindableNodeNames();
  graph.widgets.push({
    id,
    type: "slider",
    customTitle: "",
    x,
    y,
    width: 340,
    height: 120,
    minimized: false,
    outputOnly: false,
    source: bindableNames[0] || "",
    min: 0,
    max: 100,
    step: 1,
    value: 0,
    rows: [],
    columns: [],
    xyPairs: [],
  });
}

function addXYChartWidget(at = null) {
  const id = widgetCounter++;
  const z = Math.max(0.0001, ui.zoom || 1);
  const x = at?.x ?? (graphViewport.scrollLeft + 80) / z;
  const y = at?.y ?? (graphViewport.scrollTop + 80) / z;
  const nodeNames = graph.nodes.filter((n) => n.output).map((n) => n.name);
  graph.widgets.push({
    id,
    type: "xychart",
    customTitle: "",
    x,
    y,
    width: 380,
    height: 240,
    minimized: false,
    outputOnly: false,
    xMin: null,
    xMax: null,
    yMin: null,
    yMax: null,
    showGrid: true,
    xyPairs: [
      {
        xSource: "time",
        ySource: nodeNames[0] || "",
        color: defaultChartSeriesColor(0),
        showLine: true,
        showPoints: true,
        points: [],
      },
    ],
    columns: [],
  });
}

function getNodeByName(name) {
  return graph.nodes.find((n) => n.name === name);
}

function defaultChartSeriesColor(index = 0) {
  return CHART_SERIES_PALETTE[Math.abs(Number(index) || 0) % CHART_SERIES_PALETTE.length];
}

function sanitizeWidgetColumns(widget) {
  if (!Array.isArray(widget.columns)) {
    widget.columns = [];
  }
}

function sanitizeTableWidgetOptions(widget) {
  widget.showHistory = Boolean(widget.showHistory);
  if (!Array.isArray(widget.rows)) {
    widget.rows = [];
  }
}

function sanitizeWidgetXYPairs(widget) {
  if (!Array.isArray(widget.xyPairs)) {
    widget.xyPairs = [];
  }
  widget.xyPairs = widget.xyPairs
    .map((pair, idx) => ({
      xSource: String(pair?.xSource ?? "time"),
      ySource: String(pair?.ySource ?? ""),
      color: /^#[0-9a-fA-F]{6}$/.test(String(pair?.color ?? "")) ? String(pair.color) : defaultChartSeriesColor(idx),
      showLine: pair?.showLine !== false,
      showPoints: pair?.showPoints !== false,
      points: Array.isArray(pair?.points)
        ? pair.points
          .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        : [],
    }))
    .filter((pair) => pair.ySource);
}

function sanitizeXYChartOptions(widget) {
  const parseNumOrNull = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  widget.xMin = parseNumOrNull(widget.xMin);
  widget.xMax = parseNumOrNull(widget.xMax);
  widget.yMin = parseNumOrNull(widget.yMin);
  widget.yMax = parseNumOrNull(widget.yMax);
  widget.showGrid = widget.showGrid !== false;
}

function sanitizeSliderWidgetOptions(widget) {
  const parseFinite = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const allowedNames = new Set(sliderBindableNodeNames());
  widget.source = String(widget.source ?? "");
  if (widget.source && !allowedNames.has(widget.source)) {
    widget.source = "";
  }
  widget.min = parseFinite(widget.min, 0);
  widget.max = parseFinite(widget.max, 100);
  if (widget.max < widget.min) {
    const tmp = widget.min;
    widget.min = widget.max;
    widget.max = tmp;
  }
  widget.step = Math.abs(parseFinite(widget.step, 1));
  if (!Number.isFinite(widget.step) || widget.step <= 0) {
    widget.step = 1;
  }
  widget.value = parseFinite(widget.value, widget.min);
  if (widget.value < widget.min) {
    widget.value = widget.min;
  }
  if (widget.value > widget.max) {
    widget.value = widget.max;
  }
}

function snapSliderValue(value, min, max, step) {
  const raw = Number(value);
  const minVal = Number(min);
  const maxVal = Number(max);
  const stepVal = Math.abs(Number(step));
  if (!Number.isFinite(raw) || !Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
    return 0;
  }
  const clamped = clamp(raw, minVal, maxVal);
  if (!Number.isFinite(stepVal) || stepVal <= 0) {
    return clamped;
  }
  const snapped = minVal + Math.round((clamped - minVal) / stepVal) * stepVal;
  const stepText = String(stepVal);
  const dotIndex = stepText.indexOf(".");
  const decimals = dotIndex >= 0 ? stepText.length - dotIndex - 1 : 0;
  return Number(clamp(snapped, minVal, maxVal).toFixed(Math.min(10, decimals)));
}

function applyWidgetDrivenNodeValues() {
  graph.nodes.forEach((node) => {
    node.externalValueEnabled = false;
    node.externalValue = null;
  });
  graph.widgets.forEach((widget) => {
    if (widget.type === "slider") {
      applySliderWidgetValueToNode(widget);
    }
  });
}

function applySliderWidgetValueToNode(widget) {
  if (!widget || widget.type !== "slider") {
    return;
  }
  sanitizeSliderWidgetOptions(widget);
  if (!widget.source) {
    return;
  }
  const node = getNodeByName(widget.source);
  if (!canBindSliderToNode(node)) {
    return;
  }
  const value = Number(widget.value);
  node.externalValueEnabled = true;
  node.externalValue = value;
  node.computedValue = value;
  node.computedError = "";
}

function drawXYChart(canvas, seriesList = [], options = null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const pad = 24;
  const plotW = Math.max(10, width - pad * 2);
  const plotH = Math.max(10, height - pad * 2);
  ctx.strokeStyle = "#d9e2ea";
  ctx.strokeRect(pad, pad, plotW, plotH);

  const activeSeries = (Array.isArray(seriesList) ? seriesList : [])
    .map((s, idx) => ({
      label: String(s?.label ?? ""),
      color: /^#[0-9a-fA-F]{6}$/.test(String(s?.color ?? "")) ? String(s.color) : defaultChartSeriesColor(idx),
      showLine: s?.showLine !== false,
      showPoints: s?.showPoints !== false,
      points: Array.isArray(s?.points)
        ? s.points
          .map((p) => ({ x: Number(p?.x), y: Number(p?.y) }))
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        : [],
    }))
    .filter((s) => s.points.length > 0 && (s.showLine || s.showPoints));

  if (activeSeries.length < 1) {
    return;
  }

  const cfg = {
    xMin: Number.isFinite(Number(options?.xMin)) ? Number(options.xMin) : null,
    xMax: Number.isFinite(Number(options?.xMax)) ? Number(options.xMax) : null,
    yMin: Number.isFinite(Number(options?.yMin)) ? Number(options.yMin) : null,
    yMax: Number.isFinite(Number(options?.yMax)) ? Number(options.yMax) : null,
    showGrid: options?.showGrid !== false,
  };

  let minX = activeSeries[0].points[0].x;
  let maxX = activeSeries[0].points[0].x;
  let minY = activeSeries[0].points[0].y;
  let maxY = activeSeries[0].points[0].y;
  activeSeries.forEach((series) => {
    series.points.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
  });
  if (cfg.xMin != null && cfg.xMax != null && cfg.xMax > cfg.xMin) {
    minX = cfg.xMin;
    maxX = cfg.xMax;
  }
  if (cfg.yMin != null && cfg.yMax != null && cfg.yMax > cfg.yMin) {
    minY = cfg.yMin;
    maxY = cfg.yMax;
  }
  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const sx = (x) => pad + ((x - minX) / (maxX - minX)) * plotW;
  const sy = (y) => pad + plotH - ((y - minY) / (maxY - minY)) * plotH;

  if (cfg.showGrid) {
    const steps = 10;
    ctx.strokeStyle = "#eef3f7";
    ctx.lineWidth = 1;
    for (let i = 1; i < steps; i += 1) {
      const gx = pad + (plotW / steps) * i;
      ctx.beginPath();
      ctx.moveTo(gx, pad);
      ctx.lineTo(gx, pad + plotH);
      ctx.stroke();
      const gy = pad + (plotH / steps) * i;
      ctx.beginPath();
      ctx.moveTo(pad, gy);
      ctx.lineTo(pad + plotW, gy);
      ctx.stroke();
    }
  }

  activeSeries.forEach((series, s) => {
    const color = series.color || defaultChartSeriesColor(s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (series.showLine) {
      ctx.beginPath();
      let moved = false;
      series.points.forEach((p) => {
        const x = sx(p.x);
        const y = sy(p.y);
        if (!moved) {
          ctx.moveTo(x, y);
          moved = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      if (moved) {
        ctx.stroke();
      }
    }
    if (series.showPoints) {
      ctx.fillStyle = color;
      series.points.forEach((p) => {
        const x = sx(p.x);
        const y = sy(p.y);
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });

  ctx.fillStyle = "#4e6072";
  ctx.font = "11px Segoe UI, Tahoma, sans-serif";
  ctx.fillText(formatNumberValue(minX), pad, height - 6);
  ctx.fillText(formatNumberValue(maxX), width - pad - 36, height - 6);
  ctx.fillText(formatNumberValue(maxY), 2, pad + 4);
  ctx.fillText(formatNumberValue(minY), 2, height - pad);

  activeSeries.slice(0, 10).forEach((series, idx) => {
    ctx.fillStyle = series.color || defaultChartSeriesColor(idx);
    ctx.fillRect(width - 120, 8 + idx * 14, 8, 8);
    ctx.fillStyle = "#334b60";
    ctx.fillText(series.label || `s${idx + 1}`, width - 108, 16 + idx * 14);
  });
}

function updateXYWidgetsFromComputedValues(timeValue = null) {
  const maxPoints = 2000;
  const currentTime = Number(
    Number.isFinite(Number(timeValue)) ? timeValue : graph.execution.currentTime,
  );
  graph.widgets.forEach((widget) => {
    if (widget.type !== "xychart") {
      return;
    }
    sanitizeWidgetXYPairs(widget);
    widget.xyPairs.forEach((pair) => {
      if (widget.outputOnly) {
        const xAllowed = pair.xSource === "time" || getNodeByName(pair.xSource)?.output;
        const yAllowed = pair.ySource === "time" || getNodeByName(pair.ySource)?.output;
        if (!xAllowed || !yAllowed) {
          return;
        }
      }
      const xVal = pair.xSource === "time"
        ? currentTime
        : Number(getNodeByName(pair.xSource)?.computedValue);
      const yVal = pair.ySource === "time"
        ? currentTime
        : Number(getNodeByName(pair.ySource)?.computedValue);
      if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) {
        return;
      }
      if (pair.xSource !== "time") {
        const xNode = getNodeByName(pair.xSource);
        if (!xNode || xNode.computedError) {
          return;
        }
      }
      if (pair.ySource !== "time") {
        const yNode = getNodeByName(pair.ySource);
        if (!yNode || yNode.computedError) {
          return;
        }
      }
      pair.points.push({ x: xVal, y: yVal });
      if (pair.points.length > maxPoints) {
        pair.points.splice(0, pair.points.length - maxPoints);
      }
    });
  });
}

function updateTableWidgetsFromComputedValues(timeValue = null) {
  const currentTime = Number(
    Number.isFinite(Number(timeValue)) ? timeValue : graph.execution.currentTime,
  );
  graph.widgets.forEach((widget) => {
    if (widget.type !== "table") {
      return;
    }
    sanitizeWidgetColumns(widget);
    sanitizeTableWidgetOptions(widget);
    if (!widget.showHistory) {
      return;
    }
    const displayedCols = widget.outputOnly
      ? widget.columns.filter((name) => name === "time" || getNodeByName(name)?.output)
      : widget.columns.slice();
    const values = {};
    displayedCols.forEach((colName) => {
      if (colName === "time") {
        values.time = { value: currentTime };
        return;
      }
      const node = getNodeByName(colName);
      if (!node) {
        values[colName] = { value: null };
        return;
      }
      if (node.computedError) {
        values[colName] = { error: node.computedError };
        return;
      }
      values[colName] = { value: node.computedValue };
    });
    widget.rows.push({ values });
  });
}

function clearAllXYChartPoints() {
  graph.widgets.forEach((widget) => {
    if (widget.type === "xychart") {
      sanitizeWidgetXYPairs(widget);
      widget.xyPairs.forEach((pair) => {
        pair.points = [];
      });
    }
  });
}

function clearAllTableWidgetRows() {
  graph.widgets.forEach((widget) => {
    if (widget.type === "table") {
      sanitizeTableWidgetOptions(widget);
      widget.rows = [];
    }
  });
}

function widgetDefaultTitle(widget) {
  if (widget.type === "xychart") {
    return t("widget.chartTitle", { id: widget.id });
  }
  if (widget.type === "slider") {
    return t("widget.sliderTitle", { id: widget.id });
  }
  return t("widget.tableTitle", { id: widget.id });
}

function widgetDisplayTitle(widget) {
  const custom = String(widget.customTitle ?? "").trim();
  return custom || widgetDefaultTitle(widget);
}

function renderWidgets() {
  widgetLayer.innerHTML = "";
  applyWidgetDrivenNodeValues();

  graph.widgets.forEach((widget) => {
    if (widget.type !== "table" && widget.type !== "xychart" && widget.type !== "slider") {
      return;
    }
    if (widget.type === "table") {
      sanitizeWidgetColumns(widget);
      sanitizeTableWidgetOptions(widget);
    } else if (widget.type === "xychart") {
      sanitizeWidgetXYPairs(widget);
      sanitizeXYChartOptions(widget);
    } else {
      sanitizeSliderWidgetOptions(widget);
    }
    const root = document.createElement("div");
    root.className = "value-widget";
    if (ui.selected?.type === "widget" && ui.selected.id === widget.id) {
      root.classList.add("selected");
    }
    if (widget.minimized) {
      root.classList.add("minimized");
    }
    const z = Math.max(0.0001, ui.zoom || 1);
    root.style.left = `${widget.x * z}px`;
    root.style.top = `${widget.y * z}px`;
    root.style.width = `${widget.width}px`;
    root.style.height = widget.minimized ? "36px" : `${widget.height}px`;
    root.style.transform = `scale(${z})`;
    root.style.transformOrigin = "top left";
    root.dataset.widgetId = String(widget.id);
    root.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
      if (!(ui.selected?.type === "widget" && ui.selected.id === widget.id)) {
        selectWidget(widget.id);
        render();
      }
    });

    const header = document.createElement("div");
    header.className = "value-widget-header";
    const title = document.createElement("span");
    title.textContent = widgetDisplayTitle(widget);
    const actions = document.createElement("div");
    actions.className = "value-widget-actions";
    const minBtn = document.createElement("button");
    minBtn.type = "button";
    minBtn.textContent = widget.minimized ? "+" : "_";
    minBtn.title = widget.minimized ? t("widget.restore") : t("widget.minimize");
    minBtn.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
    });
    minBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      runAction(() => {
        widget.minimized = !widget.minimized;
      });
      setStatusKey(widget.minimized ? "status.widgetMinimized" : "status.widgetRestored");
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "x";
    delBtn.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
    });
    delBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      runAction(() => {
        graph.widgets = graph.widgets.filter((w) => w.id !== widget.id);
      });
      setStatusKey("status.widgetDeleted");
    });
    header.appendChild(title);
    actions.appendChild(minBtn);
    actions.appendChild(delBtn);
    header.appendChild(actions);
    header.addEventListener("pointerdown", (evt) => {
      if (evt.target.closest("button")) {
        return;
      }
      evt.stopPropagation();
      if (!(ui.selected?.type === "widget" && ui.selected.id === widget.id)) {
        selectWidget(widget.id);
      }
      ui.widgetDrag = {
        widgetId: widget.id,
        pointerId: evt.pointerId,
        startClientX: evt.clientX,
        startClientY: evt.clientY,
        startX: widget.x,
        startY: widget.y,
      };
      beginTransaction();
    });

    const body = document.createElement("div");
    body.className = "value-widget-body";
    if (widget.type === "table") {
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headRow = document.createElement("tr");
      const displayedCols = widget.outputOnly
        ? widget.columns.filter((name) => name === "time" || getNodeByName(name)?.output)
        : widget.columns;
      displayedCols.forEach((colName) => {
        const th = document.createElement("th");
        th.textContent = colName || t("widget.columnEmpty");
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");
      if (widget.showHistory) {
        sanitizeTableWidgetOptions(widget);
        widget.rows.forEach((entry) => {
          const row = document.createElement("tr");
          displayedCols.forEach((colName) => {
            const td = document.createElement("td");
            const cell = entry?.values?.[colName];
            if (cell?.error) {
              td.textContent = t("text.valueError", { reason: evalReasonText(cell.error) });
            } else if (Object.prototype.hasOwnProperty.call(entry?.values || {}, colName)) {
              td.textContent = formatComputedValue(cell?.value ?? null);
            } else {
              td.textContent = "-";
            }
            row.appendChild(td);
          });
          tbody.appendChild(row);
        });
      } else {
        const row = document.createElement("tr");
        displayedCols.forEach((colName) => {
          const td = document.createElement("td");
          if (colName === "time") {
            const tVal = graph.execution.currentTime == null ? graph.execution.t0 : graph.execution.currentTime;
            td.textContent = formatNumberValue(Number(tVal));
          } else {
            const node = getNodeByName(colName);
            if (!node) {
              td.textContent = "-";
            } else if (node.computedError) {
              td.textContent = t("text.valueError", { reason: evalReasonText(node.computedError) });
            } else {
              td.textContent = formatComputedValue(node.computedValue);
            }
          }
          row.appendChild(td);
        });
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      body.appendChild(table);
      if (widget.showHistory) {
        window.requestAnimationFrame(() => {
          body.scrollTop = body.scrollHeight;
        });
      }
    } else if (widget.type === "xychart") {
      const canvasWrap = document.createElement("div");
      canvasWrap.className = "xy-chart-canvas-wrap";
      const canvas = document.createElement("canvas");
      canvas.className = "xy-chart-canvas";
      const cw = Math.max(140, Math.floor(widget.width - 18));
      const ch = Math.max(100, Math.floor(widget.height - 52));
      canvas.width = cw;
      canvas.height = ch;
      const displayedPairs = widget.outputOnly
        ? widget.xyPairs.filter((pair) => {
          const xAllowed = pair.xSource === "time" || getNodeByName(pair.xSource)?.output;
          const yAllowed = pair.ySource === "time" || getNodeByName(pair.ySource)?.output;
          return xAllowed && yAllowed;
        })
        : widget.xyPairs;
      const seriesList = displayedPairs.map((pair) => ({
        label: `${pair.xSource} -> ${pair.ySource}`,
        color: pair.color,
        showLine: pair.showLine,
        showPoints: pair.showPoints,
        points: pair.points || [],
      }));
      drawXYChart(canvas, seriesList, widget);
      canvasWrap.appendChild(canvas);
      body.appendChild(canvasWrap);
    } else {
      const sliderWrap = document.createElement("div");
      sliderWrap.className = "slider-widget-wrap";

      const sourceLine = document.createElement("div");
      sourceLine.className = "slider-widget-source";
      sourceLine.textContent = widget.source || t("text.unnamed");
      const sourceNode = getNodeByName(widget.source);
      const lockedForRun = sourceNode?.shape === "diamond" && graph.execution.currentTime != null;

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = String(widget.min);
      slider.max = String(widget.max);
      slider.step = String(widget.step);
      slider.value = String(widget.value);
      slider.disabled = lockedForRun;
      slider.addEventListener("pointerdown", (evt) => {
        if (lockedForRun) {
          return;
        }
        evt.stopPropagation();
        ui.sliderInteraction = { widgetId: widget.id, mode: "range" };
        if (!(ui.selected?.type === "widget" && ui.selected.id === widget.id)) {
          selectWidget(widget.id);
        }
      });
      slider.addEventListener("mousedown", (evt) => {
        evt.stopPropagation();
      });

      const minLabel = document.createElement("span");
      minLabel.className = "slider-bound slider-bound-min";
      minLabel.textContent = formatNumberValue(Number(widget.min));

      const maxLabel = document.createElement("span");
      maxLabel.className = "slider-bound slider-bound-max";
      maxLabel.textContent = formatNumberValue(Number(widget.max));

      const valueInput = document.createElement("input");
      valueInput.type = "number";
      valueInput.step = String(widget.step);
      valueInput.min = String(widget.min);
      valueInput.max = String(widget.max);
      valueInput.value = String(widget.value);
      valueInput.className = "slider-widget-number";
      valueInput.disabled = lockedForRun;
      valueInput.addEventListener("pointerdown", (evt) => {
        if (lockedForRun) {
          return;
        }
        evt.stopPropagation();
        ui.sliderInteraction = { widgetId: widget.id, mode: "number" };
      });
      valueInput.addEventListener("mousedown", (evt) => {
        evt.stopPropagation();
      });
      valueInput.addEventListener("focus", () => {
        if (lockedForRun) {
          return;
        }
        ui.sliderInteraction = { widgetId: widget.id, mode: "number" };
      });

      const rangeLine = document.createElement("div");
      rangeLine.className = "slider-range-line";
      rangeLine.appendChild(minLabel);
      rangeLine.appendChild(slider);
      rangeLine.appendChild(valueInput);
      rangeLine.appendChild(maxLabel);

      const syncSliderDisplay = (nextValue = slider.value, commit = false) => {
        const snapped = snapSliderValue(nextValue, widget.min, widget.max, widget.step);
        widget.value = snapped;
        slider.value = String(snapped);
        valueInput.value = String(snapped);
        applySliderWidgetValueToNode(widget);
        if (commit) {
          refreshSidebar();
          scheduleFileStatusRefresh();
        }
      };

      slider.addEventListener("input", (evt) => {
        evt.stopPropagation();
        syncSliderDisplay();
      });
      slider.addEventListener("change", (evt) => {
        evt.stopPropagation();
        syncSliderDisplay(slider.value, true);
      });
      slider.addEventListener("pointerup", (evt) => {
        evt.stopPropagation();
        ui.sliderInteraction = null;
        render();
      });
      slider.addEventListener("pointercancel", () => {
        ui.sliderInteraction = null;
        render();
      });
      valueInput.addEventListener("input", (evt) => {
        evt.stopPropagation();
        syncSliderDisplay(valueInput.value);
      });
      valueInput.addEventListener("change", (evt) => {
        evt.stopPropagation();
        syncSliderDisplay(valueInput.value, true);
        render();
      });
      valueInput.addEventListener("blur", () => {
        ui.sliderInteraction = null;
        syncSliderDisplay(valueInput.value, true);
        render();
      });

      sliderWrap.appendChild(sourceLine);
      sliderWrap.appendChild(rangeLine);
      body.appendChild(sliderWrap);
    }

    const resize = document.createElement("div");
    resize.className = "value-widget-resize";
    resize.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
      ui.widgetResize = {
        widgetId: widget.id,
        pointerId: evt.pointerId,
        startClientX: evt.clientX,
        startClientY: evt.clientY,
        startWidth: widget.width,
        startHeight: widget.height,
      };
      beginTransaction();
    });

    root.appendChild(header);
    root.appendChild(body);
    root.appendChild(resize);
    widgetLayer.appendChild(root);
  });
}

function startEdgeCreateFromNode(nodeId, pointerId, p) {
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  selectSingleNode(node.id);
  ui.edgeCreate = {
    fromId: node.id,
    pointerId,
    current: p || { x: node.x, y: node.y },
  };
  ui.edgeCreateLastPoint = p || { x: node.x, y: node.y };
  ui.edgeCreateHoverId = null;
  setStatus(t("hint.edge.4"));
}

function startEdgeCreateFromMouse(nodeId, evt) {
  startEdgeCreateFromNode(nodeId, "mouse", svgPointFromClient(evt.clientX, evt.clientY));
  render();
}

function updateEdgeCreateFromClient(clientX, clientY) {
  if (!ui.edgeCreate) {
    return;
  }
  const pRaw = svgPointFromClient(clientX, clientY);
  ui.edgeCreate.current = snapPoint(pRaw);
  ui.edgeCreateLastPoint = pRaw;
  ui.edgeCreateHoverId = nodeIdAtClient(clientX, clientY) ?? nodeIdAtGraphPoint(pRaw);
}

function finishEdgeCreateFromClient(clientX, clientY) {
  if (!ui.edgeCreate) {
    return;
  }
  const dropPoint = ui.edgeCreateLastPoint || svgPointFromClient(clientX, clientY);
  const toId =
    ui.edgeCreateHoverId ??
    nodeIdAtClient(clientX, clientY) ??
    nodeIdAtGraphPoint(dropPoint);
  const fromId = ui.edgeCreate.fromId;
  ui.edgeCreate = null;
  ui.edgeCreateHoverId = null;
  ui.edgeCreateLastPoint = null;

  if (toId != null) {
    let created = false;
    runAction(() => {
      created = Boolean(addEdge(fromId, toId));
    });
    if (created) {
      setStatusKey("status.edgeCreated");
    }
  } else {
    setStatusKey("status.edgeCanceled");
    render();
  }
}

function removeControlPoint(edgeId, cpIndex) {
  const edge = getEdgeById(edgeId);
  if (!edge || !edge.controlPoints[cpIndex]) {
    return;
  }

  edge.controlPoints.splice(cpIndex, 1);
  if (
    ui.selectedControlPoint &&
    ui.selectedControlPoint.edgeId === edgeId &&
    ui.selectedControlPoint.index === cpIndex
  ) {
    ui.selectedControlPoint = null;
  }
}

function removeSelected() {
  if (ui.selectedControlPoint) {
    runAction(() => {
      removeControlPoint(ui.selectedControlPoint.edgeId, ui.selectedControlPoint.index);
    });
    return;
  }

  if (ui.selectedNodes.size > 0) {
    runAction(() => {
      const selectedIds = new Set(ui.selectedNodes);
      graph.nodes
        .filter((n) => selectedIds.has(n.id))
        .forEach((n) => removeNodeFromSliderBindings(n.name));
      graph.nodes = graph.nodes.filter((n) => !selectedIds.has(n.id));
      graph.edges = graph.edges.filter((e) => !selectedIds.has(e.from) && !selectedIds.has(e.to));
      clearAllSelection();
      setStatusKey("status.nodesDeleted");
    });
    return;
  }

  if (ui.selected?.type === "edge") {
    runAction(() => {
      graph.edges = graph.edges.filter((e) => e.id !== ui.selected.id);
      clearAllSelection();
      setStatusKey("status.edgeDeleted");
    });
    return;
  }

  if (ui.selected?.type === "widget") {
    runAction(() => {
      graph.widgets = graph.widgets.filter((w) => w.id !== ui.selected.id);
      clearAllSelection();
      setStatusKey("status.widgetDeleted");
    });
  }
}

function distancePointToSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby || 1;
  const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
  const qx = a.x + t * abx;
  const qy = a.y + t * aby;
  const dx = p.x - qx;
  const dy = p.y - qy;
  return { distance: Math.hypot(dx, dy), t };
}

function addControlPointAt(edge, p) {
  const geom = buildEdgeGeometry(edge);
  if (!geom) {
    return;
  }

  let insertAt = edge.controlPoints.length;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < geom.points.length - 1; i += 1) {
    const d = distancePointToSegment(p, geom.points[i], geom.points[i + 1]);
    if (d.distance < bestDistance) {
      bestDistance = d.distance;
      insertAt = i;
    }
  }

  const snapped = snapPoint(p);
  edge.controlPoints.splice(insertAt, 0, { x: snapped.x, y: snapped.y });
  ui.selectedControlPoint = { edgeId: edge.id, index: insertAt };
}

function nodeIdAtClient(clientX, clientY) {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (const el of elements) {
    const group = el.closest?.(".node");
    if (group) {
      return Number(group.dataset.nodeId);
    }
  }
  return null;
}

function pointInsideNode(node, p) {
  const dx = p.x - node.x;
  const dy = p.y - node.y;
  const hw = node.width / 2;
  const hh = node.height / 2;

  if (node.shape === "ellipse") {
    const v = (dx * dx) / (hw * hw) + (dy * dy) / (hh * hh);
    return v <= 1;
  }
  if (node.shape === "diamond") {
    const v = Math.abs(dx) / hw + Math.abs(dy) / hh;
    return v <= 1;
  }
  return Math.abs(dx) <= hw && Math.abs(dy) <= hh;
}

function nodeIdAtGraphPoint(p) {
  for (let i = graph.nodes.length - 1; i >= 0; i -= 1) {
    const node = graph.nodes[i];
    if (pointInsideNode(node, p)) {
      return node.id;
    }
  }
  return null;
}

function openBackgroundContextMenu(evt) {
  const p = svgPointFromClient(evt.clientX, evt.clientY);
  showContextMenu(evt.clientX, evt.clientY, [
    {
      label: t("context.bg.newRect"),
      action: () => {
        runAction(() => addNode("rect", p));
        setStatusKey("status.nodeCreated");
      },
    },
    {
      label: t("context.bg.newEllipse"),
      action: () => {
        runAction(() => addNode("ellipse", p));
        setStatusKey("status.nodeCreated");
      },
    },
    {
      label: t("context.bg.newDiamond"),
      action: () => {
        runAction(() => addNode("diamond", p));
        setStatusKey("status.nodeCreated");
      },
    },
    { separator: true },
    {
      label: t("context.bg.newSliderWidget"),
      action: () => {
        runAction(() => addSliderWidget({ x: p.x, y: p.y }));
        setStatusKey("status.widgetSliderCreated");
      },
    },
    {
      label: t("context.bg.newTableWidget"),
      action: () => {
        runAction(() => addTableWidget({ x: p.x, y: p.y }));
        setStatusKey("status.widgetCreated");
      },
    },
    {
      label: t("context.bg.newXYChartWidget"),
      action: () => {
        runAction(() => addXYChartWidget({ x: p.x, y: p.y }));
        setStatusKey("status.widgetChartCreated");
      },
    },
    { separator: true },
    {
      label: t("context.bg.deselect"),
      action: () => {
        clearAllSelection();
        render();
        setStatusKey("status.selectionCleared");
      },
      disabled: ui.selectedNodes.size === 0 && !ui.selected,
    },
  ]);
}

function openNodeContextMenu(evt, node) {
  showContextMenu(evt.clientX, evt.clientY, [
    {
      label: t("context.node.rename"),
      action: () => {
        selectSingleNode(node.id);
        render();
        nodeNameInput.focus();
        nodeNameInput.select();
        setStatusKey("status.renameNode");
      },
    },
    {
      label: t("context.node.addProp"),
      action: () => {
        runAction(() => {
          const target = getNodeById(node.id);
          if (target) {
            target.properties.push({ key: "", value: "" });
          }
        });
        setStatusKey("status.propertyAdded");
      },
    },
    {
      label: t("context.node.newLinked"),
      action: () => {
        runAction(() => {
          const p = { x: node.x + 180, y: node.y };
          addNode("rect", p);
          const createdNodeId = [...ui.selectedNodes][0];
          addEdge(node.id, createdNodeId);
        });
        setStatusKey("status.linkedNodeCreated");
      },
    },
    {
      label: t("context.node.delete"),
      action: () => {
        runAction(() => {
          removeNodeFromSliderBindings(node.name);
          graph.nodes = graph.nodes.filter((n) => n.id !== node.id);
          graph.edges = graph.edges.filter((e) => e.from !== node.id && e.to !== node.id);
          clearAllSelection();
        });
        setStatusKey("status.nodeDeleted");
      },
    },
  ]);
}

function openEdgeContextMenu(evt, edgeId, atPoint) {
  const edge = getEdgeById(edgeId);
  if (!edge) {
    return;
  }

  showContextMenu(evt.clientX, evt.clientY, [
    {
      label: t("context.edge.addCp"),
      action: () => {
        runAction(() => {
          const target = getEdgeById(edgeId);
          if (!target) {
            return;
          }
          selectEdge(edgeId);
          addControlPointAt(target, atPoint);
        });
        setStatusKey("status.cpAdded");
      },
    },
    {
      label: t("context.edge.clearCp"),
      action: () => {
        runAction(() => {
          const target = getEdgeById(edgeId);
          if (!target) {
            return;
          }
          target.controlPoints = [];
          selectEdge(edgeId);
        });
        setStatusKey("status.cpCleared");
      },
      disabled: edge.controlPoints.length === 0,
    },
    {
      label: t("context.edge.delete"),
      action: () => {
        runAction(() => {
          graph.edges = graph.edges.filter((e) => e.id !== edgeId);
          clearAllSelection();
        });
        setStatusKey("status.edgeDeleted");
      },
    },
  ]);
}

function marqueeRect(m) {
  const x = Math.min(m.start.x, m.current.x);
  const y = Math.min(m.start.y, m.current.y);
  const width = Math.abs(m.current.x - m.start.x);
  const height = Math.abs(m.current.y - m.start.y);
  return { x, y, width, height };
}

function nodesInRect(rect) {
  return graph.nodes
    .filter((n) => n.x >= rect.x && n.x <= rect.x + rect.width && n.y >= rect.y && n.y <= rect.y + rect.height)
    .map((n) => n.id);
}

function renderPropertiesEditor(container, items, ownerKey, deleteHandler) {
  const activeEl = document.activeElement;
  const activeInPropsEditor =
    container.contains(activeEl) &&
    (activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA" || activeEl?.tagName === "SELECT");
  if (activeInPropsEditor && container.dataset.ownerKey === ownerKey) {
    return true;
  }

  container.innerHTML = "";
  container.dataset.ownerKey = ownerKey;
  if (!Array.isArray(items) || items.length === 0) {
    const msg = document.createElement("div");
    msg.className = "empty-props";
    msg.textContent = t("text.noneProps");
    container.appendChild(msg);
    return false;
  }

  items.forEach((prop, idx) => {
    const row = document.createElement("div");
    row.className = "prop-row";

    const keyInput = document.createElement("input");
    keyInput.placeholder = t("prop.keyPlaceholder");
    keyInput.value = prop.key;
    keyInput.addEventListener("input", () => {
      prop.key = keyInput.value;
    });

    const valueInput = document.createElement("input");
    valueInput.placeholder = t("prop.valuePlaceholder");
    valueInput.value = prop.value;
    valueInput.addEventListener("input", () => {
      prop.value = valueInput.value;
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "X";
    delBtn.addEventListener("click", () => {
      delete container.dataset.ownerKey;
      runAction(() => {
        deleteHandler(idx);
      });
    });

    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
  return false;
}

function refreshWidgetConfigPanel(widget) {
  widgetConfig.innerHTML = "";

  const titleLabel = document.createElement("label");
  titleLabel.textContent = t("widget.customTitleLabel");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.placeholder = t("widget.customTitlePlaceholder");
  titleInput.value = String(widget.customTitle ?? "");
  titleInput.addEventListener("change", () => {
    runAction(() => {
      widget.customTitle = titleInput.value;
    });
  });
  widgetConfig.appendChild(titleLabel);
  widgetConfig.appendChild(titleInput);

  const outputNodeNames = graph.nodes.filter((n) => n.output).map((n) => n.name);
  const nodeNames = outputNodeNames;

  if (widget.type === "slider") {
    sanitizeSliderWidgetOptions(widget);
    const sourceLabel = document.createElement("label");
    sourceLabel.textContent = t("widget.sliderSourceLabel");
    const sourceSelect = document.createElement("select");
    const sliderChoices = ["", ...sliderBindableNodeNames()];
    sliderChoices.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name || t("widget.noneOption");
      sourceSelect.appendChild(opt);
    });
    sourceSelect.value = sliderChoices.includes(widget.source) ? widget.source : "";
    sourceSelect.addEventListener("change", () => {
      runAction(() => {
        widget.source = sourceSelect.value;
      });
    });
    widgetConfig.appendChild(sourceLabel);
    widgetConfig.appendChild(sourceSelect);

    const limitsLabel = document.createElement("label");
    limitsLabel.textContent = t("widget.sliderRangeLabel");
    widgetConfig.appendChild(limitsLabel);

    const rangeRow = document.createElement("div");
    rangeRow.className = "row3-exec";
    const createRangeField = (labelKey, inputEl) => {
      const wrap = document.createElement("label");
      wrap.className = "compact-field";
      const text = document.createElement("span");
      text.textContent = t(labelKey);
      wrap.appendChild(text);
      wrap.appendChild(inputEl);
      return wrap;
    };
    const minInput = document.createElement("input");
    minInput.type = "number";
    minInput.step = "any";
    minInput.value = String(widget.min);
    minInput.addEventListener("change", () => {
      runAction(() => {
        widget.min = Number(minInput.value);
        sanitizeSliderWidgetOptions(widget);
      });
    });
    const stepInput = document.createElement("input");
    stepInput.type = "number";
    stepInput.step = "any";
    stepInput.min = "0.0000001";
    stepInput.value = String(widget.step);
    stepInput.addEventListener("change", () => {
      runAction(() => {
        widget.step = Number(stepInput.value);
        sanitizeSliderWidgetOptions(widget);
      });
    });
    const maxInput = document.createElement("input");
    maxInput.type = "number";
    maxInput.step = "any";
    maxInput.value = String(widget.max);
    maxInput.addEventListener("change", () => {
      runAction(() => {
        widget.max = Number(maxInput.value);
        sanitizeSliderWidgetOptions(widget);
      });
    });
    rangeRow.appendChild(createRangeField("widget.sliderMin", minInput));
    rangeRow.appendChild(createRangeField("widget.sliderStep", stepInput));
    rangeRow.appendChild(createRangeField("widget.sliderMax", maxInput));
    widgetConfig.appendChild(rangeRow);
    return;
  }

  if (widget.type === "table") {
    sanitizeWidgetColumns(widget);
    sanitizeTableWidgetOptions(widget);
    const list = document.createElement("div");
    list.className = "props-list";
    const tableChoices = ["time", ...nodeNames];
    widget.columns.forEach((colName, idx) => {
      const row = document.createElement("div");
      row.className = "prop-row";
      row.style.gridTemplateColumns = "1fr auto auto auto";
      const sel = document.createElement("select");
      tableChoices.forEach((name) => {
        const opt = document.createElement("option");
        opt.value = name || "";
        opt.textContent = name === "time" ? t("widget.xSourceTime") : name;
        sel.appendChild(opt);
      });
      sel.value = tableChoices.includes(colName) ? colName : "time";
      sel.addEventListener("change", () => {
        runAction(() => {
          widget.columns[idx] = sel.value;
        });
      });
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "-";
      del.addEventListener("click", () => {
        runAction(() => {
          if (widget.columns.length > 0) {
            widget.columns.splice(idx, 1);
          }
        });
      });
      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.textContent = "↑";
      upBtn.title = t("widget.moveUp");
      upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", () => {
        runAction(() => {
          if (idx <= 0 || idx >= widget.columns.length) {
            return;
          }
          const tmp = widget.columns[idx - 1];
          widget.columns[idx - 1] = widget.columns[idx];
          widget.columns[idx] = tmp;
        });
      });
      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.textContent = "↓";
      downBtn.title = t("widget.moveDown");
      downBtn.disabled = idx >= widget.columns.length - 1;
      downBtn.addEventListener("click", () => {
        runAction(() => {
          if (idx < 0 || idx >= widget.columns.length - 1) {
            return;
          }
          const tmp = widget.columns[idx + 1];
          widget.columns[idx + 1] = widget.columns[idx];
          widget.columns[idx] = tmp;
        });
      });
      row.appendChild(sel);
      row.appendChild(upBtn);
      row.appendChild(downBtn);
      row.appendChild(del);
      list.appendChild(row);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.className = "small-btn";
    add.textContent = t("widget.addColumn");
    add.addEventListener("click", () => {
      runAction(() => {
        widget.columns.push("time");
      });
    });
    const modeLabel = document.createElement("label");
    modeLabel.className = "menu-check";
    const modeInput = document.createElement("input");
    modeInput.type = "checkbox";
    modeInput.checked = Boolean(widget.showHistory);
    modeInput.addEventListener("change", () => {
      runAction(() => {
        if (!widget.showHistory && modeInput.checked) {
          widget.rows = [];
        }
        widget.showHistory = modeInput.checked;
      });
    });
    const modeText = document.createElement("span");
    modeText.textContent = t("widget.showHistory");
    modeLabel.appendChild(modeInput);
    modeLabel.appendChild(modeText);
    widgetConfig.appendChild(list);
    widgetConfig.appendChild(add);
    widgetConfig.appendChild(modeLabel);
    return;
  }

  sanitizeWidgetXYPairs(widget);
  sanitizeXYChartOptions(widget);
  const choices = ["time", ...nodeNames];

  const pairsLabel = document.createElement("label");
  pairsLabel.textContent = t("widget.xyPairsLabel");
  widgetConfig.appendChild(pairsLabel);

  const pairList = document.createElement("div");
  pairList.className = "props-list";
  widget.xyPairs.forEach((pair, idx) => {
    const row = document.createElement("div");
    row.className = "prop-row";
    row.style.gridTemplateColumns = "1fr 1fr auto auto auto auto";

    const xSel = document.createElement("select");
    choices.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name === "time" ? t("widget.xSourceTime") : name;
      xSel.appendChild(opt);
    });
    xSel.value = choices.includes(pair.xSource) ? pair.xSource : "time";
    xSel.title = t("widget.xSourceLabel");
    xSel.addEventListener("change", () => {
      runAction(() => {
        widget.xyPairs[idx].xSource = xSel.value;
        widget.xyPairs[idx].points = [];
      });
    });

    const ySel = document.createElement("select");
    choices.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name === "time" ? t("widget.xSourceTime") : name;
      ySel.appendChild(opt);
    });
    ySel.value = choices.includes(pair.ySource) ? pair.ySource : "time";
    ySel.title = t("widget.ySeriesLabel");
    ySel.addEventListener("change", () => {
      runAction(() => {
        widget.xyPairs[idx].ySource = ySel.value;
        widget.xyPairs[idx].points = [];
      });
    });

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = /^#[0-9a-fA-F]{6}$/.test(String(pair.color ?? "")) ? String(pair.color) : defaultChartSeriesColor(idx);
    colorInput.title = t("widget.seriesColor");
    colorInput.addEventListener("change", () => {
      runAction(() => {
        widget.xyPairs[idx].color = colorInput.value;
      });
    });

    const lineLabel = document.createElement("label");
    lineLabel.className = "menu-check";
    lineLabel.title = t("widget.seriesLine");
    const lineInput = document.createElement("input");
    lineInput.type = "checkbox";
    lineInput.checked = pair.showLine !== false;
    lineInput.addEventListener("change", () => {
      runAction(() => {
        widget.xyPairs[idx].showLine = lineInput.checked;
      });
    });
    const lineText = document.createElement("span");
    lineText.textContent = t("widget.seriesLineShort");
    lineLabel.appendChild(lineInput);
    lineLabel.appendChild(lineText);

    const pointsLabel = document.createElement("label");
    pointsLabel.className = "menu-check";
    pointsLabel.title = t("widget.seriesPoints");
    const pointsInput = document.createElement("input");
    pointsInput.type = "checkbox";
    pointsInput.checked = pair.showPoints !== false;
    pointsInput.addEventListener("change", () => {
      runAction(() => {
        widget.xyPairs[idx].showPoints = pointsInput.checked;
      });
    });
    const pointsText = document.createElement("span");
    pointsText.textContent = t("widget.seriesPointsShort");
    pointsLabel.appendChild(pointsInput);
    pointsLabel.appendChild(pointsText);

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "-";
    del.title = t("widget.removePair");
    del.addEventListener("click", () => {
      runAction(() => {
        if (widget.xyPairs.length > 0) {
          widget.xyPairs.splice(idx, 1);
        }
      });
    });

    row.appendChild(xSel);
    row.appendChild(ySel);
    row.appendChild(colorInput);
    row.appendChild(lineLabel);
    row.appendChild(pointsLabel);
    row.appendChild(del);
    pairList.appendChild(row);
  });
  widgetConfig.appendChild(pairList);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "small-btn";
  addBtn.textContent = t("widget.addPair");
  addBtn.addEventListener("click", () => {
    runAction(() => {
      const defaultY = nodeNames[0] || "time";
      widget.xyPairs.push({
        xSource: "time",
        ySource: defaultY,
        color: defaultChartSeriesColor(widget.xyPairs.length),
        showLine: true,
        showPoints: true,
        points: [],
      });
    });
  });
  widgetConfig.appendChild(addBtn);

  const limitsLabel = document.createElement("label");
  limitsLabel.textContent = t("widget.axisLimitsLabel");
  widgetConfig.appendChild(limitsLabel);

  const parseLimitInput = (text) => {
    const trimmed = String(text ?? "").trim();
    if (!trimmed) {
      return null;
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const xLimitRow = document.createElement("div");
  xLimitRow.className = "row2-exec";
  const xMinInput = document.createElement("input");
  xMinInput.type = "number";
  xMinInput.step = "any";
  xMinInput.placeholder = t("widget.axisXMin");
  xMinInput.value = widget.xMin == null ? "" : String(widget.xMin);
  xMinInput.addEventListener("change", () => {
    runAction(() => {
      widget.xMin = parseLimitInput(xMinInput.value);
    });
  });
  const xMaxInput = document.createElement("input");
  xMaxInput.type = "number";
  xMaxInput.step = "any";
  xMaxInput.placeholder = t("widget.axisXMax");
  xMaxInput.value = widget.xMax == null ? "" : String(widget.xMax);
  xMaxInput.addEventListener("change", () => {
    runAction(() => {
      widget.xMax = parseLimitInput(xMaxInput.value);
    });
  });
  xLimitRow.appendChild(xMinInput);
  xLimitRow.appendChild(xMaxInput);
  widgetConfig.appendChild(xLimitRow);

  const yLimitRow = document.createElement("div");
  yLimitRow.className = "row2-exec";
  const yMinInput = document.createElement("input");
  yMinInput.type = "number";
  yMinInput.step = "any";
  yMinInput.placeholder = t("widget.axisYMin");
  yMinInput.value = widget.yMin == null ? "" : String(widget.yMin);
  yMinInput.addEventListener("change", () => {
    runAction(() => {
      widget.yMin = parseLimitInput(yMinInput.value);
    });
  });
  const yMaxInput = document.createElement("input");
  yMaxInput.type = "number";
  yMaxInput.step = "any";
  yMaxInput.placeholder = t("widget.axisYMax");
  yMaxInput.value = widget.yMax == null ? "" : String(widget.yMax);
  yMaxInput.addEventListener("change", () => {
    runAction(() => {
      widget.yMax = parseLimitInput(yMaxInput.value);
    });
  });
  yLimitRow.appendChild(yMinInput);
  yLimitRow.appendChild(yMaxInput);
  widgetConfig.appendChild(yLimitRow);

  const gridLabel = document.createElement("label");
  gridLabel.className = "menu-check";
  const gridInput = document.createElement("input");
  gridInput.type = "checkbox";
  gridInput.checked = widget.showGrid !== false;
  gridInput.addEventListener("change", () => {
    runAction(() => {
      widget.showGrid = gridInput.checked;
    });
  });
  const gridSpan = document.createElement("span");
  gridSpan.textContent = t("widget.showGrid");
  gridLabel.appendChild(gridInput);
  gridLabel.appendChild(gridSpan);
  widgetConfig.appendChild(gridLabel);
}

function refreshSidebar() {
  syncNodeSelectionFocus();

  if (ui.selected?.type === "edge") {
    delete propsList.dataset.ownerKey;
    noSelection.classList.add("hidden");
    globalPanel.classList.add("hidden");
    widgetPanel.classList.add("hidden");
    nodePanel.classList.add("hidden");
    edgePanel.classList.remove("hidden");

    const edgeId = ui.selected.id;
    const edge = getEdgeById(edgeId);
    if (!edge) {
      clearAllSelection();
      refreshSidebar();
      return;
    }

    const from = getNodeById(edge.from);
    const to = getNodeById(edge.to);
    edgeInfo.textContent = `${from?.name || edge.from} -> ${to?.name || edge.to}`;
    return;
  }

  if (ui.selected?.type === "widget") {
    delete propsList.dataset.ownerKey;
    noSelection.classList.add("hidden");
    globalPanel.classList.add("hidden");
    nodePanel.classList.add("hidden");
    edgePanel.classList.add("hidden");
    widgetPanel.classList.remove("hidden");
    const widget = getWidgetById(ui.selected.id);
    if (!widget) {
      clearAllSelection();
      refreshSidebar();
      return;
    }
    if (widgetPanelTitle) {
      widgetPanelTitle.textContent = widget.type === "xychart"
        ? t("panel.widgetChart")
        : (widget.type === "slider" ? t("panel.widgetSlider") : t("panel.widgetTable"));
    }
    refreshWidgetConfigPanel(widget);
    return;
  }

  if (ui.selectedNodes.size === 1) {
    const nodeId = [...ui.selectedNodes][0];
    const node = getNodeById(nodeId);
    if (!node) {
      clearAllSelection();
      refreshSidebar();
      return;
    }

    noSelection.classList.add("hidden");
    globalPanel.classList.add("hidden");
    widgetPanel.classList.add("hidden");
    nodePanel.classList.remove("hidden");
    edgePanel.classList.add("hidden");

    if (document.activeElement !== nodeNameInput) {
      nodeNameInput.value = node.name;
    }
    if (document.activeElement !== nodeShapeInput) {
      nodeShapeInput.value = node.shape;
    }
    const showInputToggle = canMarkNodeAsInput(node);
    nodeInputInput.checked = Boolean(node.input);
    nodeOutputInput.checked = Boolean(node.output);
    if (nodeInputLabel) {
      nodeInputLabel.classList.toggle("hidden", !showInputToggle);
    }
    nodeInputInput.disabled = !showInputToggle;
    const stateNode = isStateNode(node);
    const parameterNode = node.shape === "diamond";
    if (nodeValueExprLabel) {
      nodeValueExprLabel.textContent = parameterNode
        ? t("label.value")
        : (stateNode ? t("label.stateTransition") : t("label.behaviorFunction"));
    }
    if (document.activeElement !== nodeValueExprInput) {
      nodeValueExprInput.value = node.valueExpression || "";
    }
    updateExpressionFieldState(nodeValueExprInput, nodeValueExprStatus, node.valueExpression || "", false, "value");
    if (nodeInitialStateLabel) {
      nodeInitialStateLabel.classList.toggle("hidden", !stateNode);
    }
    if (nodeInitialStateInput) {
      nodeInitialStateInput.classList.toggle("hidden", !stateNode);
      if (editNodeInitialStateBtn) {
        editNodeInitialStateBtn.classList.toggle("hidden", !stateNode);
      }
      if (nodeInitialStateStatus) {
        nodeInitialStateStatus.classList.toggle("hidden", !stateNode);
      }
      if (stateNode && document.activeElement !== nodeInitialStateInput) {
        nodeInitialStateInput.value = node.initialStateExpression || "0";
      }
      if (stateNode) {
        updateExpressionFieldState(nodeInitialStateInput, nodeInitialStateStatus, node.initialStateExpression || "0", false, "initial");
      } else {
        nodeInitialStateInput.classList.remove("invalid");
        hideExpressionStatus(nodeInitialStateStatus);
      }
    }
    if (node.computedError) {
      nodeValueOutput.textContent = t("text.valueError", { reason: evalReasonText(node.computedError) });
    } else {
      nodeValueOutput.textContent = formatComputedValue(node.computedValue);
    }

    if (renderPropertiesEditor(
      propsList,
      node.properties,
      `node:${node.id}`,
      (idx) => {
        node.properties.splice(idx, 1);
      },
    )) {
      return;
    }
    return;
  }

  nodePanel.classList.add("hidden");
  edgePanel.classList.add("hidden");
  widgetPanel.classList.add("hidden");
  if (nodeValueExprLabel) {
    nodeValueExprLabel.textContent = t("label.behaviorFunction");
  }
  nodeValueExprInput.classList.remove("invalid");
  nodeInitialStateInput.classList.remove("invalid");
  hideExpressionStatus(nodeValueExprStatus);
  hideExpressionStatus(nodeInitialStateStatus);
  nodeInputInput.checked = false;
  if (nodeInputLabel) {
    nodeInputLabel.classList.add("hidden");
  }
  nodeInputInput.disabled = true;
  if (nodeInitialStateLabel) {
    nodeInitialStateLabel.classList.add("hidden");
  }
  if (nodeInitialStateInput) {
    nodeInitialStateInput.classList.add("hidden");
  }
  if (widgetPanelTitle) {
    widgetPanelTitle.textContent = t("panel.widget");
  }
  delete propsList.dataset.ownerKey;

  if (ui.selectedNodes.size > 1) {
    globalPanel.classList.add("hidden");
    noSelection.classList.remove("hidden");
    noSelection.textContent = t("text.nodesSelected", { count: ui.selectedNodes.size });
  } else {
    noSelection.classList.add("hidden");
    globalPanel.classList.remove("hidden");
    if (document.activeElement !== modelTitleInput) {
      modelTitleInput.value = String(graph.modelTitle ?? "");
    }
    if (document.activeElement !== timeStartInput) {
      timeStartInput.value = String(graph.execution.t0);
    }
    if (document.activeElement !== timeStepInput) {
      timeStepInput.value = String(graph.execution.dt);
    }
    if (document.activeElement !== timeEndInput) {
      timeEndInput.value = String(graph.execution.t1);
    }
    if (document.activeElement !== timeDelayInput) {
      timeDelayInput.value = String(graph.execution.delayMs);
    }
    if (document.activeElement !== decimalDigitsInput) {
      decimalDigitsInput.value = String(clampDisplayDecimals(graph.execution.decimals));
    }
    timeCurrentOutput.textContent =
      graph.execution.currentTime == null
        ? formatNumberValue(Number(graph.execution.t0))
        : formatNumberValue(Number(graph.execution.currentTime));
    renderPropertiesEditor(
      modelPropsList,
      graph.properties,
      "model",
      (idx) => {
        graph.properties.splice(idx, 1);
      },
    );
    updateModelRunButtons();
  }
}

function render() {
  edgesLayer.innerHTML = "";
  nodesLayer.innerHTML = "";
  controlsLayer.innerHTML = "";
  previewLayer.innerHTML = "";
  marqueeLayer.innerHTML = "";

  graph.edges.forEach((edge) => {
    const geom = buildEdgeGeometry(edge);
    if (!geom) {
      return;
    }

    const g = document.createElementNS(SVG_NS, "g");
    g.classList.add("edge");
    const isSelected = ui.selected?.type === "edge" && ui.selected.id === edge.id;
    if (isSelected) {
      g.classList.add("selected");
    }

    const path = document.createElementNS(SVG_NS, "path");
    path.classList.add("edge-line");
    path.setAttribute("d", geom.path);
    path.setAttribute("marker-end", "url(#arrow)");

    const hit = document.createElementNS(SVG_NS, "path");
    hit.classList.add("edge-hit");
    hit.setAttribute("d", geom.path);

    const onEdgeContextMenu = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      selectEdge(edge.id);
      render();
      const p = svgPointFromClient(evt.clientX, evt.clientY);
      openEdgeContextMenu(evt, edge.id, p);
    };

    hit.addEventListener("contextmenu", onEdgeContextMenu);
    path.addEventListener("contextmenu", onEdgeContextMenu);

    const onEdgeHitDown = (evt, pointGetter) => {
      evt.stopPropagation();
      const p = pointGetter(evt);
      if (!isSelected) {
        selectEdge(edge.id);
        render();
        return;
      }

      runAction(() => {
        addControlPointAt(edge, p);
      });
      setStatusKey("status.cpAdded");
    };

    path.addEventListener("pointerdown", (evt) => onEdgeHitDown(evt, svgPoint));
    path.addEventListener("mousedown", (evt) => onEdgeHitDown(evt, (e) => svgPointFromClient(e.clientX, e.clientY)));
    hit.addEventListener("pointerdown", (evt) => onEdgeHitDown(evt, svgPoint));
    hit.addEventListener("mousedown", (evt) => onEdgeHitDown(evt, (e) => svgPointFromClient(e.clientX, e.clientY)));

    g.appendChild(path);
    g.appendChild(hit);

    if (isSelected) {
      edge.controlPoints.forEach((cp, idx) => {
        const cpCircle = document.createElementNS(SVG_NS, "circle");
        cpCircle.classList.add("control-point");
        if (
          ui.selectedControlPoint &&
          ui.selectedControlPoint.edgeId === edge.id &&
          ui.selectedControlPoint.index === idx
        ) {
          cpCircle.classList.add("active");
        }
        cpCircle.setAttribute("cx", cp.x);
        cpCircle.setAttribute("cy", cp.y);
        cpCircle.setAttribute("r", "7");

        cpCircle.addEventListener("pointerdown", (evt) => {
          evt.stopPropagation();
          selectEdge(edge.id);
          const now = Date.now();
          if (
            ui.lastControlPointTap &&
            ui.lastControlPointTap.edgeId === edge.id &&
            ui.lastControlPointTap.index === idx &&
            now - ui.lastControlPointTap.time < 320
          ) {
            ui.lastControlPointTap = null;
            runAction(() => {
              removeControlPoint(edge.id, idx);
            });
            setStatusKey("status.cpRemoved");
            return;
          }

          ui.lastControlPointTap = { edgeId: edge.id, index: idx, time: now };
          ui.selectedControlPoint = { edgeId: edge.id, index: idx };
          ui.controlPointDrag = {
            edgeId: edge.id,
            index: idx,
            pointerId: evt.pointerId,
          };
          beginTransaction();
        });

        controlsLayer.appendChild(cpCircle);
      });
    }

    edgesLayer.appendChild(g);
  });

  if (ui.edgeCreate) {
    const fromNode = getNodeById(ui.edgeCreate.fromId);
    if (fromNode) {
      const start = nodeBoundaryPoint(fromNode, ui.edgeCreate.current.x, ui.edgeCreate.current.y);
      const preview = document.createElementNS(SVG_NS, "path");
      preview.classList.add("edge-drag-preview");
      preview.setAttribute("d", `M ${start.x} ${start.y} L ${ui.edgeCreate.current.x} ${ui.edgeCreate.current.y}`);
      preview.setAttribute("marker-end", "url(#arrow)");
      previewLayer.appendChild(preview);
    }
  }

  if (ui.marquee) {
    const r = marqueeRect(ui.marquee);
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", r.x);
    rect.setAttribute("y", r.y);
    rect.setAttribute("width", r.width);
    rect.setAttribute("height", r.height);
    rect.setAttribute("fill", "rgba(14,122,196,0.12)");
    rect.setAttribute("stroke", "#0e7ac4");
    rect.setAttribute("stroke-dasharray", "6 4");
    marqueeLayer.appendChild(rect);
  }

  graph.nodes.forEach((node) => {
    const g = document.createElementNS(SVG_NS, "g");
    g.classList.add("node");
    g.dataset.nodeId = node.id;
    g.addEventListener("contextmenu", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      openNodeContextMenu(evt, node);
    });
    if (ui.selectedNodes.has(node.id)) {
      g.classList.add("selected");
    }
    if (ui.edgeCreate && ui.edgeCreateHoverId === node.id && node.id !== ui.edgeCreate.fromId) {
      g.classList.add("edge-target");
    }

    let shapeEl;
    if (node.shape === "ellipse") {
      shapeEl = document.createElementNS(SVG_NS, "ellipse");
      shapeEl.setAttribute("cx", node.x);
      shapeEl.setAttribute("cy", node.y);
      shapeEl.setAttribute("rx", node.width / 2);
      shapeEl.setAttribute("ry", node.height / 2);
    } else if (node.shape === "diamond") {
      shapeEl = document.createElementNS(SVG_NS, "polygon");
      shapeEl.setAttribute("points", diamondPoints(node));
    } else {
      shapeEl = document.createElementNS(SVG_NS, "rect");
      shapeEl.setAttribute("x", node.x - node.width / 2);
      shapeEl.setAttribute("y", node.y - node.height / 2);
      shapeEl.setAttribute("width", node.width);
      shapeEl.setAttribute("height", node.height);
      shapeEl.setAttribute("rx", 8);
    }
    shapeEl.classList.add("node-shape");

    const startEdgeCreate = (evt) => {
      evt.stopPropagation();
      startEdgeCreateFromNode(node.id, evt.pointerId, svgPoint(evt));
      render();
    };

    const startEdgeCreateMouse = (evt) => {
      evt.stopPropagation();
      startEdgeCreateFromMouse(node.id, evt);
    };

    shapeEl.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
      const additive = evt.ctrlKey || evt.metaKey;
      const p = svgPoint(evt);
      const centerDx = p.x - node.x;
      const centerDy = p.y - node.y;
      const nearCenter = Math.hypot(centerDx, centerDy) <= 20;

      if (!additive && nearCenter) {
        startEdgeCreate(evt);
        return;
      }

      if (additive) {
        toggleNodeSelection(node.id);
        render();
        return;
      }

      if (!ui.selectedNodes.has(node.id)) {
        selectSingleNode(node.id);
      }

      const dragIds = ui.selectedNodes.size > 0 ? [...ui.selectedNodes] : [node.id];
      const dragSet = new Set(dragIds);
      const startMap = new Map(dragIds.map((id) => {
        const n = getNodeById(id);
        return [id, { x: n.x, y: n.y }];
      }));
      const edgeControlStartMap = new Map();
      graph.edges.forEach((edge) => {
        if (dragSet.has(edge.from) && dragSet.has(edge.to) && edge.controlPoints.length > 0) {
          edgeControlStartMap.set(
            edge.id,
            edge.controlPoints.map((cp) => ({ x: cp.x, y: cp.y })),
          );
        }
      });

      ui.drag = {
        nodeIds: dragIds,
        dragSet,
        startMap,
        edgeControlStartMap,
        startPointer: svgPoint(evt),
        pointerId: evt.pointerId,
      };
      beginTransaction();
      render();
    });

    const label = document.createElementNS(SVG_NS, "text");
    label.classList.add("node-label");
    label.setAttribute("x", node.x);
    label.setAttribute("y", node.y);
    label.textContent = node.name;

    let inputBadge = null;
    let inputBadgeLabel = null;
    if (node.input) {
      inputBadge = document.createElementNS(SVG_NS, "circle");
      inputBadge.classList.add("node-input-badge");
      inputBadge.setAttribute("cx", node.x - node.width / 2 + 9);
      inputBadge.setAttribute("cy", node.y - node.height / 2 + 9);
      inputBadge.setAttribute("r", "7");
      inputBadgeLabel = document.createElementNS(SVG_NS, "text");
      inputBadgeLabel.classList.add("node-input-badge-label");
      inputBadgeLabel.setAttribute("x", node.x - node.width / 2 + 9);
      inputBadgeLabel.setAttribute("y", node.y - node.height / 2 + 9);
      inputBadgeLabel.textContent = "I";
    }

    let outputBadge = null;
    let outputBadgeLabel = null;
    if (node.output) {
      outputBadge = document.createElementNS(SVG_NS, "circle");
      outputBadge.classList.add("node-output-badge");
      outputBadge.setAttribute("cx", node.x + node.width / 2 - 9);
      outputBadge.setAttribute("cy", node.y - node.height / 2 + 9);
      outputBadge.setAttribute("r", "7");
      outputBadgeLabel = document.createElementNS(SVG_NS, "text");
      outputBadgeLabel.classList.add("node-output-badge-label");
      outputBadgeLabel.setAttribute("x", node.x + node.width / 2 - 9);
      outputBadgeLabel.setAttribute("y", node.y - node.height / 2 + 9);
      outputBadgeLabel.textContent = "O";
    }

    const centerPortHit = document.createElementNS(SVG_NS, "circle");
    centerPortHit.classList.add("center-port-hit");
    centerPortHit.setAttribute("cx", node.x);
    centerPortHit.setAttribute("cy", node.y);
    centerPortHit.setAttribute("r", "18");
    centerPortHit.addEventListener("pointerdown", startEdgeCreate);
    centerPortHit.addEventListener("mousedown", startEdgeCreateMouse);

    const handle = document.createElementNS(SVG_NS, "circle");
    handle.classList.add("resize-handle");
    handle.setAttribute("cx", node.x + node.width / 2);
    handle.setAttribute("cy", node.y + node.height / 2);
    handle.setAttribute("r", "6");

    handle.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
      if (!ui.selectedNodes.has(node.id)) {
        selectSingleNode(node.id);
      }
      ui.resize = {
        nodeId: node.id,
        startPointer: svgPoint(evt),
        startWidth: node.width,
        startHeight: node.height,
        pointerId: evt.pointerId,
      };
      beginTransaction();
      render();
    });

    g.appendChild(shapeEl);
    g.appendChild(label);
    if (inputBadge && inputBadgeLabel) {
      g.appendChild(inputBadge);
      g.appendChild(inputBadgeLabel);
    }
    if (outputBadge && outputBadgeLabel) {
      g.appendChild(outputBadge);
      g.appendChild(outputBadgeLabel);
    }
    g.appendChild(centerPortHit);
    g.appendChild(handle);
    nodesLayer.appendChild(g);
  });

  updateCanvasSize();
  if (ui.sliderInteraction == null) {
    renderWidgets();
  } else {
    applyWidgetDrivenNodeValues();
  }
  refreshSidebar();
  updateHistoryButtons();
  scheduleFileStatusRefresh();
}

function isValidPoint(p) {
  return p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

function importGraphData(data) {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error(t("error.invalidJson"));
  }

  const nodes = data.nodes
    .filter((n) => Number.isInteger(n.id))
    .map((n) => {
      if (!["state", "algebraic", "parameter"].includes(n.type)) {
        throw new Error(t("error.invalidJson"));
      }
      const shape = deserializeNodeType(n.type);
      return {
        id: n.id,
        name: typeof n.name === "string" ? n.name : t("node.defaultName", { id: n.id }),
        input: shape === "ellipse" ? Boolean(n.input) : false,
        output: Boolean(n.output),
        type: serializeNodeType(shape),
        x: Number.isFinite(n.x) ? n.x : 200,
        y: Number.isFinite(n.y) ? n.y : 200,
        width: clamp(Number(n.width) || 120, 40, 500),
        height: clamp(Number(n.height) || 70, 30, 500),
        valueExpression: shape === "rect" ? "" : String(n.valueExpression ?? ""),
        stateTransition: shape === "rect"
          ? String(n.stateTransition ?? "this") || "this"
          : "",
        initialState: shape === "rect"
          ? String(n.initialState ?? "0")
          : "",
        computedValue: null,
        computedError: "",
        pendingStateValue: null,
        pendingStateError: "",
        properties: Array.isArray(n.properties)
          ? n.properties.map((p) => ({ key: String(p?.key ?? ""), value: String(p?.value ?? "") }))
          : [],
      };
    });
  const nodesWithValidNames = semantics.sanitizeNodeNames(nodes, "n");

  const nodeIds = new Set(nodesWithValidNames.map((n) => n.id));

  const edges = data.edges
    .filter((e) => {
      if (!Number.isInteger(e.id) || !nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to) {
        return false;
      }
      const targetNode = nodesWithValidNames.find((n) => n.id === e.to);
      return targetNode?.type !== "parameter";
    })
    .map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      controlPoints: Array.isArray(e.controlPoints)
        ? e.controlPoints.filter(isValidPoint).map((cp) => ({ x: cp.x, y: cp.y }))
        : [],
    }));

  const maxNodeId = nodesWithValidNames.reduce((max, n) => Math.max(max, n.id), 0);
  const maxEdgeId = edges.reduce((max, e) => Math.max(max, e.id), 0);
  const widgets = Array.isArray(data.widgets)
    ? data.widgets
      .filter((w) => Number.isInteger(w.id) && (w.type === "table" || w.type === "xychart" || w.type === "slider"))
      .map((w) => ({
        id: w.id,
        type: w.type === "xychart" ? "xychart" : (w.type === "slider" ? "slider" : "table"),
        customTitle: String(w.customTitle ?? ""),
        x: Number.isFinite(Number(w.x)) ? Number(w.x) : 40,
        y: Number.isFinite(Number(w.y)) ? Number(w.y) : 40,
        width: clamp(Number(w.width) || 320, 220, 1200),
        height: clamp(Number(w.height) || 160, 110, 900),
        minimized: Boolean(w.minimized),
        outputOnly: Boolean(w.outputOnly),
        showHistory: Boolean(w.showHistory),
        xMin: Number.isFinite(Number(w.xMin)) ? Number(w.xMin) : null,
        xMax: Number.isFinite(Number(w.xMax)) ? Number(w.xMax) : null,
        yMin: Number.isFinite(Number(w.yMin)) ? Number(w.yMin) : null,
        yMax: Number.isFinite(Number(w.yMax)) ? Number(w.yMax) : null,
        showGrid: w.showGrid !== false,
        source: String(w.source ?? ""),
        min: Number.isFinite(Number(w.min)) ? Number(w.min) : 0,
        max: Number.isFinite(Number(w.max)) ? Number(w.max) : 100,
        step: Number.isFinite(Number(w.step)) ? Number(w.step) : 1,
        value: Number.isFinite(Number(w.value)) ? Number(w.value) : 0,
        rows: [],
        columns: Array.isArray(w.columns) ? w.columns.map((c) => String(c)) : [],
        xyPairs: Array.isArray(w.xyPairs)
          ? w.xyPairs.map((pair, idx) => ({
            xSource: String(pair.xSource ?? "time"),
            ySource: String(pair.ySource ?? ""),
            color: /^#[0-9a-fA-F]{6}$/.test(String(pair?.color ?? "")) ? String(pair.color) : defaultChartSeriesColor(idx),
            showLine: pair?.showLine !== false,
            showPoints: pair?.showPoints !== false,
            points: [],
          }))
          : (() => {
            const legacyX = String(w.xSource ?? w.xNode ?? "time");
            const legacyYNodes = Array.isArray(w.yNodes)
              ? w.yNodes.map((n) => String(n))
              : (w.yNode ? [String(w.yNode)] : []);
            return legacyYNodes.map((yNode, idx) => ({
              xSource: legacyX,
              ySource: yNode,
              color: defaultChartSeriesColor(idx),
              showLine: true,
              showPoints: true,
              points: [],
            }));
          })(),
      }))
    : [];
  const maxWidgetId = widgets.reduce((max, w) => Math.max(max, w.id), 0);

  applyGraphData({
    version: 1,
    modelTitle: String(data.modelTitle ?? ""),
    modelProperties: Array.isArray(data.modelProperties)
      ? data.modelProperties.map((p) => ({ key: String(p?.key ?? ""), value: String(p?.value ?? "") }))
      : [],
    nodeCounter: Math.max(Number(data.nodeCounter) || 0, maxNodeId) + 1,
    edgeCounter: Math.max(Number(data.edgeCounter) || 0, maxEdgeId) + 1,
    widgetCounter: Math.max(Number(data.widgetCounter) || 0, maxWidgetId) + 1,
    execution: normalizeExecutionConfig(data.execution),
    nodes: nodesWithValidNames,
    edges,
    widgets,
  });
}

function defaultGraphFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `grafo-${stamp}.json`;
}

function normalizeJsonFilename(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return defaultGraphFilename();
  }
  return trimmed.toLowerCase().endsWith(".json") ? trimmed : `${trimmed}.json`;
}

function loadGraphFromJsonText(jsonText, sourceName = "", fileHandle = null) {
  stopTimedExecution(false);
  try {
    const data = JSON.parse(String(jsonText || "{}"));
    runAction(() => {
      importGraphData(data);
    });
    currentFileHandle = fileHandle || null;
    currentFileName = sourceName || currentFileName || defaultGraphFilename();
    markSavedSnapshot();
    setStatusKey("status.loaded");
    window.requestAnimationFrame(() => {
      fitToContent();
    });
  } catch (err) {
    cancelTransaction();
    setStatus(t("error.load", { message: err.message }));
  }
}

function downloadJsonFile(filename, json) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = normalizeJsonFilename(filename);
  a.click();
  URL.revokeObjectURL(url);
}

async function writeJsonToFileHandle(fileHandle, json) {
  if (!fileHandle) {
    return false;
  }
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
    return true;
  } catch (_err) {
    return false;
  }
}

async function pickSaveAsHandle(suggestedName) {
  if (window.showSaveFilePicker) {
    return window.showSaveFilePicker({
      suggestedName: normalizeJsonFilename(suggestedName),
      types: [
        {
          description: "JSON",
          accept: { "application/json": [".json"] },
        },
      ],
    });
  }

  return null;
}

async function saveGraphJson(forceSaveAs = false) {
  forceSaveAs = forceSaveAs === true;

  if (!forceSaveAs && !dirtySinceLastSave) {
    setStatusKey("status.alreadySaved");
    return true;
  }

  const data = exportGraphData();
  const json = JSON.stringify(data, null, 2);
  let filename = currentFileName || defaultGraphFilename();

  if (!forceSaveAs && currentFileHandle) {
    const ok = await writeJsonToFileHandle(currentFileHandle, json);
    if (!ok) {
      setStatusKey("error.saveFailed");
      return false;
    }
    filename = currentFileHandle.name || filename;
    currentFileName = filename;
    markSavedSnapshot();
    setStatusKey("status.saved");
    return true;
  }

  if (!forceSaveAs && !currentFileHandle) {
    try {
      currentFileHandle = await pickSaveAsHandle(filename);
      if (currentFileHandle) {
        currentFileName = currentFileHandle.name || normalizeJsonFilename(filename);
        const ok = await writeJsonToFileHandle(currentFileHandle, json);
        if (!ok) {
          setStatusKey("error.saveFailed");
          return false;
        }
        markSavedSnapshot();
        setStatusKey("status.saved");
        return true;
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        setStatusKey("status.saveCanceled");
        return false;
      }
      currentFileHandle = null;
    }

    let selectedName = normalizeJsonFilename(filename);
    if (isFirefoxBrowser()) {
      const proposed = window.prompt(t("prompt.saveAs"), selectedName);
      if (proposed == null) {
        setStatusKey("status.saveCanceled");
        return false;
      }
      selectedName = normalizeJsonFilename(proposed);
    }
    currentFileName = selectedName;
    downloadJsonFile(selectedName, json);
    markSavedSnapshot();
    setStatusKey("status.saved");
    return true;
  }

  if (forceSaveAs) {
    const hasNativeSavePicker = typeof window.showSaveFilePicker === "function";
    try {
      currentFileHandle = await pickSaveAsHandle(filename);
      if (currentFileHandle) {
        currentFileName = currentFileHandle.name || normalizeJsonFilename(filename);
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        setStatusKey("status.saveCanceled");
        return false;
      }
      if (hasNativeSavePicker) {
        setStatusKey("error.saveFailed");
        return false;
      }
      currentFileHandle = null;
    }
    if (currentFileHandle) {
      const ok = await writeJsonToFileHandle(currentFileHandle, json);
      if (!ok) {
        setStatusKey("error.saveFailed");
        return false;
      } else {
        filename = currentFileHandle.name || filename;
        currentFileName = filename;
        markSavedSnapshot();
        setStatusKey("status.savedAs");
        return true;
      }
    }
  }

  if (forceSaveAs) {
    if (isFirefoxBrowser()) {
      const proposed = window.prompt(t("prompt.saveAs"), normalizeJsonFilename(filename));
      if (proposed == null) {
        setStatusKey("status.saveCanceled");
        return false;
      }
      filename = normalizeJsonFilename(proposed);
    } else {
      filename = normalizeJsonFilename(filename);
    }
    currentFileName = filename;
  } else {
    filename = normalizeJsonFilename(filename);
    currentFileName = filename;
  }

  downloadJsonFile(filename, json);
  markSavedSnapshot();
  setStatusKey(forceSaveAs ? "status.savedAs" : "status.saved");
  return true;
}

function loadGraphJsonFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    loadGraphFromJsonText(String(reader.result || "{}"), file?.name || "graph.json");
  };
  reader.onerror = () => {
    cancelTransaction();
    setStatusKey("status.readError");
  };
  reader.readAsText(file);
}

async function openGraphJson() {
  if (window.showOpenFilePicker) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "JSON",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      if (!handles || handles.length === 0) {
        return;
      }
      const handle = handles[0];
      const file = await handle.getFile();
      const text = await file.text();
      loadGraphFromJsonText(text, handle.name || file.name || "graph.json", handle);
      return;
    } catch (err) {
      if (err && err.name === "AbortError") {
        return;
      }
    }
  }
  loadJsonInput.click();
}

async function createNewGraph() {
  if (hasUnsavedChanges()) {
    const shouldSave = window.confirm(t("confirm.newGraph.save"));
    if (shouldSave) {
      const saved = await saveGraphJson();
      if (!saved) {
        return;
      }
    }
  }

  graph.modelTitle = "";
  graph.properties = [];
  graph.nodes = [];
  graph.edges = [];
  graph.widgets = [];
  stopTimedExecution(false);
  graph.execution = { t0: 0, dt: 1, t1: 10, delayMs: 1000, decimals: 3, currentTime: null };
  nodeCounter = 1;
  edgeCounter = 1;
  widgetCounter = 1;
  clearAllSelection();
  history.undo = [];
  history.redo = [];
  updateHistoryButtons();
  currentFileHandle = null;
  currentFileName = "";
  markSavedSnapshot();
  setStatusKey("status.newGraph");
  render();
}

function stopTimedExecution(updateStatus = true) {
  if (ui.timedRunHandle != null) {
    window.clearInterval(ui.timedRunHandle);
    ui.timedRunHandle = null;
    if (updateStatus) {
      setStatusKey("status.timedStopped");
    }
    render();
  }
}

function isTimeWithinBounds(value, t0, dt, t1) {
  const epsilon = Math.max(1e-12, Math.abs(dt) * 1e-9);
  if (dt > 0) {
    return value <= t1 + epsilon && value >= t0 - epsilon;
  }
  return value >= t1 - epsilon && value <= t0 + epsilon;
}

function isExecutionEnded(cfg) {
  if (graph.execution.currentTime == null) {
    return false;
  }
  const nextTime = graph.execution.currentTime + cfg.dt;
  return !isTimeWithinBounds(nextTime, cfg.t0, cfg.dt, cfg.t1);
}

function parseModelPropertyStoredValue(raw) {
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

function serializeModelPropertyStoredValue(value) {
  if (value === true) {
    return "1";
  }
  if (value === false) {
    return "0";
  }
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value) || typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function getModelPropertyValue(key, fallback = null) {
  const name = String(key ?? "");
  const found = graph.properties.find((prop) => String(prop?.key ?? "") === name);
  if (!found) {
    return fallback;
  }
  return parseModelPropertyStoredValue(found.value);
}

function setModelPropertyValue(key, value) {
  const name = String(key ?? "");
  const stored = serializeModelPropertyStoredValue(value);
  const found = graph.properties.find((prop) => String(prop?.key ?? "") === name);
  if (found) {
    found.value = stored;
  } else {
    graph.properties.push({ key: name, value: stored });
  }
  return value;
}

function buildExecutionGlobals(timeValue) {
  return {
    time: timeValue,
    t0: Number(graph.execution.t0),
    t1: Number(graph.execution.t1),
    dt: Number(graph.execution.dt),
    getModelProperty: getModelPropertyValue,
    setModelProperty: setModelPropertyValue,
  };
}

function initializeStateNodes(timeValue) {
  graph.nodes.forEach((node) => {
    if (!isStateNode(node)) {
      node.computedValue = null;
      node.computedError = "";
      node.pendingStateValue = null;
      node.pendingStateError = "";
      return;
    }
    const initExpr = String(node.initialStateExpression ?? "0");
    const initResult = semantics.evaluateValueExpression(initExpr, buildExecutionGlobals(timeValue));
    if (initResult.ok) {
      node.computedValue = initResult.value;
      node.computedError = "";
    } else {
      node.computedValue = null;
      node.computedError = initResult.reason || "runtime";
    }
    node.pendingStateValue = null;
    node.pendingStateError = "";
  });
}

function promotePendingStateNodes() {
  graph.nodes.forEach((node) => {
    if (!isStateNode(node)) {
      return;
    }
    if (node.pendingStateError) {
      node.computedValue = null;
      node.computedError = node.pendingStateError;
      node.pendingStateValue = null;
      node.pendingStateError = "";
      return;
    }
    if (node.pendingStateValue !== null && node.pendingStateValue !== undefined) {
      node.computedValue = node.pendingStateValue;
      node.computedError = "";
      node.pendingStateValue = null;
      node.pendingStateError = "";
    }
  });
}

function evaluateAtTime(timeValue) {
  applyWidgetDrivenNodeValues();
  const evalResults = semantics.evaluateStatefulGraphStep(
    graph.nodes,
    graph.edges,
    buildExecutionGlobals(timeValue),
  );
  let successCount = 0;
  let errorCount = 0;
  let firstErrorNode = null;
  let firstErrorReason = null;

  evalResults.algebraic.forEach((entry) => {
    const node = getNodeById(entry.id);
    if (!node) {
      return;
    }
    if (entry.result.ok) {
      node.computedValue = entry.result.value;
      node.computedError = "";
      successCount += 1;
    } else {
      node.computedValue = null;
      node.computedError = entry.result.reason || "runtime";
      errorCount += 1;
      if (!firstErrorNode) {
        firstErrorNode = node.name;
        firstErrorReason = node.computedError;
      }
    }
  });

  evalResults.stateTransitions.forEach((entry) => {
    const node = getNodeById(entry.id);
    if (!node) {
      return;
    }
    if (entry.result.ok) {
      node.pendingStateValue = entry.result.value;
      node.pendingStateError = "";
      successCount += 1;
    } else {
      node.pendingStateValue = null;
      node.pendingStateError = entry.result.reason || "runtime";
      errorCount += 1;
      if (!firstErrorNode) {
        firstErrorNode = node.name;
        firstErrorReason = node.pendingStateError;
      }
    }
  });

  updateTableWidgetsFromComputedValues(timeValue);
  updateXYWidgetsFromComputedValues(timeValue);

  return { successCount, errorCount, firstErrorNode, firstErrorReason };
}

function validateTimeConfig() {
  const t0 = Number(graph.execution.t0);
  const dt = Number(graph.execution.dt);
  const t1 = Number(graph.execution.t1);
  if (!Number.isFinite(t0) || !Number.isFinite(dt) || !Number.isFinite(t1)) {
    setStatusKey("error.timeInvalid");
    return null;
  }
  if (dt === 0) {
    setStatusKey("error.timeStepZero");
    return null;
  }
  if ((dt > 0 && t0 > t1) || (dt < 0 && t0 < t1)) {
    setStatusKey("error.timeDirection");
    return null;
  }
  return { t0, dt, t1 };
}

function executeOneStep(restartIfEnded = true) {
  const cfg = validateTimeConfig();
  if (!cfg) {
    return false;
  }

  let restarted = false;
  if (isExecutionEnded(cfg)) {
    if (!restartIfEnded) {
      setStatusKey("status.timeEndReached", {
        time: formatNumberValue(Number(graph.execution.currentTime ?? cfg.t0)),
      });
      return false;
    }
    graph.execution.currentTime = null;
    restarted = true;
  }
  const nextTime = graph.execution.currentTime == null ? cfg.t0 : graph.execution.currentTime + cfg.dt;

  let stepResult = null;
  runAction(() => {
    if (restarted) {
      clearAllXYChartPoints();
      clearAllTableWidgetRows();
    }
    if (graph.execution.currentTime == null) {
      initializeStateNodes(nextTime);
    } else {
      promotePendingStateNodes();
    }
    stepResult = evaluateAtTime(nextTime);
    graph.execution.currentTime = nextTime;
  });

  if (restarted && stepResult.errorCount === 0) {
    setStatusKey("status.executionRestarted", {
      time: formatNumberValue(Number(nextTime)),
      count: stepResult.successCount,
    });
  } else if (stepResult.errorCount > 0) {
    setStatusKey("error.evalStepFailed", {
      node: stepResult.firstErrorNode,
      reason: evalReasonText(stepResult.firstErrorReason),
      time: formatNumberValue(Number(nextTime)),
    });
  } else {
    setStatusKey("status.evalStepDone", {
      count: stepResult.successCount,
      time: formatNumberValue(Number(nextTime)),
    });
  }
  return true;
}

function executeNodeExpressions() {
  stopTimedExecution(false);
  const cfg = validateTimeConfig();
  if (!cfg) {
    return;
  }

  let continuing = graph.execution.currentTime != null;
  if (continuing && isExecutionEnded(cfg)) {
    continuing = false;
  }

  if (!continuing) {
    runAction(() => {
      graph.execution.currentTime = null;
      clearAllXYChartPoints();
      clearAllTableWidgetRows();
    });
  }

  const maxSteps = 100000;
  const epsilon = Math.max(1e-12, Math.abs(cfg.dt) * 1e-9);
  const timeValues = [];
  let current = continuing ? graph.execution.currentTime + cfg.dt : cfg.t0;
  for (let i = 0; i < maxSteps; i += 1) {
    if ((cfg.dt > 0 && current > cfg.t1 + epsilon) || (cfg.dt < 0 && current < cfg.t1 - epsilon)) {
      break;
    }
    timeValues.push(current);
    current += cfg.dt;
  }

  if (timeValues.length === 0) {
    setStatusKey("error.timeInvalid");
    return;
  }
  if (timeValues.length >= maxSteps) {
    setStatusKey("error.timeTooManySteps", { max: maxSteps });
    return;
  }

  let successCount = 0;
  let errorCount = 0;
  let totalErrorCount = 0;
  let firstErrorNode = null;
  let firstErrorReason = null;
  let firstErrorTime = null;
  let lastTime = timeValues[timeValues.length - 1];

  runAction(() => {
    timeValues.forEach((timeValue, idx) => {
      if (!continuing && idx === 0) {
        initializeStateNodes(timeValue);
      } else {
        promotePendingStateNodes();
      }
      const stepResult = evaluateAtTime(timeValue);
      successCount = stepResult.successCount;
      errorCount = stepResult.errorCount;
      totalErrorCount += stepResult.errorCount;
      if (!firstErrorNode && stepResult.firstErrorNode) {
        firstErrorNode = stepResult.firstErrorNode;
        firstErrorReason = stepResult.firstErrorReason;
        firstErrorTime = timeValue;
      }
    });
    graph.execution.currentTime = lastTime;
  });

  if (firstErrorNode) {
    setStatusKey("error.evalFailedDetailedTime", {
      node: firstErrorNode,
      count: totalErrorCount,
      reason: evalReasonText(firstErrorReason),
      time: formatNumberValue(Number(firstErrorTime)),
    });
  } else {
    setStatusKey("status.evalDoneTime", {
      count: successCount,
      steps: timeValues.length,
      time: formatNumberValue(Number(lastTime)),
    });
  }
}

function runManualStep() {
  stopTimedExecution(false);
  executeOneStep(true);
}

function resetExecution() {
  stopTimedExecution(false);
  const cfg = validateTimeConfig();
  if (!cfg) {
    return;
  }
  runAction(() => {
    graph.execution.currentTime = null;
    clearAllXYChartPoints();
    clearAllTableWidgetRows();
    initializeStateNodes(cfg.t0);
  });
  setStatusKey("status.executionReset", { time: formatNumberValue(Number(cfg.t0)) });
}

function toggleTimedExecution() {
  if (ui.timedRunHandle != null) {
    stopTimedExecution(true);
    return;
  }

  const cfg = validateTimeConfig();
  const delayMs = Number(graph.execution.delayMs);
  if (!cfg) {
    return;
  }
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    setStatusKey("error.timeDelayInvalid");
    return;
  }
  const ended = isExecutionEnded(cfg);
  const isFreshStart = graph.execution.currentTime == null || ended;
  if (isFreshStart) {
    runAction(() => {
      clearAllXYChartPoints();
      clearAllTableWidgetRows();
      if (ended) {
        graph.execution.currentTime = null;
      }
    });
  }

  ui.timedRunHandle = window.setInterval(() => {
    const ok = executeOneStep(false);
    if (!ok) {
      stopTimedExecution(false);
      setStatusKey("status.timedStopped");
    }
  }, delayMs);
  setStatusKey("status.timedStarted", { delay: delayMs });
  render();
}

window.addEventListener("pointermove", (evt) => {
  if (ui.widgetDrag && evt.pointerId === ui.widgetDrag.pointerId) {
    const widget = graph.widgets.find((w) => w.id === ui.widgetDrag.widgetId);
    if (widget) {
      const z = Math.max(0.0001, ui.zoom || 1);
      const dx = (evt.clientX - ui.widgetDrag.startClientX) / z;
      const dy = (evt.clientY - ui.widgetDrag.startClientY) / z;
      widget.x = Math.max(0, ui.widgetDrag.startX + dx);
      widget.y = Math.max(0, ui.widgetDrag.startY + dy);
      renderWidgets();
    }
    return;
  }
  if (ui.widgetResize && evt.pointerId === ui.widgetResize.pointerId) {
    const widget = graph.widgets.find((w) => w.id === ui.widgetResize.widgetId);
    if (widget) {
      const z = Math.max(0.0001, ui.zoom || 1);
      const dx = (evt.clientX - ui.widgetResize.startClientX) / z;
      const dy = (evt.clientY - ui.widgetResize.startClientY) / z;
      widget.width = clamp(ui.widgetResize.startWidth + dx, 220, 1200);
      widget.height = clamp(ui.widgetResize.startHeight + dy, 110, 900);
      renderWidgets();
    }
    return;
  }

  const pRaw = svgPoint(evt);
  const p = snapPoint(pRaw);
  const hoverNodeId = nodeIdAtGraphPoint(pRaw);
  const hoverNode = hoverNodeId != null ? getNodeById(hoverNodeId) : null;
  const hoverNearCenter = hoverNode ? Math.hypot(pRaw.x - hoverNode.x, pRaw.y - hoverNode.y) <= 20 : false;

  if (!ui.drag && !ui.resize && !ui.edgeCreate && !ui.controlPointDrag && !ui.marquee) {
    if (hoverNearCenter) {
      svg.style.cursor = "crosshair";
    } else if (hoverNode) {
      svg.style.cursor = "grab";
    } else {
      svg.style.cursor = "";
    }
  }

  if (ui.drag && evt.pointerId === ui.drag.pointerId) {
    const dx = pRaw.x - ui.drag.startPointer.x;
    const dy = pRaw.y - ui.drag.startPointer.y;
    ui.drag.nodeIds.forEach((id) => {
      const node = getNodeById(id);
      const start = ui.drag.startMap.get(id);
      if (node && start) {
        node.x = snap(start.x + dx);
        node.y = snap(start.y + dy);
      }
    });
    ui.drag.edgeControlStartMap.forEach((cpStart, edgeId) => {
      const edge = getEdgeById(edgeId);
      if (!edge) {
        return;
      }
      edge.controlPoints = cpStart.map((cp) => ({
        x: snap(cp.x + dx),
        y: snap(cp.y + dy),
      }));
    });
    render();
  }

  if (ui.resize && evt.pointerId === ui.resize.pointerId) {
    const node = getNodeById(ui.resize.nodeId);
    if (node) {
      const dx = pRaw.x - ui.resize.startPointer.x;
      const dy = pRaw.y - ui.resize.startPointer.y;
      node.width = clamp(snap(ui.resize.startWidth + dx), 40, 500);
      node.height = clamp(snap(ui.resize.startHeight + dy), 30, 500);
      render();
    }
  }

  if (ui.edgeCreate && evt.pointerId === ui.edgeCreate.pointerId) {
    updateEdgeCreateFromClient(evt.clientX, evt.clientY);
    render();
  }

  if (ui.controlPointDrag && evt.pointerId === ui.controlPointDrag.pointerId) {
    const edge = getEdgeById(ui.controlPointDrag.edgeId);
    if (edge && edge.controlPoints[ui.controlPointDrag.index]) {
      ui.lastControlPointTap = null;
      edge.controlPoints[ui.controlPointDrag.index] = p;
      render();
    }
  }

  if (ui.marquee && evt.pointerId === ui.marquee.pointerId) {
    ui.marquee.current = pRaw;
    const rect = marqueeRect(ui.marquee);
    const ids = nodesInRect(rect);
    if (ui.marquee.additive) {
      setNodeSelection([...ui.marquee.baseSelection, ...ids], false);
    } else {
      setNodeSelection(ids, false);
    }
    render();
  }
});

window.addEventListener("mousemove", (evt) => {
  const pRaw = svgPointFromClient(evt.clientX, evt.clientY);
  const hoverNodeId = nodeIdAtGraphPoint(pRaw);
  const hoverNode = hoverNodeId != null ? getNodeById(hoverNodeId) : null;
  const hoverNearCenter = hoverNode ? Math.hypot(pRaw.x - hoverNode.x, pRaw.y - hoverNode.y) <= 20 : false;

  if (!ui.drag && !ui.resize && !ui.edgeCreate && !ui.controlPointDrag && !ui.marquee) {
    if (hoverNearCenter) {
      svg.style.cursor = "crosshair";
    } else if (hoverNode) {
      svg.style.cursor = "grab";
    } else {
      svg.style.cursor = "";
    }
  }

  if (!ui.edgeCreate) {
    return;
  }
  updateEdgeCreateFromClient(evt.clientX, evt.clientY);
  render();
});

window.addEventListener("pointerup", (evt) => {
  let needsRender = false;

  if (ui.widgetDrag && evt.pointerId === ui.widgetDrag.pointerId) {
    const widget = graph.widgets.find((w) => w.id === ui.widgetDrag.widgetId);
    const moved = widget && (widget.x !== ui.widgetDrag.startX || widget.y !== ui.widgetDrag.startY);
    ui.widgetDrag = null;
    commitTransaction();
    if (moved) {
      setStatusKey("status.widgetMoved");
    }
    needsRender = true;
  }

  if (ui.widgetResize && evt.pointerId === ui.widgetResize.pointerId) {
    const widget = graph.widgets.find((w) => w.id === ui.widgetResize.widgetId);
    const resized =
      widget &&
      (widget.width !== ui.widgetResize.startWidth || widget.height !== ui.widgetResize.startHeight);
    ui.widgetResize = null;
    commitTransaction();
    if (resized) {
      setStatusKey("status.widgetResized");
    }
    needsRender = true;
  }

  if (ui.edgeCreate && evt.pointerId === ui.edgeCreate.pointerId) {
    finishEdgeCreateFromClient(evt.clientX, evt.clientY);
    needsRender = true;
  }

  if (ui.marquee && evt.pointerId === ui.marquee.pointerId) {
    const rect = marqueeRect(ui.marquee);
    if (rect.width < 4 && rect.height < 4 && !ui.marquee.additive) {
      clearAllSelection();
    }
    ui.marquee = null;
    needsRender = true;
  }

  if (ui.drag && evt.pointerId === ui.drag.pointerId) {
    const movedCount = ui.drag.nodeIds.filter((id) => {
      const node = getNodeById(id);
      const start = ui.drag.startMap.get(id);
      return node && start && (node.x !== start.x || node.y !== start.y);
    }).length;
    ui.drag = null;
    commitTransaction();
    if (movedCount > 0) {
      setStatusKey("status.nodesMoved", { count: movedCount });
    }
    needsRender = true;
  }

  if (ui.resize && evt.pointerId === ui.resize.pointerId) {
    const node = getNodeById(ui.resize.nodeId);
    const resized =
      node &&
      (node.width !== ui.resize.startWidth || node.height !== ui.resize.startHeight);
    ui.resize = null;
    commitTransaction();
    if (resized) {
      setStatusKey("status.nodeResized");
    }
    needsRender = true;
  }

  if (ui.controlPointDrag && evt.pointerId === ui.controlPointDrag.pointerId) {
    ui.controlPointDrag = null;
    commitTransaction();
    needsRender = true;
  }

  if (ui.sliderInteraction?.mode === "range") {
    ui.sliderInteraction = null;
    needsRender = true;
  }

  if (needsRender) {
    render();
  }
  if (!ui.drag && !ui.resize && !ui.edgeCreate && !ui.controlPointDrag && !ui.marquee && !ui.widgetDrag && !ui.widgetResize) {
    svg.style.cursor = "";
  }
});

window.addEventListener("mouseup", (evt) => {
  if (!ui.edgeCreate) {
    return;
  }
  finishEdgeCreateFromClient(evt.clientX, evt.clientY);
});

svg.addEventListener("pointerleave", () => {
  let movedCount = 0;
  let resized = false;
  if (ui.drag) {
    movedCount = ui.drag.nodeIds.filter((id) => {
      const node = getNodeById(id);
      const start = ui.drag.startMap.get(id);
      return node && start && (node.x !== start.x || node.y !== start.y);
    }).length;
  }
  if (ui.resize) {
    const node = getNodeById(ui.resize.nodeId);
    resized =
      Boolean(node) &&
      (node.width !== ui.resize.startWidth || node.height !== ui.resize.startHeight);
  }
  if (ui.drag || ui.resize || ui.controlPointDrag) {
    commitTransaction();
  }
  if (movedCount > 0) {
    setStatusKey("status.nodesMoved", { count: movedCount });
  } else if (resized) {
    setStatusKey("status.nodeResized");
  }
  ui.drag = null;
  ui.resize = null;
  ui.controlPointDrag = null;
  ui.edgeCreateHoverId = null;
  ui.edgeCreateLastPoint = null;
  svg.style.cursor = "";
});

svg.addEventListener("pointerdown", (evt) => {
  hideContextMenu();
  if (evt.target !== svg) {
    return;
  }

  const additive = evt.ctrlKey || evt.metaKey;
  const p = svgPoint(evt);
  ui.marquee = {
    pointerId: evt.pointerId,
    start: p,
    current: p,
    additive,
    baseSelection: [...ui.selectedNodes],
  };

  if (!additive) {
    clearAllSelection();
  }
  render();
});

svg.addEventListener("contextmenu", (evt) => {
  const onNode = evt.target.closest?.(".node");
  if (onNode) {
    return;
  }
  evt.preventDefault();
  openBackgroundContextMenu(evt);
});

menuTitles.forEach((title) => {
  title.addEventListener("click", (evt) => {
    evt.stopPropagation();
    hideContextMenu();
    const root = title.closest(".menu-root");
    if (root) {
      toggleTopMenu(root);
    }
  });
});

menuRoots.forEach((root) => {
  root.addEventListener("pointerenter", () => {
    const hasOpen = menuRoots.some((r) => r.classList.contains("open"));
    if (hasOpen && !root.classList.contains("open")) {
      toggleTopMenu(root);
    }
  });
});

menuCommands.forEach((cmd) => {
  cmd.addEventListener("click", () => {
    closeTopMenus();
  });
});

addRectNodeItem.addEventListener("click", () => {
  runAction(() => {
    addNode("rect");
  });
  setStatusKey("status.nodeCreated");
});

addEllipseNodeItem.addEventListener("click", () => {
  runAction(() => {
    addNode("ellipse");
  });
  setStatusKey("status.nodeCreated");
});

addDiamondNodeItem.addEventListener("click", () => {
  runAction(() => {
    addNode("diamond");
  });
  setStatusKey("status.nodeCreated");
});

addSliderWidgetItem.addEventListener("click", () => {
  runAction(() => {
    addSliderWidget();
  });
  setStatusKey("status.widgetSliderCreated");
});

addTableWidgetItem.addEventListener("click", () => {
  runAction(() => {
    addTableWidget();
  });
  setStatusKey("status.widgetCreated");
});
addXYChartWidgetItem.addEventListener("click", () => {
  runAction(() => {
    addXYChartWidget();
  });
  setStatusKey("status.widgetChartCreated");
});

fitContentItem.addEventListener("click", () => {
  fitToContent();
});

zoomInItem.addEventListener("click", () => {
  applyZoom(ui.zoom * 1.2);
});

zoomOutItem.addEventListener("click", () => {
  applyZoom(ui.zoom / 1.2);
});

zoomResetItem.addEventListener("click", () => {
  applyZoom(1);
});
toggleGraphItem.addEventListener("click", () => {
  toggleGraphVisibility();
});
toggleWidgetsItem.addEventListener("click", () => {
  toggleWidgetsVisibility();
});
if (toggleGraphBtn) {
  toggleGraphBtn.addEventListener("click", toggleGraphVisibility);
}
if (toggleWidgetsBtn) {
  toggleWidgetsBtn.addEventListener("click", toggleWidgetsVisibility);
}
if (runFullModelBtn) {
  runFullModelBtn.addEventListener("click", executeNodeExpressions);
}
runEvalBtn.addEventListener("click", executeNodeExpressions);
runStepBtn.addEventListener("click", runManualStep);
runTimedToggleBtn.addEventListener("click", toggleTimedExecution);
runResetBtn.addEventListener("click", resetExecution);

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
deleteBtn.addEventListener("click", removeSelected);
cutBtn.addEventListener("click", cutSelectionToClipboard);
copyBtn.addEventListener("click", copySelectionToClipboard);
pasteBtn.addEventListener("click", pasteFromClipboard);
newGraphBtn.addEventListener("click", () => {
  createNewGraph();
});
saveJsonBtn.addEventListener("click", () => saveGraphJson(false));
saveAsJsonBtn.addEventListener("click", () => saveGraphJson(true));
loadJsonBtn.addEventListener("click", openGraphJson);

snapToGridInput.addEventListener("change", () => {
  ui.snapToGrid = snapToGridInput.checked;
  setStatusKey(ui.snapToGrid ? "status.snapOn" : "status.snapOff");
});

gridSizeInput.addEventListener("change", () => {
  ui.gridSize = clamp(Number(gridSizeInput.value) || 20, 5, 100);
  gridSizeInput.value = String(ui.gridSize);
  setStatusKey("status.gridStep", { value: ui.gridSize });
});

function commitExecutionInput(inputEl, key) {
  const parsed = Number(inputEl.value);
  if (!Number.isFinite(parsed)) {
    inputEl.value = String(graph.execution[key]);
    setStatusKey("error.timeInvalid");
    return;
  }
  graph.execution[key] = parsed;
  setStatusKey("status.timeConfigUpdated");
}

timeStartInput.addEventListener("change", () => commitExecutionInput(timeStartInput, "t0"));
timeStepInput.addEventListener("change", () => commitExecutionInput(timeStepInput, "dt"));
timeEndInput.addEventListener("change", () => commitExecutionInput(timeEndInput, "t1"));
timeDelayInput.addEventListener("change", () => {
  const parsed = Number(timeDelayInput.value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    timeDelayInput.value = String(graph.execution.delayMs);
    setStatusKey("error.timeDelayInvalid");
    return;
  }
  graph.execution.delayMs = Math.round(parsed);
  setStatusKey("status.timeDelayUpdated", { delay: graph.execution.delayMs });
});

decimalDigitsInput.addEventListener("change", () => {
  const parsed = Number(decimalDigitsInput.value);
  if (!Number.isFinite(parsed)) {
    decimalDigitsInput.value = String(clampDisplayDecimals(graph.execution.decimals));
    setStatusKey("error.timeInvalid");
    return;
  }
  graph.execution.decimals = clampDisplayDecimals(parsed);
  decimalDigitsInput.value = String(graph.execution.decimals);
  setStatusKey("status.timeConfigUpdated");
  render();
});

[timeStartInput, timeStepInput, timeEndInput, timeDelayInput, decimalDigitsInput].forEach((inputEl) => {
  inputEl.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      inputEl.blur();
    }
  });
});

loadJsonInput.addEventListener("change", () => {
  const file = loadJsonInput.files?.[0];
  if (file) {
    loadGraphJsonFile(file);
  }
  loadJsonInput.value = "";
});

graphViewport.addEventListener(
  "wheel",
  (evt) => {
    if (!(evt.ctrlKey || evt.metaKey)) {
      return;
    }
    evt.preventDefault();
    const factor = evt.deltaY < 0 ? 1.12 : 1 / 1.12;
    applyZoom(ui.zoom * factor, evt.clientX, evt.clientY);
  },
  { passive: false },
);

nodeNameInput.addEventListener("input", () => {
  if (ui.selectedNodes.size !== 1) {
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  const attempt = semantics.validateNodeName(graph.nodes, nodeNameInput.value, node.id);
  if (attempt.ok) {
    nodeNameInput.classList.remove("invalid");
    const oldName = node.name;
    node.name = attempt.name;
    propagateNodeRenameInExpressions(oldName, node.name);
    render();
    return;
  }

  nodeNameInput.classList.add("invalid");
  if (attempt.reason === "duplicate") {
    setStatusKey("error.duplicateNodeName");
  } else if (attempt.reason === "function") {
    setStatusKey("error.functionNodeName");
  } else if (attempt.reason === "reserved") {
    setStatusKey("error.reservedNodeName");
  } else {
    setStatusKey("error.invalidNodeName");
  }
});

nodeNameInput.addEventListener("focus", () => {
  if (ui.selectedNodes.size !== 1) {
    ui.nodeNameEditStart = null;
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  ui.nodeNameEditStart = node ? node.name : null;
});

nodeNameInput.addEventListener("blur", () => {
  if (ui.selectedNodes.size !== 1) {
    ui.nodeNameEditStart = null;
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    ui.nodeNameEditStart = null;
    return;
  }
  if (ui.nodeNameEditStart != null && ui.nodeNameEditStart !== node.name) {
    setStatusKey("status.nodeRenamed", { name: node.name });
  }
  ui.nodeNameEditStart = null;
  nodeNameInput.value = node.name;
  nodeNameInput.classList.remove("invalid");
});

nodeNameInput.addEventListener("keydown", (evt) => {
  if (evt.key === "Enter") {
    nodeNameInput.blur();
  }
});

nodeShapeInput.addEventListener("change", () => {
  if (ui.selectedNodes.size !== 1) {
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  runAction(() => {
    const wasSliderBindable = canBindSliderToNode(node);
    node.shape = nodeShapeInput.value;
    if (isStateNode(node) && !String(node.initialStateExpression || "").trim()) {
      node.initialStateExpression = "0";
    }
    if (isStateNode(node) && !String(node.valueExpression || "").trim()) {
      node.valueExpression = "this";
    }
    if (!isStateNode(node)) {
      node.initialStateExpression = "";
      node.pendingStateValue = null;
      node.pendingStateError = "";
    }
    normalizeInputNodeFlags();
    if (wasSliderBindable && !canBindSliderToNode(node)) {
      removeNodeFromSliderBindings(node.name);
    }
  });
});

nodeInputInput.addEventListener("change", () => {
  if (ui.selectedNodes.size !== 1) {
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  if (!canMarkNodeAsInput(node)) {
    nodeInputInput.checked = false;
    return;
  }
  const wasInput = Boolean(node.input);
  runAction(() => {
    node.input = nodeInputInput.checked;
    if (wasInput && !node.input) {
      removeNodeFromSliderBindings(node.name);
    }
  });
});

nodeOutputInput.addEventListener("change", () => {
  if (ui.selectedNodes.size !== 1) {
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  const wasOutput = Boolean(node.output);
  runAction(() => {
    node.output = nodeOutputInput.checked;
    if (wasOutput && !node.output) {
      removeNodeFromAllWidgetDisplays(node.name);
    }
  });
});

manualStepBtn.addEventListener("click", runManualStep);
timedToggleBtn.addEventListener("click", toggleTimedExecution);
resetExecBtn.addEventListener("click", resetExecution);

nodeValueExprInput.addEventListener("input", () => {
  const meta = expressionFieldMeta("value");
  if (!meta) {
    return;
  }
  meta.setValue(nodeValueExprInput.value);
  updateExpressionFieldState(nodeValueExprInput, nodeValueExprStatus, nodeValueExprInput.value, false, "value");
  scheduleFileStatusRefresh();
});

nodeInitialStateInput.addEventListener("input", () => {
  const meta = expressionFieldMeta("initial");
  if (!meta) {
    return;
  }
  meta.setValue(nodeInitialStateInput.value);
  updateExpressionFieldState(nodeInitialStateInput, nodeInitialStateStatus, nodeInitialStateInput.value, false, "initial");
  scheduleFileStatusRefresh();
});

if (editNodeValueExprBtn) {
  editNodeValueExprBtn.addEventListener("click", () => {
    openExpressionEditor("value");
  });
}

if (editNodeInitialStateBtn) {
  editNodeInitialStateBtn.addEventListener("click", () => {
    openExpressionEditor("initial");
  });
}

if (expressionEditorTextarea) {
  expressionEditorTextarea.addEventListener("input", () => {
    refreshExpressionEditorValidation();
  });
  expressionEditorTextarea.addEventListener("keydown", (evt) => {
    if (ui.expressionEditor?.completion?.entries?.length) {
      if (evt.key === "ArrowDown") {
        evt.preventDefault();
        const completion = ui.expressionEditor.completion;
        completion.activeIndex = (completion.activeIndex + 1) % completion.entries.length;
        renderExpressionAutocomplete();
        return;
      }
      if (evt.key === "ArrowUp") {
        evt.preventDefault();
        const completion = ui.expressionEditor.completion;
        completion.activeIndex = (completion.activeIndex - 1 + completion.entries.length) % completion.entries.length;
        renderExpressionAutocomplete();
        return;
      }
      if (evt.key === "Tab" && !evt.shiftKey) {
        evt.preventDefault();
        acceptExpressionAutocomplete();
        return;
      }
      if (evt.key === "Enter" && !evt.ctrlKey && !evt.metaKey) {
        evt.preventDefault();
        acceptExpressionAutocomplete();
        return;
      }
    }
    if (evt.key === "Tab") {
      evt.preventDefault();
      indentExpressionSelection(expressionEditorTextarea, evt.shiftKey);
      refreshExpressionEditorValidation();
      return;
    }
    if (evt.key === "Enter" && !evt.ctrlKey && !evt.metaKey) {
      evt.preventDefault();
      insertExpressionNewlineWithIndent(expressionEditorTextarea);
      refreshExpressionEditorValidation();
    }
  });
  ["click", "keyup", "mouseup"].forEach((eventName) => {
    expressionEditorTextarea.addEventListener(eventName, () => {
      renderExpressionAutocomplete();
    });
  });
}

if (expressionEditorCloseBtn) {
  expressionEditorCloseBtn.addEventListener("click", closeExpressionEditor);
}
if (expressionEditorCancelBtn) {
  expressionEditorCancelBtn.addEventListener("click", closeExpressionEditor);
}
if (expressionEditorApplyBtn) {
  expressionEditorApplyBtn.addEventListener("click", applyExpressionEditor);
}
if (expressionEditorModal) {
  expressionEditorModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === expressionEditorModal) {
      closeExpressionEditor();
    }
  });
}

modelTitleInput.addEventListener("input", () => {
  graph.modelTitle = modelTitleInput.value;
});

addModelPropBtn.addEventListener("click", () => {
  runAction(() => {
    graph.properties.push({ key: "", value: "" });
  });
});

addPropBtn.addEventListener("click", () => {
  if (ui.selectedNodes.size !== 1) {
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  runAction(() => {
    node.properties.push({ key: "", value: "" });
  });
});

document.addEventListener("keydown", (evt) => {
  if (!expressionEditorModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeExpressionEditor();
    } else if ((evt.ctrlKey || evt.metaKey) && evt.key === "Enter") {
      evt.preventDefault();
      applyExpressionEditor();
    }
    return;
  }

  if (evt.key === "F7") {
    evt.preventDefault();
    executeNodeExpressions();
    return;
  }
  if (evt.key === "F8") {
    evt.preventDefault();
    runManualStep();
    return;
  }
  if (evt.key === "F9") {
    evt.preventDefault();
    toggleTimedExecution();
    return;
  }
  if (evt.key === "F10") {
    evt.preventDefault();
    resetExecution();
    return;
  }

  if (evt.ctrlKey || evt.metaKey) {
    const key = evt.key.toLowerCase();
    if (key === "x") {
      evt.preventDefault();
      cutSelectionToClipboard();
      return;
    }
    if (key === "c") {
      evt.preventDefault();
      copySelectionToClipboard();
      return;
    }
    if (key === "v") {
      evt.preventDefault();
      pasteFromClipboard();
      return;
    }
    if (key === "s") {
      evt.preventDefault();
      if (evt.shiftKey) {
        saveGraphJson(true);
      } else {
        saveGraphJson(false);
      }
      return;
    }
    if (key === "n") {
      evt.preventDefault();
      createNewGraph();
      return;
    }
    if (key === "o") {
      evt.preventDefault();
      openGraphJson();
      return;
    }
    if (key === "f" && evt.shiftKey) {
      evt.preventDefault();
      fitToContent();
      return;
    }
    if (evt.key === "+" || evt.key === "=") {
      evt.preventDefault();
      applyZoom(ui.zoom * 1.2);
      return;
    }
    if (evt.key === "-" || evt.key === "_") {
      evt.preventDefault();
      applyZoom(ui.zoom / 1.2);
      return;
    }
    if (evt.key === "0") {
      evt.preventDefault();
      applyZoom(1);
      return;
    }
  }

  if ((evt.ctrlKey || evt.metaKey) && !evt.shiftKey && evt.key.toLowerCase() === "z") {
    evt.preventDefault();
    undo();
    return;
  }

  if (
    (evt.ctrlKey || evt.metaKey) &&
    (evt.key.toLowerCase() === "y" || (evt.shiftKey && evt.key.toLowerCase() === "z"))
  ) {
    evt.preventDefault();
    redo();
    return;
  }

  if (evt.key === "Delete") {
    removeSelected();
  }

  if (evt.key === "Escape") {
    hideContextMenu();
    closeTopMenus();
    if (ui.drag || ui.resize || ui.edgeCreate || ui.controlPointDrag || ui.marquee) {
      cancelTransaction();
      ui.drag = null;
      ui.resize = null;
      ui.edgeCreate = null;
      ui.edgeCreateHoverId = null;
      ui.edgeCreateLastPoint = null;
      ui.controlPointDrag = null;
      ui.marquee = null;
      stopTimedExecution(false);
      setStatusKey("status.cancelOp");
      render();
    }
  }
});

window.addEventListener("pointerdown", (evt) => {
  if (!contextMenu.contains(evt.target)) {
    hideContextMenu();
  }
  if (!topMenuBar.contains(evt.target)) {
    closeTopMenus();
  }
});

window.addEventListener("resize", () => {
  updateCanvasSize();
});

async function boot() {
  await loadI18n();

  runAction(() => {
    addNode("rect");
    addNode("ellipse");
    clearAllSelection();
  });
  history.undo = [];
  history.redo = [];
  updateZoomButtons();
  applyCanvasVisibility();
  markSavedSnapshot();
  updateModelRunButtons();
  setStatusKey("status.ready");
  render();
}

boot();
