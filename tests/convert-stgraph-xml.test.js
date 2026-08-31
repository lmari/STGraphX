"use strict";

const assert = require("assert");
const { convertStGraphXml } = require("../scripts/convert-stgraph-xml.js");

const source = `<?xml version="1.0"?>
<stgraph>
  <head systemName="Modello di prova" description="Descrizione" timeUnitDescription="giorni" time0="2" timeD="0.5" time1="10" simulationDelay="25" scale="0.75" integrationMethod="0"/>
  <nodes>
    <node name="p" type="ValueNode" pos-x="10" pos-y="20" width="80" height="30"><isIn>true</isIn><isOut>false</isOut><isGlobal>true</isGlobal><valueType>0</valueType><expression>2</expression><backcol>255,0,10</backcol><forecol>0,0,0</forecol><documentation>Parametro &amp; prova</documentation></node>
    <node name="x" type="ValueNode" pos-x="100" pos-y="20" width="80" height="30"><isOut>true</isOut><valueType>1</valueType><stateInit>0</stateInit><stateTrans>integral(p-this)</stateTrans></node>
    <node name="y" type="ValueNode" pos-x="200" pos-y="20" width="80" height="30"><isIn>false</isIn><valueType>0</valueType><expression>+/x + */[1:p] + [1:5] + [1:2:5] + @x + array([n,n],$i0+$i1)</expression><customprops>Name=y;Unit=kg</customprops></node>
    <node name="oldOutput" type="ValueNode" pos-x="300" pos-y="20" width="80" height="30"><isOut>true</isOut><valueType>2</valueType><stateInit>1</stateInit><stateTrans>integral(-this)</stateTrans><expression>this*2</expression></node>
  </nodes>
  <texts><text pos-x="3" pos-y="4" width="50" height="20" content="Titolo &amp; nota"/></texts>
  <edges><edge source="p" target="x" numpoints="3" p0x="10" p0y="20" p1x="45" p1y="20" p2x="100" p2y="20"/></edges>
  <widgets><widget type="ChartWidget"/></widgets>
</stgraph>`;

const { model, report } = convertStGraphXml(source, { sourceName: "prova.stg" });
assert.equal(model.modelTitle, "Modello di prova");
assert.deepEqual(model.execution, { t0: 2, dt: 0.5, t1: 10, delayMs: 25, decimals: 3, integrator: "euler", strictDefinitions: false });
assert.equal(model.view.zoom, 0.75);
assert.equal(model.nodes.length, 4);
assert.equal(model.nodes[0].type, "parameter");
assert.equal(model.nodes[0].global, true);
assert.equal(model.nodes[0].fillColor, "#ff000a");
assert.equal(model.nodes[1].type, "state");
assert.equal(model.nodes[2].type, "algebraic");
assert.equal(model.nodes[2].valueExpression, "reduce(+, x, 0) + reduce(*, range(1, (p) + 1), 1) + range(1, 6) + range(1, 6, 2) + size(x) + array([n,n],$0+$1)");
assert.deepEqual(model.nodes[2].properties, [{ key: "Unit", value: "kg" }]);
assert.match(model.nodes[3].properties[0].value, /Espressione legacy/);
assert.deepEqual(model.edges[0].controlPoints, [{ x: 45, y: 20 }]);
assert.equal(model.textItems[0].html, "Titolo & nota");
assert.deepEqual(model.widgets, []);
assert.equal(report.skipped.widgets.count, 1);
assert.deepEqual(report.skipped.widgets.types, ["ChartWidget"]);
assert.ok(report.warnings.some((warning) => warning.includes("output separata")));
assert.ok(report.warnings.some((warning) => warning.includes("riduzione legacy")));
assert.ok(report.warnings.some((warning) => warning.includes("vettore legacy")));
assert.ok(report.warnings.some((warning) => warning.includes("operatore legacy @")));
assert.ok(report.warnings.some((warning) => warning.includes("indici locali legacy")));

assert.throws(() => convertStGraphXml("<stgraph><nodes></stgraph>"), /XML non valido/);
console.log("convert-stgraph-xml.test.js: ok");
