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
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("array(2, 2, $0+$1)").value, [[0, 1], [1, 2]]);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("array(range(-2, 3), $0)").value, [-2, -1, 0, 1, 2]);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("array(range(-2, 3), $i0)").value, [0, 1, 2, 3, 4]);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("array(2, range(10, 13), [$0, $1, $i0, $i1])").value, [
  [[0, 10, 0, 0], [0, 11, 0, 1], [0, 12, 0, 2]],
  [[1, 10, 1, 0], [1, 11, 1, 1], [1, 12, 1, 2]],
]);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("array([2,4], $0)").value, [2, 4]);
assert.equal(context.window.GraphSemantics.evaluateValueExpression("array([[1,2]], $0)").ok, false);
assert.equal(context.window.GraphSemantics.validateExpressionSyntax("array(range(-2, 3), $i0)").ok, true);
assert.equal(context.window.GraphSemantics.validateExpressionSyntax("$i0").ok, false);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("append(1, [2,3])").value, [1, 2, 3]);
assert.deepEqual(context.window.GraphSemantics.evaluateValueExpression("append(1, [])").value, [1]);
assert.equal(context.window.GraphSemantics.evaluateValueExpression("append(1, [[2,3]])").ok, false);
assert.equal(context.window.GraphSemantics.evaluateValueExpression("-2^2").value, -4);
assert.equal(context.window.GraphSemantics.evaluateValueExpression("(-2)^2").value, 4);
assert.equal(context.window.GraphSemantics.evaluateValueExpression("2^-2").value, 0.25);
assert.equal(context.window.GraphSemantics.evaluateValueExpression("2^3^2").value, 512);
assert.equal(
  context.window.GraphSemantics.evaluateValueExpression("exp(-(2-5)^2/(2*3^2))").value,
  Math.exp(-0.5),
);
assert.equal(context.window.GraphSemantics.isFunctionName("pos"), true);
console.log("graph-functions.test.js: ok");
