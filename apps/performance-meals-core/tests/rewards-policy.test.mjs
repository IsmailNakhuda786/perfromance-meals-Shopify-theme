import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/rewards-policy.ts','app/services/wallet-fifo.ts'],outdir:'.shopify/rewards-policy-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {calculateRewardPoints,rewardRedemptionMinor,allocateGiftCardFirstFood}=await import('../.shopify/rewards-policy-test/rewards-policy.js');
const {allocateFundedFifo}=await import('../.shopify/rewards-policy-test/wallet-fifo.js');
const rules={version:'client-20261013',merchantApproved:true,defaultPointsPerSgd:1,rules:[]};
const line=(change={})=>({productGid:'gid://shopify/Product/1',stream:'ready_series',netMinor:1290,funding:{direct_customer:1290,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0},giftCard:false,walletTopUp:false,...change,funding:change.funding||{direct_customer:change.netMinor??1290,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0}});
const time='2026-10-13T00:00:00Z';
test('approved base earning ignores cents, excludes gift cards/top-ups and reward-funded value',()=>{
 assert.equal(calculateRewardPoints([line()],rules,time),12);
 assert.equal(calculateRewardPoints([line({netMinor:10000})],rules,time),100);
 assert.equal(calculateRewardPoints([line({funding:{direct_customer:0,customer_funded:0,gift_card_funded:0,reward_funded:1290,bonus:0}})],rules,time),0);
 assert.equal(calculateRewardPoints([line({funding:{direct_customer:790,customer_funded:0,gift_card_funded:0,reward_funded:500,bonus:0}})],rules,time),7);
 assert.equal(calculateRewardPoints([line({giftCard:true}),line({walletTopUp:true})],rules,time),0);
 assert.equal(calculateRewardPoints([line({funding:{direct_customer:0,customer_funded:0,gift_card_funded:1290,reward_funded:0,bonus:0}})],rules,time),0);
 assert.equal(calculateRewardPoints([line({funding:{direct_customer:290,customer_funded:500,gift_card_funded:300,reward_funded:100,bonus:100}})],rules,time),7);
 assert.throws(()=>calculateRewardPoints([line({funding:{direct_customer:1291,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0}})],rules,time),/differ/);
 assert.equal(rewardRedemptionMinor(1500),15000);
 assert.equal(rewardRedemptionMinor(11),110);
 assert.throws(()=>rewardRedemptionMinor(0));
 assert.throws(()=>rewardRedemptionMinor(1.5));
});
test('explicit persistent rates and dated promotions replace base rate without stacking',()=>{
 const policy={...rules,rules:[{id:'meal-plan',kind:'regular',priority:9,stream:'meal_plan',pointsPerSgd:2},{id:'valentine',kind:'promotion',priority:2,productGid:'gid://shopify/Product/1',pointsPerSgd:5,startsAt:time,endsAt:'2026-10-14T00:00:00Z'}]};
 assert.equal(calculateRewardPoints([line({stream:'meal_plan',netMinor:30000})],policy,time),1500);
 assert.equal(calculateRewardPoints([line({stream:'meal_plan',netMinor:30000})],policy,'2026-10-14T00:00:00Z'),600);
 assert.throws(()=>calculateRewardPoints([line()],{...policy,rules:[...policy.rules,{...policy.rules[1],id:'conflict',pointsPerSgd:3}]},time),/precedence/);
});
test('mixed FIFO spending and returns retain Reward funding without converting it to customer money',()=>{
 const entries=[{id:'r',sourceKind:'reward_funded',fundedDelta:1000,fundedAllocations:'[]'},{id:'g',sourceKind:'gift_card_funded',fundedDelta:2000,fundedAllocations:'[]'}];
 const parts=allocateFundedFifo(entries,1500);
 assert.deepEqual(parts.map(p=>[p.sourceKind,p.amountMinor]),[['reward_funded',1000],['gift_card_funded',500]]);
});

test('confirmed Gift Card-first food allocation excludes delivery and proportionally assigns exact cents',()=>{
 const food=[{...line(),netMinor:6000},{...line(),productGid:'gid://shopify/Product/2',netMinor:4000}].map(({funding,...food})=>food);
 const allocated=allocateGiftCardFirstFood(food,{direct_customer:6000,customer_funded:0,gift_card_funded:5000,reward_funded:0,bonus:0},11000);
 assert.deepEqual(allocated.map(line=>line.funding.gift_card_funded),[3000,2000]);
 assert.equal(calculateRewardPoints(allocated,rules,time),50);
 const rates={...rules,rules:[{id:'product-rate',kind:'regular',priority:1,productGid:'gid://shopify/Product/1',pointsPerSgd:2}]};
 assert.equal(calculateRewardPoints(allocated,rates,time),80);
 const tiny=allocateGiftCardFirstFood([{...food[0],netMinor:101},{...food[1],netMinor:100}],{direct_customer:151,customer_funded:0,gift_card_funded:50,reward_funded:0,bonus:0},201);
 assert.equal(tiny.reduce((sum,line)=>sum+line.funding.gift_card_funded,0),50);
 assert.throws(()=>allocateGiftCardFirstFood(food,{direct_customer:5000,customer_funded:0,gift_card_funded:5000,reward_funded:0,bonus:0},11000),/differs/);
});
