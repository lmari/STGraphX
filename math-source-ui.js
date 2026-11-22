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
    const save = get("mathSourceSave");
    const copy = get("mathSourceCopy");
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
      save.hidden = importing;
      save.disabled = copy.disabled = false;
      text.value = importing ? draft : "";
      if (!importing) {
        try { text.value = codec.serialize(options.getModel()); }
        catch (error) { showError(error); save.disabled = copy.disabled = true; }
      }
      dialog.showModal();
      text.focus();
    }
    function close() { if (dialog.open) dialog.close(); }
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
    save.addEventListener("click", () => perform(async () => {
      await options.saveText(text.value);
      status.textContent = t("mathSource.saved");
    }));
    copy.addEventListener("click", () => perform(async () => {
      const copied = await options.copyText(text.value);
      status.textContent = t(copied ? "status.clipboardTextCopied" : "error.clipboardTextCopyFailed");
    }));
    return { open, close, setImportedText };
  }
  root.STGraphXMathSourceUi = { createMathSourceUi };
})(typeof globalThis !== "undefined" ? globalThis : this);
