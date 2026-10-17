import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/delivery-policy.ts'],outdir:'.shopify/delivery-policy-test',bundle:true,format:'esm',platform:'node'});
const {calculateSingaporeDelivery}=await import('../.shopify/delivery-policy-test/delivery-policy.js');
const food=netMinor=>({id:'food',kind:'ordinary_food',netMinor});
test('ordinary food uses exact inclusive7500/12500minor-unit delivery boundaries',()=>{
 for(const [value,fee]of [[0,1000],[7499,1000],[7500,500],[7501,500],[12499,500],[12500,0],[12501,0]])assert.equal(calculateSingaporeDelivery([food(value)]).feeMinor,fee);
});
test('prepaid packages, Gift Cards and top-ups do not subsidize ordinary food delivery',()=>{
 const extras=['delivery_included','gift_card','wallet_top_up'].map((kind,index)=>({id:'extra'+index,kind,netMinor:30000}));
 assert.equal(calculateSingaporeDelivery(extras).feeMinor,0);
 assert.deepEqual(calculateSingaporeDelivery([food(2000),...extras]),{currency:'SGD',eligibleSubtotalMinor:2000,feeMinor:1000,hasOrdinaryFood:true});
 assert.equal(calculateSingaporeDelivery([food(7499),{id:'second-food',kind:'ordinary_food',netMinor:1},...extras]).feeMinor,500);
 assert.equal(calculateSingaporeDelivery([]).feeMinor,0);
});
test('invalid price evidence or threshold configuration cannot produce a shipping quote',()=>{
 for(const value of [-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>calculateSingaporeDelivery([food(value)]));
 assert.throws(()=>calculateSingaporeDelivery([food(100),food(200)]));
 assert.throws(()=>calculateSingaporeDelivery([food(100)],{reducedAtMinor:12500,freeAtMinor:7500,standardFeeMinor:1000,reducedFeeMinor:500}));
 assert.equal(calculateSingaporeDelivery([food(8000)],{reducedAtMinor:8000,freeAtMinor:13000,standardFeeMinor:1100,reducedFeeMinor:600}).feeMinor,600);
});
