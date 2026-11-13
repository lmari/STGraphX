"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadHeadlessRuntimeFromObject } = require("../headless-runtime.js");

const context = { window: {} };
for (const filename of ["graph-functions.js", "semantic.js", "i18n-inline.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", filename), "utf8"), context, { filename });
}
const { polynomialRegression: fit, linearRegression: linear } = context.window.GraphFunctions.createMathScope();
const near = (actual, expected, tolerance = 1e-11) => {
  assert(Number.isFinite(actual));
  assert(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
};
const vectorNear = (actual, expected, tolerance) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, i) => near(value, expected[i], tolerance));
};
const predict = (coefficients, x) => coefficients.reduceRight((sum, value) => sum * x + value, 0);

async function run() {
  const x = [0, 1, 2, 3];
  const y = [1, 2, 2, 4];
  const result = linear(x, y);
  vectorNear(result.slice(0, -1), [0.9, 0.9]);
  vectorNear(x.map((value) => predict(result.slice(0, -1), value)), [0.9, 1.8, 2.7, 3.6]);
  near(result.at(-1), 1 - 0.7 / 4.75);
  assert.deepEqual(fit(x, y), result, "default degree must equal linear regression");
  assert.deepEqual(x, [0, 1, 2, 3]);
  assert.deepEqual(y, [1, 2, 2, 4]);

  for (const coefficients of [[4], [1, 2], [1, -2, 3], [2, 0, -3, 0.5], [1, -2, 3, -4, 5, -6]]) {
    const xs = Array.from({ length: 20 }, (_, i) => (i - 10) / 5);
    const ys = xs.map((value) => predict(coefficients, value));
    const fitted = fit(xs, ys, coefficients.length - 1);
    vectorNear(fitted.slice(0, -1), coefficients);
    vectorNear(xs.map((value) => predict(fitted.slice(0, -1), value)), ys);
    near(fitted.at(-1), 1);
  }
  vectorNear(fit([7, 7, 7], [1, 2, 6], 0).slice(0, -1), [3]);
  near(fit([7, 7, 7], [1, 2, 6], 0).at(-1), 0);
  vectorNear(fit([7], [3], 0).slice(0, -1), [3]);
  const interpolated = fit([0, 1, 2], [1, 4, 9], 2);
  vectorNear(interpolated.slice(0, -1), [1, 2, 1]);
  const repeated = fit([0, 0, 1, 1], [1, 3, 3, 5], 1);
  vectorNear(repeated.slice(0, -1), [2, 2]);
  for (const constant of [0, 5, -2]) {
    const fitted = fit(x, x.map(() => constant), 2);
    vectorNear(x.map((value) => predict(fitted.slice(0, -1), value)), x.map(() => constant));
    near(fitted.at(-1), 1);
  }
  // A noisy quadratic must satisfy least-squares residual orthogonality.
  const xs = [-3, -2, -1, 0, 1, 2, 3];
  const ys = [11, 8, 1, 2, 3, 6, 13];
  const noisy = fit(xs, ys, 2);
  for (let power = 0; power <= 2; power += 1) {
    near(xs.reduce((sum, value, i) => sum + value ** power * (ys[i] - predict(noisy.slice(0, -1), value)), 0), 0);
  }
  const shifted = xs.map((value) => 1e9 + value);
  const shiftedFit = fit(shifted, ys, 2);
  vectorNear(shiftedFit, [noisy[0] - noisy[1] * 1e9 + noisy[2] * 1e18, noisy[1] - 2 * noisy[2] * 1e9, noisy[2], noisy.at(-1)], 1e-7);
  for (const scale of [1e150, 1e-100]) {
    const scaled = fit(xs.map((value) => value * scale), ys, 2);
    vectorNear([scaled[0], scaled[1] * scale, scaled[2] * scale * scale, scaled[3]], noisy);
  }
  near(fit([0, 1e-310], [0, 1e-310])[1], 1);
  const huge = fit([0, 1, 2], [1e300, 2e300, 3e300]);
  vectorNear(huge.slice(0, -1), [1e300, 1e300]);
  near(huge.at(-1), 1);

  for (const [badX, badY] of [[[], []], [[1], [1, 2]], [1, [1]], [[[1]], [1]], [[NaN], [1]], [[1], [Infinity]], [["1"], [1]]]) {
    assert.throws(() => fit(badX, badY), /two non-empty numeric vectors/);
  }
  for (const degree of [-1, 0.5, "1", NaN, Infinity, 4]) {
    assert.throws(() => fit(x, y, degree), /degree must be/);
  }
  assert.throws(() => linear([1], [1]), /degree must be/);
  assert.throws(() => fit([1, 1], [1, 2]), /distinct x/);
  assert.throws(() => fit([0, 0, 1], [1, 2, 3], 2), /distinct x/);
  assert.throws(() => fit([0, 1e-310], [0, 1]), /numeric precision or range/);
  const evaluate = context.window.GraphSemantics.evaluateValueExpression;
  vectorNear(evaluate("polynomialRegression([0,1,2],[1,4,9],2)").value, [1, 2, 1, 1]);
  near(evaluate("linearRegression([0,1,2],[1,3,5])[2]").value, 1);
  near(evaluate("linearRegression([0,1,2],[1,3,5])[1]").value, 2);
  assert.equal(evaluate("polynomialRegression([0,0,1],[1,2,3],2)").ok, false);
  for (const name of ["polynomialRegression", "linearRegression"]) {
    assert(context.window.GraphSemantics.isFunctionName(name));
    const doc = context.window.GraphFunctions.expressionDocs.functions[name];
    for (const language of ["it", "en"]) assert(context.window.STGraphXI18nBundles[language][doc.descriptionKey]);
  }
  const runtime = await loadHeadlessRuntimeFromObject({
    version: 1,
    nodes: [
      { id: 1, name: "fit", type: "algebraic", valueExpression: "polynomialRegression([0,1,2],[1,4,9],2)", output: true },
      { id: 2, name: "quadratic", type: "algebraic", valueExpression: "fit[2]", output: true },
    ],
    edges: [{ id: 1, from: 1, to: 2 }],
  }, { lang: "en" });
  await runtime.run();
  near(runtime.getOutputs().quadratic, 1);
  near(runtime.getOutputs().fit[3], 1);
  console.log("regression.test.js: ok");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
