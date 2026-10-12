import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-top-up-amount.ts'],outdir:'.shopify/top-up-amount-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {parseWalletTopUpAmount}=await import('../.shopify/top-up-amount-test/wallet-top-up-amount.js');
test('approved presets and custom bounds normalize exact cents; malformed or unbounded browser input rejects',()=>{
 for(const amount of ['20','50','100','200','5','500'])assert.deepEqual(parseWalletTopUpAmount(amount),{amountMinor:Number(amount)*100,amount:amount+'.00'});
 assert.deepEqual(parseWalletTopUpAmount('5.01'),{amountMinor:501,amount:'5.01'});
 assert.deepEqual(parseWalletTopUpAmount('499.99'),{amountMinor:49999,amount:'499.99'});
 for(const invalid of [5,null,{},'','-5','4.99','500.01','501','5.001','5e1','+5',' 5','005','999999999999999999'])assert.throws(()=>parseWalletTopUpAmount(invalid));
});
