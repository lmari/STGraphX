/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

(function initScene2dCore(global) {
  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function finiteOrNull(value) {
    if (value == null || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function finiteOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeColor(value, fallback) {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizeImagePath(value) {
    let path = String(value ?? "").trim().replace(/\\/gu, "/");
    while (path.startsWith("./")) path = path.slice(2);
    if (!path || path.startsWith("/") || /^[A-Za-z]:\//u.test(path)) return "";
    const parts = path.split("/").filter(Boolean);
    if (!parts.length || parts.some((part) => part === "." || part === "..")) return "";
    return parts.join("/");
  }

  function normalizeObject(object) {
    const type = ["segment", "circle", "text", "image"].includes(String(object?.type ?? ""))
      ? String(object.type)
      : "segment";
    return {
      type,
      collapsed: object?.collapsed === true,
      x1: String(object?.x1 ?? "0"),
      y1: String(object?.y1 ?? "0"),
      x2: String(object?.x2 ?? "1"),
      y2: String(object?.y2 ?? "0"),
      x: String(object?.x ?? "0"),
      y: String(object?.y ?? "0"),
      radius: String(object?.radius ?? "0.1"),
      width: String(object?.width ?? "1"),
      height: String(object?.height ?? "1"),
      imagePath: normalizeImagePath(object?.imagePath),
      rotation: String(object?.rotation ?? "0"),
      // Text is always centered and rotates around its own position.
      pivotX: type === "text" ? "" : (object?.pivotX == null ? "" : String(object.pivotX)),
      pivotY: type === "text" ? "" : (object?.pivotY == null ? "" : String(object.pivotY)),
      text: String(object?.text ?? ""),
      color: normalizeColor(object?.color, type === "circle" ? "#d64545" : "#334e68"),
      fill: normalizeColor(object?.fill, type === "circle" ? "#d64545" : "transparent"),
      stroke: normalizeColor(object?.stroke, type === "circle" ? "#7f1d1d" : "transparent"),
      lineWidth: clamp(finiteOr(object?.lineWidth, type === "segment" ? 3 : 1), 0, 40),
      fontSize: clamp(finiteOr(object?.fontSize, 14), 6, 72),
      textAlign: type !== "text" && ["left", "center", "right"].includes(String(object?.textAlign ?? ""))
        ? String(object.textAlign)
        : "center",
    };
  }

  function normalizeSceneOptions(widget = {}) {
    return {
      xMin: finiteOrNull(widget.xMin),
      xMax: finiteOrNull(widget.xMax),
      yMin: finiteOrNull(widget.yMin),
      yMax: finiteOrNull(widget.yMax),
      xGridStep: finiteOrNull(widget.xGridStep),
      yGridStep: finiteOrNull(widget.yGridStep),
      showGrid: widget.showGrid !== false,
      showAxes: widget.showAxes !== false,
      equalScale: widget.equalScale !== false,
      xAxisLabel: String(widget.xAxisLabel ?? "").trim(),
      yAxisLabel: String(widget.yAxisLabel ?? "").trim(),
      objects: Array.isArray(widget.objects) ? widget.objects.map(normalizeObject) : [],
    };
  }

  function niceStep(span) {
    if (!(span > 0) || !Number.isFinite(span)) return 1;
    const raw = span / 7;
    const power = 10 ** Math.floor(Math.log10(raw));
    const scaled = raw / power;
    const factor = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return factor * power;
  }

  function formatTick(value) {
    const magnitude = Math.abs(value);
    if (magnitude > 0 && (magnitude >= 1e5 || magnitude < 1e-3)) return value.toExponential(2);
    return Number(value.toFixed(6)).toString();
  }

  function rotatePoint(x, y, object, fallbackPivotX, fallbackPivotY) {
    const angle = finiteOr(object?.rotation, 0);
    if (!angle) return { x, y };
    const pivotX = finiteOrNull(object?.pivotX) ?? fallbackPivotX;
    const pivotY = finiteOrNull(object?.pivotY) ?? fallbackPivotY;
    const dx = x - pivotX;
    const dy = y - pivotY;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: pivotX + dx * cos - dy * sin, y: pivotY + dx * sin + dy * cos };
  }

  function transformedSegment(object) {
    return {
      from: { x: object.x1, y: object.y1 },
      to: { x: object.x2, y: object.y2 },
    };
  }

  function transformedPoint(object) {
    const centeredObject = object?.type === "text"
      ? { ...object, pivotX: "", pivotY: "" }
      : object;
    return rotatePoint(object.x, object.y, centeredObject, object.x, object.y);
  }

  function sceneBounds(objects, options) {
    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    const include = (x, y, radius = 0) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      bounds.minX = Math.min(bounds.minX, x - radius);
      bounds.maxX = Math.max(bounds.maxX, x + radius);
      bounds.minY = Math.min(bounds.minY, y - radius);
      bounds.maxY = Math.max(bounds.maxY, y + radius);
    };
    objects.forEach((object) => {
      if (object.type === "segment") {
        const segment = transformedSegment(object);
        include(segment.from.x, segment.from.y);
        include(segment.to.x, segment.to.y);
      } else if (object.type === "circle") {
        const point = transformedPoint(object);
        include(point.x, point.y, Math.max(0, object.radius));
      } else if (object.type === "text") {
        const point = transformedPoint(object);
        include(point.x, point.y);
      } else if (object.type === "image") {
        const point = transformedPoint(object);
        const halfDiagonal = Math.hypot(Math.max(0, Number(object.width) || 0), Math.max(0, Number(object.height) || 0)) / 2;
        include(point.x, point.y, halfDiagonal);
      }
    });
    if (!Number.isFinite(bounds.minX)) {
      bounds.minX = -1;
      bounds.maxX = 1;
      bounds.minY = -1;
      bounds.maxY = 1;
    }
    const pad = (min, max) => {
      const span = Math.max(Math.abs(max - min), 0.1);
      return [min - span * 0.12, max + span * 0.12];
    };
    if (options.xMin == null || options.xMax == null) {
      const [min, max] = pad(bounds.minX, bounds.maxX);
      if (options.xMin == null) bounds.minX = min;
      if (options.xMax == null) bounds.maxX = max;
    }
    if (options.yMin == null || options.yMax == null) {
      const [min, max] = pad(bounds.minY, bounds.maxY);
      if (options.yMin == null) bounds.minY = min;
      if (options.yMax == null) bounds.maxY = max;
    }
    if (options.xMin != null) bounds.minX = options.xMin;
    if (options.xMax != null) bounds.maxX = options.xMax;
    if (options.yMin != null) bounds.minY = options.yMin;
    if (options.yMax != null) bounds.maxY = options.yMax;
    if (!(bounds.maxX > bounds.minX)) {
      bounds.minX -= 1;
      bounds.maxX += 1;
    }
    if (!(bounds.maxY > bounds.minY)) {
      bounds.minY -= 1;
      bounds.maxY += 1;
    }
    return bounds;
  }

  function applyEqualScale(bounds, pixelWidth, pixelHeight) {
    const worldRatio = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);
    const pixelRatio = pixelWidth / pixelHeight;
    if (!(worldRatio > 0) || !(pixelRatio > 0)) return bounds;
    if (worldRatio < pixelRatio) {
      const center = (bounds.minX + bounds.maxX) / 2;
      const width = (bounds.maxY - bounds.minY) * pixelRatio;
      bounds.minX = center - width / 2;
      bounds.maxX = center + width / 2;
    } else if (worldRatio > pixelRatio) {
      const center = (bounds.minY + bounds.maxY) / 2;
      const height = (bounds.maxX - bounds.minX) / pixelRatio;
      bounds.minY = center - height / 2;
      bounds.maxY = center + height / 2;
    }
    return bounds;
  }

  function drawScene2D(canvas, rawObjects = [], rawOptions = {}) {
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return;
    const options = normalizeSceneOptions(rawOptions);
    const objects = Array.isArray(rawObjects) ? rawObjects : [];
    const width = Math.max(1, Number(canvas.width) || 1);
    const height = Math.max(1, Number(canvas.height) || 1);
    const fontSize = clamp(finiteOr(rawOptions.fontSize, 13), 8, 32);
    const margin = options.showAxes
      ? { left: 46, right: 18, top: 18, bottom: 38 }
      : { left: 12, right: 12, top: 12, bottom: 12 };
    const plotWidth = Math.max(1, width - margin.left - margin.right);
    const plotHeight = Math.max(1, height - margin.top - margin.bottom);
    const bounds = sceneBounds(objects, options);
    if (options.equalScale) applyEqualScale(bounds, plotWidth, plotHeight);
    const scaleX = plotWidth / (bounds.maxX - bounds.minX);
    const scaleY = plotHeight / (bounds.maxY - bounds.minY);
    const toCanvas = (x, y) => ({
      x: margin.left + (x - bounds.minX) * scaleX,
      y: margin.top + (bounds.maxY - y) * scaleY,
    });

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, plotWidth, plotHeight);
    ctx.clip();

    const drawGrid = (step, start, end, vertical) => {
      if (!(step > 0) || !Number.isFinite(step)) return;
      const first = Math.ceil(start / step) * step;
      ctx.strokeStyle = "#e7edf3";
      ctx.lineWidth = 1;
      for (let value = first, count = 0; value <= end + step * 1e-9 && count < 250; value += step, count += 1) {
        const point = vertical ? toCanvas(value, 0) : toCanvas(0, value);
        ctx.beginPath();
        if (vertical) {
          ctx.moveTo(point.x, margin.top);
          ctx.lineTo(point.x, margin.top + plotHeight);
        } else {
          ctx.moveTo(margin.left, point.y);
          ctx.lineTo(margin.left + plotWidth, point.y);
        }
        ctx.stroke();
      }
    };
    if (options.showGrid) {
      drawGrid(options.xGridStep || niceStep(bounds.maxX - bounds.minX), bounds.minX, bounds.maxX, true);
      drawGrid(options.yGridStep || niceStep(bounds.maxY - bounds.minY), bounds.minY, bounds.maxY, false);
    }

    if (options.showAxes) {
      ctx.strokeStyle = "#8ca0b3";
      ctx.lineWidth = 1.2;
      if (bounds.minX <= 0 && bounds.maxX >= 0) {
        const axis = toCanvas(0, 0).x;
        ctx.beginPath(); ctx.moveTo(axis, margin.top); ctx.lineTo(axis, margin.top + plotHeight); ctx.stroke();
      }
      if (bounds.minY <= 0 && bounds.maxY >= 0) {
        const axis = toCanvas(0, 0).y;
        ctx.beginPath(); ctx.moveTo(margin.left, axis); ctx.lineTo(margin.left + plotWidth, axis); ctx.stroke();
      }
    }

    objects.forEach((object) => {
      if (object.type === "segment") {
        const segment = transformedSegment(object);
        const from = toCanvas(segment.from.x, segment.from.y);
        const to = toCanvas(segment.to.x, segment.to.y);
        ctx.strokeStyle = object.color || "#334e68";
        ctx.lineWidth = object.lineWidth || 1;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      } else if (object.type === "circle") {
        const centerPoint = transformedPoint(object);
        const center = toCanvas(centerPoint.x, centerPoint.y);
        const radius = Math.max(0, object.radius) * Math.min(scaleX, scaleY);
        if (!(radius > 0)) return;
        ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        if (object.fill && object.fill !== "transparent") { ctx.fillStyle = object.fill; ctx.fill(); }
        if (object.stroke && object.stroke !== "transparent" && object.lineWidth > 0) {
          ctx.strokeStyle = object.stroke; ctx.lineWidth = object.lineWidth; ctx.stroke();
        }
      } else if (object.type === "text") {
        const scenePoint = transformedPoint(object);
        const point = toCanvas(scenePoint.x, scenePoint.y);
        ctx.fillStyle = object.color || "#334e68";
        ctx.font = `${object.fontSize || fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(-finiteOr(object.rotation, 0));
        ctx.fillText(String(object.text ?? ""), 0, 0);
        ctx.restore();
      } else if (object.type === "image") {
        const scenePoint = transformedPoint(object);
        const point = toCanvas(scenePoint.x, scenePoint.y);
        const imageWidth = Math.max(0, Number(object.width) || 0) * scaleX;
        const imageHeight = Math.max(0, Number(object.height) || 0) * scaleY;
        if (!(imageWidth > 0) || !(imageHeight > 0)) return;
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(-finiteOr(object.rotation, 0));
        const image = object.image;
        const drawable = image && image.complete !== false
          && Number(image.naturalWidth ?? image.width ?? 0) > 0;
        if (drawable) {
          ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
        } else {
          ctx.strokeStyle = object.imageStatus === "error" ? "#c2410c" : "#94a3b8";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(-imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
          ctx.setLineDash([]);
          ctx.fillStyle = object.imageStatus === "error" ? "#c2410c" : "#64748b";
          ctx.font = `${Math.max(10, Math.min(16, imageHeight / 3))}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(object.imageStatus === "error" ? "!" : "…", 0, 0);
        }
        ctx.restore();
      }
    });
    ctx.restore();

    if (options.showAxes) {
      ctx.fillStyle = "#52697d";
      ctx.font = `${Math.max(9, fontSize - 2)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const xStep = options.xGridStep || niceStep(bounds.maxX - bounds.minX);
      for (let value = Math.ceil(bounds.minX / xStep) * xStep, count = 0; value <= bounds.maxX + xStep * 1e-9 && count < 30; value += xStep, count += 1) {
        const point = toCanvas(value, 0);
        ctx.fillText(formatTick(value), point.x, margin.top + plotHeight + 5);
      }
      ctx.save();
      ctx.translate(13, margin.top + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "middle";
      ctx.fillText(options.yAxisLabel || "", 0, 0);
      ctx.restore();
      ctx.textBaseline = "bottom";
      ctx.fillText(options.xAxisLabel || "", margin.left + plotWidth / 2, height - 4);
    }
  }

  global.STGraphXScene2D = { drawScene2D, normalizeImagePath, normalizeObject, normalizeSceneOptions };
})(globalThis);
