"use strict";

const assert = require("assert");

globalThis.katex = require("katex");
require("../markdown-rendering.js");

const { renderMarkdownToHtml } = globalThis.STGraphXMarkdown;

const inline = renderMarkdownToHtml("Il valore e $x^2 + y^2$.");
assert.match(inline, /class="katex"/, "inline LaTeX must use the KaTeX renderer");

const block = renderMarkdownToHtml("$$\\frac{d x}{d t}=v$$");
assert.match(block, /latex-block/, "block LaTeX must be wrapped as a display formula");
assert.match(block, /katex-display/, "block LaTeX must use display mode");

const code = renderMarkdownToHtml("`$x^2$`");
assert.match(code, /<code>\$x\^2\$<\/code>/, "inline code must not be interpreted as LaTeX");

console.log("markdown-rendering.test.js: ok");
