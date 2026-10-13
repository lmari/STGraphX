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

const localLink = renderMarkdownToHtml("[Guide](README-USAGE.md)");
assert.match(localLink, /href="README-USAGE\.md"/, "relative documentation links must be preserved");
assert.match(localLink, /target="_blank"/, "link attributes must not be altered by inline formatting");

const unsafeLink = renderMarkdownToHtml("[Unsafe](javascript:alert(1))");
assert.doesNotMatch(unsafeLink, /javascript:/i, "unsafe link protocols must remain blocked");

const plainExternalLink = renderMarkdownToHtml("Apri https://example.test/guida.");
assert.match(plainExternalLink, /href="https:\/\/example\.test\/guida"/, "plain http(s) addresses must become links");
assert.match(plainExternalLink, />https:\/\/example\.test\/guida<\//, "a plain URL label must exclude trailing punctuation");

const heading4 = renderMarkdownToHtml("#### Fourth-level heading");
assert.match(heading4, /<h4>Fourth-level heading<\/h4>/, "fourth-level headings must be rendered");

console.log("markdown-rendering.test.js: ok");
