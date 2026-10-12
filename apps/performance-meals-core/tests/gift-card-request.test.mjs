import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/gift-card-request.ts'],outdir:'.shopify/gift-card-request-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readGiftCardCode}=await import('../.shopify/gift-card-request-test/gift-card-request.js');
test('sensitive Gift Card bodies reject oversized, malformed and non-JSON input',async()=>{
 const request=body=>new Request('https://example.test/claim',{method:'POST',headers:{'content-type':'application/json'},body});
 assert.equal(await readGiftCardCode(request('{"code":"abcd1234efgh5678"}')),'abcd1234efgh5678');
 for(const body of ['null','{','{"code":25}','{"code":"short"}',JSON.stringify({code:'abcd1234efgh5678',padding:'x'.repeat(512)})])await assert.rejects(readGiftCardCode(request(body)));
 await assert.rejects(readGiftCardCode(new Request('https://example.test/claim',{method:'POST',body:'abcd1234efgh5678'})));
});
