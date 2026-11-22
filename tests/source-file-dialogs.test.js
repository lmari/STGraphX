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
  // Execute the actual preload and both public bridges. The old preload
  // discarded `types`, so testing only the main-process filter missed the bug.
  const exposed = {};
  const ipcCalls = [];
  const preloadRequire = require('node:module').createRequire(require.resolve('../electron/preload.js'));
  const ipcRenderer = { invoke: async (channel, options) => {
    ipcCalls.push({channel, options: structuredClone(options)});
    return {canceled:false, filePath:'/tmp/sir.stgx', filePaths:['/tmp/sir.stgx']};
  } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../electron/preload.js'),'utf8'), {
    require: (name) => name === 'electron' ? {
      contextBridge: {exposeInMainWorld:(key,value)=>{exposed[key]=value;}}, ipcRenderer, webUtils:{},
    } : preloadRequire(name),
  });
  const optionsWithHandle = {...sourceOptions, startIn:{path:'/tmp/models',getFile(){}}};
  await exposed.STGraphXElectronFiles.showSaveFilePath(optionsWithHandle);
  await exposed.STGraphXElectronFiles.showOpenFilePaths(optionsWithHandle);
  await exposed.STGraphXPlatform.showSaveFilePicker(optionsWithHandle);
  await exposed.STGraphXPlatform.showOpenFilePicker(optionsWithHandle);
  assert.equal(ipcCalls.length,4);
  for (const call of ipcCalls) {
    assert.deepEqual(dialogFilters(call.options), [{name:'Source',extensions:['stgx','txt']}], call.channel);
    assert.equal(call.options.defaultPath,'/tmp/models');
    assert.equal(call.options.startIn,undefined,'native handles must not cross IPC');
  }
  await exposed.STGraphXElectronFiles.showSaveFilePath({suggestedName:'model.json'});
  assert.deepEqual(dialogFilters(ipcCalls.at(-1).options),[{name:'JSON',extensions:['json']}]);
  console.log('source-file-dialogs.test.js: ok');
})().catch((error) => { console.error(error); process.exitCode=1; });
