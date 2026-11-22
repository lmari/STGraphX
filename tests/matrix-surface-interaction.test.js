"use strict";
const assert = require('node:assert/strict');
const { rotatedView, bind } = require('../matrix-surface-interaction.js');
assert.deepEqual(rotatedView({azimuth:45,elevation:32},100,-20,400,200),{azimuth:135,elevation:41});
assert.equal(rotatedView({azimuth:170,elevation:32},40,0,400,200).azimuth,-154);
assert.equal(rotatedView({azimuth:-170,elevation:32},-40,0,400,200).azimuth,154);
assert.equal(rotatedView({azimuth:45,elevation:32},0,1000,400,200).elevation,5);
assert.equal(rotatedView({azimuth:45,elevation:32},0,-1000,400,200).elevation,85);
assert.deepEqual(rotatedView({azimuth:45,elevation:32},200,-40,800,400),rotatedView({azimuth:45,elevation:32},100,-20,400,200),'same gesture relative to a zoomed canvas');
const handlers={};
let capture=null, starts=0, finishes=[], enabled=true;
let current={azimuth:45,elevation:32};
const canvas={
 style:{},setAttribute(){},focus(){},
 getBoundingClientRect:()=>({width:400,height:200}),
 addEventListener:(name,fn)=>{handlers[name]=fn;},
 setPointerCapture:(id)=>{capture=id;},
 hasPointerCapture:(id)=>capture===id,
 releasePointerCapture:()=>{capture=null;},
};
bind(canvas,{label:'Rotate',read:()=>({...current}),onStart:()=>{if(!enabled)return false;starts++;},onChange:(view)=>{current=view;},onEnd:(cancelled)=>finishes.push(cancelled)});
const event=(props={})=>({pointerId:1,button:0,clientX:10,clientY:20,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...props});
const down=event();handlers.pointerdown(down);
assert(down.stopped&&down.prevented);assert.equal(capture,1);assert.equal(canvas.style.cursor,'grabbing');
handlers.pointermove(event({clientX:110,clientY:0}));
assert.deepEqual(current,{azimuth:135,elevation:41});
handlers.pointermove(event({pointerId:2,clientX:300}));
assert.deepEqual(current,{azimuth:135,elevation:41},'ignore a second pointer');
handlers.pointerup(event());handlers.lostpointercapture(event());
assert.deepEqual(finishes,[false],'one completed gesture');assert.equal(capture,null);
handlers.pointerdown(event());handlers.pointermove(event({clientX:200}));
handlers.keydown(event({key:'Escape'}));
assert.deepEqual(current,{azimuth:135,elevation:41});assert.deepEqual(finishes,[false,true]);
handlers.pointerdown(event());handlers.pointermove(event({clientX:200}));handlers.pointercancel(event());
assert.deepEqual(current,{azimuth:135,elevation:41});assert.equal(finishes.at(-1),true);
enabled=false;handlers.pointerdown(event());assert.equal(capture,null);
enabled=true;handlers.pointerdown(event({button:2}));assert.equal(capture,null);
assert.equal(starts,3);
console.log('matrix-surface-interaction.test.js: ok');
