"use strict";

const assert = require("assert");
const { createMenuUi } = require("../menu-ui.js");

// Minimal DOM surface used to build and interact with the context menu.
function element() {
  const classes = new Set();
  const listeners = {};
  const children = [];
  return {
    children, style: {},
    set className(value) { classes.clear(); value.split(" ").forEach((name) => classes.add(name)); },
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
      toggle: (name) => classes.has(name) ? classes.delete(name) : classes.add(name),
    },
    append(...items) { children.push(...items); },
    appendChild(item) { children.push(item); },
    setAttribute() {},
    addEventListener(name, listener) { (listeners[name] ||= []).push(listener); },
    fire(name) { (listeners[name] || []).forEach((listener) => listener({ stopPropagation() {} })); },
    querySelectorAll(selector) {
      const required = selector.slice(1).split(".");
      return children.flatMap((child) => [
        ...(required.every((name) => child.classList.contains(name)) ? [child] : []),
        ...child.querySelectorAll(selector),
      ]);
    },
    getBoundingClientRect: () => ({ top: 10, left: 10, right: 100, bottom: 100, width: 90, height: 90 }),
  };
}
global.document = { createElement: element, querySelectorAll: () => [] };
global.window = { innerWidth: 1000, innerHeight: 800, requestAnimationFrame: (callback) => callback() };
const menu = element();
let selected = false;
const ui = createMenuUi({ contextMenu: menu });
ui.showContextMenu(10, 10, [
  { label: "Widgets", children: [{ label: "Table", action: () => { selected = true; } }] },
  { label: "Edit" },
  { label: "Other", children: [{ label: "Item" }] },
  { label: "Disabled", disabled: true },
  { label: "Disabled submenu", disabled: true, children: [{ label: "Item" }] },
]);
const [widgets, edit, other, disabled, disabledSubmenu] = menu.children;
const isOpen = (item) => item.classList.contains("open");
widgets.fire("pointerenter");
assert(isOpen(widgets));
widgets.children[1].children[0].fire("pointerenter");
assert(isOpen(widgets), "moving into the submenu must leave it open");
edit.fire("pointerenter");
assert(!isOpen(widgets), "hovering another command must close the submenu");
widgets.fire("pointerenter");
other.fire("pointerenter");
assert(!isOpen(widgets));
assert(isOpen(other));
disabled.fire("pointerenter");
assert(!isOpen(other));
widgets.fire("pointerenter");
disabledSubmenu.fire("pointerenter");
assert(!isOpen(widgets));
assert(!isOpen(disabledSubmenu));
widgets.fire("focusin");
assert(isOpen(widgets));
edit.fire("focusin");
assert(!isOpen(widgets));
widgets.fire("pointerenter");
other.children[0].fire("click");
assert(!isOpen(widgets));
assert(isOpen(other));
other.children[0].fire("click");
assert(!isOpen(other));
widgets.fire("pointerenter");
widgets.children[1].children[0].fire("click");
assert(selected);
assert(menu.classList.contains("hidden"));
delete global.document;
delete global.window;
console.log("menu-ui.test.js: ok");
