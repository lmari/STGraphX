"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "graph-functions.js"), "utf8"), context, { filename: "graph-functions.js" });
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "semantic.js"), "utf8"), context, { filename: "semantic.js" });
const scope = context.window.GraphFunctions.createMathScope();

assert.equal(scope.pos(-3), 0);
assert.equal(scope.pos(0), 0);
assert.equal(scope.pos(2.5), 2.5);
assert.deepEqual(scope.pos([-2, 0, 4]), [0, 0, 4]);
assert.deepEqual(scope.pos([[-1, 2], [0, -3]]), [[0, 2], [0, 0]]);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("pos([-2, 0, 4])").value, [0, 0, 4]);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("range(1, 6)").value, [1, 2, 3, 4, 5]);
assert.equal(context.window.GraphSemantics.evaluateValueExpression("size(range(1, 6))").value, 5);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("array([2,2], $0+$1)").value, [[0, 1], [1, 2]]);
assert.equal(context.window.GraphSemantics.isFunctionName("pos"), true);
console.log("graph-functions.test.js: ok");
