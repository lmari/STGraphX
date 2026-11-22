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
    importGraphData({version:1,execution:{decimals:2},nodes:[
      {id:1,name:"m",type:"algebraic",output:true,valueExpression:"[[0,1],[2,3]]"},
    ],edges:[],widgets:[{id:1,type:"matrix",source:"m",x:80,y:80,width:300,height:240,
      viewMode:"surface",surfaceAzimuth:45.123456789,surfaceElevation:32.987654321}]});
    render(); selectSingleNode(1); openExpressionEditor("value"); setExpressionSidebarCollapsed(false);
    await wait();
    const docs = document.getElementById("expressionMainDocs");
    const card = document.querySelector(".expression-editor-card");
    function checkSideBySide(mode) {
      const left = document.getElementById("expressionDescriptionBox").getBoundingClientRect();
      const right = document.getElementById("expressionFormulaNotesBox").getBoundingClientRect();
      check(getComputedStyle(docs).display === "grid", `Missing notes grid: ${mode}`);
      check(left.width > 0 && right.width > 0 && Math.abs(left.top-right.top)<1 && left.right<=right.left,
        `Description and formula notes are stacked: ${mode}`);
    }
    checkSideBySide("desktop");
    card.style.width = "600px"; checkSideBySide("narrow editor");
    document.body.classList.add("tablet-sidebar-layout");
    setExpressionEditorView("notes", {focus:false});
    checkSideBySide("tablet notes");
    document.body.classList.remove("tablet-sidebar-layout"); closeExpressionEditor();
    selectWidget(1); refreshSidebar();
    const angleInput = () => document.querySelector('#widgetConfig input[min="-180"][max="180"]');
    const elevationInput = () => document.querySelector('#widgetConfig input[min="5"][max="85"]');
    check(angleInput()?.value === "45.12", `Azimuth not formatted: ${angleInput()?.value}`);
    check(elevationInput()?.value === "32.99", `Elevation not formatted: ${elevationInput()?.value}`);
    check(graph.widgets[0].surfaceAzimuth===45.123456789, "Display formatting changed stored precision");
    graph.execution.decimals=0; refreshSidebar();
    check(angleInput().value==="45" && elevationInput().value==="33", "Zero-decimal format ignored");
    graph.execution.decimals=3; refreshSidebar();
    check(angleInput().value==="45.123", "Three-decimal format ignored");
    angleInput().value="12.3456789"; angleInput().dispatchEvent(new Event("change",{bubbles:true}));
    check(angleInput().value==="12.346", "Edited angle not formatted");
    check(graph.widgets[0].surfaceAzimuth===12.3456789, "Manual input lost precision");
    await fetch("/__result", {method:"POST",body:JSON.stringify({ok:true})});
  } catch(error) {
    await fetch("/__result", {method:"POST",body:JSON.stringify({ok:false,error:error.message,stack:error.stack})});
  }
}

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "stgraphx-editor-browser-"));
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
    console.log("editor-layout-browser.test.js: ok");
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
