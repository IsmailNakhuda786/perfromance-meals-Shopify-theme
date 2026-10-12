import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-fifo.ts'],outdir:'.shopify/fifo-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {allocateFundedFifo}=await import('../.shopify/fifo-test/wallet-fifo.js');
const credit=(id,kind,value)=>({id,sourceKind:kind,fundedDelta:value,fundedAllocations:'[]'});
test('oldest funded credit is consumed before newer cash/Gift Card credit; bonus stays separate',()=>{
 const rows=[credit('gift','gift_card_funded',2500),credit('cash','customer_funded',1000),credit('bonus','bonus',0)];
 const parts=allocateFundedFifo(rows,2800);
 assert.deepEqual(parts,[{creditEntryId:'gift',sourceKind:'gift_card_funded',amountMinor:2500},{creditEntryId:'cash',sourceKind:'customer_funded',amountMinor:300}]);
 rows.push({id:'debit',sourceKind:'funded_spend',fundedDelta:-2800,fundedAllocations:JSON.stringify(parts)});
 assert.deepEqual(allocateFundedFifo(rows,700),[{creditEntryId:'cash',sourceKind:'customer_funded',amountMinor:700}]);
 assert.throws(()=>allocateFundedFifo(rows,701));
});
test('unknown credits and corrupted, duplicate or ambiguous historical allocations fail closed',()=>{
 assert.throws(()=>allocateFundedFifo([credit('old','legacy_unknown',1000)],100));
 const rows=[credit('a','customer_funded',1000),credit('b','gift_card_funded',1000)];
 for(const allocations of ['[]','broken',JSON.stringify([{creditEntryId:'a',sourceKind:'gift_card_funded',amountMinor:100}]),JSON.stringify([{creditEntryId:'a',sourceKind:'customer_funded',amountMinor:50},{creditEntryId:'a',sourceKind:'customer_funded',amountMinor:50}])])assert.throws(()=>allocateFundedFifo([...rows,{id:'debit',sourceKind:'funded_spend',fundedDelta:-100,fundedAllocations:allocations}],100));
});
