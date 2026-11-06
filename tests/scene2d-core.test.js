/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */

const assert = require("assert");

require("../scene2d-core.js");

const scene = globalThis.STGraphXScene2D;
assert.ok(scene, "the Scene 2D core must be exported");

const normalized = scene.normalizeSceneOptions({ xMin: null, xMax: "2", equalScale: false });
assert.equal(normalized.xMin, null, "an automatic lower bound must remain automatic");
assert.equal(normalized.xMax, 2);
assert.equal(normalized.equalScale, false);

const segment = scene.normalizeObject({ type: "segment", x1: "time", lineWidth: 3 });
assert.equal(segment.x1, "time", "formula fields must remain expressions until runtime evaluation");
assert.equal(segment.lineWidth, 3);
assert.equal(segment.rotation, "0");
assert.equal(segment.pivotX, "");

const text = scene.normalizeObject({ type: "text", textAlign: "left", pivotX: "3", pivotY: "4" });
assert.equal(text.textAlign, "center", "text must remain centered");
assert.equal(text.pivotX, "", "text must rotate around its position");
assert.equal(text.pivotY, "", "text must rotate around its position");

assert.equal(scene.normalizeImagePath("sprites/ball.png"), "sprites/ball.png");
assert.equal(scene.normalizeImagePath("../ball.png"), "", "image paths must stay inside the model folder");
const imageObject = scene.normalizeObject({ type: "image", imagePath: "ball.png", width: "2", height: "1" });
assert.equal(imageObject.imagePath, "ball.png");
assert.equal(imageObject.width, "2");
assert.equal(scene.normalizeObject({ type: "circle", collapsed: true }).collapsed, true);

const calls = [];
const context = new Proxy({}, {
  get(_target, property) {
    if (property === "measureText") return () => ({ width: 20 });
    return (...args) => { calls.push([property, ...args]); };
  },
  set(_target, property, value) {
    calls.push(["set", property, value]);
    return true;
  },
});
const canvas = { width: 320, height: 220, getContext: () => context };
scene.drawScene2D(canvas, [
  { type: "segment", x1: 0, y1: 0, x2: 1, y2: -1, color: "#123", lineWidth: 2 },
  { type: "circle", x: 1, y: -1, radius: 0.1, fill: "#f00", stroke: "#800", lineWidth: 1 },
  { type: "text", x: 0, y: 0, text: "origin", color: "#000", fontSize: 12, rotation: Math.PI / 4 },
], { showAxes: false, showGrid: false, equalScale: true });

assert.ok(calls.some(([name]) => name === "lineTo"), "a segment must draw a line");
assert.ok(calls.some(([name]) => name === "arc"), "a circle must draw an arc");
assert.ok(calls.some(([name]) => name === "fillText"), "a text object must draw text");
assert.ok(calls.some(([name]) => name === "rotate"), "a text object must support rotation");

const segmentCalls = [];
const segmentContext = new Proxy({}, {
  get(_target, property) {
    if (property === "measureText") return () => ({ width: 20 });
    return (...args) => { segmentCalls.push([property, ...args]); };
  },
  set(_target, property, value) {
    segmentCalls.push(["set", property, value]);
    return true;
  },
});
scene.drawScene2D(
  { width: 320, height: 220, getContext: () => segmentContext },
  [{ type: "segment", x1: 0, y1: 0, x2: 1, y2: 0, rotation: Math.PI / 2, color: "#123", lineWidth: 2 }],
  { showAxes: false, showGrid: false, equalScale: true },
);
assert.ok(!segmentCalls.some(([name]) => name === "rotate"), "segment endpoints must define its orientation directly");

const imageCalls = [];
const imageContext = new Proxy({}, {
  get(_target, property) {
    if (property === "measureText") return () => ({ width: 20 });
    return (...args) => { imageCalls.push([property, ...args]); };
  },
  set(_target, property, value) {
    imageCalls.push(["set", property, value]);
    return true;
  },
});
scene.drawScene2D(
  { width: 320, height: 220, getContext: () => imageContext },
  [{ type: "image", x: 0, y: 0, width: 1, height: 1, rotation: 0, image: { complete: true, naturalWidth: 24 } }],
  { showAxes: false, showGrid: false, equalScale: true },
);
assert.ok(imageCalls.some(([name]) => name === "drawImage"), "an available image must be drawn");

process.stdout.write("scene2d-core.test.js: ok\n");
