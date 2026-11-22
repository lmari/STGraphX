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
    source = source.replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, (_match, alt, href) => {
      const safe = safeHref(href);
      if (!safe || /^(?:mailto:|#)/iu.test(safe)) return alt;
      const src = options.imageBasePath && !/^(?:[a-z][a-z0-9+.-]*:|\/)/iu.test(safe)
        ? `${options.imageBasePath}${safe}` : safe;
      return stash(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`);
    });
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
  function tableCells(line) {
    let source = String(line).trim();
    if (source.startsWith("|")) source = source.slice(1);
    if (source.endsWith("|") && !source.endsWith("\\|")) source = source.slice(0, -1);
    const cells = []; let cell = ""; let ticks = 0;
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] === "\\" && source[i + 1] === "|") { cell += "|"; i += 1; }
      else if (source[i] === "`") {
        const run = source.slice(i).match(/^`+/u)[0];
        ticks = ticks === run.length ? 0 : ticks || run.length;
        cell += run; i += run.length - 1;
      } else if (source[i] === "|" && !ticks) { cells.push(cell.trim()); cell = ""; }
      else cell += source[i];
    }
    cells.push(cell.trim());
    return cells;
  }
  function renderMarkdownToHtml(markdown, options = {}) {
    const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n"); const output = []; let paragraph = []; let list = null; let inCode = false; let codeLines = []; let codeLanguage = ""; let inMath = false; let mathLines = [];
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const html = paragraph.map((item, index) => {
        // A plain newline is a soft break in Markdown. Two trailing spaces
        // make it an explicit line break, as used in the introductions.
        const hardBreak = / {2,}$/u.test(item);
        const source = item.replace(/[ \t]+$/u, "");
        const separator = index === paragraph.length - 1 ? "" : (hardBreak ? "<br>" : " ");
        return `${renderInlineMarkdown(source, options)}${separator}`;
      }).join("");
      output.push(`<p>${html}</p>`);
      paragraph = [];
    };
    const flushList = () => { if (list) { output.push(`<${list.type}>${list.items.map((item) => `<li>${renderInlineMarkdown(item, options)}</li>`).join("")}</${list.type}>`); list = null; } };
    const flushCode = () => {
      if (!inCode) return;
      const diagram = options.mermaid && codeLanguage === "mermaid" ? ' data-mermaid="true"' : "";
      output.push(`<pre${diagram}><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      inCode = false; codeLines = []; codeLanguage = "";
    };
    const flushMath = () => { if (inMath) { output.push(`<div class="latex-block">${renderLatex(resolveDynamicValueText(mathLines.join("\n"), options.resolveVariable), true, options.latexOutput)}</div>`); inMath = false; mathLines = []; } };
    let skipThrough = -1;
    lines.forEach((line, index) => {
      if (index <= skipThrough) return;
      if (inMath) { if (/^\s*\$\$\s*$/.test(line)) flushMath(); else mathLines.push(line); return; }
      if (/^```/.test(line)) { if (inCode) flushCode(); else { flushParagraph(); flushList(); inCode = true; codeLanguage = line.slice(3).trim().toLowerCase(); } return; }
      if (inCode) { codeLines.push(line); return; }
      if (line.includes("|") && index + 1 < lines.length) {
        const headers = tableCells(line);
        const separators = tableCells(lines[index + 1]);
        if (headers.length === separators.length && separators.every((cell) => /^:?-{3,}:?$/u.test(cell))) {
          flushParagraph(); flushList();
          const cellHtml = (cell, col, tag) => {
            const separator = separators[col];
            const align = separator.endsWith(":") ? (separator.startsWith(":") ? "center" : "right") : "left";
            return `<${tag} style="text-align:${align}">${renderInlineMarkdown(cell, options)}</${tag}>`;
          };
          const rows = [];
          skipThrough = index + 1;
          while (skipThrough + 1 < lines.length && lines[skipThrough + 1].includes("|") && !/^\s*```/u.test(lines[skipThrough + 1])) {
            const cells = tableCells(lines[++skipThrough]);
            rows.push(`<tr>${headers.map((_header, col) => cellHtml(cells[col] || "", col, "td")).join("")}</tr>`);
          }
          output.push(`<div class="markdown-table-scroll"><table><thead><tr>${headers.map((cell, col) => cellHtml(cell, col, "th")).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`);
          return;
        }
      }
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
  // A classic, locally bundled script also works in file:// desktop shells.
  const scriptUrl = typeof document !== "undefined" ? document.currentScript?.src || document.baseURI : "";
  let mermaidReady = null;
  let diagramId = 0;
  function loadMermaid() {
    if (!mermaidReady) {
      mermaidReady = new Promise((resolve, reject) => {
        const initialize = () => {
          try {
            const api = globalThis.mermaid;
            api.initialize({
              startOnLoad: false, securityLevel: "strict", suppressErrorRendering: true,
              htmlLabels: false, theme: "neutral",
              secure: ["securityLevel", "startOnLoad", "suppressErrorRendering", "maxTextSize", "htmlLabels", "secure"],
            });
            resolve(api);
          } catch (error) { reject(error); }
        };
        if (globalThis.mermaid) { initialize(); return; }
        const script = document.createElement("script");
        script.src = new URL("vendor/mermaid/mermaid.min.js", scriptUrl).href;
        script.onload = initialize;
        script.onerror = () => { script.remove(); reject(new Error("Unable to load Mermaid")); };
        document.head.appendChild(script);
      }).catch((error) => { mermaidReady = null; throw error; });
    }
    return mermaidReady;
  }
  async function renderMermaidDiagrams(container, options = {}) {
    const blocks = Array.from(container.querySelectorAll("pre[data-mermaid]"));
    if (!blocks.length) return;
    const current = (block) => container.contains(block) && (!options.isCurrent || options.isCurrent());
    for (const block of blocks) {
      if (!current(block)) return;
      try {
        const api = await loadMermaid();
        if (!current(block)) return;
        const { svg } = await api.render(`stgraphx-mermaid-${++diagramId}`, block.textContent);
        if (!current(block)) return;
        const diagram = document.createElement("div");
        diagram.className = "markdown-mermaid";
        diagram.innerHTML = svg;
        block.replaceWith(diagram);
      } catch (error) {
        if (current(block)) options.onError?.(block, error);
      }
    }
  }
  globalThis.STGraphXMarkdown = { renderMarkdownToHtml, legacyHtmlToMarkdown, renderMermaidDiagrams };
})();
