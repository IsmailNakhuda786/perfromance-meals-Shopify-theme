import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,rmSync,writeFileSync,statSync,utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('account bundle uses the active CLI origin, while production requires its configured origin',()=>{
 const root=mkdtempSync(join(tmpdir(),'pm-account-config-'));
 try {
  mkdirSync(join(root,'scripts'));
  mkdirSync(join(root,'extensions/performance-meals-account/src'),{recursive:true});
  const script=join(root,'scripts/configure-account-endpoint.mjs');
  copyFileSync('scripts/configure-account-endpoint.mjs',script);
  const generated=join(root,'extensions/performance-meals-account/src/app-endpoint.generated.js');
  const env={...process.env,APP_URL:'https://current-dev.example',PERFORMANCE_MEALS_APP_URL:'https://stale-dev.example',SHOPIFY_APP_URL:''};
  assert.equal(spawnSync(process.execPath,[script],{env:{...env,NODE_ENV:'development'}}).status,0);
  assert.equal(readFileSync(generated,'utf8'),'export const APP_URL="https://current-dev.example";\n');
  assert.equal(spawnSync(process.execPath,[script],{env:{...env,NODE_ENV:'production',PERFORMANCE_MEALS_APP_URL:'https://configured-core.example'}}).status,0);
  assert.equal(readFileSync(generated,'utf8'),'export const APP_URL="https://configured-core.example";\n');
  assert.notEqual(spawnSync(process.execPath,[script],{env:{...env,NODE_ENV:'production',PERFORMANCE_MEALS_APP_URL:''}}).status,0);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('development startup notifies the watched entry even when the ignored endpoint already matches',()=>{
 const root=mkdtempSync(join(tmpdir(),'pm-account-preview-notify-'));
 try{
  mkdirSync(join(root,'scripts'));mkdirSync(join(root,'extensions/performance-meals-account/src'),{recursive:true});
  const script=join(root,'scripts/configure-account-endpoint.mjs'),entry=join(root,'extensions/performance-meals-account/src/OrderStatusBlock.jsx'),generated=join(root,'extensions/performance-meals-account/src/app-endpoint.generated.js');
  copyFileSync('scripts/configure-account-endpoint.mjs',script);writeFileSync(entry,'// preserved account entry\n');
  const env={...process.env,NODE_ENV:'development',APP_URL:'https://current-dev.example',PERFORMANCE_MEALS_APP_URL:'https://previous-dev.example'};
  assert.equal(spawnSync(process.execPath,[script],{env}).status,0);const before=readFileSync(generated,'utf8');
  const old=new Date('2000-01-01T00:00:00Z');utimesSync(entry,old,old);
  assert.equal(spawnSync(process.execPath,[script,'--notify-preview'],{env}).status,0);
  assert.ok(statSync(entry).mtimeMs>old.getTime());assert.equal(readFileSync(entry,'utf8'),'// preserved account entry\n');assert.equal(readFileSync(generated,'utf8'),before);
  utimesSync(entry,old,old);assert.notEqual(spawnSync(process.execPath,[script,'--notify-preview'],{env:{...env,NODE_ENV:'production'}}).status,0);assert.equal(statSync(entry).mtimeMs,old.getTime());
 }finally{rmSync(root,{recursive:true,force:true});}
});
