/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initWorkspaceTabsUiModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXWorkspaceTabsUi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorkspaceTabsUiExports() {
  function renderWorkspaceTabs(options = {}) {
    const root = options.root || null;
    if (!root) {
      return;
    }
    const tabs = Array.isArray(options.tabs) ? options.tabs : [];
    const activeTabId = options.activeTabId;
    const displayTitle = typeof options.displayTitle === "function" ? options.displayTitle : () => "";
    const displayMeta = typeof options.displayMeta === "function" ? options.displayMeta : () => "";
    const isDirty = typeof options.isDirty === "function" ? options.isDirty : () => false;
    const closeLabel = typeof options.closeLabel === "function" ? options.closeLabel : () => "Close";
    const onActivate = typeof options.onActivate === "function" ? options.onActivate : () => {};
    const onClose = typeof options.onClose === "function" ? options.onClose : () => {};

    root.innerHTML = "";
    tabs.forEach((tab) => {
      const item = document.createElement("div");
      item.className = `workspace-tab${tab.id === activeTabId ? " active" : ""}${isDirty(tab) ? " workspace-tab-dirty" : ""}`;
      const title = displayTitle(tab);
      const meta = displayMeta(tab);
      item.title = meta ? `${title}\n${meta}` : title;

      const activate = document.createElement("button");
      activate.type = "button";
      activate.className = "workspace-tab-btn";
      activate.dataset.tabId = String(tab.id);
      activate.title = item.title;
      activate.addEventListener("click", () => onActivate(tab.id));

      const textWrap = document.createElement("span");
      textWrap.className = "workspace-tab-text";
      const label = document.createElement("span");
      label.className = "workspace-tab-label";
      label.textContent = title;
      textWrap.appendChild(label);
      if (meta) {
        const metaElement = document.createElement("span");
        metaElement.className = "workspace-tab-meta";
        metaElement.textContent = meta;
        textWrap.appendChild(metaElement);
      }
      activate.appendChild(textWrap);
      item.appendChild(activate);

      const close = document.createElement("button");
      close.type = "button";
      close.className = "workspace-tab-close";
      close.dataset.tabCloseId = String(tab.id);
      close.textContent = "×";
      close.setAttribute("aria-label", closeLabel());
      close.title = closeLabel();
      close.addEventListener("click", () => onClose(tab.id));
      item.appendChild(close);
      root.appendChild(item);
    });
  }

  return { renderWorkspaceTabs };
});
