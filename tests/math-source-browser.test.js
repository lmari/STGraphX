"use strict";
// Optional integration test: requires Firefox, a local socket and process access.
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");

async function exerciseEditor() {
  const wait = () => new Promise((resolve) => setTimeout(resolve, 200));
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    await wait(); await wait();
    check(!window.__stgraphxBootError, window.__stgraphxBootError);
    const previousTab = workspace.activeTabId;
    importGraphData(STGraphXMathSource.createCodec(semantics).parse("output preserved=7"));
    render(); await wait();
    const original = JSON.stringify(exportGraphData());
    const count = workspace.tabs.length;
    const get = (id) => document.getElementById(id);
    get("newMathSourceBtn").click();
    check(get("mathSourceDialog").open, "Import dialog did not open");
    check(get("mathSourceText").value === "", "New source editor must start empty");
    get("mathSourceInsertTemplate").click();
    check(get("mathSourceText").value.includes("@integrator = rk4"), "Expanded template was not inserted");
    await wait(); await wait();
    check(get("mathSourceStatus").textContent === t("mathSource.valid"), "Template must be valid source");
    check(getComputedStyle(get("mathSourceCreate").parentElement).flexWrap === "nowrap", "Source actions must remain on one line");
    get("mathSourceInsertTemplate").focus();
    check(get("appTooltip").parentElement === get("mathSourceDialog"), "Dialog tooltip is behind its window");
    get("mathSourceText").value = "";
    get("mathSourceInsertModel").click();
    check(get("mathSourceText").value.includes("output preserved = 7"), "Active model source was not inserted");
    get("mathSourceText").value = "bad = missing";
    get("mathSourceCreate").click(); await wait();
    check(workspace.tabs.length === count, "Invalid input changed workspace tabs");
    check(get("mathSourceStatus").textContent.includes("bad"), "Missing diagnostic");

    // Exercise the browser file-input fallback with an actual File object.
    const transfer = new DataTransfer();
    transfer.items.add(new File(["t0=0\nt1=2\ndt=1\noutput x=1;this+1\ny=x*2"], "sample.stgx", { type: "text/plain" }));
    get("mathSourceFileInput").files = transfer.files;
    get("mathSourceFileInput").dispatchEvent(new Event("change")); await wait();
    check(get("mathSourceText").value.includes("output x=1"), "File import did not fill source");
    get("mathSourceCreate").click(); await wait();
    check(workspace.tabs.length === count + 1, "Model was not created in a new tab");
    check(!get("mathSourceDialog").open, "Successful import did not close dialog");
    check(exportGraphData().nodes.length === 2, "Missing imported nodes");
    check(exportGraphData().edges.length === 1, "Missing inferred edge");
    check(hasUnsavedChanges(), "Imported model must be unsaved");
    const importedTab = workspace.activeTabId;
    switchWorkspaceTab(previousTab); await wait();
    check(JSON.stringify(exportGraphData()) === original, "Previous tab was modified");
    switchWorkspaceTab(importedTab); await wait();
    get("newMathSourceBtn").click();
    const input = get("mathSourceText");
    const edit = (value, caret = value.length) => {
      input.value = value; input.setSelectionRange(caret, caret); input.dispatchEvent(new Event("input"));
    };
    const key = (key, extra = {}) => input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...extra }));
    edit("a = sin(time) # comment");
    check(get("mathSourceHighlight").querySelector(".expression-token-function")?.textContent === "sin", "Missing function highlighting");
    check(get("mathSourceHighlight").querySelector(".expression-token-comment")?.textContent === "# comment", "Missing comment highlighting");
    edit("a = si"); key(" ", { code: "Space", ctrlKey: true });
    check(!get("mathSourceCompletions").hidden, "Completion did not open");
    const sin = [...get("mathSourceCompletions").children].find((button) => button.textContent.startsWith("sin("));
    check(sin, "Missing sine completion"); sin.click();
    check(input.value === "a = sin", "Completion replaced wrong text");
    edit("a=1\nb=2", 0); input.setSelectionRange(0, input.value.length); key("Tab");
    check(input.value === "  a=1\n  b=2", "Multiline indent failed"); key("Tab", { shiftKey: true });
    check(input.value === "a=1\nb=2", "Multiline outdent failed");
    edit("a = ("); key("Enter"); check(input.value === "a = (\n  ", "Newline indentation failed");
    edit("a = missing"); await wait(); await wait();
    check(!get("mathSourceGoToError").hidden, "Live diagnostic not available");
    get("mathSourceGoToError").click(); check(input.selectionStart === 0, "Error navigation failed");
    edit("a = 1"); await wait(); await wait();
    check(get("mathSourceStatus").textContent === t("mathSource.valid"), "Valid source diagnostic missing");
    check(workspace.tabs.length === count + 1, "Live validation created a model");
    check(get("mathSourceClose").parentElement.id === "mathSourceHead", "Close button is not in the header");
    check(getComputedStyle(get("mathSourceHint")).fontSize === getComputedStyle(get("expressionEditorHint")).fontSize, "Hint styling differs from expression editor");
    const sourceDialog = get("mathSourceDialog");
    check(getComputedStyle(sourceDialog).resize === "both", "Dialog cannot be resized");
    const initialTextHeight = get("mathSourceText").getBoundingClientRect().height;
    sourceDialog.style.height = `${sourceDialog.getBoundingClientRect().height - 60}px`;
    check(get("mathSourceText").getBoundingClientRect().height < initialTextHeight, "Text does not follow dialog resizing");
    const head = get("mathSourceHead");
    head.setPointerCapture = () => {}; // Synthetic events do not create an active pointer.
    const beforeDrag = sourceDialog.getBoundingClientRect();
    head.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 7, button: 0, clientX: beforeDrag.left + 20, clientY: beforeDrag.top + 10, bubbles: true }));
    head.dispatchEvent(new PointerEvent("pointermove", { pointerId: 7, clientX: beforeDrag.left + 45, clientY: beforeDrag.top + 35 }));
    head.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7 }));
    check(sourceDialog.getBoundingClientRect().left > beforeDrag.left, "Dialog did not move");
    input.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 450, clientY: 300 }));
    const paste = [...get("mathSourceContextMenu").querySelectorAll("button")].find((button) => button.textContent === t("menu.edit.paste"));
    check(paste, "Missing context paste action");
    const menuRect = paste.getBoundingClientRect();
    check(document.elementFromPoint(menuRect.left + 5, menuRect.top + 5) === paste, "Context menu is not accessible above dialog");
    get("mathSourceClose").click();
    // Use the real save helper, replacing only the platform picker/handle.
    let savedText = "", savedName = "";
    supportsSaveFilePicker = () => true;
    showSaveFilePickerCompat = async (options) => {
      savedName = options.suggestedName;
      return { createWritable: async () => ({ write: async (text) => { savedText = text; }, close: async () => {} }) };
    };
    get("saveMathSourceBtn").click(); await wait();
    check(!get("mathSourceDialog").open, "Save source opened an editor");
    check(savedName.endsWith(".stgx"), "Wrong source extension");
    check(savedText.includes("output x = 1; this+1"), "Wrong exported definitions");
    check(hasUnsavedChanges() && !currentFileHandle, "Source export changed JSON save state");
    const workingPicker = showSaveFilePickerCompat;
    showSaveFilePickerCompat = async () => { throw new Error("test save failure"); };
    get("saveMathSourceBtn").click(); await wait();
    check(document.body.textContent.includes("test save failure"), "Save failure was not reported");
    showSaveFilePickerCompat = workingPicker;
    get("mathSourceClose").click();
    get("newMathSourceBtn").click();
    get("mathSourceText").value = 'a=1\n@unit a = "m"\nb=100\n@unit b = "cm"\noutput total=a+b\n@unit total = "m"';
    get("mathSourceCreate").click(); await wait();
    recalculateAfterNodeDefinitionChange();
    check(graph.nodes.find((node) => node.name === "total")?.computedValue === 2, "Unit conversion changed after import");
    // New source constructs must survive the actual editor's import/export path.
    get("newMathSourceBtn").click();
    get("mathSourceText").value = '@unitDefinition ha = "10000*m^2"\na=1\n@unit a = "ha"\nb=5000\n@unit b = "m^2"\noutput total=a+b\n@unit total = "ha"\nfunction twice(value)=value*2\noutput scaled=twice(total)';
    get("mathSourceCreate").click(); await wait();
    check(!get("mathSourceDialog").open, `Extended source import failed: ${get("mathSourceStatus").textContent}`);
    recalculateAfterNodeDefinitionChange();
    check(graph.nodes.find((node) => node.name === "total")?.computedValue === 1.5, "Custom-unit conversion failed");
    check(graph.nodes.find((node) => node.name === "scaled")?.computedValue === 3, "Local function evaluation failed");
    get("saveMathSourceBtn").click(); await wait();
    const extendedSource = savedText;
    check(extendedSource.includes("function twice(value)") && extendedSource.includes("@unitDefinition ha"), "Extended source export omitted definitions");
    get("mathSourceClose").click();
    get("newMathSourceBtn").click();
    get("mathSourceText").value = extendedSource;
    get("mathSourceCreate").click(); await wait();
    recalculateAfterNodeDefinitionChange();
    check(graph.nodes.find((node) => node.name === "total")?.computedValue === 1.5, "Custom unit lost on round trip");
    check(graph.nodes.find((node) => node.name === "scaled")?.computedValue === 3, "Local function lost on round trip");
    const tabCountBeforeError = workspace.tabs.length;
    get("newMathSourceBtn").click();
    get("mathSourceText").value = '@unitDefinition bad = "m^"\nx=1';
    get("mathSourceCreate").click(); await wait();
    check(workspace.tabs.length === tabCountBeforeError, "Invalid units created a tab");
    check(get("mathSourceStatus").textContent.includes(t("analysis.unitDefinitionReason.syntax")), "Unit diagnostic is not localized");
    await fetch("/__result", { method: "POST", body: JSON.stringify({ ok: true }) });
  } catch (error) {
    await fetch("/__result", { method: "POST", body: JSON.stringify({ ok: false, error: error.message, stack: error.stack }) });
  }
}

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "stgraphx-math-browser-"));
  let browser, timer, resolveResult, rejectResult;
  const result = new Promise((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === "/__result") {
        let body = "";
        for await (const chunk of req) body += chunk;
        res.end("ok"); resolveResult(JSON.parse(body)); return;
      }
      const url = new URL(req.url, "http://localhost");
      const relative = url.pathname === "/__test" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\//, "");
      const filename = path.resolve(root, relative);
      if (!filename.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end(); return; }
      let data = await fs.readFile(filename);
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".wasm": "application/wasm" };
      res.setHeader("Content-Type", types[path.extname(filename)] || "application/octet-stream");
      if (url.pathname === "/__test") data = data.toString().replace("</body>", `<script>(${exerciseEditor.toString()})();</script></body>`);
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const url = `http://127.0.0.1:${server.address().port}/__test`;
    browser = spawn(process.env.STGRAPHX_FIREFOX || "firefox", ["--headless", "--no-remote", "--profile", profile, url], { stdio: "ignore" });
    browser.once("error", rejectResult);
    browser.once("exit", (code) => rejectResult(new Error(`Firefox exited before test completion (${code})`)));
    timer = setTimeout(() => rejectResult(new Error("Browser test timed out")), 30000);
    const response = await result;
    assert.equal(response.ok, true, `${response.error || ""}\n${response.stack || ""}`);
    console.log("math-source-browser.test.js: ok");
  } finally {
    clearTimeout(timer);
    if (browser?.pid && browser.exitCode === null) {
      const exited = new Promise((resolve) => browser.once("exit", resolve));
      browser.kill("SIGTERM");
      await exited;
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(profile, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
