/* SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 Luca Mari
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.STGraphXMatrixSurfaceInteraction = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function rotatedView(initial, dx, dy, width, height) {
    const angle = initial.azimuth + 360 * dx / Math.max(1, width);
    return {
      azimuth: dx === 0 ? initial.azimuth : ((angle + 180) % 360 + 360) % 360 - 180,
      elevation: Math.max(5, Math.min(85, initial.elevation - 90 * dy / Math.max(1, height))),
    };
  }

  function bind(canvas, options) {
    let drag = null;
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", options.label);
    canvas.title = options.label;
    function finish(cancelled) {
      if (!drag) return;
      const previous = drag;
      drag = null;
      canvas.style.cursor = "grab";
      if (cancelled) options.onChange(previous.initial);
      options.onEnd?.(cancelled);
      if (canvas.hasPointerCapture(previous.id)) canvas.releasePointerCapture(previous.id);
    }
    canvas.addEventListener("pointerdown", (event) => {
      if (drag || event.button !== 0 || event.isPrimary === false) return;
      if (options.onStart?.() === false) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = canvas.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
        width: rect.width, height: rect.height, initial: options.read() };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      event.preventDefault();
      event.stopPropagation();
      options.onChange(rotatedView(drag.initial, event.clientX - drag.x, event.clientY - drag.y, drag.width, drag.height));
    });
    canvas.addEventListener("pointerup", (event) => {
      if (drag?.id !== event.pointerId) return;
      event.stopPropagation();
      finish(false);
    });
    canvas.addEventListener("pointercancel", (event) => {
      if (drag?.id === event.pointerId) finish(true);
    });
    canvas.addEventListener("lostpointercapture", (event) => {
      if (drag?.id === event.pointerId) finish(false);
    });
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drag) {
        event.preventDefault();
        event.stopPropagation();
        finish(true);
      }
    });
  }
  return { rotatedView, bind };
});
