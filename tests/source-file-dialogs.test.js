"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { dialogFilters } = require('../electron/dialog-filters.js');
const sourceOptions = { suggestedName: 'sir.stgx', types: [{description:'Source', accept:{'text/plain':['.stgx','.txt']}}] };
assert.deepEqual(dialogFilters(sourceOptions), [{name:'Source', extensions:['stgx','txt']}]);
assert.deepEqual(dialogFilters({}), [{name:'JSON', extensions:['json']}]);
assert.deepEqual(dialogFilters({types:[{accept:{'text/plain':['.stgx','.stgx','../bad']}}]}), [{name:'Files', extensions:['stgx']}]);
const calls = [];
const context = { __TAURI__: { core: { invoke: async (name, args) => {
  calls.push({name,args});
  return name === 'open_file_dialog' ? ['/tmp/example.stgx'] : '/tmp/example.stgx';
} } }, STGraphXPlatformContract: { normalizePlatformApi: (api) => api } };
vm.runInNewContext(fs.readFileSync(require.resolve('../platform/tauri-platform.js'),'utf8'), context);
(async () => {
  await context.STGraphXPlatform.showSaveFilePicker(sourceOptions);
  await context.STGraphXPlatform.showOpenFilePicker(sourceOptions);
  assert.equal(calls[0].args.suggestedName, 'sir.stgx');
  assert.deepEqual(Array.from(calls[0].args.extensions), ['stgx','txt']);
  assert.deepEqual(Array.from(calls[1].args.extensions), ['stgx','txt']);
  console.log('source-file-dialogs.test.js: ok');
})().catch((error) => { console.error(error); process.exitCode=1; });
