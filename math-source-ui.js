/* SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Luca Mari
 */
(function (root) {
  "use strict";
  function createMathSourceUi(options) {
    const { document, codec, t } = options;
    const get = (id) => document.getElementById(id);
    const dialog = get("mathSourceDialog");
    const text = get("mathSourceText");
    const status = get("mathSourceStatus");
    const create = get("mathSourceCreate");
    const load = get("mathSourceLoad");
    const insertTemplate = get("mathSourceInsertTemplate");
    const insertModel = get("mathSourceInsertModel");
    const menuElement = get("mathSourceContextMenu");
    const menu = root.STGraphXMenuUi.createMenuUi({ contextMenu: menuElement });
    const highlight = get("mathSourceHighlight");
    const completions = get("mathSourceCompletions");
    const goToError = get("mathSourceGoToError");
    let diagnostic = null, validationTimer;
    let choices = [], choiceIndex = 0, completionStart = 0;
    const docs = new Map(Object.entries(options.docs || {}).flatMap(([, entries]) => Object.entries(entries)));
    const keywords = ["parameter", "input", "output", "global", "function", "@unit", "@unitDefinition", "@timeUnit", "@integrator", "@seed"];
    const escape = (value) => value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    function paint() {
      const tokens = /#[^\n]*|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|@?[A-Za-z_$][\w$]*|[^\w\s]/g;
      let out = "", end = 0;
      for (const match of text.value.matchAll(tokens)) {
        const token = match[0];
        const kind = /^(#|\/\/)/.test(token) ? "comment" : /^["']/.test(token) ? "string"
          : /^(\d|\.\d)/.test(token) ? "number" : keywords.includes(token) ? "keyword"
          : docs.has(token) ? (docs.get(token).kind === "variable" ? "variable" : "function")
          : /^[A-Za-z_$]/.test(token) ? "node" : "operator";
        out += escape(text.value.slice(end, match.index)) + `<span class="expression-token-${kind}">${escape(token)}</span>`;
        end = match.index + token.length;
      }
      highlight.innerHTML = out + escape(text.value.slice(end)) + "\n";
      highlight.scrollTop = text.scrollTop;
      highlight.scrollLeft = text.scrollLeft;
    }
    function hideCompletions() { completions.hidden = true; choices = []; }
    function validate() {
      clearTimeout(validationTimer);
      diagnostic = null;
      goToError.hidden = true;
      text.removeAttribute("aria-invalid");
      try { codec.parse(text.value); status.textContent = t("mathSource.valid"); }
      catch (error) { showError(error); }
    }
    function changed() {
      paint(); hideCompletions();
      diagnostic = null; goToError.hidden = true;
      text.removeAttribute("aria-invalid"); status.textContent = "";
      clearTimeout(validationTimer);
      validationTimer = setTimeout(validate, 350);
    }
    function acceptCompletion() {
      const name = choices[choiceIndex];
      if (!name) return;
      text.setRangeText(name, completionStart, text.selectionStart, "end");
      changed(); text.focus();
    }
    function renderCompletions() {
      completions.replaceChildren(); completions.hidden = !choices.length;
      choices.forEach((name, index) => {
        const button = document.createElement("button");
        button.type = "button";
        const doc = docs.get(name);
        button.textContent = doc ? `${doc.signature || name} — ${t(doc.descriptionKey)}` : name;
        button.classList.toggle("active", index === choiceIndex);
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => { choiceIndex = index; acceptCompletion(); });
        completions.append(button);
      });
      completions.children[choiceIndex]?.scrollIntoView({ block: "nearest" });
    }
    function complete() {
      const prefix = text.value.slice(0, text.selectionStart).match(/@?[A-Za-z_$][\w$]*$/)?.[0] || "";
      completionStart = text.selectionStart - prefix.length;
      const names = [...text.value.matchAll(/[A-Za-z_$][\w$]*/g)].map((match) => match[0]);
      choices = [...new Set([...keywords, ...docs.keys(), ...names])].filter((name) => name.startsWith(prefix) && name !== prefix).sort();
      choiceIndex = 0; renderCompletions();
    }
    goToError.addEventListener("click", () => {
      if (!diagnostic) return;
      const lines = text.value.split("\n");
      const offset = lines.slice(0, Math.max(0, diagnostic.line - 1)).reduce((sum, line) => sum + line.length + 1, 0) + Math.max(0, (diagnostic.column || 1) - 1);
      text.focus(); text.setSelectionRange(offset, Math.min(offset + 1, text.value.length));
      text.scrollTop = Math.max(0, diagnostic.line - 2) * parseFloat(root.getComputedStyle(text).lineHeight);
      paint();
    });
    text.addEventListener("scroll", paint);
    text.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if ((event.ctrlKey || event.metaKey) && event.code === "Space") { event.preventDefault(); complete(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); create.click(); return; }
      if (choices.length) {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault(); choiceIndex = (choiceIndex + (event.key === "ArrowDown" ? 1 : choices.length - 1)) % choices.length; renderCompletions(); return;
        }
        if (event.key === "Enter" || event.key === "Tab") { event.preventDefault(); acceptCompletion(); return; }
        if (event.key === "Escape") { event.preventDefault(); hideCompletions(); return; }
        hideCompletions();
      }
      if (event.key === "Tab") { event.preventDefault(); options.indent(text, event.shiftKey); changed(); }
      else if (event.key === "Enter") { event.preventDefault(); options.newline(text); changed(); }
    });
    const sourceTemplate = "# STGraphX mathematical source v1\n"
      + "# Base dei tempi e opzioni di esecuzione\n"
      + "t0 = 0\nt1 = 20\ndt = 0.1\n@integrator = rk4\n@seed = 1234\n@timeUnit = \"s\"\n\n"
      + "# Unita' e funzioni locali\n"
      + "@unitDefinition N = \"kg*m/s^2\"\n"
      + "function decay(value, rate) = value * exp(-rate * time)\n\n"
      + "# Parametri e input\n"
      + "global parameter k = 0.3\n@unit k = \"1/s\"\n"
      + "input u = 1\n@unit u = \"m/s\"\n\n"
      + "# Variabile algebrica di output\n"
      + "output velocity = decay(u, k)\n@unit velocity = \"m/s\"\n\n"
      + "# Variabile di stato: stato iniziale ; stato prossimo\n"
      + "output position = 0; this + dt * velocity\n@unit position = \"m\"\n";
    let busy = false;

    function errorMessage(error) {
      return error.code
        ? t("mathSource.error.location", {
          line: error.line, column: error.column, name: error.definition,
          message: t(`mathSource.error.${error.code}`), detail: [error.detail, error.reasonKey ? t(error.reasonKey) : ""].filter(Boolean).join(": "),
        })
        : String(error.message || error);
    }
    function showError(error) {
      status.textContent = errorMessage(error);
      diagnostic = error.line ? error : null;
      goToError.hidden = !diagnostic;
      text.setAttribute("aria-invalid", "true");
    }
    async function perform(action) {
      if (busy) return;
      busy = true;
      try { await action(); } catch (error) { if (error.name !== "AbortError") showError(error); }
      finally { busy = false; }
    }
    function open() {
      get("mathSourceTitle").textContent = t("mathSource.new");
      menu.hideContextMenu(); hideCompletions();
      text.value = "";
      insertModel.disabled = !options.canInsertModelSource?.();
      dialog.showModal();
      paint(); changed(); text.focus();
    }
    async function saveCurrentSource() {
      if (busy) return;
      busy = true;
      try {
        await options.saveText(codec.serialize(options.getModel()));
        options.reportStatus(t("mathSource.saved"));
      } catch (error) {
        if (error.name !== "AbortError") options.reportStatus(errorMessage(error));
      } finally { busy = false; }
    }
    function close() { menu.hideContextMenu(); if (dialog.open) dialog.close(); }
    function setImportedText(content) {
      if (!dialog.open || content == null) return;
      text.value = content;
      paint(); validate();
      text.focus();
    }
    // Keep editor-wide shortcuts away from this modal, including its buttons.
    dialog.addEventListener("keydown", (event) => event.stopPropagation());
    get("mathSourceClose").addEventListener("click", close);
    text.addEventListener("input", changed);
    function insertAtCursor(content) {
      text.setRangeText(content, text.selectionStart, text.selectionEnd, "end");
      changed();
      text.focus();
    }
    insertTemplate.addEventListener("click", () => insertAtCursor(sourceTemplate));
    insertModel.addEventListener("click", () => {
      try {
        insertAtCursor(codec.serialize(options.getModel(), { validate: false }));
        validate();
      }
      catch (error) { showError(error); }
    });
    create.addEventListener("click", () => perform(async () => {
      const model = codec.parse(text.value);
      await options.createModel(model);
      close();
    }));
    load.addEventListener("click", () => perform(async () => {
      const content = await options.loadText();
      setImportedText(content);
    }));
    function openContextMenu(event) {
      event.preventDefault();
      const selection = text.value.slice(text.selectionStart, text.selectionEnd);
      const items = [
        { label: t("menu.edit.selectAll"), action: () => { text.focus(); text.select(); } },
        { separator: true },
      ];
      items.push({ label: t("menu.edit.cut"), disabled: !selection, action: () => perform(() => options.cutSelection(text)) });
      items.push({ label: t("menu.edit.copy"), disabled: !selection, action: () => perform(async () => {
        const copied = await options.copyText(selection);
        status.textContent = t(copied ? "status.clipboardTextCopied" : "error.clipboardTextCopyFailed");
      }) });
      items.push({ label: t("menu.edit.paste"), action: () => perform(() => options.pasteText(text)) });
      const rect = text.getBoundingClientRect();
      menu.showContextMenu(event.clientX || rect.left + 16, event.clientY || rect.top + 16, items);
    }
    text.addEventListener("contextmenu", openContextMenu);
    text.addEventListener("keydown", (event) => {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) openContextMenu(event);
    });
    dialog.addEventListener("pointerdown", (event) => {
      if (!menuElement.contains(event.target)) menu.hideContextMenu();
      if (!completions.contains(event.target)) hideCompletions();
    });
    dialog.addEventListener("cancel", (event) => {
      if (!menuElement.classList.contains("hidden")) { event.preventDefault(); menu.hideContextMenu(); text.focus(); }
    });
    dialog.addEventListener("close", () => { menu.hideContextMenu(); hideCompletions(); clearTimeout(validationTimer); });

    const head = get("mathSourceHead");
    let drag = null;
    head.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;
      const rect = dialog.getBoundingClientRect();
      dialog.style.margin = "0";
      dialog.style.left = `${rect.left}px`;
      dialog.style.top = `${rect.top}px`;
      drag = { id: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
      head.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    head.addEventListener("pointermove", (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      const rect = dialog.getBoundingClientRect();
      dialog.style.left = `${Math.max(0, Math.min(event.clientX - drag.x, root.innerWidth - rect.width))}px`;
      dialog.style.top = `${Math.max(0, Math.min(event.clientY - drag.y, root.innerHeight - rect.height))}px`;
    });
    head.addEventListener("pointerup", () => { drag = null; });
    head.addEventListener("lostpointercapture", () => { drag = null; });
    return { open, close, setImportedText, saveCurrentSource };
  }
  root.STGraphXMathSourceUi = { createMathSourceUi };
})(typeof globalThis !== "undefined" ? globalThis : this);
