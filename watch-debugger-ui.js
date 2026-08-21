/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initWatchDebuggerUiModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXWatchDebuggerUi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createWatchDebuggerUiExports() {
  function createWatchDebuggerUiHelpers(options = {}) {
    const t = typeof options.t === "function" ? options.t : (key) => key;
    const watchDebuggerModal = options.watchDebuggerModal || null;
    const watchDebuggerSummary = options.watchDebuggerSummary || null;
    const watchBreakpointEnabledInput = options.watchBreakpointEnabledInput || null;
    const watchBreakpointInput = options.watchBreakpointInput || null;
    const watchBreakpointStatus = options.watchBreakpointStatus || null;
    const watchAddSelectedBtn = options.watchAddSelectedBtn || null;
    const watchDebuggerList = options.watchDebuggerList || null;
    const isEditingUiLocked = typeof options.isEditingUiLocked === "function" ? options.isEditingUiLocked : () => false;
    const getDebugConfig = typeof options.getDebugConfig === "function" ? options.getDebugConfig : () => ({ watches: [], breakpointEnabled: false, breakpointExpression: "" });
    const getSelectedWatchableNode = typeof options.getSelectedWatchableNode === "function" ? options.getSelectedWatchableNode : () => null;
    const validateBreakpointExpressionText = typeof options.validateBreakpointExpressionText === "function"
      ? options.validateBreakpointExpressionText
      : () => ({ ok: true, empty: true });
    const getBreakpointExpressionSource = typeof options.getBreakpointExpressionSource === "function"
      ? options.getBreakpointExpressionSource
      : () => "";
    const getBreakpointLastResult = typeof options.getBreakpointLastResult === "function"
      ? options.getBreakpointLastResult
      : () => null;
    const formatNumberValue = typeof options.formatNumberValue === "function" ? options.formatNumberValue : (value) => String(value ?? "");
    const showExpressionStatus = typeof options.showExpressionStatus === "function" ? options.showExpressionStatus : () => {};
    const hideExpressionStatus = typeof options.hideExpressionStatus === "function" ? options.hideExpressionStatus : () => {};
    const localizeExpressionErrorMessage = typeof options.localizeExpressionErrorMessage === "function"
      ? options.localizeExpressionErrorMessage
      : (message) => String(message ?? "");
    const formatErrorReason = typeof options.formatErrorReason === "function"
      ? options.formatErrorReason
      : (reason) => String(reason ?? "");
    const getWatchEntries = typeof options.getWatchEntries === "function" ? options.getWatchEntries : () => [];
    const onRemoveWatch = typeof options.onRemoveWatch === "function" ? options.onRemoveWatch : () => {};

    function formatWatchValue(value, error = "") {
      if (String(error || "").trim()) {
        return t("text.valueError", { reason: formatErrorReason(error) });
      }
      if (value === null || value === undefined) {
        return "—";
      }
      try {
        return String(options.summarizeValue ? options.summarizeValue(value) : value);
      } catch (_err) {
        try {
          return String(value);
        } catch (_err2) {
          return "<?>";
        }
      }
    }

    function renderWatchDebugger() {
      if (!watchDebuggerList || !watchDebuggerSummary || !watchBreakpointEnabledInput || !watchAddSelectedBtn) {
        return;
      }
      const debug = getDebugConfig();
      const selectedNode = getSelectedWatchableNode();
      const canAddSelected = Boolean(selectedNode && !debug.watches.includes(selectedNode.name) && !isEditingUiLocked());
      watchAddSelectedBtn.disabled = !canAddSelected;
      watchBreakpointEnabledInput.checked = Boolean(debug.breakpointEnabled);
      watchBreakpointEnabledInput.disabled = isEditingUiLocked();
      if (watchBreakpointInput && document.activeElement !== watchBreakpointInput) {
        watchBreakpointInput.value = String(debug.breakpointExpression ?? "");
      }
      if (watchBreakpointInput) {
        watchBreakpointInput.disabled = isEditingUiLocked();
      }
      watchDebuggerSummary.textContent = t("watch.summary", { count: debug.watches.length });

      const breakpointValidation = validateBreakpointExpressionText();
      if (watchBreakpointStatus) {
        if (debug.breakpointEnabled) {
          if (!String(getBreakpointExpressionSource() || "").trim()) {
            showExpressionStatus(watchBreakpointStatus, { ok: false, message: t("watch.breakpointEmpty") }, false);
          } else if (!breakpointValidation.ok) {
            showExpressionStatus(
              watchBreakpointStatus,
              { ok: false, message: localizeExpressionErrorMessage(breakpointValidation.message || "") },
              false,
            );
          } else if (getBreakpointLastResult()?.hit) {
            watchBreakpointStatus.classList.remove("invalid", "hidden");
            watchBreakpointStatus.textContent = t("watch.breakpointHit", {
              time: formatNumberValue(Number(getBreakpointLastResult().time)),
            });
          } else {
            showExpressionStatus(watchBreakpointStatus, { ok: true }, true);
          }
        } else {
          hideExpressionStatus(watchBreakpointStatus);
        }
      }

      watchDebuggerList.innerHTML = "";
      if (debug.watches.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-props";
        empty.textContent = t("watch.empty");
        watchDebuggerList.appendChild(empty);
        return;
      }

      getWatchEntries().forEach((entry) => {
        try {
          const item = document.createElement("div");
          item.className = "watch-item";
          const head = document.createElement("div");
          head.className = "watch-item-head";
          const title = document.createElement("strong");
          title.textContent = entry.name;
          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "small-btn";
          removeBtn.textContent = t("action.remove");
          removeBtn.disabled = isEditingUiLocked();
          removeBtn.addEventListener("click", () => {
            onRemoveWatch(entry.name);
          });
          head.appendChild(title);
          head.appendChild(removeBtn);
          item.appendChild(head);

          const currentRow = document.createElement("div");
          currentRow.className = "watch-item-row";
          currentRow.textContent = `${t("watch.current")}: ${formatWatchValue(entry.currentValue, entry.currentError)}`;
          item.appendChild(currentRow);

          const previousRow = document.createElement("div");
          previousRow.className = "watch-item-row";
          previousRow.textContent = `${t("watch.previous")}: ${entry.previousSummary ?? "—"}`;
          item.appendChild(previousRow);

          if (entry.isState) {
            const nextRow = document.createElement("div");
            nextRow.className = "watch-item-row";
            nextRow.textContent = `${t("watch.next")}: ${formatWatchValue(entry.nextValue, entry.nextError)}`;
            item.appendChild(nextRow);
          }

          watchDebuggerList.appendChild(item);
        } catch (_err) {
          const item = document.createElement("div");
          item.className = "watch-item";
          item.textContent = `${entry?.name || "?"}: <?>`;
          watchDebuggerList.appendChild(item);
        }
      });
    }

    function openWatchDebugger() {
      if (!watchDebuggerModal) {
        return;
      }
      renderWatchDebugger();
      watchDebuggerModal.classList.remove("hidden");
    }

    function closeWatchDebugger() {
      if (!watchDebuggerModal) {
        return;
      }
      watchDebuggerModal.classList.add("hidden");
    }

    return {
      closeWatchDebugger,
      formatWatchValue,
      openWatchDebugger,
      renderWatchDebugger,
    };
  }

  return {
    createWatchDebuggerUiHelpers,
  };
});
