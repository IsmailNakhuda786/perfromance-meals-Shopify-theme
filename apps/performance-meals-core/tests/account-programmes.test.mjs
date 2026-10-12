import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/services/account-programmes.server.ts'],outdir:'.shopify/account-test',bundle:true,format:'esm',platform:'node'});
const {accountProgrammeNames,accountMealNames}=await import('../.shopify/account-test/account-programmes.server.js');
const programmeGid='gid://shopify/Product/1',variantGid='gid://shopify/ProductVariant/2';
test('account names use native variant/product metadata and reject mismatched saved product references',async()=>{
 let requests=0;
 const admin={graphql:async(_query,{variables})=>{requests++;assert.deepEqual(variables.ids,[variantGid]);return Response.json({data:{nodes:[{id:variantGid,title:'Low Carb Regular',product:{id:programmeGid,title:'Monthly'}}]}});}};
 const names=await accountProgrammeNames(admin,[{programmeGid,variantGid},{programmeGid,variantGid}]);
 assert.equal(requests,1);assert.deepEqual(names.get(variantGid),{programmeTitle:'Monthly',variantTitle:'Low Carb Regular'});
 assert.equal((await accountProgrammeNames(admin,[{programmeGid:'gid://shopify/Product/99',variantGid}])).size,0);
});
test('missing native metadata cannot become invented programme names',async()=>{
 const plan={programmeGid,variantGid};
 assert.equal((await accountProgrammeNames({graphql:async()=>Response.json({data:{nodes:[null]}})},[plan])).size,0);
 await assert.rejects(()=>accountProgrammeNames({graphql:async()=>Response.json({errors:[{message:'Unavailable'}]})},[plan]),/unavailable/);
 await assert.rejects(()=>accountProgrammeNames({graphql:async()=>{throw Error('must not query');}},[{programmeGid,variantGid:'invalid'}]),/Invalid/);
});

test('account meal names use paginated native metadata and never fabricate missing names',async()=>{
 const ids=Array.from({length:51},(_,i)=>`gid://shopify/Product/${i+1}`);let calls=0;
 const names=await accountMealNames({graphql:async(_query,{variables})=>{calls++;assert.ok(variables.ids.length<=50);return Response.json({data:{nodes:variables.ids.map(id=>id===ids[50]?null:{id,title:'Approved dish '+id.split('/').pop()})}});}},[...ids,ids[0]]);
 assert.equal(calls,2);assert.equal(names.size,50);assert.equal(names.has(ids[50]),false);
 await assert.rejects(()=>accountMealNames({graphql:async()=>{throw Error('must not query');}},['invalid']),/Invalid/);
});
