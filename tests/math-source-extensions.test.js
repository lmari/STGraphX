"use strict";
const assert = require('node:assert/strict');
const { STGraphXHeadlessRuntime } = require('../headless-runtime.js');
const { createCodec, SourceError } = require('../math-source-core.js');
const units = require('../unit-analysis-core.js');
const codec = createCodec(global.GraphSemantics);
function reject(source, code, line, name) {
  assert.throws(() => codec.parse(source), (error) => {
    assert(error instanceof SourceError);
    assert.equal(error.code,code,error.message);
    if (line) assert.equal(error.line,line);
    if (name) assert.equal(error.definition,name);
    return true;
  });
}
async function run(model) {
  const runtime = await STGraphXHeadlessRuntime.loadFromObject(model);
  await runtime.run();
  return {values:runtime.getValues(model.nodes.map((node)=>node.name)),history:runtime.getOutputHistory()};
}
async function main() {
  const source = `t1 = 2
output y = affine(x)
x = 1; bump(this)
function affine(value) = twice(value) + 1
function twice(value) = (
  value * 2
)
function bump(value) = value + constant()
function constant() = 1
`;
  const model=codec.parse(source);
  const result=await run(model);
  assert.equal(result.values.x,3);
  assert.equal(result.values.y,7);
  assert.equal(model.edges.length,1,'only node references produce edges');
  assert.deepEqual(await run(codec.parse(codec.serialize(model))),result);
  assert.deepEqual(codec.parse(codec.serialize(model)).localFunctions.map((f)=>f.params),[['value'],['value'],['value'],[]]);
  assert.equal(codec.parse('function f(\narg\n) = arg\nx = f(1)').localFunctions[0].params[0],'arg');
  const literal=codec.parse('function caption() = "caption( ; // #"\nx = caption()');
  assert.equal((await run(literal)).values.x,'caption( ; // #','string contents are not calls');
  reject('function plus(a,b)=a+b\noutput total=reduce(plus,[1,2,3])','unsupported');
  reject('function f=1\nx=1','functionDefinition',1);
  reject('function f(x,x)=x\ny=1','functionParameter',1,'f');
  reject('function f(x,)=x\ny=1','functionParameter');
  reject('function f(time)=time\ny=1','functionParameter');
  reject('function sin(x)=x\ny=1','name');
  reject('function f(x)=x\nf=1','duplicate',2,'f');
  reject('f=1\nfunction f(x)=x','duplicate',2,'f');
  reject('function f()=1\nfunction f()=2\nx=1','duplicate',2,'f');
  reject('function f()=node\nnode=1','expression',1,'f');
  reject('function f()=this\nx=1','expression');
  reject('function f()=integral(1)\nx=1','expression');
  reject('function f(x)=f(x)\ny=1','functionCycle',1,'f');
  reject('function f(x)=g(x)\nfunction g(x)=f(x)\ny=1','functionCycle');
  reject('function f(a,b)=reduce(f,[a,b])\ny=1','unsupported');
  reject('function f(x)=x\ny=f()','functionArity',2,'y');
  reject('function f(x)=g(x,x)\nfunction g(x)=x\ny=1','functionArity',1,'f');
  reject('function f()=readData("a.xlsx","Dati",1,1)\nx=1','unsupported',1,'f');
  reject('function f()=getProperty("a")\nx=1','unsupported');

  const custom=codec.parse(`@unitDefinition ha = "100*are"
@unitDefinition are = "100*m^2"
a=1
@unit a = "ha"
b=5000
@unit b = "m^2"
output total=a+b
@unit total = "ha"
`);
  const copy=codec.parse(codec.serialize(custom));
  assert.deepEqual(copy.unitDefinitions,custom.unitDefinitions);
  const prepared=units.prepareDefinitions(copy.unitDefinitions);
  assert.equal(prepared.errors.length,0);
  const byName=new Map(copy.nodes.map((node)=>[node.name,units.parseUnit(node.unit,{definitions:prepared.definitions}).value]));
  const expression=copy.nodes[2].valueExpression;
  const converted=global.GraphSemantics.evaluateValueExpression(expression,{a:1,b:5000},{hooks:units.createEvaluationHooks({
    expressionAst:global.GraphSemantics.parseExpressionAst(expression),targetUnit:byName.get('total'),resolve:(name)=>byName.get(name)||units.unknown(),
  })});
  assert.equal(converted.value,1.5);
  reject('@unitDefinition ha="m^2"\n@unitDefinition ha="cm^2"\nx=1','duplicate',2,'ha');
  reject('@unitDefinition 3bad="m"\nx=1','unitDefinition',1,'3bad');
  reject('@unitDefinition ha="m^"\nx=1','unitDefinition',1,'ha');
  reject('@unitDefinition aa="bb"\n@unitDefinition bb="aa"\nx=1','unitDefinition');
  reject('@unitDefinition ha=m^2\nx=1','unit');
  reject('@unitDefinition ha=""\nx=1','unit');
  console.log('math-source-extensions.test.js: ok');
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
