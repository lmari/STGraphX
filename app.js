Warning: truncated output (original token count: 157785)
Total output lines: 17955

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const svg = document.getElementById("graphCanvas");
const graphViewport = document.getElementById("graphViewport");
const executionProgress = document.getElementById("executionProgress");
const executionProgressBar = document.getElementById("executionProgressBar");
const modelNotesCanvasBtn = document.getElementById("modelNotesCanvasBtn");
const sidebar = document.getElementById("sidebar");
const sidebarReopenBtn = document.getElementById("sidebarReopenBtn");
const sidebarHideButtons = document.querySelectorAll("[data-sidebar-hide]");
const statusText = document.getElementById("statusText");
const fileStatusText = document.getElementById("fileStatusText");
const menuTimeText = document.getElementById("menuTimeText");
const topMenuBar = document.getElementById("topMenuBar");
const workspaceTabBar = document.getElementById("workspaceTabBar");
const newTabBtn = document.getElementById("newTabBtn");
const tabletSidebarToggle = document.getElementById("tabletSidebarToggle");
const tabletQuickbar = document.getElementById("tabletQuickbar");
const tabletFitBtn = document.getElementById("tabletFitBtn");
const tabletModeBtn = document.getElementById("tabletModeBtn");
const tabletRunBtn = document.getElementById("tabletRunBtn");
const tabletStepBtn = document.getElementById("tabletStepBtn");
const tabletTimedBtn = document.getElementById("tabletTimedBtn");
const tabletResetBtn = document.getElementById("tabletResetBtn");
const tabletSidebarBackdrop = document.getElementById("tabletSidebarBackdrop");
const tabletSidebarHeader = document.getElementById("tabletSidebarHeader");
const tabletSidebarExpandBtn = document.getElementById("tabletSidebarExpandBtn");
const tabletSidebarCloseBtn = document.getElementById("tabletSidebarCloseBtn");
const menuRoots = Array.from(document.querySelectorAll(".menu-root"));
const menuTitles = Array.from(document.querySelectorAll(".menu-title"));
const menuCommands = Array.from(document.querySelectorAll(".menu-command"));
const addDraftNodeItem = document.getElementById("addDraftNodeItem");
const addRectNodeItem = document.getElementById("addRectNodeItem");
const addEllipseNodeItem = document.getElementById("addEllipseNodeItem");
const addDiamondNodeItem = document.getElementById("addDiamondNodeItem");
const addSubmodelNodeItem = document.getElementById("addSubmodelNodeItem");
const addTextItem = document.getElementById("addTextItem");
const addButtonWidgetItem = document.getElementById("addButtonWidgetItem");
const addSelectWidgetItem = document.getElementById("addSelectWidgetItem");
const addSliderWidgetItem = document.getElementById("addSliderWidgetItem");
const addNumericWidgetItem = document.getElementById("addNumericWidgetItem");
const addLedWidgetItem = document.getElementById("addLedWidgetItem");
const addTextWidgetItem = document.getElementById("addTextWidgetItem");
const addMatrixWidgetItem = document.getElementById("addMatrixWidgetItem");
const addTableWidgetItem = document.getElementById("addTableWidgetItem");
const addXYChartWidgetItem = document.getElementById("addXYChartWidgetItem");
const fitContentItem = document.getElementById("fitContentItem");
const zoomInItem = document.getElementById("zoomInItem");
const zoomOutItem = document.getElementById("zoomOutItem");
const zoomResetItem = document.getElementById("zoomResetItem");
const toggleGraphItem = document.getElementById("toggleGraphItem");
const toggleWidgetsItem = document.getElementById("toggleWidgetsItem");
const modelNotesItem = document.getElementById("modelNotesItem");
const unitDefinitionsItem = document.getElementById("unitDefinitionsItem");
const viewOptionsItem = document.getElementById("viewOptionsItem");
const toggleGraphBtn = document.getElementById("toggleGraphBtn");
const toggleWidgetsBtn = document.getElementById("toggleWidgetsBtn");
const runEvalBtn = document.getElementById("runEvalBtn");
const runRustEngineBtn = document.getElementById("runRustEngineBtn");
const runStepBtn = document.getElementById("runStepBtn");
const runTimedToggleBtn = document.getElementById("runTimedToggleBtn");
const runResetBtn = document.getElementById("runResetBtn");
const sensitivityAnalysisBtn = document.getElementById("sensitivityAnalysisBtn");
const scenarioManagerBtn = document.getElementById("scenarioManagerBtn");
const analyzeModelBtn = document.getElementById("analyzeModelBtn");
const watchDebuggerBtn = document.getElementById("watchDebuggerBtn");
const topRunEvalBtn = document.getElementById("topRunEvalBtn");
const topRunStepBtn = document.getElementById("topRunStepBtn");
const topRunTimedBtn = document.getElementById("topRunTimedBtn");
const topRunResetBtn = document.getElementById("topRunResetBtn");
const runStrictDefinitionsInput = document.getElementById("runStrictDefinitionsInput");
const runStopOnRuntimeErrorInput = document.getElementById("runStopOnRuntimeErrorInput");
const selectAllBtn = document.getElementById("selectAllBtn");
const renameNodeBtn = document.getElementById("renameNodeBtn");
const renameSelectionLabel = document.getElementById("renameSelectionLabel");
const editNodeExpressionBtn = document.getElementById("editNodeExpressionBtn");
const cutBtn = document.getElementById("cutBtn");
const copyBtn = document.getElementById("copyBtn");
const pasteBtn = document.getElementById("pasteBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const deleteBtn = document.getElementById("deleteBtn");
const deleteBtnLabel = deleteBtn?.querySelector("[data-i18n='menu.edit.delete']") || deleteBtn?.querySelector("span");
const newGraphBtn = document.getElementById("newGraphBtn");
const saveJsonBtn = document.getElementById("saveJsonBtn");
const saveAsJsonBtn = document.getElementById("saveAsJsonBtn");
const closeModelBtn = document.getElementById("closeModelBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const loadJsonBtn = document.getElementById("loadJsonBtn");
const recentModelsMenuRoot = document.getElementById("recentModelsMenuRoot");
const recentModelsSep = document.getElementById("recentModelsSep");
const recentModelsSection = document.getElementById("recentModelsSection");
const clearRecentModelsBtn = document.getElementById("clearRecentModelsBtn");
const recentModelsMenuBtn = document.getElementById("recentModelsMenuBtn");
const loadJsonInput = document.getElementById("loadJsonInput");
const snapToGridInput = document.getElementById("snapToGridInput");
const showGridInput = document.getElementById("showGridInput");
const highlightNodeEdgesInput = document.getElementById("highlightNodeEdgesInput");
const showNodeValuesInput = document.getElementById("showNodeValuesInput");
const unitChecksInput = document.getElementById("unitChecksInput");
const gridSizeInput = document.getElementById("gridSizeInput");
const tooltipDelayInput = document.getElementById("tooltipDelayInput");
const interfaceLanguageInput = document.getElementById("interfaceLanguageInput");

const noSelection = document.getElementById("noSelection");
const globalPanel = document.getElementById("globalPanel");
const nodePanel = document.getElementById("nodePanel");
const edgePanel = document.getElementById("edgePanel");
const widgetPanel = document.getElementById("widgetPanel");
const widgetPanelTitle = document.getElementById("widgetPanelTitle");
const modelTitleInput = document.getElementById("modelTitleInput");
const timeStartInput = document.getElementById("timeStartInput");
const timeStepInput = document.getElementById("timeStepInput");
const timeUnitInput = document.getElementById("timeUnitInput");
const unitDefinitionsList = document.getElementById("unitDefinitionsList");
const addUnitDefinitionBtn = document.getElementById("addUnitDefinitionBtn");
const unitDefinitionsModal = document.getElementById("unitDefinitionsModal");
const unitDefinitionsCloseBtn = document.getElementById("unitDefinitionsCloseBtn");
const siUnitDefinitionsList = document.getElementById("siUnitDefinitionsList");
const timeEndInput = document.getElementById("timeEndInput");
const timeDelayInput = document.getElementById("timeDelayInput");
const renderEveryStepsInput = document.getElementById("renderEveryStepsInput");
const decimalDigitsInput = document.getElementById("decimalDigitsInput");
const integratorInput = document.getElementById("integratorInput");
const randomSeedInput = document.getElementById("randomSeedInput");
const strictDefinitionsInput = document.getElementById("strictDefinitionsInput");
const timeCurrentOutput = document.getElementById("timeCurrentOutput");
const modelPropsList = document.getElementById("modelPropsList");
const addModelPropBtn = document.getElementById("addModelPropBtn");
const editLocalFunctionsBtn = document.getElementById("editLocalFunctionsBtn");
const zoomRangeInput = document.getElementById("zoomRangeInput");
const zoomRangeValue = document.getElementById("zoomRangeValue");
const runFullModelBtn = document.getElementById("runFullModelBtn");
const manualStepBtn = document.getElementById("manualStepBtn");
const timedToggleBtn = document.getElementById("timedToggleBtn");
const resetExecBtn = document.getElementById("resetExecBtn");

const nodeNameInput = document.getElementById("nodeNameInput");
const nodeUnitInput = document.getElementById("nodeUnitInput");
const nodeUnitLabel = document.getElementById("nodeUnitLabel");
const nodeShapeInput = document.getElementById("nodeShapeInput");
const nodeInputInput = document.getElementById("nodeInputInput");
const nodeInputLabel = nodeInputInput?.closest("label");
const nodeOutputInput = document.getElementById("nodeOutputInput");
const nodeGlobalInput = document.getElementById("nodeGlobalInput");
const nodeGlobalLabel = nodeGlobalInput?.closest("label");
const nodeValueExprLabel = document.getElementById("nodeValueExprLabel");
const nodeValueExprRow = document.getElementById("nodeValueExprRow");
const nodeValueExprInput = document.getElementById("nodeValueExprInput");
const editNodeValueExprBtn = document.getElementById("editNodeValueExprBtn");
const nodeValueExprStatus = document.getElementById("nodeValueExprStatus");
const nodeWidgetBindingInfo = document.getElementById("nodeWidgetBindingInfo");
const nodeModelPathLabel = document.getElementById("nodeModelPathLabel");
const nodeModelPathInput = document.getElementById("nodeModelPathInput");
const submodelActionRow = document.getElementById("submodelActionRow");
const loadSubmodelBtn = document.getElementById("loadSubmodelBtn");
const showSubmodelBtn = document.getElementById("showSubmodelBtn");
const submodelIconSection = document.getElementById("submodelIconSection");
const submodelIconSelect = document.getElementById("submodelIconSelect");
const chooseSubmodelIconBtn = document.getElementById("chooseSubmodelIconBtn");
const clearSubmodelIconBtn = document.getElementById("clearSubmodelIconBtn");
const nodeSubmodelInfo = document.getElementById("nodeSubmodelInfo");
const nodeSubmodelBindings = document.getElementById("nodeSubmodelBindings");
const nodeInitialStateLabel = document.getElementById("nodeInitialStateLabel");
const nodeInitialStateRow = document.getElementById("nodeInitialStateRow");
const nodeInitialStateInput = document.getElementById("nodeInitialStateInput");
const nodeInitialStateStatus = document.getElementById("nodeInitialStateStatus");
const nodeValueOutput = document.getElementById("nodeValueOutput");
const nodeNameLabel = document.querySelector('label[for="nodeNameInput"]');
const nodeValueOutputLabel = document.querySelector('label[for="nodeValueOutput"]');
const nodeFillColorInput = document.getElementById("nodeFillColorInput");
const nodeStrokeColorInput = document.getElementById("nodeStrokeColorInput");
const resetNodeColorsBtn = document.getElementById("resetNodeColorsBtn");
const propsList = document.getElementById("propsList");
const addPropBtn = document.getElementById("addPropBtn");
const nodeIdentitySection = nodeNameInput?.closest(".panel-section");
const nodeFormulaSection = nodeModelPathInput?.closest(".panel-section");
const nodeValueSection = nodeValueOutput?.closest(".panel-section");
const nodeColorSection = nodeFillColorInput?.closest(".panel-section");
const nodePropsSection = propsList?.closest(".panel-section");
const nodePropsTitle = nodePropsSection?.querySelector("h4");

const edgeInfo = document.getElementById("edgeInfo");
const textPanel = document.getElementById("textPanel");
const textWidthInput = document.getElementById("textWidthInput");
const textHeightInput = document.getElementById("textHeightInput");
const textFillColorInput = document.getElementById("textFillColorInput");
const textStrokeColorInput = document.getElementById("textStrokeColorInput");
const textHtmlInput = document.getElementById("textHtmlInput");
const configHelpModal = document.getElementById("configHelpModal");
const configHelpTitle = document.getElementById("configHelpTitle");
const configHelpContent = document.getElementById("configHelpContent");
const configHelpCloseBtn = document.getElementById("configHelpCloseBtn");
const configHelpDismissBtn = document.getElementById("configHelpDismissBtn");
const textEditorModal = document.getElementById("textEditorModal");
const textEditorCard = textEditorModal?.querySelector(".text-editor-card");
const textEditorInput = document.getElementById("textEditorInput");
const textEditorToolbar = document.getElementById("textEditorToolbar");
const textEditorCloseBtn = document.getElementById("textEditorCloseBtn");
const textEditorDismissBtn = document.getElementById("textEditorDismissBtn");
const modelNotesModal = document.getElementById("modelNotesModal");
const modelNotesInput = document.getElementById("modelNotesInput");
const modelNotesPreview = document.getElementById("modelNotesPreview");
const modelNotesReadOnly = document.getElementById("modelNotesReadOnly");
const modelNotesEditor = document.getElementById("modelNotesEditor");
const modelNotesEditBtn = document.getElementById("modelNotesEditBtn");
const modelNotesToolbar = document.getElementById("modelNotesToolbar");
const modelNotesCloseBtn = document.getElementById("modelNotesCloseBtn");
const modelNotesDismissBtn = document.getElementById("modelNotesDismissBtn");
const modelNotesInsertStructureBtn = document.getElementById("modelNotesInsertStructureBtn");
const widgetConfig = document.getElementById("widgetConfig");
const contextMenu = document.getElementById("contextMenu");
const canvasContent = document.getElementById("canvasContent");
const widgetLayer = document.getElementById("widgetLayer");
const expressionEditorModal = document.getElementById("expressionEditorModal");
const expressionEditorTitle = document.getElementById("expressionEditorTitle");
const expressionEditorViewTabs = document.getElementById("expressionEditorViewTabs");
const expressionEditorViewEditorBtn = document.getElementById("expressionEditorViewEditorBtn");
const expressionEditorViewNotesBtn = document.getElementById("expressionEditorViewNotesBtn");
const expressionEditorViewHelpBtn = document.getElementById("expressionEditorViewHelpBtn");
const expressionStateInitialBlock = document.getElementById("expressionStateInitialBlock");
const expressionStateInitialHighlight = document.getElementById("expressionStateInitialHighlight");
const expressionStateInitialInput = document.getElementById("expressionStateInitialInput");
const expressionStateInitialStatus = document.getElementById("expressionStateInitialStatus");
const expressionStateTransitionHead = document.getElementById("expressionStateTransitionHead");
const expressionStateTransitionLabel = document.getElementById("expressionStateTransitionLabel");
const expressionStateTransitionStatus = document.getElementById("expressionStateTransitionStatus");
const expressionEditorTextarea = document.getElementById("expressionEditorTextarea");
const expressionEditorHighlight = document.getElementById("expressionEditorHighlight");
const expressionEditorSurface = document.querySelector(".expression-editor-surface");
const expressionEditorCard = expressionEditorModal?.querySelector(".expression-editor-card");
const expressionEditorMain = expressionEditorModal?.querySelector(".expression-editor-main");
const expressionEditorCore = document.getElementById("expressionEditorCore");
const expressionMainDocs = document.getElementById("expressionMainDocs");
const expressionSymbolsFilter = document.getElementById("expressionSymbolsFilter");
const expressionSidebar = document.getElementById("expressionSidebar");
const expressionHelp = document.getElementById("expressionHelp");
const expressionHelpCopyBtn = document.getElementById("expressionHelpCopyBtn");
const expressionPreviewBox = document.getElementById("expressionPreviewBox");
const expressionPreviewValue = document.getElementById("expressionPreviewValue");
const expressionDescriptionBox = document.getElementById("expressionDescriptionBox");
const expressionDescriptionInput = document.getElementById("expressionDescriptionInput");
const expressionFormulaNotesBox = document.getElementById("expressionFormulaNotesBox");
const expressionFormulaNotesInput = document.getElementById("expressionFormulaNotesInput");
const expressionLibrary = document.getElementById("expressionLibrary");
const expressionEditorHint = document.getElementById("expressionEditorHint");
const expressionWidgetBindingInfo = document.getElementById("expressionWidgetBindingInfo");
const expressionEditorStatus = document.getElementById("expressionEditorStatus");
const expressionStatusCopyBtn = document.getElementById("expressionStatusCopyBtn");
const expressionEditorCloseBtn = document.getElementById("expressionEditorCloseBtn");
const expressionEditorCancelBtn = document.getElementById("expressionEditorCancelBtn");
const expressionEditorApplyBtn = document.getElementById("expressionEditorApplyBtn");
const expressionEditorResizeHandle = document.getElementById("expressionEditorResizeHandle");
const expressionNodeIdentity = document.getElementById("expressionNodeIdentity");
const expressionNodeNameInput = document.getElementById("expressionNodeNameInput");
const expressionNodeShapeInput = document.getElementById("expressionNodeShapeInput");
const expressionNodeInputLabel = document.getElementById("expressionNodeInputLabel");
const expressionNodeInputInput = document.getElementById("expressionNodeInputInput");
const expressionNodeOutputLabel = document.getElementById("expressionNodeOutputLabel");
const expressionNodeOutputInput = document.getElementById("expressionNodeOutputInput");
const expressionNodeGlobalLabel = document.getElementById("expressionNodeGlobalLabel");
const expressionNodeGlobalInput = document.getElementById("expressionNodeGlobalInput");
const expressionNodeUnitLabel = document.getElementById("expressionNodeUnitLabel");
const expressionNodeUnitInput = document.getElementById("expressionNodeUnitInput");
const documentationHelpBtn = document.getElementById("documentationHelpBtn");
const functionsHelpBtn = document.getElementById("functionsHelpBtn");
const eightTupleBtn = document.getElementById("eightTupleBtn");
const examplesHelpBtn = document.getElementById("examplesHelpBtn");
const aboutAppBtn = document.getElementById("aboutAppBtn");
const functionsHelpModal = document.getElementById("functionsHelpModal");
const functionsHelpCloseBtn = document.getElementById("functionsHelpCloseBtn");
const functionsHelpDismissBtn = document.getElementById("functionsHelpDismissBtn");
const functionsHelpContent = document.getElementById("functionsHelpContent");
const functionsHelpSearch = document.getElementById("functionsHelpSearch");
const functionsHelpTypeFilter = document.getElementById("functionsHelpTypeFilter");
const documentationHelpModal = document.getElementById("documentationHelpModal");
const documentationHelpCloseBtn = document.getElementById("documentationHelpCloseBtn");
const documentationHelpDismissBtn = document.getElementById("documentationHelpDismissBtn");
const documentationHelpBackBtn = document.getElementById("documentationHelpBackBtn");
const documentationHelpForwardBtn = document.getElementById("documentationHelpForwardBtn");
const documentationHelpTitle = document.getElementById("documentationHelpTitle");
const documentationHelpPath = document.getElementById("documentationHelpPath");
const documentationHelpContent = document.getElementById("documentationHelpContent");
const eightTupleModal = document.getElementById("eightTupleModal");
const eightTupleCloseBtn = document.getElementById("eightTupleCloseBtn");
const eightTupleDismissBtn = document.getElementById("eightTupleDismissBtn");
const eightTupleCopyBtn = document.getElementById("eightTupleCopyBtn");
const eightTupleExportBtn = document.getElementById("eightTupleExportBtn");
const eightTupleContent = document.getElementById("eightTupleContent");
const examplesHelpModal = document.getElementById("examplesHelpModal");
const examplesHelpCloseBtn = document.getElementById("examplesHelpCloseBtn");
const examplesHelpDismissBtn = document.getElementById("examplesHelpDismissBtn");
const examplesHelpTitle = document.getElementById("examplesHelpTitle");
const examplesHelpIntro = document.getElementById("examplesHelpIntro");
const examplesHelpContent = document.getElementById("examplesHelpContent");
const aboutAppModal = document.getElementById("aboutAppModal");
const aboutAppCloseBtn = document.getElementById("aboutAppCloseBtn");
const aboutAppDismissBtn = document.getElementById("aboutAppDismissBtn");
const aboutAppVersionValue = document.getElementById("aboutAppVersionValue");
const aboutAppAuthorValue = document.getElementById("aboutAppAuthorValue");
const aboutAppLicenseValue = document.getElementById("aboutAppLicenseValue");
const aboutAppCopyrightValue = document.getElementById("aboutAppCopyrightValue");
const modelAnalysisModal = document.getElementById("modelAnalysisModal");
const modelAnalysisCloseBtn = document.getElementById("modelAnalysisCloseBtn");
const modelAnalysisDismissBtn = document.getElementById("modelAnalysisDismissBtn");
const modelAnalysisChecksBtn = document.getElementById("modelAnalysisChecksBtn");
const modelAnalysisSummary = document.getElementById("modelAnalysisSummary");
const modelAnalysisContent = document.getElementById("modelAnalysisContent");
const modelAnalysisSeverityFilter = document.getElementById("modelAnalysisSeverityFilter");
const modelAnalysisSearchInput = document.getElementById("modelAnalysisSearchInput");
const modelAnalysisChecksModal = document.getElementById("modelAnalysisChecksModal");
const modelAnalysisChecksCloseBtn = document.getElementById("modelAnalysisChecksCloseBtn");
const modelAnalysisChecksDismissBtn = document.getElementById("modelAnalysisChecksDismissBtn");
const modelAnalysisChecksContent = document.getElementById("modelAnalysisChecksContent");
const watchDebuggerModal = document.getElementById("watchDebuggerModal");
const watchDebuggerCloseBtn = document.getElementById("watchDebuggerCloseBtn");
const watchDebuggerDismissBtn = document.getElementById("watchDebuggerDismissBtn");
const watchDebuggerSummary = document.getElementById("watchDebuggerSummary");
const watchAddSelectedBtn = document.getElementById("watchAddSelectedBtn");
const watchBreakpointEnabledInput = document.getElementById("watchBreakpointEnabledInput");
const watchBreakpointInput = document.getElementById("watchBreakpointInput");
const watchBreakpointMessageInput = document.getElementById("watchBreakpointMessageInput");
const watchBreakpointStatus = document.getElementById("watchBreakpointStatus");
const watchDebuggerList = document.getElementById("watchDebuggerList");
const semanticBreakpointModal = document.getElementById("semanticBreakpointModal");
const semanticBreakpointMessage = document.getElementById("semanticBreakpointMessage");
const semanticBreakpointDismissBtn = document.getElementById("semanticBreakpointDismissBtn");
const localFunctionsModal = document.getElementById("localFunctionsModal");
const localFunctionsCloseBtn = document.getElementById("localFunctionsCloseBtn");
const localFunctionsCancelBtn = document.getElementById("localFunctionsCancelBtn");
const localFunctionsApplyBtn = document.getElementById("localFunctionsApplyBtn");
const localFunctionsAddBtn = document.getElementById("localFunctionsAddBtn");
const localFunctionsList = document.getElementById("localFunctionsList");
const localFunctionsStatus = document.getElementById("localFunctionsStatus");
const managePresentationGroupsItem = document.getElementById("managePresentationGroupsItem");
const manageDashboardItem = document.getElementById("manageDashboardItem");
const feedbackLoopsItem = document.getElementById("feedbackLoopsItem");
const feedbackLoopsModal = document.getElementById("feedbackLoopsModal");
const feedbackLoopsCloseBtn = document.getElementById("feedbackLoopsCloseBtn");
const feedbackLoopsDismissBtn = document.getElementById("feedbackLoopsDismissBtn");
const feedbackLoopsShowFocusBtn = document.getElementById("feedbackLoopsShowFocusBtn");
const feedbackLoopsClearFocusBtn = document.getElementById("feedbackLoopsClearFocusBtn");
const feedbackLoopsSummary = document.getElementById("feedbackLoopsSummary");
const feedbackLoopsContent = document.getElementById("feedbackLoopsContent");
const sensitivityAnalysisModal = document.getElementById("sensitivityAnalysisModal");
const sensitivityAnalysisCloseBtn = document.getElementById("sensitivityAnalysisCloseBtn");
const sensitivityInputSelect = document.getElementById("sensitivityInputSelect");
const sensitivityOutputSelect = document.getElementById("sensitivityOutputSelect");
const sensitivityMinInput = document.getElementById("sensitivityMinInput");
const sensitivityMaxInput = document.getElementById("sensitivityMaxInput");
const sensitivitySamplesInput = document.getElementById("sensitivitySamplesInput");
const sensitivityRunBtn = document.getElementById("sensitivityRunBtn");
const sensitivityExportBtn = document.getElementById("sensitivityExportBtn");
const sensitivityImageExportBtn = document.getElementById("sensitivityImageExportBtn");
const sensitivityAnalysisStatus = document.getElementById("sensitivityAnalysisStatus");
const sensitivityAnalysisResults = document.getElementById("sensitivityAnalysisResults");
const sensitivityAnalysisChart = document.getElementById("sensitivityAnalysisChart");
const presentationGroupsModal = document.getElementById("presentationGroupsModal");
const presentationGroupsCloseBtn = document.getElementById("presentationGroupsCloseBtn");
const presentationGroupsDismissBtn = document.getElementById("presentationGroupsDismissBtn");
const viewOptionsModal = document.getElementById("viewOptionsModal");
const viewOptionsCloseBtn = document.getElementById("viewOptionsCloseBtn");
const viewOptionsDismissBtn = document.getElementById("viewOptionsDismissBtn");
const dashboardRenameModal = document.getElementById("dashboardRenameModal");
const dashboardRenameInput = document.getElementById("dashboardRenameInput");
const dashboardRenameCloseBtn = document.getElementById("dashboardRenameCloseBtn");
const dashboardRenameCancelBtn = document.getElementById("dashboardRenameCancelBtn");
const dashboardRenameApplyBtn = document.getElementById("dashboardRenameApplyBtn");
const modelCloseConfirmModal = document.getElementById("modelCloseConfirmModal");
const modelCloseConfirmDiscardBtn = document.getElementById("modelCloseConfirmDiscardBtn");
const modelCloseConfirmSaveBtn = document.getElementById("modelCloseConfirmSaveBtn");
const presentationGroupNameInput = document.getElementById("presentationGroupNameInput");
const presentationGroupCreateBtn = document.getElementById("presentationGroupCreateBtn");
const presentationGroupsStatus = document.getElementById("presentationGroupsStatus");
const presentationGroupsList = document.getElementById("presentationGroupsList");
const expressionEditorSwitchModal = document.getElementById("expressionEditorSwitchModal");
const expressionEditorSwitchCloseBtn = document.getElementById("expressionEditorSwitchCloseBtn");
const expressionEditorSwitchCancelBtn = document.getElementById("expressionEditorSwitchCancelBtn");
const expressionEditorSwitchDiscardBtn = document.getElementById("expressionEditorSwitchDiscardBtn");
const expressionEditorSwitchApplyBtn = document.getElementById("expressionEditorSwitchApplyBtn");
const appTooltip = document.getElementById("appTooltip");

window.__stgraphxBootError = null;
window.addEventListener("error", (event) => {
  const message = event?.error?.stack || event?.message || "Unknown error";
  window.__stgraphxBootError = String(message);
  if (statusText && !statusText.textContent) {
    statusText.textContent = String(message);
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason?.stack || event?.reason?.message || event?.reason || "Unhandled promise rejection";
  window.__stgraphxBootError = String(reason);
  if (statusText && !statusText.textContent) {
    statusText.textContent = String(reason);
  }
});

const {
  addCanvasText,
  addLedWidget,
  addButtonWidget,
  addSelectWidget,
  addTextWidget,
  addSliderWidget,
  addNumericWidget,
  addMatrixWidget,
  addTableWidget,
  addXYChartWidget,
  getNodeByName,
  getModelNodeById,
  buildNodeNameMap,
  defaultChartSeriesColor,
  normalizeChartPointMode,
  normalizeChartSeriesToggle,
  normalizeChartLineStyle,
  normalizeChartBarMode,
  applyWidgetDrivenNodeValues,
  applyRuntimeModelInputOverrides,
  updateTableWidgetsFromComputedValues,
  updateXYWidgetsFromComputedValues,
  clearAllXYChartPoints,
  clearAllTableWidgetRows,
  refreshRuntimeView,
  refreshWidgetFrame,
  startEdgeCreateFromNode,
  startEdgeCreateFromMouse,
  updateEdgeCreateFromClient,
  finishEdgeCreateFromClient,
  addControlPointAt,
  removeControlPoint,
  removeSelected,
  nodeIdAtGraphPoint,
  openBackgroundContextMenu,
  openNodeContextMenu,
  openTextContextMenu,
  openEdgeContextMenu,
  openControlPointContextMenu,
  marqueeRect,
  nodesInRect,
  normalizeNodeDescriptionProperty,
  getNodeDescription,
  normalizeNodeFormulaNotesProperty,
  getNodeFormulaNotes,
  buildNodeTooltipText,
  canvasTextDisplayHtml,
  wrapTextSelection,
  insertTextHtmlSnippet,
  renderPropertiesEditor,
  renderWidgets,
  refreshWidgetConfigPanel,
  copyTextToClipboard,
} = globalThis.Widgets || {};

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";
const MAX_HISTORY = 100;
const BASE_CANVAS_WIDTH = 1200;
const BASE_CANVAS_HEIGHT = 800;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const SUPPORTED_LANGS = new Set(["it", "en"]);
const CHART_SERIES_PALETTE = ["#0e7ac4", "#e67e22", "#27ae60", "#8e44ad", "#c0392b", "#16a085"];
const RECENT_MODELS_STORAGE_KEY = "stgraphx.recentModels.v1";
const MODEL_CLIPBOARD_STORAGE_KEY = "stgraphx.modelClipboard.v1";
const MODEL_CLIPBOARD_PREFIX = "STGraphX clipboard v1\n";
const MAX_RECENT_MODELS = 8;
const SUBMODEL_DEFERRED_RESOLUTION = "__submodel_deferred_resolution__";
const NODE_FILL_COLOR_PRESETS = [
  { key: "default", value: "" },
  { key: "transparent", value: "transparent" },
  { key: "blue", value: "#dff2ff" },
  { key: "green", value: "#dff6ec" },
  { key: "yellow", value: "#fff7d8" },
  { key: "orange", value: "#ffe8d6" },
  { key: "red", value: "#ffe1e6" },
  { key: "violet", value: "#eee3ff" },
  { key: "gray", value: "#eef2f6" },
];

const NODE_STROKE_COLOR_PRESETS = [
  { key: "default", value: "" },
  { key: "transparent", value: "transparent" },
  { key: "blue", value: "#156fb8" },
  { key: "green", value: "#1f8a5a" },
  { key: "yellow", value: "#b48710" },
  { key: "orange", value: "#c56416" },
  { key: "red", value: "#c43a52" },
  { key: "violet", value: "#6e49b8" },
  { key: "gray", value: "#586978" },
];

const EDGE_COLOR_PRESETS = [
  { key: "default", value: "" },
  { key: "blue", value: "#156fb8" },
  { key: "green", value: "#1f8a5a" },
  { key: "yellow", value: "#b48710" },
  { key: "orange", value: "#c56416" },
  { key: "red", value: "#c43a52" },
  { key: "violet", value: "#6e49b8" },
  { key: "gray", value: "#586978" },
];

const TEXT_FILL_COLOR_PRESETS = [
  { key: "default", value: "" },
  { key: "blue", value: "#eef6ff" },
  { key: "green", value: "#edf9f2" },
  { key: "yellow", value: "#fff9e7" },
  { key: "orange", value: "#fff0e4" },
  { key: "red", value: "#fff0f2" },
  { key: "violet", value: "#f3eeff" },
  { key: "gray", value: "#f3f6f9" },
];

const TEXT_STROKE_COLOR_PRESETS = [
  { key: "default", value: "" },
  { key: "blue", value: "#2f78c4" },
  { key: "green", value: "#2d9564" },
  { key: "yellow", value: "#bc8c19" },
  { key: "orange", value: "#ca6a1d" },
  { key: "red", value: "#c44b61" },
  { key: "violet", value: "#7a58c1" },
  { key: "gray", value: "#6b7b8a" },
];

function normalizeTableColumnName(column) {
  if (typeof column === "string") {
    return column;
  }
  if (column && typeof column === "object") {
    if (typeof column.source === "string") {
      return column.source;
    }
    if (typeof column.name === "string") {
      return column.name;
    }
    if (typeof column.label === "string") {
      return column.label;
    }
  }
  return String(column ?? "");
}

function normalizeTableColumnFormats(formats) {
  if (!formats || typeof formats !== "object" || Array.isArray(formats)) {
    return {};
  }
  return Object.fromEntries(Object.entries(formats)
    .filter(([name]) => String(name).trim())
    .map(([name, format]) => [String(name), {
      align: ["left", "center", "right"].includes(String(format?.align ?? ""))
        ? String(format.align)
        : "left",
      decimalDigits: format?.decimalDigits != null && Number.isInteger(Number(format.decimalDigits))
        && Number(format.decimalDigits) >= 0
        && Number(format.decimalDigits) <= 12
        ? Number(format.decimalDigits)
        : null,
    }]));
}

const graphFunctionHelpers = globalThis.GraphFunctions?.helpers || {};
const selectionStateHelpers = globalThis.STGraphXSelectionState;
if (!selectionStateHelpers) {
  throw new Error("STGraphX selection state helpers are unavailable");
}
const workspaceTabsUi = globalThis.STGraphXWorkspaceTabsUi;
if (!workspaceTabsUi) {
  throw new Error("STGraphX workspace tabs UI helpers are unavailable");
}
const workspaceTabsCore = globalThis.STGraphXWorkspaceTabsCore;
if (!workspaceTabsCore) {
  throw new Error("STGraphX workspace tabs core helpers are unavailable");
}
const workspaceRuntimeStateFactory = globalThis.STGraphXWorkspaceRuntimeState?.createWorkspaceRuntimeStateHelpers;
if (typeof workspaceRuntimeStateFactory !== "function") {
  throw new Error("STGraphX workspace runtime state helpers are unavailable");
}
const workspaceRuntimeStateHelpers = workspaceRuntimeStateFactory({ deepClone, cloneRuntimeModel, cloneSimulationOutputValue });
const valueFormattingFactory = globalThis.STGraphXValueFormatting?.createValueFormattingHelpers;
if (typeof valueFormattingFactory !== "function") {
  throw new Error("STGraphX value formatting helpers are unavailable");
}
const valueFormatting = valueFormattingFactory({
  t,
  clamp,
  getDecimals: () => graph.execution.decimals,
});
const {
  clampDisplayDecimals,
  describeExpressionPreviewShape,
  formatAgentSpaceSummary,
  formatComputedValue,
  formatExecutionDuration,
  formatNumberValue,
  isAgentSpaceValue,
  summarizeExpressionPreviewValue,
  summarizeNodeRuntimeValue,
  summarizeTooltipValue,
} = valueFormatting;
const recentModelsStore = globalThis.STGraphXRecentModels?.createRecentModelsStore({
  storageKey: RECENT_MODELS_STORAGE_KEY,
  maxEntries: MAX_RECENT_MODELS,
  getHandlePath: extractFileHandlePath,
  supportsPaths: supportsRecentModelPaths,
  createHandleFromPath(filePath) {
    const electronHandle = createElectronPathFileHandle(filePath);
    if (electronHandle) {
      return electronHandle;
    }
    const createHandle = window.STGraphXPlatform?.createFileHandleFromPath;
    return typeof createHandle === "function" ? createHandle(filePath) : null;
  },
  unnamedLabel: () => t("file.unnamed"),
});

if (!recentModelsStore) {
  throw new Error("STGraphX recent models helpers are unavailable");
}

const modelSessionHelpers = globalThis.STGraphXModelSession?.createModelSessionHelpers({
  deriveDirectoryHandleFromFileHandle,
  hasPlatformApi,
  getPlatform: () => window.STGraphXPlatform,
  createFileHandleFromPath(filePath) {
    const electronHandle = createElectronPathFileHandle(filePath);
    if (electronHandle) {
      return electronHandle;
    }
    const createHandle = window.STGraphXPlatform?.createFileHandleFromPath;
    return typeof createHandle === "function" ? createHandle(filePath) : null;
  },
  normalizeSubmodelPath,
  basenameOfSubmodelPath,
  buildRuntimeModelFromData,
  showSaveFilePickerCompat,
  normalizeJsonFilename,
  normalizeCsvFilename,
});

if (!modelSessionHelpers) {
  throw new Error("STGraphX model session helpers are unavailable");
}

const modelPersistenceHelpers = globalThis.STGraphXModelPersistence?.createModelPersistenceHelpers();

if (!modelPersistenceHelpers) {
  throw new Error("STGraphX model persistence helpers are unavailable");
}

const modelLoadingHelpers = globalThis.STGraphXModelLoading?.createModelLoadingHelpers({
  deriveDirectoryHandleFromFileHandle,
  loadGraphFromJsonText,
  rememberRecentModel,
  preloadSubmodelsAfterLoad,
  maybeSelectModelDirectoryForSubmodels,
  prepareSelectedJsonEntries,
  resolveRecentModelHandle,
  resolveRecentModelDirectoryHandle,
  resolveRecentModelSnapshot,
  supportsOpenFilePicker,
  showOpenFilePickerCompat,
  getCurrentModelDirectoryHandle: () => currentModelDirectoryHandle,
  getCurrentModelFileHandle: () => currentFileHandle,
  pickSubmodelFilesWithInput,
  notifyMissingRecentModelEntry,
  removeRecentModelEntry(entry) {
    recentModelsStore.remove(entry);
    renderRecentModelsMenu();
  },
  isLoadCancelledError: (err) => err && (err.name === "AbortError" || String(err.message || "") === t("error.loadCancelled")),
  beforeOpenInNewTab() {
    saveActiveWorkspaceTabState();
    closeDocumentTransientUi();
    const previousActiveTabId = workspace.activeTabId;
    workspace.activeTabId = null;
    return { previousActiveTabId };
  },
  afterOpenInNewTab() {
    createWorkspaceTabFromCurrentState({ activate: true });
    refreshWorkspaceTabBar();
  },
  onOpenPreparedStart() {
    submodelTemplateCache.clear();
    submodelFileHandleCache.clear();
    submodelSourceCache.clear();
  },
  onOpenPreparedFailure(checkpoint) {
    workspace.activeTabId = checkpoint?.previousActiveTabId ?? workspace.activeTabId ?? null;
    refreshWorkspaceTabBar();
  },
});

if (!modelLoadingHelpers) {
  throw new Error("STGraphX model loading helpers are unavailable");
}

const submodelSupportHelpers = globalThis.STGraphXSubmodelSupport?.createSubmodelSupportHelpers({
  normalizeSubmodelPath,
  basenameOfSubmodelPath,
  parseSelectedJsonEntry,
  buildRuntimeModelFromData,
  descriptionPropertyKeys,
  supportsOpenFilePicker,
  showOpenFilePickerCompat,
  pickSubmodelFilesWithInput,
  getCurrentModelDirectoryHandle: () => currentModelDirectoryHandle,
  deriveDirectoryHandleFromCurrentFile: () => deriveDirectoryHandleFromFileHandle(currentFileHandle),
  setCurrentModelDirectoryHandle: (handle) => {
    currentModelDirectoryHandle = handle || null;
  },
  ensureCurrentModelDirectoryHandle,
  supportsDirectoryInputSelection,
  supportsDirectoryPicker,
  confirmSelectModelFolder: () => window.confirm(t("confirm.selectModelFolder")),
  onModelFolderSelected: () => setStatusKey("status.modelFolderSelected"),
  hasCachedSubmodel: (name) => Boolean(name && (submodelSourceCache.has(name) || submodelTemplateCache.has(name))),
  cacheSubmodel: (baseName, payload) => {
    submodelSourceCache.set(baseName, payload.text);
    if (payload.fileHandle) {
      submodelFileHandleCache.set(baseName, payload.fileHandle);
    }
    if (payload.template) {
      submodelTemplateCache.set(baseName, payload.template);
    }
  },
  invalidJsonMessage: () => t("error.invalidJson"),
});

if (!submodelSupportHelpers) {
  throw new Error("STGraphX submodel support helpers are unavailable");
}

const submodelResolutionHelpers = globalThis.STGraphXSubmodelResolution?.createSubmodelResolutionHelpers({
  normalizeSubmodelPath,
  basenameOfSubmodelPath,
  buildRuntimeModelFromData,
  extractSubmodelInterfaceFromData: (data) => submodelSupportHelpers.extractSubmodelInterfaceFromData(data),
  supportsDirectoryInputSelection,
  supportsDirectoryPicker,
  ensureCurrentModelDirectoryHandle,
  supportsOpenFilePicker,
  showOpenFilePickerCompat,
  pickSubmodelFileWithInput,
  t,
  getCurrentModelDirectoryHandle: () => currentModelDirectoryHandle,
  getCachedSubmodelHandle: (name) => submodelFileHandleCache.get(name),
  deleteCachedSubmodelHandle: (name) => submodelFileHandleCache.delete(name),
  getCachedSubmodelSource: (name) => submodelSourceCache.get(name),
  hasCachedSubmodelSource: (name) => submodelSourceCache.has(name),
  cacheResolvedSubmodel: (name, payload) => {
    submodelSourceCache.set(name, payload.text);
    if (payload.fileHandle) {
      submodelFileHandleCache.set(name, payload.fileHandle);
    }
  },
  hasSubmodelTemplate: (name) => submodelTemplateCache.has(name),
  getSubmodelTemplate: (name) => submodelTemplateCache.get(name),
  setSubmodelTemplate: (name, template) => submodelTemplateCache.set(name, template),
  isSubmodelNode,
  deferredResolutionToken: SUBMODEL_DEFERRED_RESOLUTION,
});

if (!submodelResolutionHelpers) {
  throw new Error("STGraphX submodel resolution helpers are unavailable");
}

function appendUniqueNames(target, names) {
  (names || []).forEach((name) => {
    const normalized = String(name ?? "").trim();
    if (normalized && !target.includes(normalized)) {
      target.push(normalized);
    }
  });
}

function declaredAgentFieldNamesForNode(node) {
  if (!node) {
    return [];
  }
  const out = [];
  appendUniqueNames(out, graphFunctionHelpers.getAgentFieldNames?.(node.computedValue));
  if (isStateNode(node)) {
    appendUniqueNames(out, semantics.extractAgentFieldNamesFromExpression?.(node.initialStateExpression));
  }
  appendUniqueNames(out, semantics.extractAgentFieldNamesFromExpression?.(node.valueExpression));
  return out;
}

function accessibleAgentFieldAliasNames(node, fieldKey = "value") {
  if (!node) {
    return [];
  }
  const out = [];
  appendUniqueNames(out, declaredAgentFieldNamesForNode(node));
  globalParameterNodesForModel(graph, node.id).forEach((depNode) => {
    appendUniqueNames(out, declaredAgentFieldNamesForNode(depNode));
  });
  graph.edges
    .filter((edge) => edge.to === node.id)
    .map((edge) => getNodeById(edge.from))
    .filter(Boolean)
    .filter((depNode) => fieldKey !== "initial" || !isSubmodelNode(depNode))
    .forEach((depNode) => {
      appendUniqueNames(out, declaredAgentFieldNamesForNode(depNode));
    });
  return out;
}

function accessibleAgentFieldAliasEntries(node, fieldKey = "value") {
  const seen = new Set();
  const out = [];
  const addFromNode = (sourceNode) => {
    declaredAgentFieldNamesForNode(sourceNode).forEach((name, index) => {
      if (seen.has(name)) {
        return;
      }
      seen.add(name);
      out.push({
        name,
        index,
        source: sourceNode?.name || "",
      });
    });
  };
  if (!node) {
    return out;
  }
  addFromNode(node);
  globalParameterNodesForModel(graph, node.id).forEach(addFromNode);
  graph.edges
    .filter((edge) => edge.to === node.id)
    .map((edge) => getNodeById(edge.from))
    .filter(Boolean)
    .filter((depNode) => fieldKey !== "initial" || !isSubmodelNode(depNode))
    .forEach(addFromNode);
  return out;
}

function parseAutoNullableNumber(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || trimmed === "auto") {
      return null;
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function serializeAutoNullableNumber(value) {
  if (value == null) {
    return "auto";
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || trimmed === "auto") {
      return "auto";
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : "auto";
}

function serializeModelClipboardPayload(payload) {
  return `${MODEL_CLIPBOARD_PREFIX}${JSON.stringify({
    type: "stgraphx-model-clipboard",
    version: 1,
    payload,
  })}`;
}

function parseModelClipboardPayload(raw) {
  const text = String(raw ?? "");
  if (!text.startsWith(MODEL_CLIPBOARD_PREFIX)) {
    return null;
  }
  try {
    const parsed = JSON.parse(text.slice(MODEL_CLIPBOARD_PREFIX.length));
    const payload = parsed?.payload;
    if (!isValidModelClipboardPayload(parsed, payload)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function isValidModelClipboardPayload(parsed, payload) {
  if (
    parsed?.type !== "stgraphx-model-clipboard"
    || parsed?.version !== 1
    || !payload
    || !Array.isArray(payload.nodes)
    || !Array.isArray(payload.edges)
  ) {
    return false;
  }
  // Text items were added after the first clipboard format. Keep existing
  // node-only clipboard data valid while allowing a text-only selection.
  return !payload.textItems || Array.isArray(payload.textItems)
    ? payload.nodes.length > 0 || (payload.textItems?.length || 0) > 0
    : false;
}

function persistSharedModelClipboard(raw) {
  try {
    window.localStorage.setItem(MODEL_CLIPBOARD_STORAGE_KEY, raw);
  } catch {}
  try {
    void Promise.resolve(globalThis.STGraphXPlatform?.writeClipboardText?.(raw)).catch(() => {});
  } catch {}
}

function readStoredModelClipboardRaw() {
  try {
    const stored = window.localStorage.getItem(MODEL_CLIPBOARD_STORAGE_KEY);
    if (parseModelClipboardPayload(stored)) {
      return String(stored);
    }
  } catch {}
  return "";
}

async function readSharedModelClipboardRaw() {
  try {
    const platformText = await Promise.resolve(globalThis.STGraphXPlatform?.readClipboardText?.());
    if (parseModelClipboardPayload(platformText)) {
      return String(platformText);
    }
  } catch {}
  return readStoredModelClipboardRaw();
}

async function syncClipboardFromSharedSource() {
  const raw = await readSharedModelClipboardRaw();
  if (!raw) {
    return false;
  }
  if (raw === clipboard.signature && clipboard.data) {
    return true;
  }
  const payload = parseModelClipboardPayload(raw);
  if (!isValidModelClipboardPayload({ type: "stgraphx-model-clipboard", version: 1 }, payload)) {
    return false;
  }
  clipboard.data = deepClone(payload);
  clipboard.pasteCount = 0;
  clipboard.signature = raw;
  return true;
}

let nodeCounter = 1;
let edgeCounter = 1;
let widgetCounter = 1;
let textItemCounter = 1;
let presentationGroupCounter = 1;
let currentLang = "it";
let i18n = {};
let lastSavedSnapshot = "";
let currentFileHandle = null;
let currentFileName = "";
let currentModelDirectoryHandle = null;
const workspace = {
  tabs: [],
  activeTabId: null,
  nextTabId: 1,
};
const submodelTemplateCache = new Map();
const submodelFileHandleCache = new Map();
const submodelSourceCache = new Map();
const READ_DATA_CALL_PATTERN = /\breadData\s*\(/;
const READ_DATA_LITERAL_CALL_PATTERN = /\breadData\s*\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/g;
function descriptionPropertyKey() {
  return currentLang === "it" ? "descrizione" : "description";
}

function descriptionPropertyKeys() {
  return new Set(["descrizione", "description"]);
}

function formulaNotesPropertyKey() {
  return currentLang === "it" ? "note formula" : "formula notes";
}

function formulaNotesPropertyKeys() {
  return new Set(["note formula", "formula notes"]);
}

function commitDebugConfigChange(mutator) {
  const beforeState = exportGraphData();
  mutator();
  sanitizeDebugConfig(graph);
  const afterState = exportGraphData();
  if (JSON.stringify(beforeState) !== JSON.stringify(afterState)) {
    pushUndoState(beforeState);
    history.redo = [];
    dirtySinceLastSave = true;
    updateFileStatusLabel(true);
    updateHistoryButtons();
  }
  render();
}

let dirtySinceLastSave = false;
let fileStatusRefreshTimer = null;

const graph = {
  modelTitle: "",
  notes: { markdown: "" },
  properties: [],
  unitDefinitions: [],
  scenarios: [],
  localFunctions: [],
  nodes: [],
  edges: [],
  textItems: [],
  widgets: [],
  presentationGroups: [],
  dashboard: null,
  debug: {
    watches: [],
    breakpointEnabled: false,
    breakpointExpression: "",
    breakpointMessage: "",
  },
  __simulationHistory: [],
  __directoryPath: "",
  __readDataCache: Object.create(null),
  execution: {
    t0: 0,
    dt: 1,
    t1: 10,
    delayMs: 100,
    renderEverySteps: 1,
    decimals: 3,
    integrator: "euler",
    strictDefinitions: false,
    stopOnRuntimeError: false,
    randomSeed: null,
    randomState: null,
    currentTime: null,
  },
};

const ui = {
  selected: null,
  selectedNodes: new Set(),
  selectedControlPoint: null,
  lastControlPointTap: null,
  lastEdgeTap: null,
  drag: null,
  resize: null,
  edgeCreate: null,
  edgeCreateHoverId: null,
  edgeCreateLastPoint: null,
  controlPointDrag: null,
  marquee: null,
  snapToGrid: true,
  showGrid: true,
  highlightNodeEdges: true,
  showNodeValues: true,
  checkUnits: true,
  gridSize: 20,
  tooltipDelayMs: 300,
  zoom: 1,
  nodeNameEditStart: null,
  timedRunHandle: null,
  timedStepRunning: false,
  fullRunRunning: false,
  sensitivityRunning: false,
  sensitivityStopRequested: false,
  sensitivityProgressFraction: 0,
  sensitivityCompletedSamples: 0,
  timedRunStartedAt: 0,
  timedStepLastActivityAt: 0,
  submodelsPrepared: false,
  widgetDrag: null,
  widgetResize: null,
  dashboardDrag: null,
  dashboardResize: null,
  dashboardTabClickTimer: null,
  dashboardTabClickPageId: null,
  dashboardDropState: null,
  dashboardRenamePageId: null,
  modelCloseConfirmResolver: null,
  sliderInteraction: null,
  showGraph: true,
  showWidgets: true,
  expressionEditor: null,
  expressionEditorView: "editor",
  modalDrag: null,
  modalResize: null,
  tooltipTarget: null,
  tooltipPointer: null,
  tooltipShowTimer: null,
  tooltipHideTimer: null,
  executionPlan: null,
  activeChartPairByWidgetId: new Map(),
  sidebarNodeId: null,
  lastNodeActivate: null,
  lastTextActivate: null,
  textDrag: null,
  textResize: null,
  expressionPreviewTimer: null,
  nodeDefinitionRefreshTimer: null,
  expressionEditorPendingSelectionAction: null,
  expressionPreviewInitCache: null,
  analysisFocus: null,
  feedbackLoopSelection: null,
  feedbackLoopFocus: null,
  sensitivityAnalysis: null,
  watchPreviousSnapshot: new Map(),
  breakpointLastResult: null,
  localFunctionsEditor: null,
  tabletSidebarOpen: false,
  sidebarHidden: false,
  tabletSidebarExpanded: false,
  tabletSidebarDrag: null,
  tabletCanvasMode: "edit",
  touchViewportGesture: null,
  touchHold: null,
  modelAnalysisIssues: null,
};

const submodelOrchestrationHelpers = globalThis.STGraphXSubmodelOrchestration?.createSubmodelOrchestrationHelpers({
  graph,
  ui,
  t,
  isSubmodelNode,
  normalizeSubmodelPath,
  loadSubmodelTemplateByPath,
  loadSubmodelInterfaceByPath,
  resolveSubmodelFileByPath,
  isDeferredSubmodelResolutionError,
  getNodeDescription,
  emptySubmodelInterfaceCache,
  normalizeSubmodelInterfaceCache,
  sanitizeSubmodelBindings,
  sanitizeAllEdgesForNode,
  refreshSidebar,
  render,
  setStatusKey,
  invalidateExecutionPlan,
  scheduleFileStatusRefresh,
  deriveDirectoryHandleFromFileHandle,
  loadGraphFromJsonText,
  preloadSubmodelsAfterLoadRef: () => preloadSubmodelsAfterLoad(),
  beforeOpenSubmodelInNewTab() {
    const previousActiveTabId = workspace.activeTabId;
    saveActiveWorkspaceTabState();
    closeDocumentTransientUi();
    workspace.activeTabId = null;
    return { previousActiveTabId };
  },
  afterOpenSubmodelInNewTab(node, checkpoint) {
    createWorkspaceTabFromCurrentState({
      activate: true,
      meta: {
        kind: "submodel",
        parentTabId: checkpoint?.previousActiveTabId ?? null,
        parentNodeName: String(node?.name || ""),
        parentTitle: checkpoint?.previousActiveTabId != null
          ? displayFileNameFromContext(getWorkspaceTabById(checkpoint.previousActiveTabId)?.state?.context)
          : "",
      },
    });
    refreshWorkspaceTabBar();
  },
  onOpenSubmodelInNewTabFailure(checkpoint) {
    workspace.activeTabId = workspace.activeTabId || checkpoint?.previousActiveTabId || null;
    refreshWorkspaceTabBar();
  },
});

if (!submodelOrchestrationHelpers) {
  throw new Error("STGraphX submodel orchestration helpers are unavailable");
}

const helpContentHelpers = globalThis.STGraphXHelpContent?.createHelpContentHelpers({
  t,
  hasPlatformApi,
  getCurrentLang: () => currentLang,
  openPreparedJsonEntryInNewTab,
  setStatus,
  setStatusKey,
  closeTopMenus,
  normalizeJsonFilename,
  copyTextToClipboard,
  supportsSaveFilePicker,
  showSaveFilePickerCompat,
  writeTextToFileHandle,
  getGraph: () => graph,
  getCurrentFileName: () => currentFileName,
  getCurrentModelTitle: () => graph?.modelTitle || "",
  getNodeDescription,
  isStateNode,
  isAlgebraicNode,
  isSubmodelNode,
  hasExternalUrlOpener: () => hasPlatformApi("openExternalUrl"),
  openExternalUrl: (url) => {
    if (hasPlatformApi("openExternalUrl")) {
      return window.STGraphXPlatform.openExternalUrl(url);
    }
    const popup = window.open(String(url ?? ""), "_blank", "noopener,noreferrer");
    if (popup) popup.opener = null;
    return Promise.resolve(Boolean(popup));
  },
  documentationHelpModal,
  documentationHelpTitle,
  documentationHelpPath,
  documentationHelpContent,
  documentationHelpBackBtn,
  documentationHelpForwardBtn,
  examplesHelpModal,
  examplesHelpTitle,
  examplesHelpIntro,
  examplesHelpContent,
  eightTupleModal,
  eightTupleContent,
  eightTupleCopyBtn,
  eightTupleExportBtn,
  aboutAppModal,
  aboutAppVersionValue,
  aboutAppAuthorValue,
  aboutAppLicenseValue,
  aboutAppCopyrightValue,
});

if (!helpContentHelpers) {
  throw new Error("STGraphX help content helpers are unavailable");
}

const modelAnalysisUiHelpers = globalThis.STGraphXModelAnalysisUi?.createModelAnalysisUiHelpers({
  t,
  modelAnalysisModal,
  modelAnalysisSummary,
  modelAnalysisContent,
  modelAnalysisSeverityFilter,
  modelAnalysisSearchInput,
  modelAnalysisChecksModal,
  modelAnalysisChecksContent,
  analyzeModelStaticIssues,
  setStatusKey,
  onFocusIssueTarget: focusAnalysisIssueTarget,
});

if (!modelAnalysisUiHelpers) {
  throw new Error("STGraphX model analysis UI helpers are unavailable");
}

const watchDebuggerUiHelpers = globalThis.STGraphXWatchDebuggerUi?.createWatchDebuggerUiHelpers({
  t,
  watchDebuggerModal,
  watchDebuggerSummary,
  watchBreakpointEnabledInput,
  watchBreakpointInput,
  watchBreakpointMessageInput,
  watchBreakpointStatus,
  watchAddSelectedBtn,
  watchDebuggerList,
  isEditingUiLocked,
  getDebugConfig: () => sanitizeDebugConfig(graph),
  getSelectedWatchableNode: () => selectedWatchableNode(),
  validateBreakpointExpressionText,
  getBreakpointExpressionSource: () => breakpointExpressionSource(),
  getBreakpointLastResult: () => ui.breakpointLastResult,
  formatNumberValue,
  showExpressionStatus,
  hideExpressionStatus,
  localizeExpressionErrorMessage,
  formatErrorReason: evalReasonText,
  summarizeValue: summarizeExpressionPreviewValue,
  getWatchEntries: () => {
    const debug = sanitizeDebugConfig(graph);
    return debug.watches
      .map((name) => {
        const node = getNodeByName(name);
        if (!node) {
          return null;
        }
        const previous = ui.watchPreviousSnapshot instanceof Map ? ui.watchPreviousSnapshot.get(name) : null;
        return {
          name,
          currentValue: node.computedValue,
          currentError: node.computedError,
          previousSummary: previous?.summary ?? "—",
          isState: isStateNode(node),
          nextValue: node.pendingStateValue,
          nextError: node.pendingStateError,
        };
      })
      .filter(Boolean);
  },
  onRemoveWatch: (name) => {
    commitDebugConfigChange(() => {
      ensureDebugConfig(graph).watches = ensureDebugConfig(graph).watches.filter((entry) => entry !== name);
    });
    watchDebuggerUiHelpers.renderWatchDebugger();
  },
});

if (!watchDebuggerUiHelpers) {
  throw new Error("STGraphX watch debugger UI helpers are unavailable");
}

const history = {
  undo: [],
  redo: [],
  transactionStart: null,
};

const clipboard = {
  data: null,
  pasteCount: 0,
  signature: "",
};

const defs = document.createElementNS(SVG_NS, "defs");
function createArrowMarker(id, color) {
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("orient", "auto-start-reverse");
  const arrowPath = document.createElementNS(SVG_NS, "path");
  arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  arrowPath.setAttribute("fill", color);
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
}
function edgeArrowMarkerId(color) {
  const normalized = normalizeEdgeColor(color);
  if (!normalized) {
    return "arrow";
  }
  const id = `arrow-color-${normalized.slice(1).toLowerCase()}`;
  if (!defs.querySelector(`#${id}`)) {
    createArrowMarker(id, normalized);
  }
  return id;
}
createArrowMarker("arrow", "#3b4e61");
createArrowMarker("arrow-selected", "#0e7ac4");
createArrowMarker("arrow-incoming", "#d17b16");
createArrowMarker("arrow-outgoing", "#0d8c8c");
createArrowMarker("arrow-both", "#8b5fbf");
createArrowMarker("arrow-feedback-loop", "#8f2d68");
svg.appendChild(defs);

const edgesLayer = document.createElementNS(SVG_NS, "g");
const presentationGroupsLayer = document.createElementNS(SVG_NS, "g");
const dashboardLayer = document.createElementNS(SVG_NS, "g");
const previewLayer = document.createElementNS(SVG_NS, "g");
const marqueeLayer = document.createElementNS(SVG_NS, "g");
const nodesLayer = document.createElementNS(SVG_NS, "g");
const textLayer = document.createElementNS(SVG_NS, "g");
const controlsLayer = document.createElementNS(SVG_NS, "g");
svg.appendChild(edgesLayer);
svg.insertBefore(presentationGroupsLayer, edgesLayer);
svg.appendChild(previewLayer);
svg.appendChild(nodesLayer);
svg.appendChild(dashboardLayer);
svg.appendChild(textLayer);
svg.appendChild(controlsLayer);
svg.appendChild(marqueeLayer);
const semantics = window.GraphSemantics;

const runtimeShared = globalThis.STGraphXRuntimeShared?.createRuntimeShared({
  getCurrentLang: () => currentLang,
});

if (!runtimeShared) {
  throw new Error("STGraphX runtime shared helpers are unavailable");
}

function clamp(val, min, max) {
  return runtimeShared.clamp(val, min, max);
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

function worldDeltaFromClientDelta(deltaClientX, deltaClientY) {
  const vb = svg.viewBox.baseVal;
  const width = Math.max(1, svg.clientWidth || Math.round((vb?.width || BASE_CANVAS_WIDTH) * ui.zoom));
  const height = Math.max(1, svg.clientHeight || Math.round((vb?.height || BASE_CANVAS_HEIGHT) * ui.zoom));
  const scaleX = (vb?.width || BASE_CANVAS_WIDTH) / width;
  const scaleY = (vb?.height || BASE_CANVAS_HEIGHT) / height;
  return {
    x: deltaClientX * scaleX,
    y: deltaClientY * scaleY,
  };
}

function isTypingTarget(target = document.activeElement) {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
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

function updateCanvasGridAppearance() {
  if (!canvasContent || !svg) {
    return;
  }
  const vb = svg.viewBox?.baseVal;
  const viewX = Number(vb?.x) || 0;
  const viewY = Number(vb?.y) || 0;
  const stepPx = Math.max(1, ui.gridSize * ui.zoom);
  const offsetX = -((viewX * ui.zoom) % stepPx);
  const offsetY = -((viewY * ui.zoom) % stepPx);
  canvasContent.style.setProperty("--canvas-grid-step", `${stepPx}px`);
  canvasContent.style.setProperty("--canvas-grid-offset-x", `${offsetX}px`);
  canvasContent.style.setProperty("--canvas-grid-offset-y", `${offsetY}px`);
  canvasContent.classList.toggle("grid-hidden", !ui.showGrid);
  if (showGridInput) {
    showGridInput.checked = ui.showGrid;
  }
  if (highlightNodeEdgesInput) {
    highlightNodeEdgesInput.checked = ui.highlightNodeEdges === true;
  }
  if (showNodeValuesInput) {
    showNodeValuesInput.checked = ui.showNodeValues === true;
  }
  if (unitChecksInput) {
    unitChecksInput.checked = ui.checkUnits !== false;
  }
  if (gridSizeInput && document.activeElement !== gridSizeInput) {
    gridSizeInput.value = String(ui.gridSize);
  }
  if (tooltipDelayInput && document.activeElement !== tooltipDelayInput) {
    tooltipDelayInput.value = String(normalizeTooltipDelayMs(ui.tooltipDelayMs));
  }
}

function deepClone(obj) {
  return runtimeShared.deepClone(obj);
}

function normalizeColorString(value) {
  const color = String(value ?? "").trim();
  return color === "transparent" || /^#[0-9a-fA-F]{6}$/.test(color) ? color : "";
}

function defaultNodeFillColor() {
  return "#fcfdff";
}

function defaultNodeStrokeColor() {
  return "#2f4a62";
}

function sanitizeNodeVisualOptions(node) {
  node.fillColor = normalizeColorString(node.fillColor);
  node.strokeColor = normalizeColorString(node.strokeColor);
}

function populateNodeColorSelect(selectEl, presets) {
  if (!selectEl) {
    return;
  }
  const currentValue = String(selectEl.value ?? "");
  selectEl.innerHTML = "";
  presets.forEach((preset) => {
    const opt = document.createElement("option");
    opt.value = preset.value;
    opt.textContent = t(`color.${preset.key}`);
    selectEl.appendChild(opt);
  });
  selectEl.value = presets.some((preset) => preset.value === currentValue) ? currentValue : "";
}

function sanitizeTextItem(item) {
  item.html = String(item?.html ?? "");
  item.markdown = typeof item?.markdown === "string" ? item.markdown : null;
  item.x = Number.isFinite(Number(item?.x)) ? Number(item.x) : 120;
  item.y = Number.isFinite(Number(item?.y)) ? Number(item.y) : 120;
  item.width = clamp(Number(item?.width) || 220, 40, 1200);
  item.height = clamp(Number(item?.height) || 80, 24, 1200);
  item.fillColor = normalizeColorString(item?.fillColor);
  item.strokeColor = normalizeColorString(item?.strokeColor);
  item.dashboardPageId = normalizeDashboardPageId(item?.dashboardPageId);
}

function normalizeModelNotes(value) {
  return { markdown: String(value?.markdown ?? "") };
}

function textItemMarkdown(item) {
  if (typeof item?.markdown === "string") return item.markdown;
  return globalThis.STGraphXMarkdown?.legacyHtmlToMarkdown(item?.html ?? "") ?? String(item?.html ?? "");
}

function sanitizeRichTextHtml(rawHtml) {
  const template = document.createElement("template");
  template.innerHTML = String(rawHtml ?? "");
  const allowedTags = new Set([
    "B", "STRONG", "I", "EM", "U", "BR",
    "P", "DIV", "SPAN",
    "H1", "H2", "H3", "H4", "H5", "H6",
    "UL", "OL", "LI", "SUP", "SUB",
  ]);
  const allowedStyles = new Set([
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "font-style",
    "text-decoration",
    "text-align",
    "line-height",
  ]);

  const sanitizeStyle = (value) => {
    return String(value || "")
      .split(";")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const [prop, ...rest] = chunk.split(":");
        const key = String(prop || "").trim().toLowerCase();
        if (!allowedStyles.has(key)) {
          return "";
        }
        const val = rest.join(":").trim();
        return val ? `${key}: ${val}` : "";
      })
      .filter(Boolean)
      .join("; ");
  };

  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toUpperCase();
        if (!allowedTags.has(tag)) {
          const fragment = document.createDocumentFragment();
          while (child.firstChild) {
            fragment.appendChild(child.firstChild);
          }
          child.replaceWith(fragment);
          walk(node);
          return;
        }
        [...child.attributes].forEach((attr) => {
          if (attr.name.toLowerCase() !== "style") {
            child.removeAttribute(attr.name);
          }
        });
        const style = sanitizeStyle(child.getAttribute("style"));
        if (style) {
          child.setAttribute("style", style);
        } else {
          child.removeAttribute("style");
        }
        walk(child);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      }
    });
  };

  walk(template.content);
  return template.innerHTML.trim();
}

function hasPlatformApi(name) {
  return typeof window.STGraphXPlatform?.[name] === "function";
}

function electronFileBridge() {
  const bridge = window.STGraphXElectronFiles;
  return bridge && typeof bridge === "object" ? bridge : null;
}

function nativePathName(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").replace(/\/+$/u, "");
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

function nativePathDirectory(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/").replace(/\/+$/u, "");
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? (normalized.slice(0, slash) || "/") : "";
}

function joinNativeRelativePath(directoryPath, relativePath) {
  const relative = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/gu, "");
  if (!relative || relative.split("/").some((part) => !part || part === "." || part === "..")) {
    const err = new Error("Invalid relative model path");
    err.name = "NotFoundError";
    throw err;
  }
  return `${String(directoryPath || "").replace(/\/+$/u, "")}/${relative}`;
}

function createElectronPathDirectoryHandle(directoryPath) {
  const bridge = electronFileBridge();
  if (!bridge || !directoryPath) {
    return null;
  }
  return {
    kind: "directory",
    name: nativePathName(directoryPath),
    path: directoryPath,
    async getFileHandle(relativePath) {
      return createElectronPathFileHandle(joinNativeRelativePath(directoryPath, relativePath));
    },
  };
}

function createElectronPathFileHandle(filePath) {
  const bridge = electronFileBridge();
  const directoryPath = nativePathDirectory(filePath);
  if (!bridge || !filePath || typeof bridge.readTextFile !== "function") {
    return null;
  }
  return {
    kind: "file",
    name: nativePathName(filePath),
    path: filePath,
    async getPath() {
      return filePath;
    },
    async getParentDirectoryPath() {
      return directoryPath;
    },
    async getParentDirectoryHandle() {
      return createElectronPathDirectoryHandle(directoryPath);
    },
    async getFile() {
      return {
        name: nativePathName(filePath),
        path: filePath,
        text: () => bridge.readTextFile(filePath),
      };
    },
    async createWritable() {
      let buffer = "";
      return {
        async write(data) {
          buffer = typeof data === "string" ? data : String(data ?? "");
        },
        async close() {
          if (typeof bridge.writeTextFile !== "function") {
            throw new Error("Electron file write bridge unavailable");
          }
          await bridge.writeTextFile(filePath, buffer);
        },
      };
    },
  };
}

function widgetMinDimensions(widget) {
  switch (String(widget?.type || "")) {
    case "led":
      return { width: 120, height: 78 };
    case "button":
      return { width: 120, height: 76 };
    case "select":
      return { width: 120, height: 82 };
    case "slider":
      return { width: 220, height: 82 };
    case "numeric":
      return { width: 160, height: 100 };
    case "text":
      return { width: 120, height: 82 };
    case "matrix":
      return { width: 180, height: 130 };
    case "table":
      return { width: 120, height: 96 };
    case "xychart":
      return { width: 244, height: 152 };
    default:
      return { width: 160, height: 84 };
  }
}

function supportsOpenFilePicker() {
  return typeof electronFileBridge()?.showOpenFilePaths === "function"
    || hasPlatformApi("showOpenFilePicker")
    || typeof window.showOpenFilePicker === "function";
}

function supportsSaveFilePicker() {
  return typeof electronFileBridge()?.showSaveFilePath === "function"
    || hasPlatformApi("showSaveFilePicker")
    || typeof window.showSaveFilePicker === "function";
}

function supportsDirectoryPicker() {
  return hasPlatformApi("showDirectoryPicker") || typeof window.showDirectoryPicker === "function";
}

async function showOpenFilePickerCompat(options) {
  const electronBridge = electronFileBridge();
  if (typeof electronBridge?.showOpenFilePaths === "function") {
    const paths = await electronBridge.showOpenFilePaths(options);
    return paths.map((filePath) => createElectronPathFileHandle(String(filePath))).filter(Boolean);
  }
  if (hasPlatformApi("showOpenFilePicker")) {
    return window.STGraphXPlatform.showOpenFilePicker(options);
  }
  if (typeof window.showOpenFilePicker === "function") {
    return window.showOpenFilePicker(options);
  }
  throw new Error("Open file picker not supported");
}

async function showSaveFilePickerCompat(options) {
  const electronBridge = electronFileBridge();
  if (typeof electronBridge?.showSaveFilePath === "function") {
    const filePath = await electronBridge.showSaveFilePath(options);
    if (!filePath) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      throw err;
    }
    return createElectronPathFileHandle(filePath);
  }
  if (hasPlatformApi("showSaveFilePicker")) {
    return window.STGraphXPlatform.showSaveFilePicker(options);
  }
  if (typeof window.showSaveFilePicker === "function") {
    return window.showSaveFilePicker(options);
  }
  throw new Error("Save file picker not supported");
}

async function showDirectoryPickerCompat(options) {
  if (hasPlatformApi("showDirectoryPicker")) {
    return window.STGraphXPlatform.showDirectoryPicker(options);
  }
  if (typeof window.showDirectoryPicker === "function") {
    return window.showDirectoryPicker(options);
  }
  throw new Error(t("error.submodelDirectoryUnsupported"));
}

function bundledI18nMessages(lang) {
  const bundles = window.STGraphXI18nBundles || {};
  const fallback = bundles.en && typeof bundles.en === "object" ? bundles.en : null;
  const raw = bundles?.[lang];
  if (raw && typeof raw === "object") {
    return fallback && raw !== fallback ? { ...fallback, ...raw } : { ...raw };
  }
  return fallback ? { ...fallback } : null;
}

function normalizeSupportedLanguage(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  const base = value.split("-")[0];
  if (SUPPORTED_LANGS.has(value)) {
    return value;
  }
  if (SUPPORTED_LANGS.has(base)) {
    return base;
  }
  return "";
}

async function resolveLangFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const urlLanguage = normalizeSupportedLanguage(params.get("lang"));
  if (urlLanguage) {
    return urlLanguage;
  }
  try {
    const startupLanguage = await Promise.resolve(globalThis.STGraphXPlatform?.getStartupLanguage?.());
    const platformLanguage = normalizeSupportedLanguage(startupLanguage);
    if (platformLanguage) {
      return platformLanguage;
    }
  } catch {}
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

function applicationWindowTitle() {
  const releaseDate = String(window.STGraphXAppMeta?.releaseDate ?? "").trim();
  return releaseDate ? `STGraphX ${releaseDate}` : "STGraphX";
}

function setTooltipText(el, text) {
  if (!el) {
    return;
  }
  const value = String(text ?? "").trim();
  const isSvgElement = typeof SVGElement !== "undefined" && el instanceof SVGElement;
  const existingSvgTitle = isSvgElement
    ? Array.from(el.children || []).find((child) => child.tagName?.toLowerCase?.() === "title" && child.getAttribute("data-generated-tooltip") === "1")
    : null;
  el.removeAttribute("title");
  if (existingSvgTitle) {
    existingSvgTitle.remove();
  }
  if (!value) {
    el.removeAttribute("data-tooltip");
    return;
  }
  el.setAttribute("data-tooltip", value);
}

function normalizeTooltipDelayMs(value) {
  const numeric = Math.round(Number(value));
  return [0, 150, 300, 600, 1000].includes(numeric) ? numeric : 300;
}

function cancelTooltipTimers() {
  if (ui.tooltipShowTimer != null) {
    window.clearTimeout(ui.tooltipShowTimer);
    ui.tooltipShowTimer = null;
  }
  if (ui.tooltipHideTimer != null) {
    window.clearTimeout(ui.tooltipHideTimer);
    ui.tooltipHideTimer = null;
  }
}

function activeTooltipTarget(target) {
  if (!target || !(target instanceof Element)) {
    return null;
  }
  return target.closest("[data-node-tooltip], [data-tooltip]");
}

function nodeTooltipTarget(target) {
  if (!target || !(target instanceof Element)) {
    return null;
  }
  return target.closest("[data-node-tooltip][data-node-id]");
}

function hideAppTooltip() {
  cancelTooltipTimers();
  if (!appTooltip) {
    return;
  }
  appTooltip.classList.add("hidden");
  appTooltip.setAttribute("aria-hidden", "true");
  ui.tooltipTarget = null;
  ui.tooltipPointer = null;
}

function scheduleHideAppTooltip(delay = 90) {
  if (!appTooltip) {
    return;
  }
  if (ui.tooltipHideTimer != null) {
    window.clearTimeout(ui.tooltipHideTimer);
  }
  ui.tooltipHideTimer = window.setTimeout(() => {
    ui.tooltipHideTimer = null;
    hideAppTooltip();
  }, delay);
}

function positionAppTooltip(clientX, clientY) {
  if (!appTooltip || appTooltip.classList.contains("hidden")) {
    return;
  }
  const margin = 12;
  const cursorOffsetX = 20;
  const cursorOffsetY = 26;
  const rect = appTooltip.getBoundingClientRect();
  let left = clientX + cursorOffsetX;
  let top = clientY + cursorOffsetY;
  if (left + rect.width > window.innerWidth - margin) {
    left = window.innerWidth - rect.width - margin;
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = clientY - rect.height - cursorOffsetY;
  }
  if (left < margin) {
    left = margin;
  }
  if (top < margin) {
    top = margin;
  }
  appTooltip.style.left = `${Math.round(left)}px`;
  appTooltip.style.top = `${Math.round(top)}px`;
}

function showAppTooltip(target, clientX, clientY) {
  cancelTooltipTimers();
  if (!appTooltip || !target) {
    return;
  }
  const { text, tone } = tooltipInfoForTarget(target);
  if (!text) {
    hideAppTooltip();
    return;
  }
  applyTooltipState(text, tone);
  appTooltip.classList.remove("hidden");
  appTooltip.setAttribute("aria-hidden", "false");
  ui.tooltipTarget = target;
  ui.tooltipPointer = { x: clientX, y: clientY };
  positionAppTooltip(clientX, clientY);
}

function scheduleShowAppTooltip(target, clientX, clientY, delay = 280) {
  cancelTooltipTimers();
  if (!target) {
    return;
  }
  if (ui.tooltipDelayMs <= 0) {
    hideAppTooltip();
    return;
  }
  ui.tooltipShowTimer = window.setTimeout(() => {
    ui.tooltipShowTimer = null;
    showAppTooltip(target, clientX, clientY);
  }, normalizeTooltipDelayMs(delay));
}

function tooltipInfoForTarget(target) {
  if (!target) {
    return { text: "", tone: "" };
  }
  const nodeEl = nodeTooltipTarget(target);
  if (nodeEl) {
    // SVG data attributes are strings, whereas graph node identifiers are numeric.
    const node = getNodeById(Number(nodeEl.getAttribute("data-node-id")));
    return buildNodeTooltipText(node);
  }
  return { text: String(target.dataset.tooltip || "").trim(), tone: "" };
}

function applyTooltipState(text, tone = "") {
  if (!appTooltip) {
    return;
  }
  appTooltip.textContent = text;
  appTooltip.classList.remove("value", "error");
  if (tone) {
    appTooltip.classList.add(tone);
  }
}

function showNodeTooltip(node, target, clientX, clientY) {
  if (!appTooltip || !target || !node) {
    return;
  }
  const { text } = buildNodeTooltipText(node);
  if (!text) {
    hideAppTooltip();
    return;
  }
  setTooltipText(target, text);
  scheduleShowAppTooltip(target, clientX, clientY, ui.tooltipDelayMs);
}

function refreshNodeTooltipElement(target) {
  const nodeEl = nodeTooltipTarget(target);
  if (!nodeEl) {
    return;
  }
  const node = getNodeById(Number(nodeEl.getAttribute("data-node-id")));
  if (!node) {
    return;
  }
  setTooltipText(nodeEl, buildNodeTooltipText(node).text);
}

function refreshRenderedNodeTooltipElements() {
  const renderedNodes = document.querySelectorAll(".node[data-node-id]");
  renderedNodes.forEach((nodeEl) => {
    const node = getNodeById(String(nodeEl.getAttribute("data-node-id") || ""));
    if (!node) {
      return;
    }
    setTooltipText(nodeEl, buildNodeTooltipText(node).text);
  });
}

function refreshActiveTooltip() {
  if (!appTooltip || appTooltip.classList.contains("hidden") || !ui.tooltipTarget) {
    return;
  }
  const nodeId = nodeTooltipTarget(ui.tooltipTarget)?.getAttribute?.("data-node-id");
  let target = ui.tooltipTarget;
  if (nodeId) {
    target = document.querySelector(`.node[data-node-id="${CSS.escape(String(nodeId))}"]`) || target;
    ui.tooltipTarget = target;
  }
  refreshNodeTooltipElement(target);
  const { text, tone } = tooltipInfoForTarget(target);
  if (!text) {
    hideAppTooltip();
    return;
  }
  applyTooltipState(text, tone);
  const point = ui.tooltipPointer || { x: 24, y: 24 };
  positionAppTooltip(point.x, point.y);
}

function nodeExpressionTooltipKey(node) {
  if (!node) {
    return "tooltip.node.expressionBehavior";
  }
  if (node.shape === "diamond") {
    return "tooltip.node.expressionValue";
  }
  if (isStateNode(node)) {
    return "tooltip.node.expressionState";
  }
  return "tooltip.node.expressionBehavior";
}

function updateNodeExpressionTooltips(node = selectedNodeForSidebar()) {
  const key = nodeExpressionTooltipKey(node);
  const text = t(key);
  setTooltipText(nodeValueExprLabel, text);
  setTooltipText(nodeValueExprInput, text);
}

function hideExpressionStatus(statusEl) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = "";
  statusEl.classList.add("hidden");
  statusEl.classList.remove("ok", "error");
  if (statusEl === expressionEditorStatus && expressionStatusCopyBtn) {
    expressionStatusCopyBtn.classList.add("hidden");
  }
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
    if (statusEl === expressionEditorStatus && expressionStatusCopyBtn) {
      expressionStatusCopyBtn.classList.remove("hidden");
    }
    return;
  }
  statusEl.classList.add("error");
  statusEl.textContent = t("expr.syntaxError", {
    message: localizeExpressionErrorMessage(syntaxResult.message || t("error.evalReason.syntax")),
  });
  if (statusEl === expressionEditorStatus && expressionStatusCopyBtn) {
    expressionStatusCopyBtn.classList.remove("hidden");
  }
}

function localizeExpressionErrorMessage(message) {
  const raw = String(message ?? "").trim();
  if (!raw) {
    return t("error.evalReason.syntax");
  }
  const lower = raw.toLowerCase();
  if (["syntax", "syntaxerror"].includes(lower)) {
    return t("error.evalReason.syntax");
  }
  if (["runtime", "runtimeerror"].includes(lower)) {
    return t("error.evalReason.runtime");
  }
  if (["reference", "referenceerror"].includes(lower)) {
    return t("error.evalReason.reference");
  }
  if (["dependency"].includes(lower)) {
    return t("error.evalReason.dependency");
  }
  if (["type", "typeerror"].includes(lower)) {
    return t("error.evalReason.type");
  }
  if (lower === "readdata is only available in parameters") {
    return t("expr.error.readDataOnlyParameters");
  }
  if (lower === "readdata expects a string literal path") {
    return t("expr.error.readDataLiteralPath");
  }
  if (lower === "readdata path is invalid") {
    return t("expr.error.readDataPathInvalid");
  }
  if (lower === "readdata requires access to the model folder") {
    return t("expr.error.readDataModelFolderUnavailable");
  }
  const readDataUnavailableMatch = raw.match(/^readData file is unavailable: (.+)$/i);
  if (readDataUnavailableMatch) {
    return t("expr.error.readDataFileUnavailable", { path: readDataUnavailableMatch[1] });
  }
  if (lower === "readdata csv is empty") {
    return t("expr.error.readDataCsvEmpty");
  }
  if (lower === "readdata csv must be rectangular") {
    return t("expr.error.readDataCsvRectangular");
  }
  if (lower === "readdata csv contains an unterminated quoted field") {
    return t("expr.error.readDataCsvQuotedField");
  }
  const readDataNumericCellMatch = raw.match(/^readData CSV cell is not numeric at \[(\d+), (\d+)\]$/i);
  if (readDataNumericCellMatch) {
    return t("expr.error.readDataCsvNumericCell", {
      row: readDataNumericCellMatch[1],
      col: readDataNumericCellMatch[2],
    });
  }
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
  if (lower === "invalid number") {
    return t("expr.error.invalidNumber");
  }
  if (lower === "empty index") {
    return t("expr.error.emptyIndex");
  }
  if (lower === "empty index after ','") {
    return t("expr.error.emptyIndexAfterComma");
  }
  if (lower === "expected property name after '.'") {
    return t("expr.error.expectedPropertyAfterDot");
  }
  const notDefinedMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) is not defined$/);
  if (notDefinedMatch) {
    return t("expr.error.notDefined", { name: notDefinedMatch[1] });
  }
  const notCallableMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) is not callable$/);
  if (notCallableMatch) {
    return t("expr.error.notCallable", { name: notCallableMatch[1] });
  }
  const unavailableFunctionMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) is unavailable$/i);
  if (unavailableFunctionMatch) {
    return t("expr.error.functionUnavailable", { name: unavailableFunctionMatch[1] });
  }
  const expectsMatrixMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects a matrix$/i);
  if (expectsMatrixMatch) {
    return t("expr.error.expectsMatrix", { name: expectsMatrixMatch[1] });
  }
  const expectsRectMatrixMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects a rectangular matrix$/i);
  if (expectsRectMatrixMatch) {
    return t("expr.error.expectsRectangularMatrix", { name: expectsRectMatrixMatch[1] });
  }
  const expectsVectorMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects a non-empty vector$/i);
  if (expectsVectorMatch) {
    return t("expr.error.expectsNonEmptyVector", { name: expectsVectorMatch[1] });
  }
  const expectsVectorOrMatrixMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects a non-empty vector or matrix$/i);
  if (expectsVectorOrMatrixMatch) {
    return t("expr.error.expectsNonEmptyVectorOrMatrix", { name: expectsVectorOrMatrixMatch[1] });
  }
  const expectsNumericVectorOrMatrixMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects a non-empty numeric vector or matrix$/i);
  if (expectsNumericVectorOrMatrixMatch) {
    return t("expr.error.expectsNonEmptyNumericVectorOrMatrix", { name: expectsNumericVectorOrMatrixMatch[1] });
  }
  const expectsVectorOrMatrixGenericMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects a vector or matrix$/i);
  if (expectsVectorOrMatrixGenericMatch) {
    return t("expr.error.expectsVectorOrMatrix", { name: expectsVectorOrMatrixGenericMatch[1] });
  }
  const expectsVectorGenericMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects a vector$/i);
  if (expectsVectorGenericMatch) {
    return t("expr.error.expectsVector", { name: expectsVectorGenericMatch[1] });
  }
  const expectsOptionBoolMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects ([A-Za-z_$][A-Za-z0-9_$]*) to be true, false, 1, or 0$/i);
  if (expectsOptionBoolMatch) {
    return t("expr.error.expectsBooleanFlag", { name: expectsOptionBoolMatch[1], option: expectsOptionBoolMatch[2] });
  }
  const expectsFiniteMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) must be finite$/i);
  if (expectsFiniteMatch) {
    return t("expr.error.mustBeFinite", { name: expectsFiniteMatch[1] });
  }
  const expectsNArgsMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects exactly (\d+) arguments?$/i);
  if (expectsNArgsMatch) {
    return t("expr.error.expectsExactlyArgs", { name: expectsNArgsMatch[1], count: expectsNArgsMatch[2] });
  }
  const expectsRangeArgsMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects (\d+) to (\d+) arguments?$/i);
  if (expectsRangeArgsMatch) {
    return t("expr.error.expectsArgRange", { name: expectsRangeArgsMatch[1], min: expectsRangeArgsMatch[2], max: expectsRangeArgsMatch[3] });
  }
  const finiteBoundsMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects finite numeric bounds$/i);
  if (finiteBoundsMatch) {
    return t("expr.error.finiteNumericBounds", { name: finiteBoundsMatch[1] });
  }
  if (lower === "mode must be 0 (pdf), 1 (cdf), or 2 (icdf)") {
    return t("expr.error.distributionMode");
  }
  if (lower === "randint expects min <= max") {
    return t("expr.error.randIntBounds");
  }
  if (lower === "reduce on matrices requires an axis argument") {
    return t("expr.error.reduceMatrixAxis");
  }
  if (lower === "reduce expects an operator or function as first argument") {
    return t("expr.error.reduceOperator");
  }
  const expectsOptionsArgsMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects (.+) arguments?$/i);
  if (expectsOptionsArgsMatch) {
    const descriptions = {
      "0, 1, or 2": "expr.error.argumentList.0_1_2",
      "1 or 2": "expr.error.argumentList.1_2",
      "1, 2, or 3": "expr.error.argumentList.1_2_3",
      "2 or 3": "expr.error.argumentList.2_3",
    };
    const description = expectsOptionsArgsMatch[2].trim().toLowerCase();
    return t("expr.error.expectsArgsDescription", {
      name: expectsOptionsArgsMatch[1],
      description: descriptions[description] ? t(descriptions[description]) : expectsOptionsArgsMatch[2],
    });
  }
  if (lower === "probability must be in (0, 1)") {
    return t("expr.error.probabilityOpen01");
  }
  if (lower === "probability must be in [0, 1]") {
    return t("expr.error.probabilityClosed01");
  }
  if (lower === "probability must be in [0, 1)") {
    return t("expr.error.probabilityHalfOpen01");
  }
  if (lower === "sigma must be > 0") {
    return t("expr.error.sigmaPositive");
  }
  const closedUnitIntervalMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) must be in \[0, 1\]$/i);
  if (closedUnitIntervalMatch) {
    return t("expr.error.valueClosed01", { name: closedUnitIntervalMatch[1] });
  }
  const nonNegativeIntegerMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) must be a non-negative integer$/i);
  if (nonNegativeIntegerMatch) {
    return t("expr.error.mustBeNonNegativeInteger", { name: nonNegativeIntegerMatch[1] });
  }
  const signalArgsMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects cx, cy, and x$/i);
  if (signalArgsMatch) {
    return t("expr.error.signalArgs", { name: signalArgsMatch[1] });
  }
  const signalPointsMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects two numeric vectors of the same length, with at least two points$/i);
  if (signalPointsMatch) {
    return t("expr.error.signalControlPoints", { name: signalPointsMatch[1] });
  }
  const signalOrderMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) expects strictly increasing cx values$/i);
  if (signalOrderMatch) {
    return t("expr.error.signalControlPointsIncreasing", { name: signalOrderMatch[1] });
  }
  if (lower === "rate must be > 0") {
    return t("expr.error.ratePositive");
  }
  if (lower === "rate must be >= 0") {
    return t("expr.error.rateNonNegative");
  }
  if (lower === "max must be > min") {
    return t("expr.error.maxGreaterThanMin");
  }
  if (lower === "dt must be finite") {
    return t("expr.error.dtFinite");
  }
  if (lower === "range bounds must be finite numbers") {
    return t("expr.error.rangeBoundsFinite");
  }
  if (lower === "range step must be a non-zero finite number") {
    return t("expr.error.rangeStepNonZeroFinite");
  }
  if (lower === "range step does not reach the end value") {
    return t("expr.error.rangeStepNotReachEnd");
  }
  if (lower === "range is too large") {
    return t("expr.error.rangeTooLarge");
  }
  if (lower === "resize dimensions must be non-negative integers") {
    return t("expr.error.resizeDimensions");
  }
  if (lower === "resize does not support agent matrices") {
    return t("expr.error.resizeAgentMatrix");
  }
  if (lower === "array is too large") {
    return t("expr.error.arrayTooLarge");
  }
  if (lower === "array requires at least one dimension") {
    return t("expr.error.arrayNeedsDimension");
  }
  if (lower === "array expects at least one axis and an expression") {
    return t("expr.error.arrayNeedsAxisExpression");
  }
  const arrayDimMatch = raw.match(/^array dimension (\d+) must be a non-negative integer$/i);
  if (arrayDimMatch) {
    return t("expr.error.arrayDimensionNonNegative", { index: arrayDimMatch[1] });
  }
  const arrayAxisMatch = raw.match(/^array axis (\d+) must be a non-negative integer or a vector$/i);
  if (arrayAxisMatch) {
    return t("expr.error.arrayAxisIntegerOrVector", { index: arrayAxisMatch[1] });
  }
  if (lower === "array is a special expression form" || lower === "map is a special expression form" || lower === "filter is a special expression form" || lower === "reduce is a special expression form" || lower === "append is a special expression form") {
    return t("expr.error.specialForm");
  }
  if (lower === "getproperty is only available in node expressions") {
    return t("expr.error.getPropertyOnlyNode");
  }
  if (lower === "setproperty is only available in node expressions") {
    return t("expr.error.setPropertyOnlyNode");
  }
  if (lower === "getmodelproperty is unavailable") {
    return t("expr.error.getModelPropertyUnavailable");
  }
  if (lower === "setmodelproperty is unavailable") {
    return t("expr.error.setModelPropertyUnavailable");
  }
  if (lower === "integral is only available in state node expressions") {
    return t("expr.error.integralOnlyStateNode");
  }
  if (lower === "empty integral expression") {
    return t("expr.error.emptyIntegralExpression");
  }
  if (lower === "integral derivative is unavailable") {
    return t("expr.error.integralDerivativeUnavailable");
  }
  if (lower === "integral value is unavailable") {
    return t("expr.error.integralValueUnavailable");
  }
  if (lower === "integral requires matching numeric state and derivative") {
    return t("expr.error.integralStateDerivativeMismatch");
  }
  if (lower === "operator arguments must have matching shapes" || lower === "function arguments must have matching shapes" || lower === "if arguments must have matching shapes" || lower === "tensor shape mismatch") {
    return t("expr.error.matchingShapes");
  }
  if (lower === "if expects an odd number of arguments: condition, value pairs, and a default value") {
    return t("expr.error.ifOddArgs");
  }
  if (lower === "slice bounds must be integers") {
    return t("expr.error.sliceBoundsIntegers");
  }
  if (lower === "slice step must be a non-zero integer") {
    return t("expr.error.sliceStepNonZeroInteger");
  }
  if (lower === "indexing requires an array or matrix" || lower === "slicing requires an array or matrix") {
    return t("expr.error.indexingArrayOrMatrix");
  }
  if (lower === "matrix index must be a pair of integers") {
    return t("expr.error.matrixIndexPair");
  }
  if (lower === "matrix index requires a matrix target") {
    return t("expr.error.matrixIndexMatrixTarget");
  }
  if (lower === "matrix row index out of range") {
    return t("expr.error.matrixRowOutOfRange");
  }
  if (lower === "matrix column index out of range") {
    return t("expr.error.matrixColOutOfRange");
  }
  if (lower === "array index must be an integer or a [row, col] pair") {
    return t("expr.error.arrayIndexIntegerOrPair");
  }
  if (lower === "array index must be an integer or a vector of integers") {
    return t("expr.error.arrayIndexIntegerOrVector");
  }
  if (lower === "array index must be an integer") {
    return t("expr.error.arrayIndexInteger");
  }
  if (lower === "array index out of range") {
    return t("expr.error.arrayIndexOutOfRange");
  }
  if (lower === "member access requires an object or array") {
    return t("expr.error.memberAccessObjectOrArray");
  }
  if (lower === "missing reduce operator") {
    return t("expr.error.missingReduceOperator");
  }
  if (lower === "invalid reducer") {
    return t("expr.error.invalidReducer");
  }
  const reducerCallableMatch = raw.match(/^([A-Za-z_$][A-Za-z0-9_$]*) is not callable$/i);
  if (reducerCallableMatch) {
    return t("expr.error.notCallable", { name: reducerCallableMatch[1] });
  }
  if (lower === "reduce expects a vector or matrix" || lower === "sum expects a vector or matrix" || lower === "count expects a vector or matrix" || lower === "indiceswhere expects a vector or matrix" || lower === "size expects a vector or matrix" || lower === "average expects a vector or matrix" || lower === "stdev expects a vector or matrix" || lower === "resize expects a vector or matrix") {
    const fn = raw.split(" ")[0];
    return t("expr.error.expectsVectorOrMatrix", { name: fn });
  }
  if (lower === "flatten expects a matrix" || lower === "neighbors expects a matrix") {
    const fn = raw.split(" ")[0];
    return t("expr.error.expectsMatrix", { name: fn });
  }
  if (lower === "sum expects a rectangular numeric matrix" || lower === "average expects a rectangular numeric matrix" || lower === "stdev expects a rectangular numeric matrix") {
    const fn = raw.split(" ")[0];
    return t("expr.error.expectsRectangularNumericMatrix", { name: fn });
  }
  if (lower === "count expects a rectangular matrix" || lower === "indiceswhere expects a rectangular matrix" || lower === "removeat expects a rectangular matrix" || lower === "setat expects a rectangular matrix" || lower === "size expects a rectangular matrix" || lower === "neighbors expects a rectangular matrix") {
    const fn = raw.split(" ")[0];
    return t("expr.error.expectsRectangularMatrix", { name: fn });
  }
  if (lower === "sum axis for matrices must be 0 or 1" || lower === "count axis for matrices must be 0 or 1" || lower === "size axis for matrices must be 0 or 1" || lower === "average axis for matrices must be 0 or 1" || lower === "stdev axis for matrices must be 0 or 1" || lower === "removeat axis for matrices must be 0 or 1" || lower === "reduce matrix axis must be 0 or 1") {
    const fn = raw.split(" ")[0];
    return t("expr.error.axisZeroOrOne", { name: fn });
  }
  if (lower === "size axis for vectors must be 0") {
    return t("expr.error.vectorAxisZero", { name: "size" });
  }
  if (lower === "reduce axis requires a matrix") {
    return t("expr.error.axisRequiresMatrix", { name: "reduce" });
  }
  if (lower === "reduce axis requires a rectangular matrix") {
    return t("expr.error.axisRequiresRectangularMatrix", { name: "reduce" });
  }
  if (lower === "reduce requires a non-empty vector when no initial value is provided") {
    return t("expr.error.reduceNeedsNonEmptyVector");
  }
  if (
    lower === "append expects a vector or matrix as first argument"
    || lower === "append requires a vector or matrix as first argument"
    || lower === "append expects a vector or matrix as first argument, or a scalar followed by a vector"
  ) {
    return t("expr.error.appendArguments");
  }
  if (lower === "append expects at least 2 arguments") {
    return t("expr.error.appendMinArguments");
  }
  if (lower === "append on matrices expects a vector row as second argument") {
    return t("expr.error.appendSecondArgVectorRow");
  }
  if (lower === "append matrix axis must be 0 or 1") {
    return t("expr.error.appendAxis");
  }
  if (lower === "append on matrices axis 1 expects a vector column") {
    return t("expr.error.appendColumnVector");
  }
  if (lower === "appended column length does not match matrix row count") {
    return t("expr.error.appendColumnLength");
  }
  if (lower === "append axis 1 is not supported for agent matrices") {
    return t("expr.error.appendAgentColumn");
  }
  if (lower === "append requires a rectangular matrix") {
    return t("expr.error.expectsRectangularMatrix", { name: "append" });
  }
  if (lower === "appended row length does not match matrix column count") {
    return t("expr.error.appendRowLength");
  }
  if (lower === "set expects a vector") {
    return t("expr.error.expectsVector", { name: "set" });
  }
  if (lower === "union expects two vectors" || lower === "intersection expects two vectors") {
    const fn = raw.split(" ")[0];
    return t("expr.error.expectsTwoVectors", { name: fn });
  }
  if (lower === "setat expects a vector or matrix" || lower === "removeat expects a vector or matrix") {
    const fn = raw.split(" ")[0];
    return t("expr.error.expectsVectorOrMatrix", { name: fn });
  }
  if (lower === "setat expects [row, col] for matrix cell replacement") {
    return t("expr.error.setAtPair");
  }
  if (lower === "setat expects a row vector with matching length") {
    return t("expr.error.setAtRowVe…107785 tokens truncated…terLoad();
  let ready = await ensureSubmodelTemplatesReady({ allowPrompt: false });
  if (!ready) {
    const hasSubmodels = graph.nodes.some((node) => isSubmodelNode(node) && String(node.modelPath ?? "").trim());
    if (hasSubmodels && !currentModelDirectoryHandle && (supportsDirectoryInputSelection() || supportsDirectoryPicker())) {
      try {
        await ensureCurrentModelDirectoryHandle();
        await preloadSubmodelsAfterLoad();
        ready = await ensureSubmodelTemplatesReady({ allowPrompt: false });
      } catch (_err) {
        ready = false;
      }
    }
  }
  if (!ready) {
    return false;
  }
  try {
    await prepareReadDataCachesForModelTree(graph);
  } catch (err) {
    setStatus(localizeExpressionErrorMessage(String(err?.message || "")), true);
    return false;
  }
  return ready;
}

async function executeOneStep(restartIfEnded = true) {
  return runtimeController.executeOneStep(restartIfEnded);
}

async function executeNodeExpressions() {
  await runtimeController.executeAll();
}

function rustEngineNumericExpression(value, path = "input") {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rustEngineNumericExpression(entry, `${path}[${index}]`));
    return JSON.stringify(value);
  }
  throw new Error(`Rust engine requires a finite numeric value at ${path}`);
}

function buildRustEngineModelDocument() {
  applyWidgetDrivenNodeValues();
  const modelDocument = exportGraphData();
  const supportedTypes = new Set(["parameter", "algebraic", "state"]);
  const unsupportedNode = modelDocument.nodes.find((node) => !supportedTypes.has(String(node?.type ?? "")));
  if (unsupportedNode) {
    throw new Error(t("error.rustEngineUnsupportedNode", {
      name: unsupportedNode.name || unsupportedNode.id,
      type: unsupportedNode.type || "unknown",
    }));
  }

  const runtimeNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  modelDocument.nodes.forEach((node) => {
    const runtimeNode = runtimeNodes.get(node.id);
    if (!runtimeNode?.externalValueEnabled || !["parameter", "algebraic"].includes(node.type)) {
      return;
    }
    node.valueExpression = rustEngineNumericExpression(
      runtimeNode.externalValue,
      `node ${runtimeNode.name}`,
    );
  });
  return modelDocument;
}

function applyRustEngineSnapshot(snapshot, nodeMap) {
  const values = snapshot?.values || {};
  graph.nodes.forEach((node) => {
    if (!Object.prototype.hasOwnProperty.call(values, node.name)) {
      node.computedValue = null;
      node.computedError = "";
      return;
    }
    node.computedValue = cloneSimulationOutputValue(values[node.name]);
    node.computedError = "";
    node.pendingStateValue = null;
    node.pendingStateError = "";
  });
  graph.execution.currentTime = Number(snapshot.time);
  updateTableWidgetsFromComputedValues(snapshot.time, nodeMap);
  updateXYWidgetsFromComputedValues(snapshot.time, nodeMap);
  recordSimulationOutputSnapshot(snapshot.time);
}

async function executeModelWithRustEngine() {
  if (!rustEngineAdapter || isEditingUiLocked()) {
    return;
  }
  if (!enforceStrictDefinitionsIfNeeded()) {
    return;
  }
  if (ensureDebugConfig(graph).breakpointEnabled) {
    setStatusKey("error.rustEngineBreakpoint");
    return;
  }

  stopTimedExecution(false);
  setFullExecutionRunning(true);
  setStatusKey("status.rustEngineLoading");
  try {
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    const modelDocument = buildRustEngineModelDocument();
    await rustEngineAdapter.load();
    const startedAt = performance.now();
    const result = await rustEngineAdapter.executeModel(modelDocument);

    clearAllXYChartPoints();
    clearAllTableWidgetRows();
    clearSimulationOutputHistory();
    const nodeMap = buildNodeNameMap();
    result.snapshots.forEach((snapshot) => applyRustEngineSnapshot(snapshot, nodeMap));
    const finalSnapshot = result.snapshots[result.snapshots.length - 1];
    graph.execution.currentTime = Number(finalSnapshot.time);
    refreshRuntimeView();
    updateExecutionProgress(finalSnapshot.time);
    setStatusKey("status.rustEvalDoneTime", {
      count: result.nodeCount,
      steps: result.snapshots.length,
      duration: formatExecutionDuration(performance.now() - startedAt),
    });
  } catch (error) {
    const message = typeof error === "string"
      ? error
      : String(error?.message || error || t("error.evalReason.runtime"));
    setStatus(t("error.rustEngineFailed", { message }), true);
  } finally {
    setFullExecutionRunning(false);
  }
}

async function runManualStep() {
  await runtimeController.runManualStep();
}

async function resetExecution() {
  await runtimeController.resetExecution();
}

async function toggleTimedExecution() {
  await runtimeController.toggleTimedExecution();
}

window.addEventListener("pointermove", (evt) => {
  if (ui.touchHold && evt.pointerId === ui.touchHold.pointerId) {
    ui.touchHold.lastClientX = evt.clientX;
    ui.touchHold.lastClientY = evt.clientY;
    if (
      Math.hypot(
        evt.clientX - ui.touchHold.startClientX,
        evt.clientY - ui.touchHold.startClientY,
      ) > ui.touchHold.moveTolerance
    ) {
      clearTouchHold();
    }
  }
  if (ui.tabletSidebarDrag && evt.pointerId === ui.tabletSidebarDrag.pointerId) {
    return;
  }
  if (ui.modalDrag && evt.pointerId === ui.modalDrag.pointerId) {
    const card = ui.modalDrag.card;
    if (card) {
      card.style.transform = "none";
      card.style.left = `${evt.clientX - ui.modalDrag.offsetX}px`;
      card.style.top = `${evt.clientY - ui.modalDrag.offsetY}px`;
    }
    return;
  }
  if (handleCompactTouchViewportPointerMove(evt)) {
    return;
  }
  if (ui.modalResize && evt.pointerId === ui.modalResize.pointerId) {
    const card = ui.modalResize.card;
    if (card) {
      const nextWidth = clamp(ui.modalResize.startWidth + (evt.clientX - ui.modalResize.startClientX), 780, window.innerWidth - 20);
      const nextHeight = clamp(ui.modalResize.startHeight + (evt.clientY - ui.modalResize.startClientY), 420, window.innerHeight - 20);
      card.style.transform = "none";
      card.style.left = `${ui.modalResize.startLeft}px`;
      card.style.top = `${ui.modalResize.startTop}px`;
      card.style.width = `${nextWidth}px`;
      card.style.height = `${nextHeight}px`;
    }
    return;
  }
  if (ui.dashboardDrag && evt.pointerId === ui.dashboardDrag.pointerId) {
    const dashboard = graph.dashboard;
    if (dashboard) {
      const z = Math.max(0.0001, ui.zoom || 1);
      const dx = (evt.clientX - ui.dashboardDrag.startClientX) / z;
      const dy = (evt.clientY - ui.dashboardDrag.startClientY) / z;
      dashboard.x = ui.snapToGrid ? snap(ui.dashboardDrag.startX + dx) : ui.dashboardDrag.startX + dx;
      dashboard.y = ui.snapToGrid ? snap(ui.dashboardDrag.startY + dy) : ui.dashboardDrag.startY + dy;
      render();
    }
    return;
  }
  if (ui.dashboardResize && evt.pointerId === ui.dashboardResize.pointerId) {
    const dashboard = graph.dashboard;
    if (dashboard) {
      const z = Math.max(0.0001, ui.zoom || 1);
      const dx = (evt.clientX - ui.dashboardResize.startClientX) / z;
      const dy = (evt.clientY - ui.dashboardResize.startClientY) / z;
      dashboard.width = clamp(ui.dashboardResize.startWidth + dx, 320, 1600);
      dashboard.height = clamp(ui.dashboardResize.startHeight + dy, 220, 1200);
      render();
    }
    return;
  }
  if (ui.widgetDrag && evt.pointerId === ui.widgetDrag.pointerId) {
    const widget = graph.widgets.find((w) => w.id === ui.widgetDrag.widgetId);
    if (widget) {
      const z = Math.max(0.0001, ui.zoom || 1);
      const dx = (evt.clientX - ui.widgetDrag.startClientX) / z;
      const dy = (evt.clientY - ui.widgetDrag.startClientY) / z;
      const dragSnap = ui.snapToGrid && !ui.widgetDrag.snapOnRelease;
      widget.x = dragSnap ? snap(ui.widgetDrag.startX + dx) : ui.widgetDrag.startX + dx;
      widget.y = dragSnap ? snap(ui.widgetDrag.startY + dy) : ui.widgetDrag.startY + dy;
      updateDashboardDropState(widget);
      if (!refreshWidgetFrame(widget)) {
        renderWidgets();
      }
    }
    return;
  }
  if (ui.widgetResize && evt.pointerId === ui.widgetResize.pointerId) {
    const widget = graph.widgets.find((w) => w.id === ui.widgetResize.widgetId);
    if (widget) {
      const z = Math.max(0.0001, ui.zoom || 1);
      const dx = (evt.clientX - ui.widgetResize.startClientX) / z;
      const dy = (evt.clientY - ui.widgetResize.startClientY) / z;
      const nextWidth = ui.snapToGrid ? snap(ui.widgetResize.startWidth + dx) : ui.widgetResize.startWidth + dx;
      const nextHeight = ui.snapToGrid ? snap(ui.widgetResize.startHeight + dy) : ui.widgetResize.startHeight + dy;
      const minSize = widgetMinDimensions(widget);
      widget.width = clamp(nextWidth, minSize.width, 1200);
      widget.height = clamp(nextHeight, minSize.height, 900);
      if (!refreshWidgetFrame(widget)) {
        renderWidgets();
      }
    }
    return;
  }
  if (ui.textDrag && evt.pointerId === ui.textDrag.pointerId) {
    const item = getTextItemById(ui.textDrag.id);
    if (item) {
      const delta = worldDeltaFromClientDelta(
        evt.clientX - ui.textDrag.startClientX,
        evt.clientY - ui.textDrag.startClientY,
      );
      item.x = ui.snapToGrid ? snap(ui.textDrag.startX + delta.x) : ui.textDrag.startX + delta.x;
      item.y = ui.snapToGrid ? snap(ui.textDrag.startY + delta.y) : ui.textDrag.startY + delta.y;
      updateDashboardDropState(item);
      render();
    }
    return;
  }
  if (ui.textResize && evt.pointerId === ui.textResize.pointerId) {
    const item = getTextItemById(ui.textResize.id);
    if (item) {
      const delta = worldDeltaFromClientDelta(
        evt.clientX - ui.textResize.startClientX,
        evt.clientY - ui.textResize.startClientY,
      );
      item.width = clamp(ui.snapToGrid ? snap(ui.textResize.startWidth + delta.x) : ui.textResize.startWidth + delta.x, 40, 1200);
      item.height = clamp(ui.snapToGrid ? snap(ui.textResize.startHeight + delta.y) : ui.textResize.startHeight + delta.y, 24, 1200);
      render();
    }
    return;
  }

  const pRaw = svgPoint(evt);
  const p = snapPoint(pRaw);
  const hoverNodeId = nodeIdAtGraphPoint(pRaw);
  const hoverNode = hoverNodeId != null ? getNodeById(hoverNodeId) : null;
  const hoverPort = hoverNode ? nodeEdgePortPosition(hoverNode) : null;
  const hoverNearPort = Boolean(
    hoverNode
    && ui.selectedNodes.size === 1
    && ui.selectedNodes.has(hoverNode.id)
    && Math.hypot(pRaw.x - hoverPort.x, pRaw.y - hoverPort.y) <= nodeEdgePortRadius(hoverNode),
  );

  if (!ui.drag && !ui.resize && !ui.edgeCreate && !ui.controlPointDrag && !ui.marquee && !ui.textDrag && !ui.textResize) {
    if (hoverNearPort) {
      svg.style.cursor = "crosshair";
    } else if (hoverNode) {
      svg.style.cursor = "grab";
    } else {
      svg.style.cursor = "";
    }
  }

  if (ui.drag && evt.pointerId === ui.drag.pointerId) {
    const delta = worldDeltaFromClientDelta(
      evt.clientX - ui.drag.startClientX,
      evt.clientY - ui.drag.startClientY,
    );
    const rawDx = delta.x;
    const rawDy = delta.y;
    let dx = rawDx;
    let dy = rawDy;
    if (ui.snapToGrid) {
      const anchorStart = ui.drag.startMap.get(ui.drag.anchorNodeId);
      if (anchorStart) {
        dx = snap(anchorStart.x + rawDx) - anchorStart.x;
        dy = snap(anchorStart.y + rawDy) - anchorStart.y;
      }
    }
    ui.drag.nodeIds.forEach((id) => {
      const node = getNodeById(id);
      const start = ui.drag.startMap.get(id);
      if (node && start) {
        node.x = ui.snapToGrid ? start.x + dx : start.x + dx;
        node.y = ui.snapToGrid ? start.y + dy : start.y + dy;
      }
    });
    ui.drag.edgeControlStartMap.forEach((cpStart, edgeId) => {
      const edge = getEdgeById(edgeId);
      if (!edge) {
        return;
      }
      edge.controlPoints = cpStart.map((cp) => ({
        x: ui.snapToGrid ? cp.x + dx : cp.x + dx,
        y: ui.snapToGrid ? cp.y + dy : cp.y + dy,
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
  const hoverPort = hoverNode ? nodeEdgePortPosition(hoverNode) : null;
  const hoverNearPort = Boolean(
    hoverNode
    && ui.selectedNodes.size === 1
    && ui.selectedNodes.has(hoverNode.id)
    && Math.hypot(pRaw.x - hoverPort.x, pRaw.y - hoverPort.y) <= nodeEdgePortRadius(hoverNode),
  );

  if (!ui.drag && !ui.resize && !ui.edgeCreate && !ui.controlPointDrag && !ui.marquee) {
    if (hoverNearPort) {
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
  const touchHoldTriggered = ui.touchHold?.pointerId === evt.pointerId && ui.touchHold.triggered;
  if (ui.touchHold?.pointerId === evt.pointerId) {
    clearTouchHold();
  }
  if (touchHoldTriggered) {
    return;
  }
  handleCompactTouchViewportPointerEnd(evt);
  if (ui.tabletSidebarDrag && evt.pointerId === ui.tabletSidebarDrag.pointerId) {
    const deltaY = evt.clientY - ui.tabletSidebarDrag.startClientY;
    const wasExpanded = ui.tabletSidebarDrag.startExpanded;
    ui.tabletSidebarDrag = null;
    if (deltaY < -26) {
      setTabletSidebarExpanded(true);
    } else if (deltaY > 36) {
      if (wasExpanded) {
        setTabletSidebarExpanded(false);
      } else {
        setTabletSidebarOpen(false);
      }
    }
    return;
  }
  let needsRender = false;

  if (ui.modalDrag && evt.pointerId === ui.modalDrag.pointerId) {
    ui.modalDrag = null;
  }
  if (ui.modalResize && evt.pointerId === ui.modalResize.pointerId) {
    ui.modalResize = null;
  }

  if (ui.dashboardDrag && evt.pointerId === ui.dashboardDrag.pointerId) {
    const dashboard = graph.dashboard;
    const moved = dashboard && (dashboard.x !== ui.dashboardDrag.startX || dashboard.y !== ui.dashboardDrag.startY);
    ui.dashboardDrag = null;
    commitTransaction();
    needsRender = Boolean(moved);
  }

  if (ui.dashboardResize && evt.pointerId === ui.dashboardResize.pointerId) {
    const dashboard = graph.dashboard;
    const resized = dashboard && (
      dashboard.width !== ui.dashboardResize.startWidth || dashboard.height !== ui.dashboardResize.startHeight
    );
    ui.dashboardResize = null;
    commitTransaction();
    needsRender = needsRender || Boolean(resized);
  }

  if (ui.widgetDrag && evt.pointerId === ui.widgetDrag.pointerId) {
    const widget = graph.widgets.find((w) => w.id === ui.widgetDrag.widgetId);
    if (widget && ui.widgetDrag.snapOnRelease && ui.snapToGrid) {
      widget.x = snap(widget.x);
      widget.y = snap(widget.y);
    }
    const droppedInDashboard = widget && dropItemIntoActiveDashboardPage(widget);
    ui.dashboardDropState = null;
    const moved = widget && (widget.x !== ui.widgetDrag.startX || widget.y !== ui.widgetDrag.startY);
    ui.widgetDrag = null;
    commitTransaction();
    if (moved || droppedInDashboard) {
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

  if (ui.textDrag && evt.pointerId === ui.textDrag.pointerId) {
    const item = getTextItemById(ui.textDrag.id);
    const droppedInDashboard = item && dropItemIntoActiveDashboardPage(item);
    ui.dashboardDropState = null;
    const moved =
      item &&
      (item.x !== ui.textDrag.startX || item.y !== ui.textDrag.startY);
    const releasedTextId = ui.textDrag.id;
    ui.textDrag = null;
    commitTransaction();
    if (moved || droppedInDashboard) {
      setStatusKey("status.textMoved");
      ui.lastTextActivate = null;
    } else if (releasedTextId != null) {
      const now = Date.now();
      if (ui.lastTextActivate && ui.lastTextActivate.id === releasedTextId && now - ui.lastTextActivate.time <= 360) {
        ui.lastTextActivate = null;
        if (!(ui.selected?.type === "text" && ui.selected.id === releasedTextId)) {
          selectTextItem(releasedTextId);
        }
        openTextEditor();
      } else {
        ui.lastTextActivate = { id: releasedTextId, time: now };
      }
    }
    needsRender = true;
  }

  if (ui.textResize && evt.pointerId === ui.textResize.pointerId) {
    const item = getTextItemById(ui.textResize.id);
    const resized =
      item &&
      (item.width !== ui.textResize.startWidth || item.height !== ui.textResize.startHeight);
    ui.textResize = null;
    commitTransaction();
    if (resized) {
      setStatusKey("status.textResized");
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
  if (!ui.drag && !ui.resize && !ui.edgeCreate && !ui.controlPointDrag && !ui.marquee && !ui.widgetDrag && !ui.widgetResize && !ui.textDrag && !ui.textResize) {
    svg.style.cursor = "";
  }
});

window.addEventListener("pointercancel", (evt) => {
  if (ui.touchHold?.pointerId === evt.pointerId) {
    clearTouchHold();
  }
  handleCompactTouchViewportPointerEnd(evt);
  if ((ui.widgetDrag && evt.pointerId === ui.widgetDrag.pointerId) || (ui.textDrag && evt.pointerId === ui.textDrag.pointerId)) {
    ui.dashboardDropState = null;
    render();
  }
  if (ui.tabletSidebarDrag && evt.pointerId === ui.tabletSidebarDrag.pointerId) {
    ui.tabletSidebarDrag = null;
  }
});

window.addEventListener("mouseup", (evt) => {
  if (!ui.edgeCreate) {
    return;
  }
  finishEdgeCreateFromClient(evt.clientX, evt.clientY);
});

svg.addEventListener("pointerleave", () => {
  ui.edgeCreateHoverId = null;
  ui.edgeCreateLastPoint = null;
  if (!ui.drag && !ui.resize && !ui.controlPointDrag && !ui.edgeCreate && !ui.marquee && !ui.widgetDrag && !ui.widgetResize && !ui.textDrag && !ui.textResize) {
    svg.style.cursor = "";
  }
});

svg.addEventListener("pointerdown", (evt) => {
  hideContextMenu();
  if (isTabletCanvasPanMode()) {
    return;
  }
  if (isCompactTouchPointerEvent(evt)) {
    if (evt.target === svg) {
      closeTopMenus();
      clearAllSelection();
      render();
    }
    return;
  }
  ui.lastNodeActivate = null;
  if (evt.target !== svg) {
    return;
  }
  if (evt.button !== 0) {
    return;
  }

  // Avoid the native SVG selection drag, notably visible in WebKit on macOS.
  evt.preventDefault();

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

svg.addEventListener("selectstart", (evt) => {
  evt.preventDefault();
});

svg.addEventListener("dragstart", (evt) => {
  evt.preventDefault();
});

[graphViewport, canvasContent].forEach((el) => {
  el?.addEventListener("pointerdown", (evt) => {
    if (!evt.target.closest?.(".node")) {
      ui.lastNodeActivate = null;
    }
    if (evt.target.closest?.(".node, .canvas-text-item, .edge, .st-widget, .menu-bar, .sidebar, .context-menu, svg")) {
      return;
    }
    hideContextMenu();
    closeTopMenus();
    clearAllSelection();
    render();
  });
});

graphViewport.addEventListener("pointerdown", (evt) => {
  if (isCompactTouchPointerEvent(evt) && isBackgroundTouchCanvasTarget(evt.target)) {
    hideContextMenu();
    closeTopMenus();
    clearAllSelection();
    render();
  }
  handleCompactTouchViewportPointerDown(evt);
}, { passive: false });

svg.addEventListener("contextmenu", (evt) => {
  const onNode = evt.target.closest?.(".node");
  const onText = evt.target.closest?.(".canvas-text-item");
  if (onNode || onText) {
    return;
  }
  evt.preventDefault();
  openBackgroundContextMenu(evt);
});

[graphViewport, canvasContent].forEach((el) => {
  el?.addEventListener("contextmenu", (evt) => {
    if (evt.target.closest?.(".node, .canvas-text-item, .edge, .st-widget, .context-menu")) {
      return;
    }
    evt.preventDefault();
    openBackgroundContextMenu(evt);
  });
});

getMenuUi().bindInteractions(recentModelsMenuBtn);

if (addDraftNodeItem) {
  addDraftNodeItem.addEventListener("click", () => {
    runAction(() => {
      addNode("draft");
    });
    setStatusKey("status.nodeCreated");
  });
}

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

if (addSubmodelNodeItem) {
  addSubmodelNodeItem.addEventListener("click", () => {
    runAction(() => {
      addNode("submodel");
    });
    setStatusKey("status.nodeCreated");
  });
}

if (addTextItem) {
  addTextItem.addEventListener("click", () => {
    runAction(() => {
      addCanvasText();
    });
    setStatusKey("status.textCreated");
  });
}

if (addButtonWidgetItem) {
  addButtonWidgetItem.addEventListener("click", () => {
    runAction(() => {
      addButtonWidget();
    });
    setStatusKey("status.widgetButtonCreated");
  });
}

if (addSelectWidgetItem) {
  addSelectWidgetItem.addEventListener("click", () => {
    runAction(() => {
      addSelectWidget();
    });
    setStatusKey("status.widgetSelectCreated");
  });
}

if (addLedWidgetItem) {
  addLedWidgetItem.addEventListener("click", () => {
    runAction(() => {
      addLedWidget();
    });
    setStatusKey("status.widgetLedCreated");
  });
}

if (addTextWidgetItem) {
  addTextWidgetItem.addEventListener("click", () => {
    runAction(() => {
      addTextWidget();
    });
    setStatusKey("status.widgetTextCreated");
  });
}

addSliderWidgetItem.addEventListener("click", () => {
  runAction(() => {
    addSliderWidget();
  });
  setStatusKey("status.widgetSliderCreated");
});

addNumericWidgetItem?.addEventListener("click", () => {
  runAction(() => {
    addNumericWidget();
  });
  setStatusKey("status.widgetNumericCreated");
});

addMatrixWidgetItem.addEventListener("click", () => {
  runAction(() => {
    addMatrixWidget();
  });
  setStatusKey("status.widgetMatrixCreated");
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

if (zoomRangeInput) {
  zoomRangeInput.addEventListener("input", () => {
    applyZoom(Number(zoomRangeInput.value) / 100);
  });
}
if (managePresentationGroupsItem) {
  managePresentationGroupsItem.addEventListener("click", openPresentationGroupsEditor);
}
if (feedbackLoopsItem) {
  feedbackLoopsItem.addEventListener("click", () => {
    closeTopMenus();
    openFeedbackLoops();
  });
}
if (viewOptionsItem) {
  viewOptionsItem.addEventListener("click", openViewOptions);
}
if (modelNotesItem) {
  modelNotesItem.addEventListener("click", () => {
    closeTopMenus();
    openModelNotes();
  });
}
if (unitDefinitionsItem) {
  unitDefinitionsItem.addEventListener("click", () => {
    closeTopMenus();
    openUnitDefinitions();
  });
}
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
  runFullModelBtn.addEventListener("click", () => {
    void executeNodeExpressions();
  });
}
if (runRustEngineBtn) {
  runRustEngineBtn.addEventListener("click", () => {
    void executeModelWithRustEngine();
  });
}
if (topRunEvalBtn) {
  topRunEvalBtn.addEventListener("click", () => {
    void executeNodeExpressions();
  });
}
if (topRunStepBtn) {
  topRunStepBtn.addEventListener("click", () => {
    void runManualStep();
  });
}
function bindTimedExecutionToggle(button) {
  if (!button) {
    return;
  }
  let lastPointerActivationAt = -Infinity;
  const activate = () => {
    void toggleTimedExecution();
  };

  // WebKit can lose a click while a timed execution refreshes the toolbar.
  // Pointer activation keeps the stop command responsive in the Tauri shell.
  button.addEventListener("pointerup", (evt) => {
    if (!evt.pointerType) {
      return;
    }
    lastPointerActivationAt = performance.now();
    evt.preventDefault();
    activate();
  });
  button.addEventListener("click", (evt) => {
    if (performance.now() - lastPointerActivationAt < 600) {
      evt.preventDefault();
      return;
    }
    activate();
  });
}

bindTimedExecutionToggle(topRunTimedBtn);
if (topRunResetBtn) {
  topRunResetBtn.addEventListener("click", resetExecution);
}
if (tabletFitBtn) {
  tabletFitBtn.addEventListener("click", fitToContent);
}
if (tabletModeBtn) {
  tabletModeBtn.addEventListener("click", () => {
    setTabletCanvasMode(ui.tabletCanvasMode === "pan" ? "edit" : "pan");
  });
}
if (tabletRunBtn) {
  tabletRunBtn.addEventListener("click", () => {
    void executeNodeExpressions();
  });
}
if (tabletStepBtn) {
  tabletStepBtn.addEventListener("click", () => {
    void runManualStep();
  });
}
bindTimedExecutionToggle(tabletTimedBtn);
if (tabletResetBtn) {
  tabletResetBtn.addEventListener("click", resetExecution);
}
runEvalBtn.addEventListener("click", () => {
  void executeNodeExpressions();
});
runStepBtn.addEventListener("click", () => {
  void runManualStep();
});
bindTimedExecutionToggle(runTimedToggleBtn);
runResetBtn.addEventListener("click", resetExecution);

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
if (selectAllBtn) {
  selectAllBtn.addEventListener("click", selectAllNodes);
}
if (renameNodeBtn) {
  renameNodeBtn.addEventListener("click", activateRenameSelectionAction);
}
if (editNodeExpressionBtn) {
  editNodeExpressionBtn.addEventListener("click", editSelectedNodeExpression);
}
deleteBtn.addEventListener("click", removeSelected);
cutBtn.addEventListener("click", cutSelectionToClipboard);
copyBtn.addEventListener("click", copySelectionToClipboard);
pasteBtn.addEventListener("click", pasteFromClipboard);
newGraphBtn.addEventListener("click", () => {
  void createNewGraph();
});
saveJsonBtn.addEventListener("click", () => saveGraphJson(false));
saveAsJsonBtn.addEventListener("click", () => saveGraphJson(true));
if (closeModelBtn) {
  closeModelBtn.addEventListener("click", () => {
    closeTopMenus();
    void closeActiveWorkspaceTab();
  });
}
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", () => {
    closeTopMenus();
    void exportSimulationCsv();
  });
}
loadJsonBtn.addEventListener("click", openGraphJson);
if (newTabBtn) {
  newTabBtn.addEventListener("click", () => {
    void createNewGraph();
  });
}
snapToGridInput.addEventListener("change", () => {
  ui.snapToGrid = snapToGridInput.checked;
  setStatusKey(ui.snapToGrid ? "status.snapOn" : "status.snapOff");
});

if (showGridInput) {
  showGridInput.addEventListener("change", () => {
    ui.showGrid = showGridInput.checked;
    updateCanvasGridAppearance();
    scheduleFileStatusRefresh();
    setStatusKey(ui.showGrid ? "status.gridOn" : "status.gridOff");
  });
}

if (highlightNodeEdgesInput) {
  highlightNodeEdgesInput.addEventListener("change", () => {
    ui.highlightNodeEdges = highlightNodeEdgesInput.checked;
    render();
    scheduleFileStatusRefresh();
    setStatusKey(ui.highlightNodeEdges ? "status.highlightNodeEdgesOn" : "status.highlightNodeEdgesOff");
  });
}

if (showNodeValuesInput) {
  showNodeValuesInput.addEventListener("change", () => {
    ui.showNodeValues = showNodeValuesInput.checked;
    render();
    scheduleFileStatusRefresh();
    setStatusKey(ui.showNodeValues ? "status.nodeValuesOn" : "status.nodeValuesOff");
  });
}

if (unitChecksInput) {
  unitChecksInput.addEventListener("change", () => {
    ui.checkUnits = unitChecksInput.checked;
    analyzeModelStaticIssues();
    render();
    scheduleFileStatusRefresh();
  });
}

gridSizeInput.addEventListener("change", () => {
  ui.gridSize = clamp(Number(gridSizeInput.value) || 20, 5, 100);
  gridSizeInput.value = String(ui.gridSize);
  updateCanvasGridAppearance();
  scheduleFileStatusRefresh();
  setStatusKey("status.gridStep", { value: ui.gridSize });
});

if (tooltipDelayInput) {
  tooltipDelayInput.addEventListener("change", () => {
    ui.tooltipDelayMs = normalizeTooltipDelayMs(tooltipDelayInput.value);
    tooltipDelayInput.value = String(ui.tooltipDelayMs);
    scheduleFileStatusRefresh();
    hideAppTooltip();
  });
}

if (interfaceLanguageInput) {
  interfaceLanguageInput.addEventListener("change", () => {
    applyInterfaceLanguage(interfaceLanguageInput.value, true);
  });
}

if (graphViewport) {
  graphViewport.addEventListener("scroll", () => {
    scheduleFileStatusRefresh();
  }, { passive: true });
}

function commitExecutionInput(inputEl, key) {
  // Time values use the same invariant decimal point as expressions.
  const rawValue = String(inputEl.value ?? "").trim();
  const parsed = Number(rawValue.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    inputEl.value = String(graph.execution[key]);
    setStatusKey("error.timeInvalid");
    return;
  }
  graph.execution[key] = parsed;
  inputEl.value = String(parsed);
  scheduleFileStatusRefresh();
  setStatusKey("status.timeConfigUpdated");
}

timeStartInput.addEventListener("change", () => commitExecutionInput(timeStartInput, "t0"));
timeStepInput.addEventListener("change", () => commitExecutionInput(timeStepInput, "dt"));
timeUnitInput?.addEventListener("change", () => { graph.execution.timeUnit = String(timeUnitInput.value ?? "").trim() || "s"; timeUnitInput.value = graph.execution.timeUnit; analyzeModelStaticIssues(); scheduleFileStatusRefresh(); });
addUnitDefinitionBtn?.addEventListener("click", () => {
  graph.unitDefinitions.push({ symbol: "", expression: "" });
  scheduleFileStatusRefresh();
  refreshSidebar();
  unitDefinitionsList?.querySelector(".unit-definition-row:last-child input")?.focus();
});
timeEndInput.addEventListener("change", () => commitExecutionInput(timeEndInput, "t1"));
timeDelayInput.addEventListener("change", () => {
  const parsed = Number(timeDelayInput.value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    timeDelayInput.value = String(graph.execution.delayMs);
    setStatusKey("error.timeDelayInvalid");
    return;
  }
  graph.execution.delayMs = Math.round(parsed);
  scheduleFileStatusRefresh();
  setStatusKey("status.timeDelayUpdated", { delay: graph.execution.delayMs });
});

if (renderEveryStepsInput) {
  renderEveryStepsInput.addEventListener("change", () => {
    const parsed = Number(renderEveryStepsInput.value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      renderEveryStepsInput.value = String(graph.execution.renderEverySteps);
      setStatusKey("error.renderEveryStepsInvalid");
      return;
    }
    graph.execution.renderEverySteps = Math.round(parsed);
    renderEveryStepsInput.value = String(graph.execution.renderEverySteps);
    scheduleFileStatusRefresh();
    setStatusKey("status.renderEveryStepsUpdated", { steps: graph.execution.renderEverySteps });
  });
}

if (decimalDigitsInput) {
  decimalDigitsInput.addEventListener("change", () => {
    const parsed = Number(decimalDigitsInput.value);
    if (!Number.isFinite(parsed)) {
      decimalDigitsInput.value = String(clampDisplayDecimals(graph.execution.decimals));
      setStatusKey("error.timeInvalid");
      return;
    }
    graph.execution.decimals = clampDisplayDecimals(parsed);
    decimalDigitsInput.value = String(graph.execution.decimals);
    scheduleFileStatusRefresh();
    setStatusKey("status.timeConfigUpdated");
    render();
  });
}

if (integratorInput) {
  integratorInput.addEventListener("change", () => {
    graph.execution.integrator = String(integratorInput.value || "euler").toLowerCase() === "rk4" ? "rk4" : "euler";
    setStatusKey("status.integratorUpdated", { name: t(`integrator.${graph.execution.integrator}`) });
    scheduleFileStatusRefresh();
    render();
  });
}

if (randomSeedInput) {
  randomSeedInput.addEventListener("change", () => {
    const raw = String(randomSeedInput.value ?? "").trim();
    if (!raw) {
      graph.execution.randomSeed = null;
      graph.execution.randomState = null;
    } else {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        randomSeedInput.value = graph.execution.randomSeed == null ? "" : String(graph.execution.randomSeed);
        setStatusKey("error.randomSeedInvalid");
        return;
      }
      graph.execution.randomSeed = runtimeShared.normalizeRandomSeed(parsed);
      graph.execution.randomState = graph.execution.randomSeed;
      randomSeedInput.value = String(graph.execution.randomSeed);
    }
    scheduleFileStatusRefresh();
  });
}

function commitStrictDefinitionsToggle(enabled) {
  graph.execution.strictDefinitions = Boolean(enabled);
  analyzeModelStaticIssues();
  setStatusKey(graph.execution.strictDefinitions ? "status.strictDefinitionsOn" : "status.strictDefinitionsOff");
  scheduleFileStatusRefresh();
  render();
}

if (strictDefinitionsInput) {
  strictDefinitionsInput.addEventListener("change", () => {
    commitStrictDefinitionsToggle(strictDefinitionsInput.checked);
  });
}
if (runStrictDefinitionsInput) {
  runStrictDefinitionsInput.addEventListener("change", () => {
    commitStrictDefinitionsToggle(runStrictDefinitionsInput.checked);
  });
}

if (runStopOnRuntimeErrorInput) {
  runStopOnRuntimeErrorInput.addEventListener("change", () => {
    graph.execution.stopOnRuntimeError = Boolean(runStopOnRuntimeErrorInput.checked);
    scheduleFileStatusRefresh();
    render();
  });
}

[timeStartInput, timeStepInput, timeEndInput, timeDelayInput, decimalDigitsInput, integratorInput].filter(Boolean).forEach((inputEl) => {
  inputEl.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      inputEl.blur();
    }
  });
});

loadJsonInput.addEventListener("change", () => {
  const file = loadJsonInput.files?.[0];
  if (file) {
    void loadGraphJsonFile(file);
  }
  loadJsonInput.value = "";
});

if (clearRecentModelsBtn) {
  clearRecentModelsBtn.addEventListener("click", () => {
    clearRecentModels();
    closeTopMenus();
    setStatusKey("status.recentCleared");
  });
}

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
    scheduleNodeDefinitionRecalculation();
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

nodeUnitInput?.addEventListener("input", () => {
  const node = selectedNodeForSidebar();
  if (!node || isSubmodelNode(node)) return;
  node.unit = String(nodeUnitInput.value ?? "").trim();
  analyzeModelStaticIssues();
  render();
  scheduleFileStatusRefresh();
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

function changeNodeShape(node, nextShape) {
  if (!node || !["draft", "rect", "ellipse", "diamond", "submodel"].includes(nextShape)) {
    return false;
  }
  if (node.shape === nextShape) {
    return true;
  }
  runAction(() => {
    const wasSliderBindable = canBindSliderToNode(node);
    const wasDraft = isDraftNode(node);
    node.shape = nextShape;
    if (isDraftNode(node)) {
      node.input = false;
      node.output = false;
      node.global = false;
      node.unit = "";
      node.valueExpression = "";
      node.initialStateExpression = "";
      node.computedValue = null;
      node.computedError = "";
      node.pendingStateValue = null;
      node.pendingStateError = "";
      node.fillColor = "transparent";
      node.strokeColor = "transparent";
    }
    if (wasDraft && !isDraftNode(node)) {
      node.fillColor = "";
      node.strokeColor = "";
    }
    if (!canMarkNodeAsGlobal(node)) {
      node.global = false;
    }
    if (isSubmodelNode(node)) {
      node.input = false;
      node.output = false;
      node.valueExpression = "";
      node.initialStateExpression = "";
      node.pendingStateValue = null;
      node.pendingStateError = "";
    }
    if (!isStateNode(node)) {
      node.initialStateExpression = "";
      node.pendingStateValue = null;
      node.pendingStateError = "";
    }
    if (!isSubmodelNode(node)) {
      node.modelPath = "";
      node.submodelIcon = null;
      node.inputBindings = {};
      node.interfaceCache = emptySubmodelInterfaceCache();
      node.submodelError = "";
    }
    node.__runtimeSubmodel = null;
    node.__runtimeSubmodelPath = "";
    normalizeInputNodeFlags();
    if (wasSliderBindable && !canBindSliderToNode(node)) {
      removeNodeFromInputWidgetBindings(node.name);
    }
  });
  recalculateAfterNodeDefinitionChange();
  return true;
}

nodeShapeInput.addEventListener("change", () => {
  if (ui.selectedNodes.size !== 1) {
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  changeNodeShape(node, nodeShapeInput.value);
});

if (nodeModelPathInput) {
  nodeModelPathInput.addEventListener("input", () => {
    if (ui.selectedNodes.size !== 1) {
      return;
    }
    const nodeId = [...ui.selectedNodes][0];
    const node = getNodeById(nodeId);
    if (!node || !isSubmodelNode(node)) {
      return;
    }
    node.modelPath = String(nodeModelPathInput.value ?? "");
    node.submodelError = "";
    node.interfaceCache = emptySubmodelInterfaceCache();
    node.inputBindings = {};
    node.__runtimeSubmodel = null;
    node.__runtimeSubmodelPath = "";
    ui.submodelsPrepared = false;
    render();
  });
  nodeModelPathInput.addEventListener("blur", () => {
    if (ui.selectedNodes.size !== 1) {
      return;
    }
    const nodeId = [...ui.selectedNodes][0];
    const node = getNodeById(nodeId);
    if (!node || !isSubmodelNode(node)) {
      return;
    }
    node.modelPath = String(nodeModelPathInput.value ?? "").trim();
    nodeModelPathInput.value = node.modelPath;
    scheduleFileStatusRefresh();
    render();
  });
  nodeModelPathInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      nodeModelPathInput.blur();
    }
  });
}

if (submodelIconSelect) {
  submodelIconSelect.addEventListener("change", async () => {
    if (ui.selectedNodes.size !== 1 || isEditingUiLocked()) {
      return;
    }
    const node = getNodeById([...ui.selectedNodes][0]);
    if (!node || !isSubmodelNode(node)) {
      return;
    }
    const value = String(submodelIconSelect.value ?? "");
    if (value === "image") {
      const previousIcon = normalizeSubmodelIcon(node.submodelIcon);
      const file = await chooseSubmodelIconFile();
      if (!file) {
        submodelIconSelect.value = submodelIconSelectValue({ submodelIcon: previousIcon });
        return;
      }
      try {
        const icon = await readImageFileAsDataUrl(file);
        runAction(() => {
          node.submodelIcon = icon;
        });
      } catch (err) {
        setStatus(String(err?.message || t("error.submodelIconRead")));
        submodelIconSelect.value = submodelIconSelectValue({ submodelIcon: previousIcon });
        return;
      }
    } else {
      runAction(() => {
        node.submodelIcon = value
          ? normalizeSubmodelIcon({ type: "library", value })
          : null;
      });
    }
    refreshSidebar();
    render();
  });
}

if (chooseSubmodelIconBtn) {
  chooseSubmodelIconBtn.addEventListener("click", async () => {
    if (ui.selectedNodes.size !== 1 || isEditingUiLocked()) {
      return;
    }
    const node = getNodeById([...ui.selectedNodes][0]);
    if (!node || !isSubmodelNode(node)) {
      return;
    }
    const file = await chooseSubmodelIconFile();
    if (!file) {
      return;
    }
    try {
      const icon = await readImageFileAsDataUrl(file);
      runAction(() => {
        node.submodelIcon = icon;
      });
      refreshSidebar();
      render();
    } catch (err) {
      setStatus(String(err?.message || t("error.submodelIconRead")));
    }
  });
}

if (clearSubmodelIconBtn) {
  clearSubmodelIconBtn.addEventListener("click", () => {
    if (ui.selectedNodes.size !== 1 || isEditingUiLocked()) {
      return;
    }
    const node = getNodeById([...ui.selectedNodes][0]);
    if (!node || !isSubmodelNode(node) || !normalizeSubmodelIcon(node.submodelIcon)) {
      return;
    }
    runAction(() => {
      node.submodelIcon = null;
    });
    refreshSidebar();
    render();
  });
}

if (loadSubmodelBtn) {
  loadSubmodelBtn.addEventListener("click", async () => {
    if (ui.selectedNodes.size !== 1) {
      return;
    }
    const nodeId = [...ui.selectedNodes][0];
    const node = getNodeById(nodeId);
    if (!node || !isSubmodelNode(node)) {
      return;
    }
    try {
      const chosen = await chooseSubmodelFileForNode(node);
      if (!chosen) {
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        return;
      }
      setStatus(String(err?.message || t("error.submodelLoadFailed", { message: t("error.load") })));
      refreshSidebar();
      render();
      return;
    }
    await refreshSubmodelInterface(node, true, { allowPrompt: true });
    await preloadSubmodelsAfterLoad();
    refreshSidebar();
    render();
  });
}

if (showSubmodelBtn) {
  showSubmodelBtn.addEventListener("click", async () => {
    if (ui.selectedNodes.size !== 1) {
      return;
    }
    const nodeId = [...ui.selectedNodes][0];
    const node = getNodeById(nodeId);
    if (!canShowSubmodelNode(node)) {
      return;
    }
    await openSubmodelNodeInNewTab(node);
  });
}

nodeInputInput.addEventListener("change", () => {
  const nodes = selectedNodesList().filter((node) => canMarkNodeAsInput(node));
  if (nodes.length === 0) {
    nodeInputInput.checked = false;
    return;
  }
  runAction(() => {
    nodes.forEach((node) => {
      const wasInput = Boolean(node.input);
      node.input = nodeInputInput.checked;
      if (wasInput && !node.input) {
        removeNodeFromInputWidgetBindings(node.name);
      }
    });
  });
  recalculateAfterNodeDefinitionChange();
  nodeInputInput.indeterminate = false;
});

nodeGlobalInput.addEventListener("change", () => {
  if (ui.selectedNodes.size !== 1) {
    return;
  }
  const nodeId = [...ui.selectedNodes][0];
  const node = getNodeById(nodeId);
  if (!node) {
    return;
  }
  if (!canMarkNodeAsGlobal(node)) {
    nodeGlobalInput.checked = false;
    return;
  }
  runAction(() => {
    node.global = nodeGlobalInput.checked;
  });
  recalculateAfterNodeDefinitionChange();
});

nodeOutputInput.addEventListener("change", () => {
  const nodes = selectedNodesList().filter((node) => !isSubmodelNode(node));
  if (nodes.length === 0) {
    return;
  }
  runAction(() => {
    nodes.forEach((node) => {
      const wasOutput = Boolean(node.output);
      node.output = nodeOutputInput.checked;
      if (wasOutput && !node.output) {
        removeNodeFromAllWidgetDisplays(node.name);
      }
    });
  });
  recalculateAfterNodeDefinitionChange();
  nodeOutputInput.indeterminate = false;
});

function expressionEditorCurrentNode() {
  return ui.expressionEditor?.nodeId ? getNodeById(ui.expressionEditor.nodeId) : null;
}

function applyPendingExpressionEditorDefinition() {
  if (!expressionEditorHasUnsavedChanges()) {
    return true;
  }
  return commitExpressionEditorValue(false);
}

expressionNodeNameInput?.addEventListener("change", () => {
  const node = expressionEditorCurrentNode();
  if (!node || isEditingUiLocked()) return;
  const attempt = semantics.validateNodeName(graph.nodes, expressionNodeNameInput.value, node.id);
  if (!attempt.ok) {
    expressionNodeNameInput.classList.add("invalid");
    expressionNodeNameInput.value = node.name;
    return;
  }
  if (!applyPendingExpressionEditorDefinition()) {
    expressionNodeNameInput.value = node.name;
    return;
  }
  expressionNodeNameInput.classList.remove("invalid");
  if (attempt.name === node.name) return;
  const oldName = node.name;
  node.name = attempt.name;
  propagateNodeRenameInExpressions(oldName, node.name);
  ui.expressionEditor.baseTitle = expressionEditorBaseTitleForNode(node);
  analyzeModelStaticIssues();
  scheduleNodeDefinitionRecalculation();
  refreshExpressionEditorValidation();
  render();
});

expressionNodeShapeInput?.addEventListener("change", () => {
  const node = expressionEditorCurrentNode();
  if (!node || isEditingUiLocked()) return;
  if (!applyPendingExpressionEditorDefinition() || !changeNodeShape(node, expressionNodeShapeInput.value)) {
    expressionNodeShapeInput.value = node.shape;
    return;
  }
  ui.expressionEditor.baseTitle = expressionEditorBaseTitleForNode(node);
  syncExpressionEditorFormulaNotes();
  refreshExpressionEditorValidation();
});

expressionNodeInputInput?.addEventListener("change", () => {
  const node = expressionEditorCurrentNode();
  if (!node || !canMarkNodeAsInput(node) || isEditingUiLocked()) return;
  runAction(() => {
    const wasInput = Boolean(node.input);
    node.input = expressionNodeInputInput.checked;
    if (wasInput && !node.input) {
      removeNodeFromInputWidgetBindings(node.name);
    }
  });
  recalculateAfterNodeDefinitionChange();
  syncExpressionEditorNodeIdentity(node);
});

expressionNodeOutputInput?.addEventListener("change", () => {
  const node = expressionEditorCurrentNode();
  if (!node || isSubmodelNode(node) || isEditingUiLocked()) return;
  runAction(() => {
    const wasOutput = Boolean(node.output);
    node.output = expressionNodeOutputInput.checked;
    if (wasOutput && !node.output) {
      removeNodeFromAllWidgetDisplays(node.name);
    }
  });
  recalculateAfterNodeDefinitionChange();
  syncExpressionEditorNodeIdentity(node);
});

expressionNodeGlobalInput?.addEventListener("change", () => {
  const node = expressionEditorCurrentNode();
  if (!node || !canMarkNodeAsGlobal(node) || isEditingUiLocked()) return;
  runAction(() => {
    node.global = expressionNodeGlobalInput.checked;
  });
  recalculateAfterNodeDefinitionChange();
  syncExpressionEditorNodeIdentity(node);
});

expressionNodeUnitInput?.addEventListener("input", () => {
  const node = expressionEditorCurrentNode();
  if (!node || isEditingUiLocked() || expressionNodeUnitInput.readOnly) return;
  node.unit = String(expressionNodeUnitInput.value ?? "").trim();
  analyzeModelStaticIssues();
  scheduleNodeDefinitionRecalculation();
  scheduleFileStatusRefresh();
  render();
});

if (nodeFillColorInput) {
  nodeFillColorInput.addEventListener("change", () => {
    const nodes = selectedNodesList();
    if (nodes.length === 0) {
      return;
    }
    runAction(() => {
      const nextColor = normalizeColorString(nodeFillColorInput.value);
      nodes.forEach((node) => {
        node.fillColor = nextColor;
        sanitizeNodeVisualOptions(node);
      });
    });
  });
}

if (nodeStrokeColorInput) {
  nodeStrokeColorInput.addEventListener("change", () => {
    const nodes = selectedNodesList();
    if (nodes.length === 0) {
      return;
    }
    runAction(() => {
      const nextColor = normalizeColorString(nodeStrokeColorInput.value);
      nodes.forEach((node) => {
        node.strokeColor = nextColor;
        sanitizeNodeVisualOptions(node);
      });
    });
  });
}

if (resetNodeColorsBtn) {
  resetNodeColorsBtn.addEventListener("click", () => {
    const nodes = selectedNodesList();
    if (nodes.length === 0) {
      return;
    }
    runAction(() => {
      nodes.forEach((node) => {
        node.fillColor = "";
        node.strokeColor = "";
        sanitizeNodeVisualOptions(node);
      });
    });
  });
}

if (textWidthInput) {
  textWidthInput.addEventListener("change", () => {
    const item = ui.selected?.type === "text" ? getTextItemById(ui.selected.id) : null;
    if (!item) {
      return;
    }
    runAction(() => {
      item.width = clamp(Number(textWidthInput.value) || item.width, 40, 1200);
      sanitizeTextItem(item);
    });
  });
}

if (textHeightInput) {
  textHeightInput.addEventListener("change", () => {
    const item = ui.selected?.type === "text" ? getTextItemById(ui.selected.id) : null;
    if (!item) {
      return;
    }
    runAction(() => {
      item.height = clamp(Number(textHeightInput.value) || item.height, 24, 1200);
      sanitizeTextItem(item);
    });
  });
}

if (textFillColorInput) {
  textFillColorInput.addEventListener("change", () => {
    const item = ui.selected?.type === "text" ? getTextItemById(ui.selected.id) : null;
    if (!item) {
      return;
    }
    runAction(() => {
      item.fillColor = normalizeColorString(textFillColorInput.value);
      sanitizeTextItem(item);
    });
  });
}

if (textStrokeColorInput) {
  textStrokeColorInput.addEventListener("change", () => {
    const item = ui.selected?.type === "text" ? getTextItemById(ui.selected.id) : null;
    if (!item) {
      return;
    }
    runAction(() => {
      item.strokeColor = normalizeColorString(textStrokeColorInput.value);
      sanitizeTextItem(item);
    });
  });
}

function bindTextInputEditor(input) {
  if (!input) {
    return;
  }
  input.addEventListener("focus", () => {
    const item = ui.selected?.type === "text" ? getTextItemById(ui.selected.id) : null;
    if (!item) {
      return;
    }
    beginTransaction();
  });
  input.addEventListener("input", () => {
    const item = ui.selected?.type === "text" ? getTextItemById(ui.selected.id) : null;
    if (!item) {
      return;
    }
    item.markdown = String(input.value ?? "");
    item.html = "";
    sanitizeTextItem(item);
    syncSelectedTextInputs(item);
    dirtySinceLastSave = true;
    updateFileStatusLabel(true);
    render();
  });
  input.addEventListener("blur", () => {
    commitTransaction();
    render();
  });
}

bindTextInputEditor(textHtmlInput);
bindTextInputEditor(textEditorInput);

if (textEditorInput) {
  textEditorInput.addEventListener("keydown", (evt) => {
    if ((evt.ctrlKey || evt.metaKey) && evt.key === "Enter") {
      evt.preventDefault();
      commitTransaction();
      render();
      closeTextEditor();
    }
  });
}

if (textHtmlInput) {
  textHtmlInput.addEventListener("dblclick", () => {
    openTextEditor();
  });
}

function handleTextEditorTool(tool) {
  if (tool === "h1") {
    wrapTextSelection("# ", "", t("text.toolbarHeading1"));
    return;
  }
  if (tool === "h2") {
    wrapTextSelection("## ", "", t("text.toolbarHeading2"));
    return;
  }
  if (tool === "h3") {
    wrapTextSelection("### ", "", t("text.toolbarHeading3"));
    return;
  }
  if (tool === "p") {
    wrapTextSelection("", "\n\n", t("text.toolbarParagraph"));
    return;
  }
  if (tool === "b") {
    wrapTextSelection("**", "**");
    return;
  }
  if (tool === "i") {
    wrapTextSelection("*", "*");
    return;
  }
  if (tool === "tex") {
    wrapTextSelection("$", "$", "x^2");
    return;
  }
  if (tool === "variable") {
    wrapTextSelection("{{", "}}", "nomeVariabile");
    return;
  }
  if (tool === "u") {
    return;
  }
  if (tool === "ul") {
    wrapTextSelection("- ", "", t("text.toolbarListItem"));
    return;
  }
  if (tool === "ol") {
    wrapTextSelection("1. ", "", t("text.toolbarListItem"));
    return;
  }
  if (tool === "li") {
    wrapTextSelection("- ", "", t("text.toolbarListItem"));
    return;
  }
  if (tool === "br") {
    insertTextHtmlSnippet("\n");
    return;
  }
  if (tool === "hr") {
    insertTextHtmlSnippet("\n---\n");
  }
}

if (textEditorToolbar) {
  textEditorToolbar.addEventListener("click", (evt) => {
    const btn = evt.target.closest("[data-text-tool]");
    if (!btn) {
      return;
    }
    evt.preventDefault();
    handleTextEditorTool(btn.getAttribute("data-text-tool"));
  });
}

if (textEditorCloseBtn) {
  textEditorCloseBtn.addEventListener("click", () => {
    closeTextEditor();
  });
}

if (textEditorDismissBtn) {
  textEditorDismissBtn.addEventListener("click", () => {
    closeTextEditor();
  });
}
if (modelNotesInput) {
  modelNotesInput.addEventListener("input", () => {
    graph.notes = normalizeModelNotes({ markdown: modelNotesInput.value });
    dirtySinceLastSave = true;
    updateFileStatusLabel(true);
    renderModelNotesPreview();
    modelNotesCanvasBtn?.classList.toggle("hidden", !modelNotesInput.value.trim());
  });
  modelNotesInput.addEventListener("contextmenu", openModelNotesInputContextMenu);
  modelNotesInput.addEventListener("keydown", (evt) => {
    if (!(evt.ctrlKey || evt.metaKey)) return;
    const key = evt.key.toLowerCase();
    if (key === "a") {
      evt.preventDefault();
      modelNotesInput.select();
    } else if (key === "c") {
      evt.preventDefault();
      void copyModelNotesSelection();
    } else if (key === "x") {
      evt.preventDefault();
      void cutModelNotesSelection();
    } else if (key === "v") {
      evt.preventDefault();
      void pasteModelNotesText();
    }
  });
}
if (modelNotesEditBtn) modelNotesEditBtn.addEventListener("click", () => setModelNotesEditing(true));
if (modelNotesCanvasBtn) modelNotesCanvasBtn.addEventListener("click", () => openModelNotes(false));
[modelNotesReadOnly, modelNotesPreview].filter(Boolean).forEach((container) => {
  container.addEventListener("click", (evt) => {
    const link = evt.target.closest("[data-stgraphx-node]");
    if (!link) return;
    evt.preventDefault();
    revealNodeFromModelNotes(link.dataset.stgraphxNode);
  });
});
if (modelNotesToolbar) {
  modelNotesToolbar.addEventListener("click", (evt) => {
    const button = evt.target.closest("[data-markdown-tool]");
    if (!button || !modelNotesInput) return;
    evt.preventDefault();
    const tool = button.dataset.markdownTool;
    const map = { h1: ["# ", ""], h2: ["## ", ""], h3: ["### ", ""], b: ["**", "**"], i: ["*", "*"], ul: ["- ", ""], ol: ["1. ", ""], hr: ["\n---\n", ""] };
    const [prefix, suffix] = map[tool] || ["", ""];
    const start = modelNotesInput.selectionStart ?? 0;
    const end = modelNotesInput.selectionEnd ?? start;
    const selected = start === end ? t("text.toolbarParagraph") : modelNotesInput.value.slice(start, end);
    const insertion = tool === "nodeLink"
      ? `[[${start === end ? "nomeNodo|testo" : `${selected}|${selected}`}]]`
      : tool === "tex"
      ? `$${start === end ? "x^2" : selected}$`
      : `${prefix}${selected}${suffix}`;
    modelNotesInput.value = `${modelNotesInput.value.slice(0, start)}${insertion}${modelNotesInput.value.slice(end)}`;
    modelNotesInput.dispatchEvent(new Event("input", { bubbles: true }));
    modelNotesInput.focus();
  });
}
if (modelNotesInsertStructureBtn) {
  modelNotesInsertStructureBtn.addEventListener("click", () => {
    if (modelNotesInput && !modelNotesInput.value.trim()) {
      modelNotesInput.value = modelNotesTemplate();
      modelNotesInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}
if (modelNotesCloseBtn) modelNotesCloseBtn.addEventListener("click", closeModelNotes);
if (modelNotesDismissBtn) modelNotesDismissBtn.addEventListener("click", closeModelNotes);
if (unitDefinitionsCloseBtn) unitDefinitionsCloseBtn.addEventListener("click", closeUnitDefinitions);
if (unitDefinitionsModal) {
  unitDefinitionsModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === unitDefinitionsModal) closeUnitDefinitions();
  });
}

manualStepBtn.addEventListener("click", () => {
  void runManualStep();
});
bindTimedExecutionToggle(timedToggleBtn);
resetExecBtn.addEventListener("click", resetExecution);

nodeValueExprInput.addEventListener("input", () => {
  const meta = expressionFieldMeta("value");
  if (!meta) {
    return;
  }
  meta.setValue(nodeValueExprInput.value);
  const syntaxResult = updateExpressionFieldState(
    nodeValueExprInput,
    nodeValueExprStatus,
    nodeValueExprInput.value,
    false,
    "value",
  );
  if (syntaxResult.ok) {
    scheduleNodeDefinitionRecalculation();
  }
  scheduleFileStatusRefresh();
});

nodeInitialStateInput.addEventListener("input", () => {
  const meta = expressionFieldMeta("initial");
  if (!meta) {
    return;
  }
  meta.setValue(nodeInitialStateInput.value);
  const syntaxResult = updateExpressionFieldState(
    nodeInitialStateInput,
    nodeInitialStateStatus,
    nodeInitialStateInput.value,
    false,
    "initial",
  );
  if (syntaxResult.ok) {
    scheduleNodeDefinitionRecalculation();
  }
  scheduleFileStatusRefresh();
});

if (propsList) {
  propsList.addEventListener("input", () => {
    scheduleNodeDefinitionRecalculation();
  });
  propsList.addEventListener("click", (evt) => {
    if (evt.target.closest("button")) {
      scheduleNodeDefinitionRecalculation();
    }
  });
}

if (expressionDescriptionInput) {
  expressionDescriptionInput.addEventListener("focus", () => {
    if (isTabletExpressionEditorMode()) {
      setExpressionEditorView("notes", { focus: false });
    }
  });
  expressionDescriptionInput.addEventListener("input", () => {
    const node = ui.expressionEditor?.nodeId ? getNodeById(ui.expressionEditor.nodeId) : null;
    if (!node) {
      return;
    }
    const prop = normalizeNodeDescriptionProperty(node);
    prop.value = expressionDescriptionInput.value;
    scheduleFileStatusRefresh();
  });
}

if (expressionFormulaNotesInput) {
  expressionFormulaNotesInput.addEventListener("focus", () => {
    if (isTabletExpressionEditorMode()) {
      setExpressionEditorView("notes", { focus: false });
    }
  });
  expressionFormulaNotesInput.addEventListener("input", () => {
    const node = ui.expressionEditor?.nodeId ? getNodeById(ui.expressionEditor.nodeId) : null;
    if (!node) {
      return;
    }
    const prop = normalizeNodeFormulaNotesProperty(node);
    prop.value = expressionFormulaNotesInput.value;
    scheduleFileStatusRefresh();
  });
}

if (editNodeValueExprBtn) {
  editNodeValueExprBtn.addEventListener("click", () => {
    if (isWidgetControlledExpressionNode(selectedNodeForSidebar())) {
      return;
    }
    openExpressionEditor("value");
  });
}

if (expressionEditorTextarea) {
  expressionEditorTextarea.addEventListener("focus", () => {
    setActiveExpressionEditor("main");
    if (isTabletExpressionEditorMode()) {
      setExpressionEditorView("editor", { focus: false });
    }
  });
  expressionEditorTextarea.addEventListener("input", () => {
    refreshExpressionEditorValidation();
  });
  expressionEditorTextarea.addEventListener("scroll", () => {
    renderExpressionHighlight();
  });
  expressionEditorTextarea.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowDown" && evt.shiftKey) {
      evt.preventDefault();
      moveLibrarySelection(1);
      return;
    }
    if (evt.key === "ArrowUp" && evt.shiftKey) {
      evt.preventDefault();
      moveLibrarySelection(-1);
      return;
    }
    if (evt.key === "Enter" && evt.shiftKey && !evt.ctrlKey && !evt.metaKey) {
      evt.preventDefault();
      insertSelectedLibraryEntry();
      return;
    }
    if (evt.key === "Tab") {
      evt.preventDefault();
      insertExpressionSnippet("\t");
      refreshExpressionEditorValidation();
      return;
    }
    if (evt.key === "Enter" && !evt.ctrlKey && !evt.metaKey) {
      evt.preventDefault();
      insertExpressionSnippet("\n");
      refreshExpressionEditorValidation();
    }
  });
  ["click", "keyup", "mouseup", "select"].forEach((eventName) => {
    expressionEditorTextarea.addEventListener(eventName, () => {
      renderExpressionHighlight();
      renderExpressionAutocomplete();
    });
  });
  ["pointerup", "touchend"].forEach((eventName) => {
    expressionEditorTextarea.addEventListener(eventName, () => {
      renderExpressionHighlight();
    });
  });
}

if (expressionStateInitialInput) {
  expressionStateInitialInput.addEventListener("focus", () => {
    setActiveExpressionEditor("initial");
    if (isTabletExpressionEditorMode()) {
      setExpressionEditorView("editor", { focus: false });
    }
  });
  expressionStateInitialInput.addEventListener("input", () => {
    refreshExpressionEditorValidation();
  });
  expressionStateInitialInput.addEventListener("scroll", () => {
    renderExpressionHighlight();
  });
  expressionStateInitialInput.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowDown" && evt.shiftKey) {
      evt.preventDefault();
      moveLibrarySelection(1);
      return;
    }
    if (evt.key === "ArrowUp" && evt.shiftKey) {
      evt.preventDefault();
      moveLibrarySelection(-1);
      return;
    }
    if (evt.key === "Enter" && evt.shiftKey && !evt.ctrlKey && !evt.metaKey) {
      evt.preventDefault();
      insertSelectedLibraryEntry();
      return;
    }
    if (evt.key === "Tab") {
      evt.preventDefault();
      insertExpressionSnippet("\t");
      refreshExpressionEditorValidation();
      return;
    }
    if (evt.key === "Enter" && !evt.ctrlKey && !evt.metaKey) {
      evt.preventDefault();
      insertExpressionSnippet("\n");
      refreshExpressionEditorValidation();
    }
  });
  ["click", "keyup", "mouseup", "select"].forEach((eventName) => {
    expressionStateInitialInput.addEventListener(eventName, () => {
      renderExpressionHighlight();
      renderExpressionAutocomplete();
    });
  });
  ["pointerup", "touchend"].forEach((eventName) => {
    expressionStateInitialInput.addEventListener(eventName, () => {
      renderExpressionHighlight();
    });
  });
}

// `selectionchange` also covers caret movements performed by touch handles,
// accessibility tools and browser commands, which do not consistently emit a
// keyboard or mouse event on the textarea itself.
document.addEventListener("selectionchange", () => {
  if (!ui.expressionEditor || expressionEditorModal?.classList.contains("hidden")) {
    return;
  }
  const active = document.activeElement;
  if (active === expressionEditorTextarea || active === expressionStateInitialInput) {
    renderExpressionAutocomplete();
  }
});

const expressionResizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const target = entry.target;
      if (target === expressionEditorTextarea) {
        syncExpressionSurfaceSize(expressionEditorTextarea, expressionEditorHighlight);
        renderExpressionHighlightFor(expressionEditorTextarea, expressionEditorHighlight);
      } else if (target === expressionStateInitialInput) {
        syncExpressionSurfaceSize(expressionStateInitialInput, expressionStateInitialHighlight);
        renderExpressionHighlightFor(expressionStateInitialInput, expressionStateInitialHighlight);
      }
    });
  })
  : null;

if (expressionResizeObserver) {
  if (expressionEditorTextarea) {
    expressionResizeObserver.observe(expressionEditorTextarea);
  }
  if (expressionStateInitialInput) {
    expressionResizeObserver.observe(expressionStateInitialInput);
  }
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
if (expressionHelpCopyBtn) {
  expressionHelpCopyBtn.addEventListener("click", () => {
    copyExpressionAuxText(expressionHelp);
  });
}
if (expressionStatusCopyBtn) {
  expressionStatusCopyBtn.addEventListener("click", () => {
    copyExpressionAuxText(expressionEditorStatus);
  });
}
if (expressionSymbolsFilter) {
  expressionSymbolsFilter.addEventListener("focus", () => {
    if (isTabletExpressionEditorMode()) {
      setExpressionEditorView("help", { focus: false });
    }
  });
  expressionSymbolsFilter.addEventListener("input", () => {
    renderExpressionLibrary();
  });
  expressionSymbolsFilter.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowDown") {
      evt.preventDefault();
      moveLibrarySelection(1);
      return;
    }
    if (evt.key === "ArrowUp") {
      evt.preventDefault();
      moveLibrarySelection(-1);
      return;
    }
    if (evt.key === "Enter") {
      evt.preventDefault();
      insertSelectedLibraryEntry();
      return;
    }
    if (evt.key === "Escape") {
      evt.preventDefault();
      expressionEditorTextarea?.focus();
    }
  });
}
[
  [expressionEditorViewEditorBtn, "editor"],
  [expressionEditorViewNotesBtn, "notes"],
  [expressionEditorViewHelpBtn, "help"],
].forEach(([btn, view]) => {
  if (!btn) {
    return;
  }
  btn.addEventListener("click", () => {
    setExpressionEditorView(view);
  });
});
if (expressionEditorModal) {
  const modalCard = expressionEditorModal.querySelector(".expression-editor-card");
  bindModalDragHandle(expressionEditorModal, ".expression-editor-card");
  if (expressionEditorResizeHandle && modalCard) {
    expressionEditorResizeHandle.addEventListener("pointerdown", (evt) => {
      if (isCompactTouchPointerEvent(evt)) {
        return;
      }
      evt.preventDefault();
      evt.stopPropagation();
      const rect = modalCard.getBoundingClientRect();
      modalCard.style.transform = "none";
      modalCard.style.left = `${rect.left}px`;
      modalCard.style.top = `${rect.top}px`;
      modalCard.style.width = `${rect.width}px`;
      modalCard.style.height = `${rect.height}px`;
      ui.modalResize = {
        pointerId: evt.pointerId,
        startClientX: evt.clientX,
        startClientY: evt.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        startLeft: rect.left,
        startTop: rect.top,
        card: modalCard,
      };
      evt.currentTarget?.setPointerCapture?.(evt.pointerId);
    });
  }
}
bindModalDragHandle(functionsHelpModal, ".functions-help-card");
bindModalDragHandle(documentationHelpModal, ".documentation-help-card");
bindModalDragHandle(examplesHelpModal, ".examples-help-card");
bindModalDragHandle(aboutAppModal, ".about-app-card");
bindModalDragHandle(modelAnalysisModal, ".model-analysis-card");
bindModalDragHandle(feedbackLoopsModal, ".feedback-loops-card");
bindModalDragHandle(sensitivityAnalysisModal, ".sensitivity-analysis-card");
bindModalDragHandle(eightTupleModal, ".eight-tuple-card");
bindModalDragHandle(watchDebuggerModal, ".watch-debugger-card");
bindModalDragHandle(localFunctionsModal, ".local-functions-card");
bindModalDragHandle(presentationGroupsModal, ".presentation-groups-card");
bindModalDragHandle(textEditorModal, ".text-editor-card");
bindModalDragHandle(modelNotesModal, ".model-notes-card");
bindModalDragHandle(viewOptionsModal, ".view-options-card", { allowCompactTouch: true });
bindModalDragHandle(configHelpModal, ".config-help-card", { allowCompactTouch: true });
document.querySelectorAll("[data-config-help]").forEach((button) => {
  button.addEventListener("click", () => openConfigurationHelp(button.getAttribute("data-config-help")));
});
if (configHelpCloseBtn) {
  configHelpCloseBtn.addEventListener("click", closeConfigurationHelp);
}
if (configHelpDismissBtn) {
  configHelpDismissBtn.addEventListener("click", closeConfigurationHelp);
}
if (functionsHelpBtn) {
  functionsHelpBtn.addEventListener("click", () => {
    closeTopMenus();
    openFunctionsHelp();
  });
}
if (documentationHelpBtn) {
  documentationHelpBtn.addEventListener("click", () => {
    closeTopMenus();
    openDocumentationHelp();
  });
}
if (eightTupleBtn) {
  eightTupleBtn.addEventListener("click", () => {
    closeTopMenus();
    openEightTuple();
  });
}
if (examplesHelpBtn) {
  examplesHelpBtn.addEventListener("click", () => {
    closeTopMenus();
    openExamplesHelp();
  });
}
if (aboutAppBtn) {
  aboutAppBtn.addEventListener("click", () => {
    closeTopMenus();
    openAboutApp();
  });
}
if (analyzeModelBtn) {
  analyzeModelBtn.addEventListener("click", () => {
    closeTopMenus();
    openModelAnalysis();
  });
}
if (watchDebuggerBtn) {
  watchDebuggerBtn.addEventListener("click", () => {
    closeTopMenus();
    openWatchDebugger();
  });
}
if (sensitivityAnalysisBtn) {
  sensitivityAnalysisBtn.addEventListener("click", () => {
    closeTopMenus();
    openSensitivityAnalysis();
  });
}
if (scenarioManagerBtn) {
  scenarioManagerBtn.addEventListener("click", () => {
    closeTopMenus();
    openScenarioManager();
  });
}
if (functionsHelpCloseBtn) {
  functionsHelpCloseBtn.addEventListener("click", closeFunctionsHelp);
}
if (functionsHelpDismissBtn) {
  functionsHelpDismissBtn.addEventListener("click", closeFunctionsHelp);
}
if (documentationHelpCloseBtn) {
  documentationHelpCloseBtn.addEventListener("click", closeDocumentationHelp);
}
if (documentationHelpDismissBtn) {
  documentationHelpDismissBtn.addEventListener("click", closeDocumentationHelp);
}
if (functionsHelpSearch) {
  functionsHelpSearch.addEventListener("input", renderFunctionsHelp);
}
if (functionsHelpTypeFilter) {
  functionsHelpTypeFilter.addEventListener("change", renderFunctionsHelp);
}
if (examplesHelpCloseBtn) {
  examplesHelpCloseBtn.addEventListener("click", closeExamplesHelp);
}
if (examplesHelpDismissBtn) {
  examplesHelpDismissBtn.addEventListener("click", closeExamplesHelp);
}
if (aboutAppCloseBtn) {
  aboutAppCloseBtn.addEventListener("click", closeAboutApp);
}
if (aboutAppDismissBtn) {
  aboutAppDismissBtn.addEventListener("click", closeAboutApp);
}
if (eightTupleCloseBtn) {
  eightTupleCloseBtn.addEventListener("click", closeEightTuple);
}
if (eightTupleDismissBtn) {
  eightTupleDismissBtn.addEventListener("click", closeEightTuple);
}
if (eightTupleCopyBtn) {
  eightTupleCopyBtn.addEventListener("click", copyEightTupleText);
}
if (eightTupleExportBtn) {
  eightTupleExportBtn.addEventListener("click", () => {
    void exportEightTupleMarkdown();
  });
}
if (modelAnalysisCloseBtn) {
  modelAnalysisCloseBtn.addEventListener("click", closeModelAnalysis);
}
if (modelAnalysisDismissBtn) {
  modelAnalysisDismissBtn.addEventListener("click", closeModelAnalysis);
}
if (modelAnalysisChecksBtn) {
  modelAnalysisChecksBtn.addEventListener("click", openModelAnalysisChecksHelp);
}
if (modelAnalysisChecksCloseBtn) {
  modelAnalysisChecksCloseBtn.addEventListener("click", closeModelAnalysisChecksHelp);
}
if (modelAnalysisChecksDismissBtn) {
  modelAnalysisChecksDismissBtn.addEventListener("click", closeModelAnalysisChecksHelp);
}
if (feedbackLoopsCloseBtn) {
  feedbackLoopsCloseBtn.addEventListener("click", closeFeedbackLoops);
}
if (feedbackLoopsDismissBtn) {
  feedbackLoopsDismissBtn.addEventListener("click", closeFeedbackLoops);
}
if (feedbackLoopsShowFocusBtn) {
  feedbackLoopsShowFocusBtn.addEventListener("click", showFeedbackLoopFocus);
}
if (feedbackLoopsClearFocusBtn) {
  feedbackLoopsClearFocusBtn.addEventListener("click", clearFeedbackLoopFocus);
}
if (sensitivityAnalysisCloseBtn) {
  sensitivityAnalysisCloseBtn.addEventListener("click", closeSensitivityAnalysis);
}
if (sensitivityInputSelect) {
  sensitivityInputSelect.addEventListener("change", () => {
    updateSensitivityRangeFromSelection();
    setSensitivityStatus();
    renderSensitivityResults();
  });
}
if (sensitivityOutputSelect) {
  sensitivityOutputSelect.addEventListener("change", () => {
    setSensitivityStatus();
    renderSensitivityResults();
  });
}
if (sensitivityRunBtn) {
  sensitivityRunBtn.addEventListener("click", () => { void runSensitivityAnalysis(); });
}
if (sensitivityExportBtn) {
  sensitivityExportBtn.addEventListener("click", exportSensitivityAnalysis);
}
if (sensitivityImageExportBtn) {
  sensitivityImageExportBtn.addEventListener("click", exportSensitivityChart);
}
if (watchDebuggerCloseBtn) {
  watchDebuggerCloseBtn.addEventListener("click", closeWatchDebugger);
}
if (watchDebuggerDismissBtn) {
  watchDebuggerDismissBtn.addEventListener("click", closeWatchDebugger);
}
if (watchDebuggerModal) {
  watchDebuggerModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === watchDebuggerModal) {
      closeWatchDebugger();
    }
  });
}
if (semanticBreakpointDismissBtn) {
  semanticBreakpointDismissBtn.addEventListener("click", closeSemanticBreakpointMessage);
}
if (semanticBreakpointModal) {
  semanticBreakpointModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === semanticBreakpointModal) {
      closeSemanticBreakpointMessage();
    }
  });
}
if (watchAddSelectedBtn) {
  watchAddSelectedBtn.addEventListener("click", () => {
    const node = selectedWatchableNode();
    if (!node || isEditingUiLocked()) {
      return;
    }
    commitDebugConfigChange(() => {
      const debug = ensureDebugConfig(graph);
      if (!debug.watches.includes(node.name)) {
        debug.watches.push(node.name);
      }
      sanitizeDebugConfig(graph);
    });
    renderWatchDebugger();
  });
}
if (watchBreakpointEnabledInput) {
  watchBreakpointEnabledInput.addEventListener("change", () => {
    commitDebugConfigChange(() => {
      ensureDebugConfig(graph).breakpointEnabled = Boolean(watchBreakpointEnabledInput.checked);
      if (!watchBreakpointEnabledInput.checked) {
        ui.breakpointLastResult = null;
      }
    });
    renderWatchDebugger();
  });
}
if (watchBreakpointInput) {
  const commitWatchBreakpointExpression = () => {
    commitDebugConfigChange(() => {
      ensureDebugConfig(graph).breakpointExpression = String(watchBreakpointInput.value ?? "");
      ui.breakpointLastResult = null;
    });
    renderWatchDebugger();
  };
  watchBreakpointInput.addEventListener("input", () => {
    ui.breakpointLastResult = null;
    renderWatchDebugger();
  });
  watchBreakpointInput.addEventListener("change", commitWatchBreakpointExpression);
  watchBreakpointInput.addEventListener("blur", commitWatchBreakpointExpression);
  watchBreakpointInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      commitWatchBreakpointExpression();
      watchBreakpointInput.blur();
    }
  });
}
if (watchBreakpointMessageInput) {
  const commitWatchBreakpointMessage = () => {
    commitDebugConfigChange(() => {
      ensureDebugConfig(graph).breakpointMessage = String(watchBreakpointMessageInput.value ?? "");
    });
    renderWatchDebugger();
  };
  watchBreakpointMessageInput.addEventListener("change", commitWatchBreakpointMessage);
  watchBreakpointMessageInput.addEventListener("blur", commitWatchBreakpointMessage);
  watchBreakpointMessageInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      commitWatchBreakpointMessage();
      watchBreakpointMessageInput.blur();
    }
  });
}
if (expressionEditorSwitchCloseBtn) {
  expressionEditorSwitchCloseBtn.addEventListener("click", closeExpressionEditorSwitchModal);
}
if (expressionEditorSwitchCancelBtn) {
  expressionEditorSwitchCancelBtn.addEventListener("click", closeExpressionEditorSwitchModal);
}
if (expressionEditorSwitchDiscardBtn) {
  expressionEditorSwitchDiscardBtn.addEventListener("click", runPendingExpressionEditorSelectionAction);
}
if (expressionEditorSwitchApplyBtn) {
  expressionEditorSwitchApplyBtn.addEventListener("click", () => {
    if (!commitExpressionEditorValue(false)) {
      return;
    }
    runPendingExpressionEditorSelectionAction();
  });
}
if (functionsHelpModal) {
  functionsHelpModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === functionsHelpModal) {
      closeFunctionsHelp();
    }
  });
}
if (documentationHelpModal) {
  documentationHelpModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === documentationHelpModal) {
      closeDocumentationHelp();
    }
  });
}
if (examplesHelpModal) {
  examplesHelpModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === examplesHelpModal) {
      closeExamplesHelp();
    }
  });
}
if (aboutAppModal) {
  aboutAppModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === aboutAppModal) {
      closeAboutApp();
    }
  });
}
if (eightTupleModal) {
  eightTupleModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === eightTupleModal) {
      closeEightTuple();
    }
  });
}
if (modelAnalysisChecksModal) {
  modelAnalysisChecksModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === modelAnalysisChecksModal) {
      closeModelAnalysisChecksHelp();
    }
  });
}
if (feedbackLoopsModal) {
  feedbackLoopsModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === feedbackLoopsModal) {
      closeFeedbackLoops();
    }
  });
}
if (sensitivityAnalysisModal) {
  sensitivityAnalysisModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === sensitivityAnalysisModal) closeSensitivityAnalysis();
  });
}
if (localFunctionsModal) {
  localFunctionsModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === localFunctionsModal) {
      closeLocalFunctionsEditor();
    }
  });
}
if (presentationGroupsModal) {
  presentationGroupsModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === presentationGroupsModal) {
      closePresentationGroupsEditor();
    }
  });
}
if (viewOptionsModal) {
  viewOptionsModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === viewOptionsModal) {
      closeViewOptions();
    }
  });
}
if (configHelpModal) {
  configHelpModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === configHelpModal) {
      closeConfigurationHelp();
    }
  });
}
if (dashboardRenameModal) {
  dashboardRenameModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === dashboardRenameModal) {
      closeDashboardPageRenameEditor();
    }
  });
}
if (expressionEditorSwitchModal) {
  expressionEditorSwitchModal.addEventListener("pointerdown", (evt) => {
    if (evt.target === expressionEditorSwitchModal) {
      closeExpressionEditorSwitchModal();
    }
  });
}

document.addEventListener("pointerover", (evt) => {
  const target = activeTooltipTarget(evt.target);
  if (!target) {
    scheduleHideAppTooltip(60);
    return;
  }
  ui.tooltipPointer = { x: evt.clientX, y: evt.clientY };
  scheduleShowAppTooltip(target, evt.clientX, evt.clientY, ui.tooltipDelayMs);
});

document.addEventListener("pointermove", (evt) => {
  const target = activeTooltipTarget(evt.target);
  if (!target) {
    scheduleHideAppTooltip(60);
    return;
  }
  ui.tooltipPointer = { x: evt.clientX, y: evt.clientY };
  if (ui.tooltipTarget !== target) {
    scheduleShowAppTooltip(target, evt.clientX, evt.clientY, ui.tooltipDelayMs);
    return;
  }
  cancelTooltipTimers();
  if (ui.tooltipDelayMs > 0) {
    positionAppTooltip(evt.clientX, evt.clientY);
  }
});

document.addEventListener("pointerout", (evt) => {
  if (!evt.relatedTarget || !activeTooltipTarget(evt.relatedTarget)) {
    scheduleHideAppTooltip(60);
  }
});

document.addEventListener("pointerdown", () => {
  ensureEditingUiUnlockedIfIdle();
}, true);

document.addEventListener("focusin", (evt) => {
  if (isTypingTarget(evt.target)) {
    ensureEditingUiUnlockedIfIdle();
  }
  const target = activeTooltipTarget(evt.target);
  if (!target) {
    return;
  }
  if (ui.tooltipDelayMs <= 0) {
    return;
  }
  const rect = target.getBoundingClientRect();
  showAppTooltip(target, rect.left + 8, rect.bottom);
});

document.addEventListener("focusout", (evt) => {
  if (!evt.relatedTarget || !activeTooltipTarget(evt.relatedTarget)) {
    hideAppTooltip();
  }
});

window.addEventListener("scroll", hideAppTooltip, true);
window.addEventListener("resize", hideAppTooltip);

modelTitleInput.addEventListener("input", () => {
  const nextTitle = String(modelTitleInput.value ?? "");
  if (graph.modelTitle === nextTitle) {
    return;
  }
  graph.modelTitle = nextTitle;
  dirtySinceLastSave = hasUnsavedChanges();
  updateFileStatusLabel(dirtySinceLastSave);
});

addModelPropBtn.addEventListener("click", () => {
  runAction(() => {
    graph.properties.push({ key: "", value: "" });
  });
});
if (editLocalFunctionsBtn) {
  editLocalFunctionsBtn.addEventListener("click", openLocalFunctionsEditor);
}
if (localFunctionsAddBtn) {
  localFunctionsAddBtn.addEventListener("click", () => {
    localFunctionsDraft().push({ name: "", params: [], expression: "", description: "" });
    renderLocalFunctionsEditor();
    showLocalFunctionsStatus();
  });
}
if (localFunctionsApplyBtn) {
  localFunctionsApplyBtn.addEventListener("click", commitLocalFunctionsEditor);
}
if (localFunctionsCancelBtn) {
  localFunctionsCancelBtn.addEventListener("click", closeLocalFunctionsEditor);
}
if (localFunctionsCloseBtn) {
  localFunctionsCloseBtn.addEventListener("click", closeLocalFunctionsEditor);
}
if (presentationGroupCreateBtn) {
  presentationGroupCreateBtn.addEventListener("click", createPresentationGroupFromSelection);
}
if (presentationGroupNameInput) {
  presentationGroupNameInput.addEventListener("keydown", (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      createPresentationGroupFromSelection();
    }
  });
}
if (presentationGroupsCloseBtn) {
  presentationGroupsCloseBtn.addEventListener("click", closePresentationGroupsEditor);
}
if (presentationGroupsDismissBtn) {
  presentationGroupsDismissBtn.addEventListener("click", closePresentationGroupsEditor);
}
if (viewOptionsCloseBtn) {
  viewOptionsCloseBtn.addEventListener("click", closeViewOptions);
}
if (viewOptionsDismissBtn) {
  viewOptionsDismissBtn.addEventListener("click", closeViewOptions);
}
if (dashboardRenameCloseBtn) {
  dashboardRenameCloseBtn.addEventListener("click", closeDashboardPageRenameEditor);
}
if (dashboardRenameCancelBtn) {
  dashboardRenameCancelBtn.addEventListener("click", closeDashboardPageRenameEditor);
}
if (dashboardRenameApplyBtn) {
  dashboardRenameApplyBtn.addEventListener("click", applyDashboardPageRename);
}
if (modelCloseConfirmDiscardBtn) {
  modelCloseConfirmDiscardBtn.addEventListener("click", () => resolveWorkspaceTabSaveConfirmation(false));
}
if (modelCloseConfirmSaveBtn) {
  modelCloseConfirmSaveBtn.addEventListener("click", () => resolveWorkspaceTabSaveConfirmation(true));
}
if (manageDashboardItem) {
  manageDashboardItem.addEventListener("click", () => {
    closeTopMenus();
    commitDashboardChange(() => {
      if (!graph.dashboard) {
        graph.dashboard = defaultDashboard();
      } else {
        graph.dashboard.visible = !graph.dashboard.visible;
      }
    });
  });
}

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
  recalculateAfterNodeDefinitionChange();
});

window.addEventListener("keydown", (evt) => {
  if ((evt.ctrlKey || evt.metaKey) && !evt.shiftKey && evt.key.toLowerCase() === "n" && !isTypingTarget(evt.target)) {
    evt.preventDefault();
    evt.stopPropagation();
    createNewGraph();
    return;
  }
  if (evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey && evt.code === "KeyN" && !isTypingTarget(evt.target)) {
    evt.preventDefault();
    evt.stopPropagation();
    createNewGraph();
    return;
  }
  if (evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey && evt.code === "KeyO" && !isTypingTarget(evt.target)) {
    evt.preventDefault();
    evt.stopPropagation();
    openGraphJson();
  }
}, true);

document.addEventListener("keydown", (evt) => {
  if (!dashboardRenameModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeDashboardPageRenameEditor();
    } else if (evt.key === "Enter") {
      evt.preventDefault();
      applyDashboardPageRename();
    }
    return;
  }

  if (!expressionEditorSwitchModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeExpressionEditorSwitchModal();
    } else if ((evt.ctrlKey || evt.metaKey) && evt.key === "Enter") {
      evt.preventDefault();
      if (commitExpressionEditorValue(false)) {
        runPendingExpressionEditorSelectionAction();
      }
    }
    return;
  }

  if (!watchDebuggerModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeWatchDebugger();
      return;
    }
  }

  if (!localFunctionsModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeLocalFunctionsEditor();
      return;
    }
    if ((evt.ctrlKey || evt.metaKey) && evt.key === "Enter") {
      evt.preventDefault();
      commitLocalFunctionsEditor();
      return;
    }
  }

  const expressionEditorActive =
    !expressionEditorModal?.classList.contains("hidden")
    && expressionEditorModal.contains(document.activeElement);
  if (expressionEditorActive) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeExpressionEditor();
    } else if ((evt.ctrlKey || evt.metaKey) && evt.key === "Enter") {
      evt.preventDefault();
      applyExpressionEditor();
    }
    return;
  }

  if (!configHelpModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeConfigurationHelp();
    }
    return;
  }

  if (!functionsHelpModal?.classList.contains("hidden")) {
    if (evt.key === "Escape" || evt.key === "F1") {
      evt.preventDefault();
      closeFunctionsHelp();
    }
    return;
  }

  if (!documentationHelpModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeDocumentationHelp();
    }
    return;
  }

  if (!examplesHelpModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeExamplesHelp();
    }
    return;
  }

  if (!aboutAppModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeAboutApp();
    }
    return;
  }
  if (!eightTupleModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeEightTuple();
    }
    return;
  }
  if (!modelAnalysisChecksModal?.classList.contains("hidden")) {
    if (evt.key === "Escape") {
      evt.preventDefault();
      closeModelAnalysisChecksHelp();
    }
    return;
  }

  if (evt.key === "F1") {
    evt.preventDefault();
    openFunctionsHelp();
    return;
  }

  if (
    evt.key === "F2"
    && !evt.ctrlKey
    && !evt.metaKey
    && !evt.altKey
    && !isTypingTarget(evt.target)
  ) {
    if (activateRenameSelectionAction()) {
      evt.preventDefault();
    }
    return;
  }

  if (
    evt.key === "F4"
    && !evt.ctrlKey
    && !evt.metaKey
    && !evt.altKey
    && !isTypingTarget(evt.target)
  ) {
    if (editSelectedNodeExpression()) {
      evt.preventDefault();
    }
    return;
  }

  if (evt.key === "F7") {
    evt.preventDefault();
    if (!hasStrictExecutionBlock()) {
      void executeNodeExpressions();
    }
    return;
  }
  if (evt.key === "F8") {
    evt.preventDefault();
    if (!hasStrictExecutionBlock()) {
      void runManualStep();
    }
    return;
  }
  if (evt.key === "F9") {
    evt.preventDefault();
    if (ui.timedRunHandle != null || !hasStrictExecutionBlock()) {
      void toggleTimedExecution();
    }
    return;
  }
  if (evt.key === "F10") {
    evt.preventDefault();
    resetExecution();
    return;
  }

  if (evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey && !isTypingTarget(evt.target)) {
    if (isEditingUiLocked() && ["Digit0", "Digit1", "Digit2", "Digit3", "Digit4"].includes(evt.code)) {
      evt.preventDefault();
      return;
    }
    if (evt.code === "Digit0") {
      evt.preventDefault();
      runAction(() => {
        addNode("draft");
      });
      setStatusKey("status.nodeCreated");
      return;
    }
    if (evt.code === "Digit1") {
      evt.preventDefault();
      runAction(() => {
        addNode("rect");
      });
      setStatusKey("status.nodeCreated");
      return;
    }
    if (evt.code === "Digit2") {
      evt.preventDefault();
      runAction(() => {
        addNode("ellipse");
      });
      setStatusKey("status.nodeCreated");
      return;
    }
    if (evt.code === "Digit3") {
      evt.preventDefault();
      runAction(() => {
        addNode("diamond");
      });
      setStatusKey("status.nodeCreated");
      return;
    }
    if (evt.code === "Digit4") {
      evt.preventDefault();
      runAction(() => {
        addNode("submodel");
      });
      setStatusKey("status.nodeCreated");
      return;
    }
  }

  if (evt.ctrlKey || evt.metaKey) {
    const key = evt.key.toLowerCase();
    const typingTarget = isTypingTarget(evt.target);
    if (key === "a" && !typingTarget) {
      evt.preventDefault();
      selectAllNodes();
      return;
    }
    if (key === "x" && !typingTarget) {
      if (isEditingUiLocked()) {
        evt.preventDefault();
        return;
      }
      evt.preventDefault();
      cutSelectionToClipboard();
      return;
    }
    if (key === "c" && !typingTarget) {
      evt.preventDefault();
      copySelectionToClipboard();
      return;
    }
    if (key === "v" && !typingTarget) {
      if (isEditingUiLocked()) {
        evt.preventDefault();
        return;
      }
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
    if (key === "w") {
      evt.preventDefault();
      void closeActiveWorkspaceTab();
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
    if (isEditingUiLocked()) {
      evt.preventDefault();
      return;
    }
    evt.preventDefault();
    undo();
    return;
  }

  if (
    (evt.ctrlKey || evt.metaKey) &&
    (evt.key.toLowerCase() === "y" || (evt.shiftKey && evt.key.toLowerCase() === "z"))
  ) {
    if (isEditingUiLocked()) {
      evt.preventDefault();
      return;
    }
    evt.preventDefault();
    redo();
    return;
  }

  // Let native text controls handle Delete/Backspace. Otherwise Delete removes
  // the selected canvas object, which also closes the text editor.
  if (evt.key === "Delete" && !isTypingTarget(evt.target)) {
    if (isEditingUiLocked()) {
      evt.preventDefault();
      return;
    }
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
  if (
    isCompactTabletLayout()
    && ui.tabletSidebarOpen
    && !evt.target.closest?.(".sidebar, #tabletSidebarToggle, .menu-bar, .context-menu, .modal-overlay")
  ) {
    setTabletSidebarOpen(false);
  }
});

window.addEventListener("resize", () => {
  updateCanvasSize();
  applyResponsiveUiState();
  updateExecutionProgress();
  const openMenuRoot = menuRoots.find((root) => root.classList.contains("open"));
  if (openMenuRoot) {
    positionCompactTopMenu(openMenuRoot);
  }
});

async function boot() {
  await loadI18n();
  sidebarHideButtons.forEach((button) => {
    button.addEventListener("click", hideConfigurationSidebar);
  });
  if (sidebarReopenBtn) {
    sidebarReopenBtn.addEventListener("click", showConfigurationSidebar);
  }
  if (tabletSidebarToggle) {
    tabletSidebarToggle.addEventListener("click", () => {
      setTabletSidebarOpen(!ui.tabletSidebarOpen);
    });
  }
  if (tabletSidebarBackdrop) {
    tabletSidebarBackdrop.addEventListener("click", () => {
      setTabletSidebarOpen(false);
    });
  }
  if (tabletSidebarExpandBtn) {
    tabletSidebarExpandBtn.addEventListener("click", () => {
      setTabletSidebarExpanded(!ui.tabletSidebarExpanded);
    });
  }
  if (tabletSidebarCloseBtn) {
    tabletSidebarCloseBtn.addEventListener("click", () => {
      setTabletSidebarOpen(false);
    });
  }
  if (tabletSidebarHeader) {
    tabletSidebarHeader.addEventListener("pointerdown", (evt) => {
      if (!isCompactTouchPointerEvent(evt) || evt.target.closest("button")) {
        return;
      }
      evt.currentTarget?.setPointerCapture?.(evt.pointerId);
      ui.tabletSidebarDrag = {
        pointerId: evt.pointerId,
        startClientY: evt.clientY,
        startExpanded: ui.tabletSidebarExpanded,
      };
    });
    tabletSidebarHeader.addEventListener("click", (evt) => {
      if (evt.target.closest("button")) {
        return;
      }
      setTabletSidebarExpanded(!ui.tabletSidebarExpanded);
    });
  }
  await recentModelsStore.loadFromStorage();
  renderRecentModelsMenu();

  history.undo = [];
  history.redo = [];
  updateZoomButtons();
  applyCanvasVisibility();
  applyResponsiveUiState();
  workspace.tabs = [];
  workspace.activeTabId = null;
  workspace.nextTabId = 1;
  createWorkspaceTabFromCurrentState({ activate: true });
  updateModelRunButtons();
  setStatusKey("status.ready");
  render();
  window.requestAnimationFrame(() => {
    markSavedSnapshot();
  });
}

boot().catch((err) => {
  const message = err?.stack || err?.message || String(err);
  window.__stgraphxBootError = String(message);
  console.error(err);
  if (statusText) {
    statusText.textContent = String(message);
  }
});
