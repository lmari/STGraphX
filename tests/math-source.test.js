"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { STGraphXHeadlessRuntime } = require("../headless-runtime.js");
const { createCodec, SourceError } = require("../math-source-core.js");
const codec = createCodec(global.GraphSemantics);

function rejects(source, code, line) {
  assert.throws(() => codec.parse(source), (error) => {
    assert.ok(error instanceof SourceError, error.stack);
    assert.equal(error.code, code, error.message);
    if (line) assert.equal(error.line, line);
    assert.ok(error.column > 0);
    return true;
  });
}

async function run(model) {
  const runtime = await STGraphXHeadlessRuntime.loadFromObject(model);
  await runtime.run();
  return { values: runtime.getValues(model.nodes.map((node) => node.name)), history: runtime.getOutputHistory(), time: runtime.getTime() };
}

async function main() {
  const source = `# Forward references and simultaneous state updates
  t0 = 0
  t1 = 2
  dt = 1 / 2
  output result = x + y
  output x = p; y
  output y = 2; x
  global parameter p = 1
  input u = 3
  text = "https://example.test/#hello;world"
  matrix = [
    [1, 2], # keep nesting
    [3, 4]
  ]
  `;
  const model = codec.parse(source);
  assert.equal(model.execution.dt, 0.5);
  assert.equal(model.nodes[0].name, "result");
  assert.equal(model.nodes[1].type, "state");
  assert.equal(model.nodes[3].global, true);
  assert.equal(model.nodes[4].input, true);
  const edges = model.edges.map((edge) => [model.nodes[edge.from - 1].name, model.nodes[edge.to - 1].name]);
  assert.ok(edges.some(([from, to]) => from === "p" && to === "x"));
  assert.ok(edges.some(([from, to]) => from === "y" && to === "x"));
  assert.ok(model.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)));
  const result = await run(model);
  assert.equal(result.values.x, 1);
  assert.equal(result.values.y, 2);
  assert.deepEqual(await run(codec.parse(codec.serialize(model))), result);

  const multilineState = codec.parse('x = (\n  1 + 2\n); (\nthis + 1\n)\n');
  assert.equal(multilineState.nodes[0].type, "state");
  assert.equal(codec.parse('\uFEFFx = "a;#//\\\"b"\r\n').nodes.length, 1);
  assert.equal(codec.parse('t0=2\nt1=0\ndt=-1\nx=0;this+1').execution.dt, -1);
  assert.equal(codec.parse('x = if(1 == 1, 2, 3)').nodes.length, 1);
  assert.equal(codec.parse('x = "[)"').nodes.length, 1);
  assert.equal(codec.parse('output = 1').nodes[0].name, 'output');

  rejects('', 'empty');
  rejects('x 1', 'declaration');
  rejects('x=1\nx=2', 'duplicate', 2);
  rejects('t0=0\nt0=1\nx=1', 'duplicate', 2);
  rejects('sin=1', 'name');
  rejects('x=', 'expression');
  rejects('x=1;', 'expression');
  rejects('x=1;2;3', 'expression');
  rejects('x=1\ny=unknown+1', 'expression', 2);
  rejects('x=1\ny=2 + * 3', 'expression', 2);
  rejects('x=[1,2)', 'brackets');
  rejects('x=(1', 'unclosed');
  rejects('x="hello', 'unclosed');
  rejects('input x=0;this+1', 'qualifier');
  rejects('global x=1', 'qualifier');
  rejects('input x=y\ny=1', 'inputDependency');
  rejects('@unit absent = "m"\nx=1', 'name');
  rejects('@unit x = m\nx=1', 'unit');
  rejects('@unit x = "m"\n@unit x = "cm"\nx=1', 'duplicate');
  rejects('output output x=1', 'qualifier');
  rejects('parameter x=0;this+1', 'qualifier');
  rejects('x=y\ny=x', 'cycle');
  rejects('x=x+1', 'cycle');
  rejects('x=y;this\ny=x;this', 'cycle');
  rejects('parameter p=u\nu=1', 'expression');
  rejects('x=this', 'expression');
  rejects('x=integral(1)', 'expression');
  rejects('dt=0\nx=1', 'time');
  rejects('t0=10\nt1=0\ndt=1\nx=1', 'time');
  rejects('dt=random()\nx=1', 'setting');
  rejects('@seed=-1\nx=1', 'setting');
  rejects('@seed=4294967296\nx=1', 'setting');
  rejects('@integrator=other\nx=1', 'setting');
  rejects('x=readData("book.xlsx", "sheet", 1, 1)', 'unsupported');
  rejects('x=getProperty("value")', 'unsupported');
  rejects('# STGraphX mathematical source v2\nx=1', 'version');
  for (const type of ['submodel', 'draft']) {
    assert.throws(() => codec.serialize({ nodes: [{ type, name: 'n' }] }), (e) => e.code === 'unsupported');
  }
  assert.throws(() => codec.serialize({ ...model, localFunctions: [{}] }), (e) => e.code === 'functionDefinition');
  assert.throws(() => codec.serialize({ ...model, modelProperties: [{}] }), (e) => e.code === 'unsupported');

  // Real graph documents, including RK4 integration and seeded random draws.
  for (const file of ['examples/sir.json', 'rust/stgraphx-engine/tests/fixtures/seeded-random.json', 'rust/stgraphx-engine/tests/fixtures/local-functions.json']) {
    const original = JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
    const copy = codec.parse(codec.serialize(original));
    assert.deepEqual(await run(copy), await run(original), file);
  }
  const withUnits = codec.parse('@timeUnit = "giorno"\na=1\n@unit a = "m"\nb=100\n@unit b = "cm"\noutput total=a+b\n@unit total = "m"');
  const roundTripUnits = codec.parse(codec.serialize(withUnits));
  assert.equal(roundTripUnits.execution.timeUnit, 'giorno');
  assert.equal(roundTripUnits.nodes[0].unit, 'm');
  assert.equal(roundTripUnits.nodes[1].unit, 'cm');
  const unitAnalysis = require('../unit-analysis-core.js');
  const units = new Map(roundTripUnits.nodes.map((node) => [node.name, unitAnalysis.parseUnit(node.unit).value]));
  const expression = roundTripUnits.nodes[2].valueExpression;
  const converted = global.GraphSemantics.evaluateValueExpression(expression, { a: 1, b: 100 }, {
    hooks: unitAnalysis.createEvaluationHooks({
      expressionAst: global.GraphSemantics.parseExpressionAst(expression),
      targetUnit: units.get('total'), resolve: (name) => units.get(name) || unitAnalysis.unknown(),
    }),
  });
  assert.equal(converted.value, 2);
  assert.deepEqual(codec.parse(codec.serialize({ ...model, unitDefinitions: [{symbol:'ha', expression:'10000*m^2'}] })).unitDefinitions, [{symbol:'ha', expression:'10000*m^2'}]);

  // Initial dependencies can pass through an algebraic variable into a state.
  const initial = codec.parse('parameter p=2\na=p+1;this\nb=a*2\noutput c=b+3;this');
  assert.equal((await run(initial)).values.c, 9);
  console.log('math-source.test.js: ok');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
