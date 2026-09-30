/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initMenuUiModule(globalScope, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  globalScope.STGraphXMenuUi = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createMenuUiExports() {
  function createMenuUi(options = {}) {
    const menuRoots = Array.isArray(options.menuRoots) ? options.menuRoots : [];
    const menuTitles = Array.isArray(options.menuTitles) ? options.menuTitles : [];
    const menuCommands = Array.isArray(options.menuCommands) ? options.menuCommands : [];
    const contextMenu = options.contextMenu || null;
    const isCompactLayout = typeof options.isCompactLayout === "function" ? options.isCompactLayout : () => false;
    const touchClickSuppressions = new WeakMap();

    function suppressSyntheticClick(element) {
      if (!element) {
        return;
      }
      const timerId = window.setTimeout(() => {
        touchClickSuppressions.delete(element);
      }, 1500);
      touchClickSuppressions.set(element, timerId);
    }

    function consumeSyntheticClick(element) {
      const timerId = touchClickSuppressions.get(element);
      if (timerId == null) {
        return false;
      }
      window.clearTimeout(timerId);
      touchClickSuppressions.delete(element);
      return true;
    }

    function setTopMenuOpen(root, open) {
      if (!root) {
        return;
      }
      root.classList.toggle("open", Boolean(open));
      const title = root.querySelector(".menu-title");
      const panel = root.querySelector(".menu-panel");
      title?.setAttribute("aria-expanded", open ? "true" : "false");
      panel?.setAttribute("aria-hidden", open ? "false" : "true");
    }

    function closeTopMenus() {
      menuRoots.forEach((root) => {
        setTopMenuOpen(root, false);
        const panel = root.querySelector(".menu-panel");
        if (panel) {
          panel.style.position = "";
          panel.style.left = "";
          panel.style.right = "";
          panel.style.top = "";
          panel.style.maxHeight = "";
          panel.style.width = "";
        }
      });
      document.querySelectorAll(".menu-submenu.open").forEach((item) => item.classList.remove("open"));
    }

    function positionCompactTopMenu(root) {
      if (!root || !isCompactLayout()) {
        return;
      }
      const panel = root.querySelector(".menu-panel");
      const title = root.querySelector(".menu-title");
      if (!panel || !title) {
        return;
      }
      const titleRect = title.getBoundingClientRect();
      const viewportPadding = 8;
      const desiredWidth = Math.min(380, Math.max(240, window.innerWidth - viewportPadding * 2));
      const maxLeft = Math.max(viewportPadding, window.innerWidth - desiredWidth - viewportPadding);
      const left = Math.round(Math.min(Math.max(titleRect.left, viewportPadding), maxLeft));
      const top = Math.round(titleRect.bottom + 4);
      panel.style.position = "fixed";
      panel.style.left = `${left}px`;
      panel.style.right = "auto";
      panel.style.top = `${top}px`;
      panel.style.width = `${desiredWidth}px`;
      panel.style.maxHeight = `${Math.max(180, window.innerHeight - top - 12)}px`;
    }

    function toggleTopMenu(root) {
      const wasOpen = root.classList.contains("open");
      closeTopMenus();
      if (!wasOpen) {
        setTopMenuOpen(root, true);
        positionCompactTopMenu(root);
      }
    }

    function hideContextMenu() {
      if (!contextMenu) {
        return;
      }
      contextMenu.classList.add("hidden");
      contextMenu.innerHTML = "";
    }

    function contextMenuTopInset() {
      if (!isCompactLayout()) {
        return 8;
      }
      const menuBar = menuRoots[0]?.closest(".menu-bar");
      const menuBarBottom = menuBar ? menuBar.getBoundingClientRect().bottom : 0;
      return Math.max(8, Math.ceil(menuBarBottom) + 8);
    }

    function showContextMenu(clientX, clientY, items) {
      if (!contextMenu) {
        return;
      }
      closeTopMenus();
      contextMenu.innerHTML = "";
      (items || []).forEach((item) => {
        if (item?.title) {
          const title = document.createElement("div");
          title.className = "context-menu-title";
          title.textContent = item.label;
          contextMenu.appendChild(title);
          return;
        }
        if (item?.separator) {
          const separator = document.createElement("hr");
          separator.className = "context-menu-sep";
          contextMenu.appendChild(separator);
          return;
        }
        const button = document.createElement("button");
        button.type = "button";
        if (item.icon) {
          const label = document.createElement("span");
          label.className = "context-menu-command-label";
          const icon = document.createElement("span");
          icon.className = "context-menu-item-icon";
          icon.setAttribute("aria-hidden", "true");
          icon.textContent = item.icon;
          const text = document.createElement("span");
          text.textContent = item.label;
          label.append(icon, text);
          button.appendChild(label);
        } else {
          button.textContent = item.label;
        }
        button.disabled = Boolean(item.disabled);
        button.addEventListener("click", () => {
          hideContextMenu();
          item.action?.();
        });
        contextMenu.appendChild(button);
      });

      const topInset = contextMenuTopInset();
      contextMenu.style.maxHeight = `${Math.max(120, window.innerHeight - topInset - 8)}px`;
      contextMenu.classList.remove("hidden");
      const rect = contextMenu.getBoundingClientRect();
      const left = Math.min(clientX, window.innerWidth - rect.width - 8);
      const maxTop = Math.max(topInset, window.innerHeight - rect.height - 8);
      const top = Math.min(Math.max(clientY, topInset), maxTop);
      contextMenu.style.left = `${Math.max(8, left)}px`;
      contextMenu.style.top = `${top}px`;
    }

    function bindInteractions(recentModelsMenuBtn = null) {
      menuTitles.forEach((title) => {
        title.setAttribute("aria-haspopup", "menu");
        title.setAttribute("aria-expanded", "false");
        const panel = title.closest(".menu-root")?.querySelector(".menu-panel");
        panel?.setAttribute("aria-hidden", "true");
        const openCompactMenu = (event) => {
          if (!isCompactLayout()) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          hideContextMenu();
          const root = title.closest(".menu-root");
          if (root) {
            toggleTopMenu(root);
          }
        };
        title.addEventListener("touchstart", (event) => {
          suppressSyntheticClick(title);
          openCompactMenu(event);
        }, { passive: false });
        title.addEventListener("pointerdown", (event) => {
          if (!isCompactLayout() || event.pointerType === "touch") {
            return;
          }
          suppressSyntheticClick(title);
          openCompactMenu(event);
        });
        title.addEventListener("click", (event) => {
          if (isCompactLayout()) {
            if (consumeSyntheticClick(title)) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            openCompactMenu(event);
            return;
          }
          event.stopPropagation();
          hideContextMenu();
          const root = title.closest(".menu-root");
          if (root) {
            toggleTopMenu(root);
          }
        });
      });

      menuRoots.forEach((root) => {
        root.addEventListener("pointerenter", () => {
          const hasOpen = menuRoots.some((item) => item.classList.contains("open"));
          if (hasOpen && !root.classList.contains("open")) {
            toggleTopMenu(root);
          }
        });
      });

      menuCommands.forEach((command) => {
        command.addEventListener("click", closeTopMenus);
      });

      if (!recentModelsMenuBtn) {
        return;
      }
      const toggleRecentModelsSubmenu = (event) => {
        if (!isCompactLayout()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const submenu = recentModelsMenuBtn.closest(".menu-submenu");
        if (!submenu) {
          return;
        }
        const willOpen = !submenu.classList.contains("open");
        document.querySelectorAll(".menu-submenu.open").forEach((item) => {
          if (item !== submenu) {
            item.classList.remove("open");
          }
        });
        submenu.classList.toggle("open", willOpen);
      };
      recentModelsMenuBtn.addEventListener("touchstart", (event) => {
        suppressSyntheticClick(recentModelsMenuBtn);
        toggleRecentModelsSubmenu(event);
      }, { passive: false });
      recentModelsMenuBtn.addEventListener("click", (event) => {
        if (!isCompactLayout()) {
          return;
        }
        if (consumeSyntheticClick(recentModelsMenuBtn)) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        toggleRecentModelsSubmenu(event);
      });
    }

    function repositionOpenMenu() {
      const openMenuRoot = menuRoots.find((root) => root.classList.contains("open"));
      if (openMenuRoot) {
        positionCompactTopMenu(openMenuRoot);
      }
    }

    return {
      bindInteractions,
      closeTopMenus,
      hideContextMenu,
      positionCompactTopMenu,
      repositionOpenMenu,
      showContextMenu,
      toggleTopMenu,
    };
  }

  return { createMenuUi };
});
