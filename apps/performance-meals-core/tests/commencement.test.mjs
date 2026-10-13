import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/services/commencement.ts'],outfile:'.shopify/commencement-test.js',bundle:true,platform:'node',format:'esm'});
const {commencementStatus}=await import('../.shopify/commencement-test.js');
test('saved date commences at the Singapore date boundary rather than dispatch or browser time zone',()=>{
 assert.equal(commencementStatus('2026-10-19',new Date('2026-10-18T15:59:59Z')),'before_start');
 assert.equal(commencementStatus('2026-10-19',new Date('2026-10-18T16:00:00Z')),'commenced');
 assert.equal(commencementStatus('2026-10-19',new Date('2026-10-20T00:00:00Z')),'commenced');
});
test('missing or impossible dates never invent commencement evidence',()=>{
 for(const value of [null,undefined,'','2026-02-30','2026-2-2','2026-10-19T00:00:00Z'])assert.equal(commencementStatus(value,new Date('2026-10-13T00:00:00Z')),'unknown');
 assert.equal(commencementStatus('2026-10-19',new Date('invalid')),'unknown');
});
