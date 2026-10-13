/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initHelpContentModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXHelpContent = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createHelpContentExports() {
  const EXAMPLE_CATALOG_PATH = "examples/examples-catalog.json";
  const EXAMPLE_STYLE_PATH = "examples/examples-help.css";
  const EIGHT_TUPLE_TEMPLATE_PATH = "help/eight-tuple-template.json";
  const DOCUMENTATION_ENTRY_PATH = "README.md";
  const DOCUMENTATION_PATHS = new Set([
    "README.md",
    "QUICK-START.md",
    "QUICK-START-USERS.md",
    "QUICK-START-DEVELOPERS.md",
    "README-ARCHITECTURE.md",
    "README-PLAYER.md",
    "README-USAGE.md",
    "README-CONVERSION.md",
    "docs/QUICK-FUNCTION-REFERENCE.md",
    "docs/RIFERIMENTO-RAPIDO-FUNZIONI.md",
  ]);
  const EXAMPLE_LAYOUT_VARIANTS = new Set(["list", "compact", "stack"]);
  const EXAMPLES_HELP_STYLE_TAG_ID = "examples-help-external-style";

  function createHelpContentHelpers(options = {}) {
    let eightTupleTemplateCache = null;

    const t = typeof options.t === "function" ? options.t : (key) => key;
    const hasPlatformApi = typeof options.hasPlatformApi === "function" ? options.hasPlatformApi : () => false;
    const getCurrentLang = typeof options.getCurrentLang === "function" ? options.getCurrentLang : () => "it";
    const openPreparedJsonEntryInNewTab = typeof options.openPreparedJsonEntryInNewTab === "function"
      ? options.openPreparedJsonEntryInNewTab
      : async () => false;
    const setStatus = typeof options.setStatus === "function" ? options.setStatus : () => {};
    const setStatusKey = typeof options.setStatusKey === "function" ? options.setStatusKey : () => {};
    const closeTopMenus = typeof options.closeTopMenus === "function" ? options.closeTopMenus : () => {};
    const normalizeJsonFilename = typeof options.normalizeJsonFilename === "function"
      ? options.normalizeJsonFilename
      : (value) => String(value || "model.json");
    const copyTextToClipboard = typeof options.copyTextToClipboard === "function"
      ? options.copyTextToClipboard
      : async () => false;
    const supportsSaveFilePicker = typeof options.supportsSaveFilePicker === "function"
      ? options.supportsSaveFilePicker
      : () => false;
    const showSaveFilePickerCompat = typeof options.showSaveFilePickerCompat === "function"
      ? options.showSaveFilePickerCompat
      : async () => null;
    const writeTextToFileHandle = typeof options.writeTextToFileHandle === "function"
      ? options.writeTextToFileHandle
      : async () => false;
    const getGraph = typeof options.getGraph === "function" ? options.getGraph : () => ({ nodes: [], localFunctions: [], execution: {} });
    const getCurrentFileName = typeof options.getCurrentFileName === "function" ? options.getCurrentFileName : () => "";
    const getCurrentModelTitle = typeof options.getCurrentModelTitle === "function" ? options.getCurrentModelTitle : () => "";
    const getNodeDescription = typeof options.getNodeDescription === "function" ? options.getNodeDescription : () => "";
    const isStateNode = typeof options.isStateNode === "function" ? options.isStateNode : () => false;
    const isAlgebraicNode = typeof options.isAlgebraicNode === "function" ? options.isAlgebraicNode : () => false;
    const isSubmodelNode = typeof options.isSubmodelNode === "function" ? options.isSubmodelNode : () => false;
    const openExternalUrl = typeof options.openExternalUrl === "function"
      ? options.openExternalUrl
      : async (url) => {
        const popup = window.open(String(url ?? ""), "_blank", "noopener,noreferrer");
        if (popup) popup.opener = null;
        return Boolean(popup);
      };
    const hasExternalUrlOpener = typeof options.hasExternalUrlOpener === "function"
      ? options.hasExternalUrlOpener
      : () => false;
    const documentationHelpModal = options.documentationHelpModal || null;
    const documentationHelpTitle = options.documentationHelpTitle || null;
    const documentationHelpPath = options.documentationHelpPath || null;
    const documentationHelpContent = options.documentationHelpContent || null;
    const documentationHelpBackBtn = options.documentationHelpBackBtn || null;
    const documentationHelpForwardBtn = options.documentationHelpForwardBtn || null;
    const examplesHelpModal = options.examplesHelpModal || null;
    const examplesHelpTitle = options.examplesHelpTitle || null;
    const examplesHelpIntro = options.examplesHelpIntro || null;
    const examplesHelpContent = options.examplesHelpContent || null;
    const eightTupleModal = options.eightTupleModal || null;
    const eightTupleContent = options.eightTupleContent || null;
    const eightTupleCopyBtn = options.eightTupleCopyBtn || null;
    const eightTupleExportBtn = options.eightTupleExportBtn || null;
    const aboutAppModal = options.aboutAppModal || null;
    const aboutAppVersionValue = options.aboutAppVersionValue || null;
    const aboutAppAuthorValue = options.aboutAppAuthorValue || null;
    const aboutAppLicenseValue = options.aboutAppLicenseValue || null;
    const aboutAppCopyrightValue = options.aboutAppCopyrightValue || null;
    const documentationHistory = [];
    let documentationHistoryIndex = -1;
    let documentationRequestId = 0;

    function localizedRecordText(record) {
      if (typeof record === "string") {
        return record.trim();
      }
      if (!record || typeof record !== "object") {
        return "";
      }
      const currentLang = String(getCurrentLang() || "it");
      return String(record[currentLang] ?? record.en ?? record.it ?? "").trim();
    }

    function normalizeExampleEntry(entry) {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const file = String(entry.file || "").trim();
      if (!file) {
        return null;
      }
      return {
        file,
        label: localizedRecordText(entry.label ?? entry.title) || file,
        summary: localizedRecordText(entry.summary ?? entry.description),
      };
    }

    function normalizeExamplesLayout(layout) {
      const source = layout && typeof layout === "object" ? layout : {};
      const variant = String(source.variant || "").trim();
      return {
        variant: EXAMPLE_LAYOUT_VARIANTS.has(variant) ? variant : "list",
        showPaths: source.showPaths !== false,
        dense: source.dense === true,
        openLabel: localizedRecordText(source.openLabel) || "",
      };
    }

    function normalizeExamplesCatalog(parsed) {
      if (Array.isArray(parsed)) {
        return {
          title: "",
          intro: "",
          layout: normalizeExamplesLayout(null),
          entries: parsed.map(normalizeExampleEntry).filter(Boolean),
          sections: [],
        };
      }
      if (!parsed || typeof parsed !== "object") {
        return {
          title: "",
          intro: "",
          layout: normalizeExamplesLayout(null),
          entries: [],
          sections: [],
        };
      }
      const sections = Array.isArray(parsed.sections)
        ? parsed.sections
          .map((section) => {
            if (!section || typeof section !== "object") {
              return null;
            }
            const entries = Array.isArray(section.entries)
              ? section.entries.map(normalizeExampleEntry).filter(Boolean)
              : [];
            if (!entries.length) {
              return null;
            }
            return {
              title: localizedRecordText(section.title),
              intro: localizedRecordText(section.intro),
              entries,
            };
          })
          .filter(Boolean)
        : [];
      return {
        title: localizedRecordText(parsed.title),
        intro: localizedRecordText(parsed.intro),
        layout: normalizeExamplesLayout(parsed.layout),
        entries: Array.isArray(parsed.entries) ? parsed.entries.map(normalizeExampleEntry).filter(Boolean) : [],
        sections,
      };
    }

    async function loadExamplesAssetText(relativePath) {
      let text = "";
      if (hasPlatformApi("createFileHandleFromPath")) {
        try {
          const pageUrl = new URL(window.location.href);
          const basePath = decodeURIComponent(pageUrl.pathname || "");
          const baseDir = basePath.replace(/\/[^/]*$/, "");
          const assetPath = `${baseDir}/${relativePath}`;
          const fileHandle = window.STGraphXPlatform.createFileHandleFromPath(assetPath);
          const file = await fileHandle.getFile();
          text = await file.text();
        } catch (_err) {
          text = "";
        }
      }
      if (!text) {
        const response = await fetch(relativePath, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        text = await response.text();
      }
      return text;
    }

    async function openExampleModel(fileName) {
      const normalized = String(fileName || "").trim();
      if (!normalized) {
        return false;
      }
      try {
        let text = "";
        let fileHandle = null;
        let directoryHandle = null;
        if (hasPlatformApi("createFileHandleFromPath") && hasPlatformApi("createDirectoryHandleFromDirectoryPath")) {
          try {
            const pageUrl = new URL(window.location.href);
            const basePath = decodeURIComponent(pageUrl.pathname || "");
            const baseDir = basePath.replace(/\/[^/]*$/, "");
            const filePath = `${baseDir}/examples/${normalized}`;
            fileHandle = window.STGraphXPlatform.createFileHandleFromPath(filePath);
            directoryHandle = window.STGraphXPlatform.createDirectoryHandleFromDirectoryPath(`${baseDir}/examples`);
            const file = await fileHandle.getFile();
            text = await file.text();
          } catch (_err) {
            fileHandle = null;
            directoryHandle = null;
          }
        }
        if (!text) {
          const response = await fetch(`examples/${encodeURIComponent(normalized)}`, { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`${response.status}`);
          }
          text = await response.text();
        }
        const rootEntry = {
          name: normalized,
          text,
          fileHandle,
          directoryHandle,
          data: JSON.parse(text),
        };
        const opened = await openPreparedJsonEntryInNewTab(rootEntry);
        if (!opened) {
          return false;
        }
        closeExamplesHelp();
        return true;
      } catch (err) {
        const message = `${t("examples.openError")} ${String(err?.message || "")}`.trim();
        setStatus(message, true);
        window.alert(message);
        return false;
      }
    }

    function normalizeEightTupleTemplate(parsed) {
      const source = parsed && typeof parsed === "object" ? parsed : {};
      const normalizeRecordMap = (record) => {
        if (!record || typeof record !== "object") {
          return {};
        }
        return Object.fromEntries(
          Object.entries(record).map(([key, value]) => [key, localizedRecordText(value)]),
        );
      };
      return {
        title: localizedRecordText(source.title) || t("eightTuple.title"),
        intro: localizedRecordText(source.intro) || t("eightTuple.intro"),
        copyMarkdownLabel: localizedRecordText(source.copyMarkdownLabel) || t("eightTuple.copyMarkdown"),
        exportMarkdownLabel: localizedRecordText(source.exportMarkdownLabel) || t("eightTuple.exportMarkdown"),
        exportPickerTitle: localizedRecordText(source.exportPickerTitle) || t("eightTuple.exportMarkdown"),
        exportSuccess: localizedRecordText(source.exportSuccess) || t("status.clipboardTextCopied"),
        exportFailed: localizedRecordText(source.exportFailed) || t("error.saveFailed"),
        sections: normalizeRecordMap(source.sections),
        text: normalizeRecordMap(source.text),
      };
    }

    async function loadEightTupleTemplate(forceReload = false) {
      if (!forceReload && eightTupleTemplateCache) {
        return eightTupleTemplateCache;
      }
      try {
        const text = await loadExamplesAssetText(EIGHT_TUPLE_TEMPLATE_PATH);
        const parsed = JSON.parse(text);
        eightTupleTemplateCache = normalizeEightTupleTemplate(parsed);
      } catch (_err) {
        eightTupleTemplateCache = normalizeEightTupleTemplate(null);
      }
      return eightTupleTemplateCache;
    }

    function getEightTupleTemplateText(template, key, fallbackKey) {
      const direct = String(template?.text?.[key] || "").trim();
      if (direct) {
        return direct;
      }
      return fallbackKey ? t(fallbackKey) : "";
    }

    function getEightTupleSectionTitle(template, key, fallbackKey) {
      const direct = String(template?.sections?.[key] || "").trim();
      if (direct) {
        return direct;
      }
      return fallbackKey ? t(fallbackKey) : "";
    }

    function interpolateEightTupleText(text, vars = {}) {
      return String(text || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
        if (Object.prototype.hasOwnProperty.call(vars, key)) {
          return String(vars[key] ?? "");
        }
        return "";
      });
    }

    async function ensureExamplesHelpStyles() {
      const cssText = await loadExamplesAssetText(EXAMPLE_STYLE_PATH);
      let styleTag = document.getElementById(EXAMPLES_HELP_STYLE_TAG_ID);
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = EXAMPLES_HELP_STYLE_TAG_ID;
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = cssText;
    }

    async function loadExamplesCatalog() {
      const text = await loadExamplesAssetText(EXAMPLE_CATALOG_PATH);
      const parsed = JSON.parse(text);
      return normalizeExamplesCatalog(parsed);
    }

    async function renderExamplesHelp() {
      if (!examplesHelpContent) {
        return;
      }
      examplesHelpContent.innerHTML = "";
      await ensureExamplesHelpStyles();
      if (examplesHelpTitle) {
        examplesHelpTitle.textContent = t("examples.title");
      }
      if (examplesHelpIntro) {
        examplesHelpIntro.textContent = t("examples.intro");
      }
      let catalog = { title: "", intro: "", layout: normalizeExamplesLayout(null), entries: [], sections: [] };
      try {
        catalog = await loadExamplesCatalog();
      } catch (err) {
        const message = `${t("examples.openError")} ${String(err?.message || "")}`.trim();
        const row = document.createElement("div");
        row.className = "example-entry";
        row.textContent = message;
        examplesHelpContent.appendChild(row);
        return;
      }
      if (examplesHelpTitle && catalog.title) {
        examplesHelpTitle.textContent = catalog.title;
      }
      if (examplesHelpIntro && catalog.intro) {
        examplesHelpIntro.textContent = catalog.intro;
      }
      examplesHelpContent.dataset.layoutVariant = catalog.layout.variant;
      examplesHelpContent.classList.toggle("dense", catalog.layout.dense);
      const openLabel = catalog.layout.openLabel || t("examples.open");
      const showPaths = catalog.layout.showPaths !== false;

      function createExampleRow(entry) {
        const row = document.createElement("div");
        row.className = "example-entry";
        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "small-btn";
        openBtn.textContent = openLabel;
        openBtn.addEventListener("click", () => {
          closeTopMenus();
          void openExampleModel(entry.file);
        });
        const content = document.createElement("div");
        const title = document.createElement("div");
        title.className = "example-entry-title";
        title.textContent = entry.label || entry.file;
        content.appendChild(title);
        if (showPaths) {
          const path = document.createElement("div");
          path.className = "example-entry-path";
          path.textContent = `examples/${entry.file}`;
          content.appendChild(path);
        }
        const desc = document.createElement("p");
        desc.className = "example-entry-desc";
        desc.textContent = entry.summary;
        content.appendChild(desc);
        row.appendChild(openBtn);
        row.appendChild(content);
        return row;
      }

      catalog.entries.forEach((entry) => {
        examplesHelpContent.appendChild(createExampleRow(entry));
      });
      catalog.sections.forEach((section) => {
        const block = document.createElement("section");
        block.className = "examples-section";
        if (section.title) {
          const heading = document.createElement("h4");
          heading.className = "examples-section-title";
          heading.textContent = section.title;
          block.appendChild(heading);
        }
        if (section.intro) {
          const intro = document.createElement("p");
          intro.className = "examples-section-intro";
          intro.textContent = section.intro;
          block.appendChild(intro);
        }
        const list = document.createElement("div");
        list.className = "examples-section-list";
        section.entries.forEach((entry) => {
          list.appendChild(createExampleRow(entry));
        });
        block.appendChild(list);
        examplesHelpContent.appendChild(block);
      });
    }

    function openExamplesHelp() {
      if (!examplesHelpModal) {
        return;
      }
      void renderExamplesHelp();
      examplesHelpModal.classList.remove("hidden");
    }

    function closeExamplesHelp() {
      if (!examplesHelpModal) {
        return;
      }
      examplesHelpModal.classList.add("hidden");
    }

    function normalizeDocumentationPath(rawPath, currentPath = DOCUMENTATION_ENTRY_PATH) {
      const source = String(rawPath ?? "").trim().replace(/\\/g, "/");
      if (!source || /^(?:https?:|mailto:|#)/iu.test(source)) {
        return "";
      }
      const withoutSuffix = source.split(/[?#]/u, 1)[0];
      const baseParts = String(currentPath || DOCUMENTATION_ENTRY_PATH).split("/").slice(0, -1);
      const parts = withoutSuffix.startsWith("/") ? [] : baseParts;
      for (const part of withoutSuffix.replace(/^\/+/, "").split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") {
          if (!parts.length) return "";
          parts.pop();
        } else {
          parts.push(part);
        }
      }
      const normalized = parts.join("/");
      return DOCUMENTATION_PATHS.has(normalized) ? normalized : "";
    }

    function normalizeDocumentationModelPath(rawPath, currentPath) {
      const source = String(rawPath ?? "").trim().replace(/\\/g, "/");
      if (!/\.json(?:[?#].*)?$/iu.test(source)) return "";
      const withoutSuffix = source.split(/[?#]/u, 1)[0];
      const baseParts = String(currentPath || DOCUMENTATION_ENTRY_PATH).split("/").slice(0, -1);
      const parts = withoutSuffix.startsWith("/") ? [] : baseParts;
      for (const part of withoutSuffix.replace(/^\/+/, "").split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") {
          if (!parts.length) return "";
          parts.pop();
        } else {
          parts.push(part);
        }
      }
      const normalized = parts.join("/");
      return normalized.startsWith("examples/") ? normalized : "";
    }

    function documentationTitleForPath(path) {
      const name = String(path || "").split("/").pop() || "";
      return name.replace(/\.md$/iu, "") || t("documentation.title");
    }

    function markdownForDocumentation(markdown) {
      const source = String(markdown ?? "");
      // Repository READMEs may use HTML links. Convert only these anchors
      // before rendering; arbitrary HTML remains escaped in model notes.
      const htmlLinks = source.replace(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu, (_match, href, label) => {
        const text = String(label).replace(/<[^>]*>/gu, "").trim() || href;
        return `[${text}](${href})`;
      });
      // The existing documentation commonly refers to sibling files as code.
      // Make those known guide documents navigable without changing the files.
      return htmlLinks.replace(/`((?:README|QUICK-START)[A-Za-z0-9-]*\.md|docs\/[A-Za-z0-9_\-]+\.md)`/gu, (_match, path) => (
        `[${path}](${path})`
      ));
    }

    function updateDocumentationNavigation() {
      if (documentationHelpBackBtn) {
        documentationHelpBackBtn.disabled = documentationHistoryIndex <= 0;
      }
      if (documentationHelpForwardBtn) {
        documentationHelpForwardBtn.disabled = documentationHistoryIndex < 0 || documentationHistoryIndex >= documentationHistory.length - 1;
      }
    }

    function linkifyDocumentationUrls() {
      if (!documentationHelpContent || typeof document === "undefined" || typeof NodeFilter === "undefined") {
        return;
      }
      const urlPattern = /https?:\/\/[^\s<]+/giu;
      const walker = document.createTreeWalker(documentationHelpContent, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let current = walker.nextNode();
      while (current) {
        if (!current.parentElement?.closest("a")) {
          textNodes.push(current);
        }
        current = walker.nextNode();
      }
      textNodes.forEach((textNode) => {
        const source = textNode.nodeValue || "";
        if (!urlPattern.test(source)) {
          urlPattern.lastIndex = 0;
          return;
        }
        urlPattern.lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        source.replace(urlPattern, (rawUrl, offset) => {
          const trailing = rawUrl.match(/[.,;:!?]+$/u)?.[0] || "";
          const url = rawUrl.slice(0, rawUrl.length - trailing.length);
          if (offset > cursor) fragment.appendChild(document.createTextNode(source.slice(cursor, offset)));
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.textContent = url;
          fragment.appendChild(anchor);
          if (trailing) fragment.appendChild(document.createTextNode(trailing));
          cursor = offset + rawUrl.length;
          return rawUrl;
        });
        if (cursor < source.length) fragment.appendChild(document.createTextNode(source.slice(cursor)));
        textNode.replaceWith(fragment);
        urlPattern.lastIndex = 0;
      });
    }

    async function renderDocumentationPath(path, options = {}) {
      const normalized = normalizeDocumentationPath(path, options.currentPath || DOCUMENTATION_ENTRY_PATH);
      if (!normalized || !documentationHelpContent) {
        return false;
      }
      const requestId = ++documentationRequestId;
      if (options.addToHistory !== false) {
        documentationHistory.splice(documentationHistoryIndex + 1);
        documentationHistory.push(normalized);
        documentationHistoryIndex = documentationHistory.length - 1;
      }
      if (documentationHelpTitle) documentationHelpTitle.textContent = documentationTitleForPath(normalized);
      if (documentationHelpPath) documentationHelpPath.textContent = normalized;
      documentationHelpContent.textContent = t("documentation.loading");
      updateDocumentationNavigation();
      try {
        const text = await loadExamplesAssetText(normalized);
        if (requestId !== documentationRequestId) return false;
        const renderer = globalThis.STGraphXMarkdown?.renderMarkdownToHtml;
        documentationHelpContent.innerHTML = typeof renderer === "function"
          ? renderer(markdownForDocumentation(text))
          : "";
        // URLs in fenced examples deliberately remain code in the generic
        // Markdown renderer. In the application guide they are instructions
        // the reader may need to open, so make them actionable here as well.
        linkifyDocumentationUrls();
        bindDocumentationLinks();
        documentationHelpContent.scrollTop = 0;
        return true;
      } catch (error) {
        if (requestId !== documentationRequestId) return false;
        documentationHelpContent.textContent = t("documentation.loadError", { message: String(error?.message || error || "") });
        return false;
      }
    }

    async function openDocumentationModel(path) {
      const normalized = normalizeDocumentationModelPath(path, DOCUMENTATION_ENTRY_PATH);
      if (!normalized) return false;
      const opened = await openExampleModel(normalized.slice("examples/".length));
      if (opened) closeDocumentationHelp();
      return opened;
    }

    function openExternalDocumentationUrl(url) {
      // In desktop shells use the explicit native bridge.  The fallback keeps
      // ordinary web deployments independent from platform-specific code.
      if (!hasExternalUrlOpener()) {
        return false;
      }
      Promise.resolve(openExternalUrl(url)).catch(() => {
        // If a shell bridge fails, still give Electron's window-open handler
        // a chance to hand the URL to the operating system.
        const popup = globalThis.open?.(url, "_blank", "noopener,noreferrer");
        if (popup) popup.opener = null;
      });
      return true;
    }

    function onDocumentationLinkClick(event, anchor) {
      const href = String(anchor.getAttribute("href") || "").trim();
      const currentPath = documentationHistory[documentationHistoryIndex] || DOCUMENTATION_ENTRY_PATH;
      const targetPath = normalizeDocumentationPath(href, currentPath);
      if (targetPath) {
        event.preventDefault();
        void renderDocumentationPath(targetPath, { currentPath });
        return;
      }
      const modelPath = normalizeDocumentationModelPath(href, currentPath);
      if (modelPath) {
        event.preventDefault();
        void openDocumentationModel(modelPath);
        return;
      }
      if (/^https?:/iu.test(href)) {
        // Electron handles target=_blank in its main-process window-open
        // handler; browsers do so natively. Intercept only Tauri, whose
        // WebView otherwise has no external-browser target.
        if (globalThis.STGraphXPlatform?.isTauri && openExternalDocumentationUrl(href)) {
          event.preventDefault();
        }
      }
    }

    function bindDocumentationLinks() {
      documentationHelpContent?.querySelectorAll("a[href]").forEach((anchor) => {
        anchor.addEventListener("click", (event) => onDocumentationLinkClick(event, anchor));
      });
    }

    function openDocumentationHelp() {
      if (!documentationHelpModal) return;
      documentationHelpModal.classList.remove("hidden");
      if (documentationHistoryIndex < 0) {
        void renderDocumentationPath(DOCUMENTATION_ENTRY_PATH);
      } else {
        updateDocumentationNavigation();
      }
    }

    function closeDocumentationHelp() {
      documentationHelpModal?.classList.add("hidden");
    }

    if (documentationHelpBackBtn) {
      documentationHelpBackBtn.addEventListener("click", () => {
        if (documentationHistoryIndex <= 0) return;
        documentationHistoryIndex -= 1;
        void renderDocumentationPath(documentationHistory[documentationHistoryIndex], { addToHistory: false });
      });
    }
    if (documentationHelpForwardBtn) {
      documentationHelpForwardBtn.addEventListener("click", () => {
        if (documentationHistoryIndex >= documentationHistory.length - 1) return;
        documentationHistoryIndex += 1;
        void renderDocumentationPath(documentationHistory[documentationHistoryIndex], { addToHistory: false });
      });
    }

    function eightTupleNodeAnnotation(node, extraText = "") {
      const parts = [];
      const description = getNodeDescription(node);
      if (description) {
        parts.push(description);
      }
      if (extraText) {
        parts.push(extraText);
      }
      return parts.length ? ` [${parts.join(" | ")}]` : "";
    }

    function eightTupleUnitSuffix(node, expression = "") {
      const unit = String(node?.unit || node?.inferredUnit || "").trim();
      if (!unit) return "";
      return /^\s*[+-]?(?:\d|\.\d)/.test(String(expression)) ? ` ${unit}` : ` [${unit}]`;
    }

    function eightTupleBehaviorExpression(node, template = eightTupleTemplateCache) {
      if (!node) {
        return "";
      }
      if (isStateNode(node)) {
        return interpolateEightTupleText(
          getEightTupleTemplateText(template, "stateOutputIdentity", "eightTuple.stateOutputIdentity"),
          { name: node.name },
        );
      }
      return String(node.valueExpression ?? "").trim() || getEightTupleTemplateText(template, "unspecified", "eightTuple.unspecified");
    }

    function buildEightTupleSections(model = getGraph(), template = eightTupleTemplateCache) {
      const nodes = Array.isArray(model?.nodes) ? model.nodes : [];
      const execution = model?.execution || {};
      const t0 = Number(execution.t0);
      const dt = Number(execution.dt);
      const t1 = Number(execution.t1);
      const integrator = String(execution.integrator || "euler");
      const delayMs = Number(execution.delayMs);

      const parameterNodes = nodes.filter((node) => node?.shape === "diamond");
      const inputNodes = nodes.filter((node) => Boolean(node?.input) && node?.shape !== "diamond");
      const outputNodes = nodes.filter((node) => Boolean(node?.output));
      const stateNodes = nodes.filter((node) => isStateNode(node));
      const internalAlgebraicNodes = nodes.filter((node) => isAlgebraicNode(node) && !node.input && !node.output);
      const submodelNodes = nodes.filter((node) => isSubmodelNode(node));
      const localFunctions = Array.isArray(model?.localFunctions) ? model.localFunctions : [];

      const productOf = (names, emptyText) => (
        names.length ? names.join(" × ") : emptyText
      );
      const listOrNone = (lines, noneText) => (
        lines.length ? lines : [noneText]
      );

      const parameterLines = [
        ...parameterNodes.map((node) => (
          `${node.name} = ${String(node.valueExpression ?? "").trim() || getEightTupleTemplateText(template, "unspecified", "eightTuple.unspecified")}${eightTupleUnitSuffix(node, node.valueExpression)}${eightTupleNodeAnnotation(
            node,
            node.global ? t("label.global") : "",
          )}`
        )),
        ...stateNodes.map((node) => (
          `${node.name}(t0) = ${String(node.initialStateExpression ?? "").trim() || getEightTupleTemplateText(template, "unspecified", "eightTuple.unspecified")}${eightTupleUnitSuffix(node, node.initialStateExpression)}${eightTupleNodeAnnotation(node)}`
        )),
      ];

      const inputLines = inputNodes.map((node) => (
        `${node.name}: ${getEightTupleTemplateText(template, "rangeUndeclared", "eightTuple.rangeUndeclared")}${eightTupleUnitSuffix(node)}${eightTupleNodeAnnotation(node)}`
      ));

      const outputLines = outputNodes.map((node) => (
        `${node.name}: ${getEightTupleTemplateText(template, "rangeUndeclared", "eightTuple.rangeUndeclared")}${eightTupleUnitSuffix(node)}${eightTupleNodeAnnotation(node)}`
      ));

      const stateRangeLines = stateNodes.map((node) => (
        `${node.name}: ${getEightTupleTemplateText(template, "rangeUndeclared", "eightTuple.rangeUndeclared")}${eightTupleNodeAnnotation(node)}`
      ));

      const phiLines = stateNodes.map((node) => (
        `${node.name}(t + Δt) = ${String(node.valueExpression ?? "").trim() || getEightTupleTemplateText(template, "unspecified", "eightTuple.unspecified")}${eightTupleUnitSuffix(node, node.valueExpression)}${eightTupleNodeAnnotation(node)}`
      ));

      const etaLines = outputNodes.map((node) => (
        `${node.name}(t) = ${eightTupleBehaviorExpression(node, template)}${eightTupleNodeAnnotation(node)}`
      ));

      const internalNames = internalAlgebraicNodes.map((node) => node.name);
      const submodelNames = submodelNodes.map((node) => (
        node.modelPath ? `${node.name} → ${node.modelPath}` : node.name
      ));
      const localFunctionNames = localFunctions
        .map((definition) => String(definition?.name ?? "").trim())
        .filter(Boolean);

      const tLines = [];
      if (Number.isFinite(t0) && Number.isFinite(dt) && Number.isFinite(t1)) {
        tLines.push(`T = {${t0}, ${t0} + Δt, ..., ${t1}}`);
        tLines.push(`t0 = ${t0}`);
        tLines.push(`Δt = ${dt}`);
        tLines.push(`t1 = ${t1}`);
      } else {
        tLines.push(`T = ${getEightTupleTemplateText(template, "timeUndeclared", "eightTuple.timeUndeclared")}`);
      }

      return [
        {
          title: getEightTupleSectionTitle(template, "tuple", "eightTuple.section.tuple"),
          intro: model?.modelTitle ? `${t("label.modelTitle")}: ${model.modelTitle}` : "",
          lines: ["〈T, K, U, Ω, Y, X, φ, η〉"],
        },
        {
          title: getEightTupleSectionTitle(template, "T", "eightTuple.section.T"),
          lines: tLines,
        },
        {
          title: getEightTupleSectionTitle(template, "K", "eightTuple.section.K"),
          intro: getEightTupleTemplateText(template, "KIntro", "eightTuple.KIntro"),
          lines: listOrNone(parameterLines, "K = ∅"),
        },
        {
          title: getEightTupleSectionTitle(template, "U", "eightTuple.section.U"),
          intro: inputNodes.length
            ? `U = ${productOf(inputNodes.map((node) => `U_${node.name}`), "U")}`
            : getEightTupleTemplateText(template, "closedModel", "eightTuple.closedModel"),
          lines: listOrNone(inputLines, "U = ∅"),
        },
        {
          title: getEightTupleSectionTitle(template, "Omega", "eightTuple.section.Omega"),
          lines: inputNodes.length
            ? [getEightTupleTemplateText(template, "omegaUndeclared", "eightTuple.omegaUndeclared")]
            : [getEightTupleTemplateText(template, "omegaUndefined", "eightTuple.omegaUndefined")],
        },
        {
          title: getEightTupleSectionTitle(template, "Y", "eightTuple.section.Y"),
          intro: outputNodes.length
            ? `Y = ${productOf(outputNodes.map((node) => `Y_${node.name}`), "Y")}`
            : getEightTupleTemplateText(template, "noOutputs", "eightTuple.noOutputs"),
          lines: listOrNone(outputLines, getEightTupleTemplateText(template, "noOutputs", "eightTuple.noOutputs")),
        },
        {
          title: getEightTupleSectionTitle(template, "X", "eightTuple.section.X"),
          intro: stateNodes.length
            ? `X = ${productOf(stateNodes.map((node) => `X_${node.name}`), "X")}`
            : getEightTupleTemplateText(template, "algebraicModel", "eightTuple.algebraicModel"),
          lines: listOrNone(stateRangeLines, "X = ∅"),
        },
        {
          title: getEightTupleSectionTitle(template, "phi", "eightTuple.section.phi"),
          intro: stateNodes.length ? getEightTupleTemplateText(template, "phiIntro", "eightTuple.phiIntro") : getEightTupleTemplateText(template, "phiUndefined", "eightTuple.phiUndefined"),
          lines: listOrNone(phiLines, getEightTupleTemplateText(template, "phiUndefined", "eightTuple.phiUndefined")),
        },
        {
          title: getEightTupleSectionTitle(template, "eta", "eightTuple.section.eta"),
          intro: getEightTupleTemplateText(template, "etaIntro", "eightTuple.etaIntro"),
          lines: listOrNone(etaLines, getEightTupleTemplateText(template, "noOutputs", "eightTuple.noOutputs")),
        },
        {
          title: getEightTupleSectionTitle(template, "notes", "eightTuple.section.notes"),
          lines: [
            `${getEightTupleTemplateText(template, "noteImplementation", "eightTuple.noteImplementation")}: ${t(`integrator.${integrator}`)}; delayMs = ${Number.isFinite(delayMs) ? delayMs : getEightTupleTemplateText(template, "unspecified", "eightTuple.unspecified")}`,
            `${getEightTupleTemplateText(template, "noteInternal", "eightTuple.noteInternal")}: ${internalNames.length ? internalNames.join(", ") : getEightTupleTemplateText(template, "none", "eightTuple.none")}`,
            `${getEightTupleTemplateText(template, "noteSubmodels", "eightTuple.noteSubmodels")}: ${submodelNames.length ? submodelNames.join(", ") : getEightTupleTemplateText(template, "none", "eightTuple.none")}`,
            `${getEightTupleTemplateText(template, "noteLocalFunctions", "eightTuple.noteLocalFunctions")}: ${localFunctionNames.length ? localFunctionNames.join(", ") : getEightTupleTemplateText(template, "none", "eightTuple.none")}`,
            getEightTupleTemplateText(template, "noteGaps", "eightTuple.noteGaps"),
          ],
        },
      ];
    }

    function buildEightTupleMarkdown(model = getGraph(), template = eightTupleTemplateCache) {
      const sections = buildEightTupleSections(model, template);
      const lines = [];
      lines.push(`# ${template?.title || t("eightTuple.title")}`);
      if (template?.intro) {
        lines.push("");
        lines.push(template.intro);
      }
      sections.forEach((section) => {
        lines.push("");
        lines.push(`## ${section.title}`);
        if (section.intro) {
          lines.push("");
          lines.push(section.intro);
        }
        if (Array.isArray(section.lines) && section.lines.length) {
          lines.push("");
          section.lines.forEach((line) => {
            lines.push(`- ${line}`);
          });
        }
      });
      lines.push("");
      return lines.join("\n");
    }

    async function renderEightTuple() {
      if (!eightTupleContent) {
        return;
      }
      const template = await loadEightTupleTemplate(true);
      eightTupleContent.innerHTML = "";
      const introNode = document.getElementById("eightTupleIntro");
      const titleNode = document.getElementById("eightTupleTitle");
      if (titleNode) {
        titleNode.textContent = template.title || t("eightTuple.title");
      }
      if (introNode) {
        introNode.textContent = template.intro || t("eightTuple.intro");
      }
      if (eightTupleCopyBtn) {
        eightTupleCopyBtn.textContent = template.copyMarkdownLabel || t("eightTuple.copyMarkdown");
      }
      if (eightTupleExportBtn) {
        eightTupleExportBtn.textContent = template.exportMarkdownLabel || t("eightTuple.exportMarkdown");
      }
      buildEightTupleSections(getGraph(), template).forEach((section) => {
        const block = document.createElement("section");
        block.className = "eight-tuple-section";
        const heading = document.createElement("h4");
        heading.textContent = section.title;
        block.appendChild(heading);
        if (section.intro) {
          const intro = document.createElement("p");
          intro.textContent = section.intro;
          block.appendChild(intro);
        }
        const pre = document.createElement("pre");
        pre.className = "eight-tuple-pre";
        pre.textContent = Array.isArray(section.lines) ? section.lines.join("\n") : "";
        block.appendChild(pre);
        eightTupleContent.appendChild(block);
      });
    }

    function openEightTuple() {
      if (!eightTupleModal) {
        return;
      }
      void renderEightTuple();
      eightTupleModal.classList.remove("hidden");
    }

    function closeEightTuple() {
      if (!eightTupleModal) {
        return;
      }
      eightTupleModal.classList.add("hidden");
    }

    function suggestedEightTupleMarkdownName() {
      const baseName = String(getCurrentFileName() || getCurrentModelTitle() || "model").trim() || "model";
      return normalizeJsonFilename(baseName).replace(/\.json$/i, "-8tuple.md");
    }

    async function copyEightTupleText() {
      const template = await loadEightTupleTemplate();
      const ok = await copyTextToClipboard(buildEightTupleMarkdown(getGraph(), template));
      if (ok) {
        setStatusKey("status.clipboardTextCopied");
        return;
      }
      setStatusKey("error.clipboardTextCopyFailed");
    }

    async function exportEightTupleMarkdown() {
      const template = await loadEightTupleTemplate();
      try {
        if (!supportsSaveFilePicker()) {
          throw new Error("unsupported");
        }
        const fileHandle = await showSaveFilePickerCompat({
          suggestedName: suggestedEightTupleMarkdownName(),
          types: [
            {
              description: template.exportPickerTitle || "Markdown",
              accept: { "text/markdown": [".md"], "text/plain": [".md"] },
            },
          ],
        });
        const ok = await writeTextToFileHandle(fileHandle, buildEightTupleMarkdown(getGraph(), template));
        if (!ok) {
          throw new Error("write-failed");
        }
        setStatus(template.exportSuccess || t("status.clipboardTextCopied"));
      } catch (_err) {
        const markdown = buildEightTupleMarkdown(getGraph(), template);
        const ok = await copyTextToClipboard(markdown);
        if (ok) {
          setStatus(`${template.exportFailed || t("error.saveFailed")} ${t("status.clipboardTextCopied")}`, true);
          return;
        }
        window.alert(template.exportFailed || t("error.saveFailed"));
        setStatus(template.exportFailed || t("error.saveFailed"), true);
      }
    }

    function openAboutApp() {
      if (!aboutAppModal) {
        return;
      }
      const appMeta = window.STGraphXAppMeta || {};
      const releaseDate = String(appMeta.releaseDate || "").trim();
      const author = String(appMeta.author || "").trim();
      const license = String(appMeta.license || "").trim();
      const copyright = String(appMeta.copyright || "").trim();
      if (aboutAppVersionValue) {
        aboutAppVersionValue.textContent = releaseDate;
      }
      if (aboutAppAuthorValue) {
        aboutAppAuthorValue.textContent = author;
      }
      if (aboutAppLicenseValue) {
        aboutAppLicenseValue.textContent = license;
      }
      if (aboutAppCopyrightValue) {
        aboutAppCopyrightValue.textContent = copyright;
      }
      aboutAppModal.classList.remove("hidden");
    }

    function closeAboutApp() {
      if (!aboutAppModal) {
        return;
      }
      aboutAppModal.classList.add("hidden");
    }

    return {
      closeAboutApp,
      closeDocumentationHelp,
      closeEightTuple,
      closeExamplesHelp,
      copyEightTupleText,
      exportEightTupleMarkdown,
      openAboutApp,
      openDocumentationHelp,
      openEightTuple,
      openExamplesHelp,
      renderEightTuple,
      renderExamplesHelp,
    };
  }

  return {
    createHelpContentHelpers,
  };
});
