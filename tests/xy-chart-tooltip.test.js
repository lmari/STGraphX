"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tooltip = require('../xy-chart-tooltip.js');
const view = {leftPad:40,topPad:20,plotW:200,plotH:100,minX:-10,maxX:30,minY:-50,maxY:150};
assert.deepEqual(tooltip.coordinatesAt(view,140,70),{x:10,y:50});
assert.deepEqual(tooltip.coordinatesAt(view,40,20),{x:-10,y:150});
assert.deepEqual(tooltip.coordinatesAt(view,240,120),{x:30,y:-50});
assert.equal(tooltip.coordinatesAt(view,39,70),null);
assert.equal(tooltip.coordinatesAt(view,140,121),null);
assert.equal(tooltip.coordinatesAt(null,140,70),null);

const events = {};
let element;
const parent = {
  style: {}, offsetWidth:280, offsetHeight:150, clientWidth:280, clientHeight:150,
  clientLeft:0,clientTop:0,scrollLeft:0,scrollTop:0,
  getBoundingClientRect:()=>({left:100,top:200,width:560,height:300}),
  appendChild:(child)=>{element=child;},
};
const canvas = {
  width:280,height:150,offsetWidth:282,offsetHeight:152,clientWidth:280,clientHeight:150,clientLeft:1,clientTop:1,
  getBoundingClientRect:()=>({left:100,top:200,width:564,height:304}),
  parentElement:parent,
  ownerDocument:{defaultView:{getComputedStyle:()=>({position:'static'})},createElement:()=>({style:{},setAttribute(){},offsetWidth:90,offsetHeight:22})},
  addEventListener:(type,fn)=>{assert(!events[type],'duplicate event handler');events[type]=fn;},
};
// The canvas has a border and is displayed at 200% zoom.
assert.deepEqual(tooltip.canvasPoint(canvas,382,342),{x:140,y:70});
tooltip.update(canvas,view,(x,y)=>`${x},${y}`);
events.pointermove({clientX:382,clientY:342,pointerType:'mouse',buttons:0});
assert.equal(element.textContent,'10,50');
assert.equal(element.hidden,false);
assert.equal(element.style.pointerEvents,'none');
// Redrawing with a new scale refreshes the readout under a stationary cursor.
tooltip.update(canvas,{...view,minX:0,maxX:100},(x,y)=>`${x},${y}`);
assert.equal(element.textContent,'50,50');
tooltip.update(canvas,null,(x,y)=>`${x},${y}`);
assert.equal(element.hidden,true);
tooltip.update(canvas,view,(x,y)=>`${x},${y}`);
events.pointermove({clientX:102,clientY:202,pointerType:'mouse',buttons:0});
assert.equal(element.hidden,true,'axis margins have no coordinates');
events.pointermove({clientX:382,clientY:342,pointerType:'mouse',buttons:0});
events.pointerleave();
assert.equal(element.hidden,true);
events.pointermove({clientX:382,clientY:342,pointerType:'mouse',buttons:1});
assert.equal(element.hidden,true,'do not interfere with dragging');
events.pointermove({clientX:382,clientY:342,pointerType:'touch',buttons:0});
assert.equal(element.hidden,true);

// The renderer supplies the actual bounds, including explicit axis limits,
// degenerate automatic ranges and its tick-label-dependent plot padding.
let rendered;
const context = {
  CHART_SERIES_PALETTE:["#123456"],
  STGraphXXYChartTooltip:{update:(_canvas,bounds)=>{rendered=bounds;}},
  clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),formatNumberValue:String,t:(key)=>key,
};
vm.runInNewContext(fs.readFileSync(require.resolve('../widgets.js'),'utf8'),context);
const ctx = new Proxy({measureText:(text)=>({width:text.length*6})},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
const drawingCanvas = {width:400,height:240,getContext:()=>ctx};
context.Widgets.drawXYChart(drawingCanvas,[{points:[{x:2,y:3},{x:6,y:9}]}],{xMin:-10,xMax:10,yMin:0,yMax:20,legendPosition:'none'});
assert.equal(rendered.minX,-10);assert.equal(rendered.maxX,10);
assert.equal(rendered.minY,0);assert.equal(rendered.maxY,20);
assert.deepEqual(tooltip.coordinatesAt(rendered,rendered.leftPad+rendered.plotW/2,rendered.topPad+rendered.plotH/2),{x:0,y:10});
context.Widgets.drawXYChart(drawingCanvas,[{points:[{x:2,y:3}]}],{legendPosition:'none'});
assert.equal(rendered.minX,1);assert.equal(rendered.maxX,3);
assert.equal(rendered.minY,2);assert.equal(rendered.maxY,4);
context.Widgets.drawXYChart(drawingCanvas,[]);
assert.equal(rendered,null,'empty charts clear the previous scale');
console.log('xy-chart-tooltip.test.js: ok');
