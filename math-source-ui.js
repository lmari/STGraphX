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
    const menuElement = get("mathSourceContextMenu");
    const menu = root.STGraphXMenuUi.createMenuUi({ contextMenu: menuElement });
    let exportable = false;
    let draft = "t0 = 0\nt1 = 10\ndt = 1\n\nparameter k = 0.2\nu = sin(time)\noutput x = 0; this + dt * (u - k * this)\n";
    let importing = false;
    let busy = false;

    function showError(error) {
      status.textContent = error.code
        ? t("mathSource.error.location", {
          line: error.line, column: error.column, name: error.definition,
          message: t(`mathSource.error.${error.code}`), detail: error.detail || "",
        })
        : String(error.message || error);
    }
    async function perform(action) {
      if (busy) return;
      busy = true;
      try { await action(); } catch (error) { if (error.name !== "AbortError") showError(error); }
      finally { busy = false; }
    }
    function open(mode) {
      importing = mode === "import";
      status.textContent = "";
      get("mathSourceTitle").textContent = t(importing ? "mathSource.new" : "mathSource.show");
      text.readOnly = !importing;
      create.hidden = load.hidden = !importing;
      dialog.querySelector(".math-source-actions").hidden = !importing;
      exportable = false;
      menu.hideContextMenu();
      text.value = importing ? draft : "";
      if (!importing) {
        try { text.value = codec.serialize(options.getModel()); exportable = true; }
        catch (error) { showError(error); }
      }
      dialog.showModal();
      text.focus();
    }
    function close() { menu.hideContextMenu(); if (dialog.open) dialog.close(); }
    function setImportedText(content) {
      if (!dialog.open || !importing || content == null) return;
      text.value = content;
      status.textContent = "";
      text.focus();
    }
    dialog.addEventListener("close", () => { if (importing) draft = text.value; });
    // Keep editor-wide shortcuts away from this modal, including its buttons.
    dialog.addEventListener("keydown", (event) => event.stopPropagation());
    get("mathSourceClose").addEventListener("click", close);
    text.addEventListener("input", () => { status.textContent = ""; });
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
      if (importing) items.push({ label: t("menu.edit.cut"), disabled: !selection, action: () => perform(() => options.cutSelection(text)) });
      items.push({ label: t("menu.edit.copy"), disabled: !selection, action: () => perform(async () => {
        const copied = await options.copyText(selection);
        status.textContent = t(copied ? "status.clipboardTextCopied" : "error.clipboardTextCopyFailed");
      }) });
      if (importing) items.push({ label: t("menu.edit.paste"), action: () => perform(() => options.pasteText(text)) });
      else items.push({ separator: true }, { label: t("mathSource.save"), disabled: !exportable, action: () => perform(async () => {
        await options.saveText(text.value);
        status.textContent = t("mathSource.saved");
      }) });
      const rect = text.getBoundingClientRect();
      menu.showContextMenu(event.clientX || rect.left + 16, event.clientY || rect.top + 16, items);
    }
    text.addEventListener("contextmenu", openContextMenu);
    text.addEventListener("keydown", (event) => {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) openContextMenu(event);
    });
    dialog.addEventListener("pointerdown", (event) => {
      if (!menuElement.contains(event.target)) menu.hideContextMenu();
    });
    dialog.addEventListener("cancel", (event) => {
      if (!menuElement.classList.contains("hidden")) { event.preventDefault(); menu.hideContextMenu(); text.focus(); }
    });
    dialog.addEventListener("close", () => menu.hideContextMenu());

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
    return { open, close, setImportedText };
  }
  root.STGraphXMathSourceUi = { createMathSourceUi };
})(typeof globalThis !== "undefined" ? globalThis : this);
