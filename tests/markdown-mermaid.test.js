"use strict";

const assert = require("node:assert/strict");
require("../markdown-rendering.js");
const { renderMermaidDiagrams } = globalThis.STGraphXMarkdown;

function fixture(sources) {
  const children = sources.map((textContent) => ({ textContent }));
  const container = {
    children,
    querySelectorAll: () => children.filter((item) => item.textContent !== undefined),
    contains: (item) => children.includes(item),
  };
  children.forEach((block) => {
    block.replaceWith = (node) => { children.splice(children.indexOf(block), 1, node); };
  });
  return container;
}

globalThis.document = { createElement: () => ({ className: "", innerHTML: "" }) };
const calls = [];
let initializations = 0;
let pendingRender;
globalThis.mermaid = {
  initialize(config) {
    initializations += 1;
    assert.equal(config.securityLevel, "strict");
    assert.equal(config.startOnLoad, false);
    assert.equal(config.htmlLabels, false);
  },
  async render(id, source) {
    calls.push({ id, source });
    if (source === "invalid") throw new Error("invalid diagram");
    if (source === "pending") await new Promise((resolve) => { pendingRender = resolve; });
    return { svg: `<svg id="${id}"></svg>` };
  },
};

(async () => {
  await renderMermaidDiagrams(fixture([]));
  assert.equal(initializations, 0, "ordinary documentation must not load Mermaid");
  const content = fixture(["flowchart LR\n A --> B", "invalid", "flowchart LR\n C --> D"]);
  const errors = [];
  await renderMermaidDiagrams(content, { onError: (block) => errors.push(block.textContent) });
  assert.equal(initializations, 1);
  assert.equal(content.children[0].className, "markdown-mermaid");
  assert.equal(content.children[1].textContent, "invalid", "retain source after a diagram error");
  assert.equal(content.children[2].className, "markdown-mermaid", "continue after an invalid diagram");
  assert.deepEqual(errors, ["invalid"]);
  assert.equal(new Set(calls.map(({ id }) => id)).size, calls.length, "SVG IDs must be unique");

  const obsolete = fixture(["never rendered"]);
  const callCount = calls.length;
  await renderMermaidDiagrams(obsolete, { isCurrent: () => false });
  assert.equal(calls.length, callCount);

  let current = true;
  const pending = fixture(["pending"]);
  const rendering = renderMermaidDiagrams(pending, { isCurrent: () => current });
  await new Promise((resolve) => setImmediate(resolve));
  current = false;
  pendingRender();
  await rendering;
  assert.equal(pending.children[0].textContent, "pending", "a late result must not replace a newer document");
  console.log("markdown-mermaid.test.js: ok");
})().catch((error) => { console.error(error); process.exitCode = 1; });
