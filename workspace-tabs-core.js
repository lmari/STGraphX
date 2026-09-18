/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initWorkspaceTabsCoreModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXWorkspaceTabsCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createWorkspaceTabsCoreExports() {
  function tabsOf(tabs) {
    return Array.isArray(tabs) ? tabs : [];
  }

  function getTabById(tabs, tabId) {
    return tabsOf(tabs).find((tab) => tab?.id === tabId) || null;
  }

  function currentTab(tabs, activeTabId) {
    return getTabById(tabs, activeTabId);
  }

  function collectDescendantTabIds(tabs, tabId) {
    const descendants = [];
    const visit = (parentId) => {
      tabsOf(tabs)
        .filter((tab) => tab?.meta?.parentTabId === parentId)
        .forEach((childTab) => {
          descendants.push(childTab.id);
          visit(childTab.id);
        });
    };
    visit(tabId);
    return descendants;
  }

  function contextHasUnsavedChanges(context) {
    if (!context) {
      return false;
    }
    try {
      return JSON.stringify(context.data) !== String(context.lastSavedSnapshot || "");
    } catch (_err) {
      return Boolean(context.dirtySinceLastSave);
    }
  }

  function nextTabIdAfterClosing(tabs, closingIds, anchorTabId) {
    const orderedTabs = tabsOf(tabs);
    const closing = new Set(Array.from(closingIds || []).map((id) => Number(id)));
    const anchorIndex = orderedTabs.findIndex((tab) => tab?.id === anchorTabId);
    const remaining = orderedTabs.filter((tab) => tab && !closing.has(tab.id));
    if (!remaining.length) {
      return null;
    }
    const right = orderedTabs.slice(anchorIndex + 1).find((tab) => tab && !closing.has(tab.id));
    if (right) {
      return right.id;
    }
    const left = orderedTabs.slice(0, Math.max(0, anchorIndex)).reverse().find((tab) => tab && !closing.has(tab.id));
    return left?.id ?? remaining[0].id;
  }

  return {
    collectDescendantTabIds,
    contextHasUnsavedChanges,
    currentTab,
    getTabById,
    nextTabIdAfterClosing,
  };
});
