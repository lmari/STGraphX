/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */
(() => {
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function safeHref(value) {
    const href = String(value ?? "").trim();
    if (!href || /^(?:javascript|data|vbscript):/iu.test(href) || href.startsWith("//")) return "";
    return /^(?:https?:|mailto:|#)/iu.test(href) || !/^[a-z][a-z0-9+.-]*:/iu.test(href) ? href : "";
  }
  function renderLatex(source, displayMode = false, output = "htmlAndMathml") {
    const latex = String(source ?? "").trim();
    if (!latex) return "";
    if (typeof globalThis.katex?.renderToString !== "function") {
      return `<code class="latex-fallback">${escapeHtml(latex)}</code>`;
    }
    try {
      return globalThis.katex.renderToString(latex, {
        displayMode,
        output: ["html", "mathml", "htmlAndMathml"].includes(output) ? output : "htmlAndMathml",
        throwOnError: false,
        strict: "ignore",
      });
    } catch (_err) {
      return `<code class="latex-error">${escapeHtml(latex)}</code>`;
    }
  }
  function resolveDynamicValueText(source, resolveVariable) {
    if (typeof resolveVariable !== "function") return String(source ?? "");
    return String(source ?? "").replace(/\{\{([^{}|\n]+)\}\}/g, (raw, rawName) => {
      const name = String(rawName ?? "").trim();
      if (!name) return raw;
      const resolved = resolveVariable(name);
      return resolved && typeof resolved.text === "string" ? resolved.text : raw;
    });
  }
  function renderInlineMarkdown(value, options = {}) {
    const fragments = [];
    const stash = (html) => {
      const token = `\u0000M${fragments.length}\u0000`;
      fragments.push(html);
      return token;
    };
    let source = String(value ?? "");
    const resolveVariable = typeof options.resolveVariable === "function" ? options.resolveVariable : null;
    // Protect code spans before looking for inline math delimiters.
    source = source.replace(/`([^`]+)`/g, (_m, code) => stash(`<code>${escapeHtml(code)}</code>`));
    // Resolve only the contents of formulas before passing them to KaTeX.
    // Outside formulas the same syntax becomes a styled live-value element.
    if (resolveVariable) {
      source = source.replace(/\$([^$\n]+?)\$/g, (_match, latex) => (
        `$${resolveDynamicValueText(latex, resolveVariable)}$`
      ));
    }
    source = source.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_m, prefix, latex) => (
      `${prefix}${stash(renderLatex(latex, false, options.latexOutput))}`
    ));
    if (resolveVariable) {
      source = source.replace(/\{\{([^{}|\n]+)\}\}/g, (raw, rawName) => {
        const name = String(rawName ?? "").trim();
        if (!name) return raw;
        const resolved = resolveVariable(name);
        if (!resolved || typeof resolved.text !== "string") return raw;
        const tone = resolved.error ? " markdown-variable-value-error" : "";
        const title = escapeHtml(resolved.title || name);
        return stash(`<span class="markdown-variable-value${tone}" data-stgraphx-variable="${escapeHtml(name)}" title="${title}">${escapeHtml(resolved.text)}</span>`);
      });
    }
    let html = escapeHtml(source);
    html = html.replace(/\[\[([^\[\]\n]+)\]\]/g, (_m, nodeSpec) => {
      const [rawName, ...rawLabel] = String(nodeSpec).split("|");
      const name = rawName.trim();
      const label = rawLabel.join("|").trim() || name;
      return name ? stash(`<a href="#" class="markdown-node-ref" data-stgraphx-node="${escapeHtml(name)}">${label}</a>`) : "";
    });
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
      const safe = safeHref(href);
      return safe ? stash(`<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`) : label;
    });
    // Documentation also contains plain http(s) addresses.  Turn those into
    // normal external links after Markdown links have been stashed, so URLs
    // already used as a link target are never processed twice.
    html = html.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+)/giu, (_m, prefix, rawHref) => {
      const trailing = rawHref.match(/[.,;:!?]+$/u)?.[0] || "";
      const href = rawHref.slice(0, rawHref.length - trailing.length);
      const safe = safeHref(href);
      return safe
        ? `${prefix}${stash(`<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(href)}</a>`)}${trailing}`
        : `${prefix}${rawHref}`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>").replace(/~~([^~]+)~~/g, "<s>$1</s>").replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/_([^_]+)_/g, "<em>$1</em>");
    return html.replace(/\u0000M(\d+)\u0000/g, (_m, index) => fragments[Number(index)] || "");
  }
  function renderMarkdownToHtml(markdown, options = {}) {
    const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n"); const output = []; let paragraph = []; let list = null; let inCode = false; let codeLines = []; let inMath = false; let mathLines = [];
    const flushParagraph = () => { if (paragraph.length) { output.push(`<p>${paragraph.map((item) => renderInlineMarkdown(item, options)).join("<br>")}</p>`); paragraph = []; } };
    const flushList = () => { if (list) { output.push(`<${list.type}>${list.items.map((item) => `<li>${renderInlineMarkdown(item, options)}</li>`).join("")}</${list.type}>`); list = null; } };
    const flushCode = () => { if (inCode) { output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`); inCode = false; codeLines = []; } };
    const flushMath = () => { if (inMath) { output.push(`<div class="latex-block">${renderLatex(resolveDynamicValueText(mathLines.join("\n"), options.resolveVariable), true, options.latexOutput)}</div>`); inMath = false; mathLines = []; } };
    lines.forEach((line) => {
      if (inMath) { if (/^\s*\$\$\s*$/.test(line)) flushMath(); else mathLines.push(line); return; }
      if (/^```/.test(line)) { if (inCode) flushCode(); else { flushParagraph(); flushList(); inCode = true; } return; }
      if (inCode) { codeLines.push(line); return; }
      const oneLineMath = /^\s*\$\$\s*(.*?)\s*\$\$\s*$/.exec(line);
      if (oneLineMath) { flushParagraph(); flushList(); output.push(`<div class="latex-block">${renderLatex(resolveDynamicValueText(oneLineMath[1], options.resolveVariable), true, options.latexOutput)}</div>`); return; }
      if (/^\s*\$\$\s*$/.test(line)) { flushParagraph(); flushList(); inMath = true; mathLines = []; return; }
      const heading = /^(#{1,4})\s+(.+)$/.exec(line); const unordered = /^\s*[-*+]\s+(.+)$/.exec(line); const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
      if (heading) { flushParagraph(); flushList(); const level = heading[1].length; output.push(`<h${level}>${renderInlineMarkdown(heading[2], options)}</h${level}>`); }
      else if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushParagraph(); flushList(); output.push("<hr>"); }
      else if (unordered || ordered) { flushParagraph(); const type = unordered ? "ul" : "ol"; if (!list || list.type !== type) { flushList(); list = { type, items: [] }; } list.items.push((unordered || ordered)[1]); }
      else if (!line.trim()) { flushParagraph(); flushList(); }
      else if (/^>\s?/.test(line)) { flushParagraph(); flushList(); output.push(`<blockquote>${renderInlineMarkdown(line.replace(/^>\s?/, ""), options)}</blockquote>`); }
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
