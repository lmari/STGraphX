/* SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Luca Mari
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.STGraphXXYChartTooltip = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const states = new WeakMap();

  // Pixel coordinates are in the canvas bitmap, not its CSS or screen size.
  function coordinatesAt(view, px, py) {
    if (!view || !Number.isFinite(px) || !Number.isFinite(py)) return null;
    const { leftPad, topPad, plotW, plotH, minX, maxX, minY, maxY } = view;
    if (plotW <= 0 || plotH <= 0 || px < leftPad || px > leftPad + plotW || py < topPad || py > topPad + plotH) return null;
    const x = minX + (px - leftPad) / plotW * (maxX - minX);
    const y = maxY - (py - topPad) / plotH * (maxY - minY);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }

  function canvasPoint(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !canvas.clientWidth || !canvas.clientHeight) return null;
    // Borders scale with the widget during graph zoom. Exclude them before
    // mapping the CSS content box to the bitmap used by the chart renderer.
    const sx = rect.width / canvas.offsetWidth;
    const sy = rect.height / canvas.offsetHeight;
    return {
      x: ((clientX - rect.left) / sx - canvas.clientLeft) * canvas.width / canvas.clientWidth,
      y: ((clientY - rect.top) / sy - canvas.clientTop) * canvas.height / canvas.clientHeight,
    };
  }

  function update(canvas, view, format) {
    let state = states.get(canvas);
    if (!state) {
      state = { view: null, point: null, tooltip: null, format };
      states.set(canvas, state);
      state.hide = () => { if (state.tooltip) state.tooltip.hidden = true; };
      state.refresh = () => {
        const point = state.point && canvasPoint(canvas, state.point.x, state.point.y);
        const value = point && coordinatesAt(state.view, point.x, point.y);
        const parent = canvas.parentElement;
        if (!value || !parent) { state.hide(); return; }
        if (!state.tooltip) {
          const tooltip = canvas.ownerDocument.createElement("div");
          tooltip.className = "xy-chart-cursor-tooltip";
          tooltip.setAttribute("role", "tooltip");
          Object.assign(tooltip.style, {
            position: "absolute", pointerEvents: "none", zIndex: "10",
            padding: "4px 7px", borderRadius: "4px", background: "#163650",
            color: "#fff", font: "12px sans-serif", whiteSpace: "nowrap",
            boxShadow: "0 2px 5px #0003", maxWidth: "100%", boxSizing: "border-box",
          });
          if (canvas.ownerDocument.defaultView.getComputedStyle(parent).position === "static") parent.style.position = "relative";
          parent.appendChild(tooltip);
          state.tooltip = tooltip;
        }
        const tooltip = state.tooltip;
        tooltip.textContent = state.format(value.x, value.y);
        tooltip.hidden = false;
        const rect = parent.getBoundingClientRect();
        const sx = rect.width / parent.offsetWidth;
        const sy = rect.height / parent.offsetHeight;
        const x = (state.point.x - rect.left) / sx - parent.clientLeft + parent.scrollLeft;
        const y = (state.point.y - rect.top) / sy - parent.clientTop + parent.scrollTop;
        const left = x + 12 + tooltip.offsetWidth <= parent.clientWidth ? x + 12 : x - tooltip.offsetWidth - 12;
        const top = y + 12 + tooltip.offsetHeight <= parent.clientHeight ? y + 12 : y - tooltip.offsetHeight - 12;
        tooltip.style.left = `${Math.max(0, left)}px`;
        tooltip.style.top = `${Math.max(0, top)}px`;
      };
      canvas.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch" || event.buttons) { state.point = null; state.hide(); return; }
        state.point = { x: event.clientX, y: event.clientY };
        state.refresh();
      });
      for (const type of ["pointerleave", "pointercancel", "pointerdown"]) {
        canvas.addEventListener(type, () => { state.point = null; state.hide(); });
      }
    }
    state.view = view;
    state.format = format;
    state.refresh();
  }
  return { coordinatesAt, canvasPoint, update };
});
