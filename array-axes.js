/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 * Copyright (c) 2026 Luca Mari
 */
(function installArrayAxes(g) {
  const S = g?.GraphSemantics;
  if (!S || S.__arrayAxesInstalled) return;
  const KEY = "__stgraphxAxes", SIZE = "__stgxAxisSize", COORD = "__stgxAxisCoord";
  const cloneAxes = (axes) => Array.isArray(axes) ? axes.map((a) => Array.isArray(a) ? a.slice() : []) : null;
  const attach = (v, axes) => {
    if (Array.isArray(v) && Array.isArray(axes)) Object.defineProperty(v, KEY, { value: cloneAxes(axes), configurable: true, writable: true, enumerable: false });
    return v;
  };
  const get = (v) => Array.isArray(v) && Array.isArray(v[KEY]) ? cloneAxes(v[KEY]) : null;
  const stdAxis = (n) => Number.isInteger(Number(n)) && Number(n) >= 0 ? Array.from({ length: Number(n) }, (_, i) => i) : null;
  const axisValues = (v) => Array.isArray(v) && !v.some(Array.isArray) ? v.slice() : stdAxis(v);
  const axisSize = (v) => {
    if (Array.isArray(v)) return v.length;
    const a = stdAxis(v); if (!a) throw new Error("array axis must be a non-negative integer dimension or a vector"); return a.length;
  };
  const axisCoord = (v, i) => {
    const k = Number(i); if (!Number.isInteger(k) || k < 0 || k >= axisSize(v)) throw new Error("array axis index out of range");
    return Array.isArray(v) ? v[k] : k;
  };
  const quotedEnd = (s, i) => { const q=s[i]; for (i++; i<s.length; i++) { if (s[i]==="\\") i++; else if (s[i]===q) return i+1; } return s.length; };
  const matchParen = (s, open) => { let d=0; for (let i=open;i<s.length;i++) { if (/['"`]/.test(s[i])) { i=quotedEnd(s,i)-1; continue; } if (s[i]==="(") d++; else if (s[i]===")" && --d===0) return i; } return -1; };
  const splitArgs = (s) => { const out=[]; let st=0,p=0,b=0,c=0; for (let i=0;i<s.length;i++) { const ch=s[i]; if (/['"`]/.test(ch)) { i=quotedEnd(s,i)-1; continue; } if(ch==="(")p++; else if(ch===")")p--; else if(ch==="[")b++; else if(ch==="]")b--; else if(ch==="{")c++; else if(ch==="}")c--; else if(ch===","&&!p&&!b&&!c){out.push(s.slice(st,i).trim());st=i+1;} } out.push(s.slice(st).trim()); return out; };
  const directRange = (s) => { const t=String(s).trim(); if(!/^range\s*\(/u.test(t)) return false; const o=t.indexOf("("); return matchParen(t,o)===t.length-1; };
  function transform(src, map={}) {
    const s=String(src??""); let out="",i=0;
    while(i<s.length){ const ch=s[i];
      if(/['"`]/.test(ch)){const e=quotedEnd(s,i);out+=s.slice(i,e);i=e;continue;}
      if(ch==="$"&&/\d/.test(s[i+1]||"")){let j=i+2;while(/\d/.test(s[j]||""))j++;const t=s.slice(i,j);out+=Object.prototype.hasOwnProperty.call(map,t)?map[t]:t;i=j;continue;}
      if(s.startsWith("array",i)&&!/[A-Za-z0-9_$]/.test(s[i-1]||"")&&!/[A-Za-z0-9_$]/.test(s[i+5]||"")){
        let o=i+5;while(/\s/.test(s[o]||""))o++;if(s[o]==="("){const e=matchParen(s,o);if(e>=0){out+=transformArray(splitArgs(s.slice(o+1,e)),map,s.slice(i,e+1));i=e+1;continue;}}
      }
      out+=ch;i++;
    } return out;
  }
  function transformArray(args, outer, original){
    if(args.length<2)return original;
    const single=args.length===2&&directRange(args[0]), multi=args.length>=3;
    if(!single&&!multi)return `array(${transform(args[0],outer)}, ${transform(args[1],{})})`;
    const raw=single?[args[0]]:args.slice(0,-1), axes=raw.map((a)=>transform(a,outer)), local={};
    axes.forEach((a,i)=>local[`$${i}`]=`${COORD}((${a}), $${i})`);
    const dims=axes.length===1?`${SIZE}((${axes[0]}))`:`[${axes.map((a)=>`${SIZE}((${a}))`).join(", ")}]`;
    return `array(${dims}, ${transform(args.at(-1),local)})`;
  }
  const rootArgs=(src)=>{const t=String(src??"").trim();if(!/^array\s*\(/u.test(t))return null;const o=t.indexOf("("),e=matchParen(t,o);return e===t.length-1?splitArgs(t.slice(o+1,e)):null;};
  const baseEval=S.evaluateValueExpression.bind(S), baseValidate=S.validateExpressionSyntax.bind(S);
  const localOpts=(o={})=>!Array.isArray(o.localFunctions)?o:{...o,localFunctions:o.localFunctions.map((f)=>({...f,expression:transform(f.expression)}))};
  const ctx=(c={})=>({...c,[SIZE]:axisSize,[COORD]:axisCoord});
  const evalRaw=(x,c,o)=>baseEval(transform(x),ctx(c),localOpts(o));
  const shape=(v)=>{if(!Array.isArray(v))return[];const z=[];let a=v;while(Array.isArray(a)){z.push(a.length);if(!a.length)break;const f=a[0];if(Array.isArray(f)&&!a.every((x)=>Array.isArray(x)&&x.length===f.length))return null;a=f;}return z;};
  const fits=(axes,v)=>{const sh=shape(v);return Array.isArray(sh)&&Array.isArray(axes)&&axes.length===sh.length&&axes.every((a,i)=>Array.isArray(a)&&a.length===sh[i]);};
  function rootAxes(src,c,o){const a=rootArgs(src);if(!a||a.length<2)return null;if(a.length>=3)return a.slice(0,-1).map((x)=>axisValues(evalRaw(x,c,o).value));if(directRange(a[0]))return [axisValues(evalRaw(a[0],c,o).value)];const v=evalRaw(a[0],c,o).value;return Array.isArray(v)?v.map(stdAxis):[stdAxis(v)];}
  function inheritedAxes(src,c,v){if(!Array.isArray(v)||typeof S.collectIdentifierReferences!=="function")return null;const found=[];for(const n of S.collectIdentifierReferences(src)){const a=get(c?.[n]);if(a&&fits(a,v))found.push(a);}const sig=new Set(found.map(JSON.stringify));return sig.size===1?found[0]:null;}
  S.evaluateValueExpression=(expression,c={},o={})=>{const src=String(expression??"");const r=baseEval(transform(src),ctx(c),localOpts(o));if(r?.ok&&Array.isArray(r.value)){const a=rootAxes(src,c,o)||inheritedAxes(src,c,r.value);if(a&&a.every(Boolean)&&fits(a,r.value))attach(r.value,a);}return r;};
  S.validateExpressionSyntax=(expression,names=[],o={})=>baseValidate(transform(expression),[...names,SIZE,COORD],localOpts(o));
  if(typeof S.analyzeStateTransitionExpression==="function"){const f=S.analyzeStateTransitionExpression.bind(S);S.analyzeStateTransitionExpression=(e)=>f(transform(e));}
  for(const name of ["evaluateIntegralDerivativeExpression","evaluateIntegralDerivativeList"]){if(typeof S[name]==="function"){const f=S[name].bind(S);S[name]=(e,c={},o={})=>f(transform(e),ctx(c),localOpts(o));}}
  if(typeof S.evaluateStateTransitionExpressionWithIntegralValues==="function"){const f=S.evaluateStateTransitionExpressionWithIntegralValues.bind(S);S.evaluateStateTransitionExpressionWithIntegralValues=(e,c={},vals=[],o={})=>f(transform(e),ctx(c),vals,localOpts(o));}
  const oldReserved=S.isReservedWord?.bind(S),oldFn=S.isFunctionName?.bind(S);if(oldReserved)S.isReservedWord=(n)=>n===SIZE||n===COORD||oldReserved(n);if(oldFn)S.isFunctionName=(n)=>n===SIZE||n===COORD||oldFn(n);
  const label=(v)=>typeof S.formatComputedValue==="function"?S.formatComputedValue(v):String(v??"");
  function patchGrid(grid){const root=grid?.closest?.(".value-widget[data-widget-id]");if(!root)return;let gr;try{if(typeof graph==="undefined")return;gr=graph;}catch{return;}const w=gr.widgets?.find((x)=>+x.id===+root.dataset.widgetId);const m=gr.nodes?.find((x)=>String(x.name)===String(w?.source))?.computedValue,a=get(m);if(!w||w.type!=="matrix"||w.showIndices===false||!a||a.length<2)return;const rows=w.displayRows??m.length,cols=w.displayCols??(m[0]?.length||0),cells=[...grid.children];for(let j=0;j<Math.min(cols,a[1].length);j++)cells[1+j].textContent=label(a[1][j]);for(let i=0;i<Math.min(rows,a[0].length);i++)cells[(cols+1)+i*(cols+1)].textContent=label(a[0][i]);}
  if(typeof MutationObserver!=="undefined"&&typeof document!=="undefined"){const obs=new MutationObserver((rs)=>rs.forEach((r)=>r.addedNodes.forEach((n)=>{if(n.nodeType!==1)return;if(n.matches?.(".matrix-widget-grid"))patchGrid(n);n.querySelectorAll?.(".matrix-widget-grid").forEach(patchGrid);})));const start=()=>{obs.observe(document.documentElement,{childList:true,subtree:true});document.querySelectorAll(".matrix-widget-grid").forEach(patchGrid);};document.documentElement?start():document.addEventListener("DOMContentLoaded",start,{once:true});}
  function patchPlayer(p){const model=p?._state?.runtimeModel,raw=p?._state?.rawModel,box=p?.$widgets;if(!model||!raw||!box)return;const ws=(raw.widgets||[]).filter((w)=>!p.isDashboardItemVisible||p.isDashboardItemVisible(w)),nodes=new Map((model.nodes||[]).map((n)=>[String(n.name),n]));[...box.children].forEach((root,k)=>{const w=ws[k],m=nodes.get(String(w?.source))?.computedValue,a=get(m),can=root.querySelector?.("canvas");if(!w||w.type!=="matrix"||w.showIndices===false||!a||a.length<2||!can)return;const x=can.getContext("2d"),rows=Math.min(m.length,w.displayRows??m.length),cols=Math.min(m[0]?.length||0,w.displayCols??(m[0]?.length||0)),cs=can.width/(cols+1);if(!x||!rows||!cols)return;x.textAlign="center";x.textBaseline="middle";x.font=`${Math.max(8,Math.floor(cs*.45))}px Georgia, serif`;for(let j=0;j<Math.min(cols,a[1].length);j++){const px=(j+1)*cs;x.fillStyle="#f5f9fc";x.fillRect(px,0,cs,cs);x.strokeStyle="#d9e3ee";x.strokeRect(px+.5,.5,Math.max(0,cs-1),Math.max(0,cs-1));x.fillStyle="#52687d";x.fillText(label(a[1][j]),px+cs/2,cs/2);}for(let i=0;i<Math.min(rows,a[0].length);i++){const py=(i+1)*cs;x.fillStyle="#f5f9fc";x.fillRect(0,py,cs,cs);x.strokeStyle="#d9e3ee";x.strokeRect(.5,py+.5,Math.max(0,cs-1),Math.max(0,cs-1));x.fillStyle="#52687d";x.fillText(label(a[0][i]),cs/2,py+cs/2);}});}
  if(typeof customElements!=="undefined")customElements.whenDefined("stgraphx-player").then(()=>{const P=customElements.get("stgraphx-player")?.prototype;if(!P||P.__arrayAxesPatched)return;const r=P.renderWidgets;P.renderWidgets=function(...a){const z=r.apply(this,a);patchPlayer(this);return z;};Object.defineProperty(P,"__arrayAxesPatched",{value:true});}).catch(()=>{});
  const B=g.STGraphXI18nBundles;if(B?.it)B.it["expr.help.array"]="array(dim, expr), array([d0,d1,...], expr) oppure array(asse0, asse1, ..., expr): gli assi interi usano 0..n-1; range(...) usa i valori del range; $0, $1, ... sono le coordinate locali.";if(B?.en)B.en["expr.help.array"]="array(dim, expr), array([d0,d1,...], expr), or array(axis0, axis1, ..., expr): integer axes use 0..n-1; range(...) uses its values; $0, $1, ... are local coordinates.";
  S.attachArrayAxes=attach;S.getArrayAxes=get;S.preprocessArrayAxesExpression=transform;Object.defineProperty(S,"__arrayAxesInstalled",{value:true});g.STGraphXArrayAxes={attachArrayAxes:attach,getArrayAxes:get,preprocessExpression:transform};
})(typeof window!=="undefined"&&window.GraphSemantics?window:globalThis);
