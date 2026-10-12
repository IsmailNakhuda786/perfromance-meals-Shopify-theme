import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,rmSync} from 'node:fs';
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
