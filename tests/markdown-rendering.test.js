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

const canvasFormula = renderMarkdownToHtml("$x^2$", { latexOutput: "html" });
assert.match(canvasFormula, /katex-html/, "HTML-only LaTeX output must retain the visual KaTeX markup");
assert.doesNotMatch(canvasFormula, /katex-mathml/, "HTML-only LaTeX output must omit MathML for SVG foreignObject compatibility");

const safariCanvasFormula = renderMarkdownToHtml("$x^2$", { latexOutput: "mathml" });
assert.match(safariCanvasFormula, /<math /, "MathML LaTeX output must be available for Safari SVG foreignObject rendering");
assert.doesNotMatch(safariCanvasFormula, /katex-html/, "MathML-only LaTeX output must not rely on KaTeX HTML styles");

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

const dynamicValue = renderMarkdownToHtml("Valore: {{temperatura}}", {
  resolveVariable: (name) => name === "temperatura" ? { text: "21.5", title: "temperatura" } : null,
});
assert.match(dynamicValue, /data-stgraphx-variable="temperatura"/, "dynamic variable references must be rendered");
assert.match(dynamicValue, />21\.5<\//, "dynamic variable values must use the resolver output");

const dynamicFormula = renderMarkdownToHtml("$y = {{temperatura}}x$", {
  resolveVariable: (name) => name === "temperatura" ? { text: "21.5" } : null,
});
assert.match(dynamicFormula, /21\.5/, "dynamic references must be resolved before inline LaTeX rendering");
assert.doesNotMatch(dynamicFormula, /data-stgraphx-variable/, "dynamic formula values must not be inserted as HTML inside KaTeX");

const heading4 = renderMarkdownToHtml("#### Fourth-level heading");
assert.match(heading4, /<h4>Fourth-level heading<\/h4>/, "fourth-level headings must be rendered");

const softBreak = renderMarkdownToHtml("Prima riga\nseconda riga");
assert.equal(softBreak, "<p>Prima riga seconda riga</p>", "a plain newline must be a Markdown soft break");
const hardBreak = renderMarkdownToHtml("Prima riga  \nseconda riga");
assert.equal(hardBreak, "<p>Prima riga<br>seconda riga</p>", "two trailing spaces must create a Markdown hard break");

const table = renderMarkdownToHtml("| Funzione | Valore |\n| :--- | ---: |\n| `pow(2, 3)` | **8** |\n\nDopo la tabella.");
assert.match(table, /<thead><tr><th style="text-align:left">Funzione/);
assert.match(table, /<td style="text-align:right"><strong>8<\/strong><\/td>/);
assert.match(table, /<p>Dopo la tabella\.<\/p>/);
const pipes = renderMarkdownToHtml("| Espressione | Testo |\n| --- | --- |\n| `x |> abs(_)` | a\\|b |");
assert.match(pipes, /<code>x \|&gt; abs\(_\)<\/code>/);
assert.match(pipes, />a\|b<\/td>/);
assert.equal((pipes.match(/<td /g) || []).length, 2);
assert.doesNotMatch(renderMarkdownToHtml("```text\n| A | B |\n| --- | --- |\n```"), /<table>/);
assert.doesNotMatch(renderMarkdownToHtml("a | b\nnot a table"), /<table>/);

const picture = renderMarkdownToHtml('![A "diagram"](figures/example.svg)', { imageBasePath: "docs/" });
assert.match(picture, /src="docs\/figures\/example.svg"/);
assert.match(picture, /alt="A &quot;diagram&quot;"/);
assert.doesNotMatch(renderMarkdownToHtml('![unsafe](javascript:alert)'), /<img/);
assert.doesNotMatch(renderMarkdownToHtml('![unsafe](data:image\/svg+xml,test)'), /<img/);
assert.doesNotMatch(renderMarkdownToHtml('`![example](image.svg)`'), /<img/);

const fs = require("fs");
const path = require("path");
const introduction = fs.readFileSync(path.join(__dirname, "../docs/introduzione-pensiero-funzionale.md"), "utf8");
const introductionHtml = renderMarkdownToHtml(introduction, { mermaid: true });
assert.equal((introductionHtml.match(/<table>/g) || []).length, 1);
assert.equal((introductionHtml.match(/data-mermaid="true"/g) || []).length, 4);
assert.doesNotMatch(introductionHtml, /<img /);
const diagramSource = '```mermaid\nflowchart LR\n A["<script>alert(1)</script>"] --> B\n```';
assert.doesNotMatch(renderMarkdownToHtml(diagramSource), /data-mermaid/);
assert.match(renderMarkdownToHtml(diagramSource, { mermaid: true }), /&lt;script&gt;/);
assert.doesNotMatch(renderMarkdownToHtml(diagramSource, { mermaid: true }), /<script>/);
assert.doesNotMatch(renderMarkdownToHtml('```text\nflowchart LR\n```', { mermaid: true }), /data-mermaid/);
console.log("markdown-rendering.test.js: ok");
