/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */
(() => {
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function safeHref(value) { const href = String(value ?? "").trim(); return /^(https?:|mailto:|#)/iu.test(href) ? href : ""; }
  function renderLatex(source, displayMode = false) {
    const latex = String(source ?? "").trim();
    if (!latex) return "";
    if (typeof globalThis.katex?.renderToString !== "function") {
      return `<code class="latex-fallback">${escapeHtml(latex)}</code>`;
    }
    try {
      return globalThis.katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: "ignore",
      });
    } catch (_err) {
      return `<code class="latex-error">${escapeHtml(latex)}</code>`;
    }
  }
  function renderInlineMarkdown(value) {
    const fragments = [];
    const stash = (html) => {
      const token = `\u0000M${fragments.length}\u0000`;
      fragments.push(html);
      return token;
    };
    let source = String(value ?? "");
    source = source.replace(/`([^`]+)`/g, (_m, code) => stash(`<code>${escapeHtml(code)}</code>`));
    source = source.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_m, prefix, latex) => (
      `${prefix}${stash(renderLatex(latex, false))}`
    ));
    let html = escapeHtml(source);
    html = html.replace(/\[\[([^\[\]\n]+)\]\]/g, (_m, nodeSpec) => {
      const [rawName, ...rawLabel] = String(nodeSpec).split("|");
      const name = rawName.trim();
      const label = rawLabel.join("|").trim() || name;
      return name ? `<a href="#" class="markdown-node-ref" data-stgraphx-node="${escapeHtml(name)}">${label}</a>` : "";
    });
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => { const safe = safeHref(href); return safe ? `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label; });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>").replace(/~~([^~]+)~~/g, "<s>$1</s>").replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/_([^_]+)_/g, "<em>$1</em>");
    return html.replace(/\u0000M(\d+)\u0000/g, (_m, index) => fragments[Number(index)] || "");
  }
  function renderMarkdownToHtml(markdown) {
    const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n"); const output = []; let paragraph = []; let list = null; let inCode = false; let codeLines = []; let inMath = false; let mathLines = [];
    const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`); paragraph = []; } };
    const flushList = () => { if (list) { output.push(`<${list.type}>${list.items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${list.type}>`); list = null; } };
    const flushCode = () => { if (inCode) { output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`); inCode = false; codeLines = []; } };
    const flushMath = () => { if (inMath) { output.push(`<div class="latex-block">${renderLatex(mathLines.join("\n"), true)}</div>`); inMath = false; mathLines = []; } };
    lines.forEach((line) => {
      if (inMath) { if (/^\s*\$\$\s*$/.test(line)) flushMath(); else mathLines.push(line); return; }
      if (/^```/.test(line)) { if (inCode) flushCode(); else { flushParagraph(); flushList(); inCode = true; } return; }
      if (inCode) { codeLines.push(line); return; }
      const oneLineMath = /^\s*\$\$\s*(.*?)\s*\$\$\s*$/.exec(line);
      if (oneLineMath) { flushParagraph(); flushList(); output.push(`<div class="latex-block">${renderLatex(oneLineMath[1], true)}</div>`); return; }
      if (/^\s*\$\$\s*$/.test(line)) { flushParagraph(); flushList(); inMath = true; mathLines = []; return; }
      const heading = /^(#{1,3})\s+(.+)$/.exec(line); const unordered = /^\s*[-*+]\s+(.+)$/.exec(line); const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
      if (heading) { flushParagraph(); flushList(); const level = heading[1].length; output.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`); }
      else if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushParagraph(); flushList(); output.push("<hr>"); }
      else if (unordered || ordered) { flushParagraph(); const type = unordered ? "ul" : "ol"; if (!list || list.type !== type) { flushList(); list = { type, items: [] }; } list.items.push((unordered || ordered)[1]); }
      else if (!line.trim()) { flushParagraph(); flushList(); }
      else if (/^>\s?/.test(line)) { flushParagraph(); flushList(); output.push(`<blockquote>${renderInlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`); }
      else { flushList(); paragraph.push(line); }
    }); flushParagraph(); flushList(); flushCode(); flushMath(); return output.join("\n");
  }
  function legacyHtmlToMarkdown(rawHtml) {
    if (typeof document === "undefined") return String(rawHtml ?? "");
    const template = document.createElement("template"); template.innerHTML = String(rawHtml ?? "");
    function convert(node) { if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || ""; if (node.nodeType !== Node.ELEMENT_NODE) return ""; const content = Array.from(node.childNodes).map(convert).join(""); switch (node.tagName) { case "H1": return `# ${content}\n\n`; case "H2": return `## ${content}\n\n`; case "H3": return `### ${content}\n\n`; case "P": case "DIV": return `${content}\n\n`; case "BR": return "\n"; case "STRONG": case "B": return `**${content}**`; case "EM": case "I": return `*${content}*`; case "LI": return `- ${content}\n`; case "HR": return "\n---\n\n"; default: return content; } }
    return Array.from(template.content.childNodes).map(convert).join("").replace(/\n{3,}/g, "\n\n").trim();
  }
  globalThis.STGraphXMarkdown = { renderMarkdownToHtml, legacyHtmlToMarkdown };
})();
