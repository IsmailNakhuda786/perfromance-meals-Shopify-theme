import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/rewards-policy.ts','app/services/wallet-fifo.ts','app/services/wallet-credit-policy.ts'],outdir:'.shopify/rewards-policy-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {calculateRewardPoints,rewardRedemptionMinor,allocateGiftCardFirstFood,allocateApprovedFoodFunding,validateRewardRules}=await import('../.shopify/rewards-policy-test/rewards-policy.js');
const {allocateFundedFifo}=await import('../.shopify/rewards-policy-test/wallet-fifo.js');
const {planApprovedWalletSpend}=await import('../.shopify/rewards-policy-test/wallet-credit-policy.js');
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
test('confirmed mixed rates ignore cents separately per earning-rate bucket',()=>{
 const policy={...rules,rules:[{id:'double',kind:'regular',priority:1,productGid:'gid://shopify/Product/2',pointsPerSgd:2}]};
 assert.equal(calculateRewardPoints([line(),line({productGid:'gid://shopify/Product/2'})],policy,time),36);
 // Split lines at the same rate are combined before dropping cents.
 assert.equal(calculateRewardPoints([line({netMinor:690}),line({netMinor:600}),line({productGid:'gid://shopify/Product/2'})],policy,time),36);
});

test('explicit persistent rates and dated promotions replace base rate without stacking',()=>{
 const policy={...rules,rules:[{id:'meal-plan',kind:'regular',priority:9,stream:'meal_plan',pointsPerSgd:2},{id:'valentine',kind:'promotion',priority:2,productGid:'gid://shopify/Product/1',pointsPerSgd:5,startsAt:time,endsAt:'2026-10-14T00:00:00Z'}]};
 assert.equal(calculateRewardPoints([line({stream:'meal_plan',netMinor:30000})],policy,time),1500);
 assert.equal(calculateRewardPoints([line({stream:'meal_plan',netMinor:30000})],policy,'2026-10-14T00:00:00Z'),600);
 assert.throws(()=>calculateRewardPoints([line()],{...policy,rules:[...policy.rules,{...policy.rules[1],id:'conflict',pointsPerSgd:3}]},time),/precedence/);
});

test('invalid calendar dates or missing timezones cannot select a Rewards promotion',()=>{
 const promo={id:'strict-promotion',kind:'promotion',priority:1,productGid:'gid://shopify/Product/1',pointsPerSgd:3,startsAt:'2028-02-29T00:00:00+08:00',endsAt:'2028-03-01T00:00:00+08:00'};
 const policy={...rules,rules:[promo]};
 assert.equal(calculateRewardPoints([line()],policy,'2028-02-28T16:00:00Z'),36);
 assert.equal(calculateRewardPoints([line()],policy,'2028-02-29T16:00:00Z'),12);
 for(const invalid of ['2027-02-29T00:00:00Z','2028-02-30T00:00:00Z','2028-02-29T24:00:00Z','2028-02-29T00:00:00','2028-02-29','2028-13-01T00:00:00Z']){
  assert.throws(()=>calculateRewardPoints([line()],rules,invalid));
  assert.throws(()=>validateRewardRules({...policy,rules:[{...promo,startsAt:invalid}]}));
  assert.throws(()=>validateRewardRules({...rules,earningStartsAt:invalid}));
 }
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

test('Reward credit covers remaining food and delivery proportionally after Gift Card allocation',()=>{
 const food=[line({netMinor:10000})].map(({funding,...food})=>food);
 const input={direct_customer:4000,customer_funded:0,gift_card_funded:5000,reward_funded:2000,bonus:0};
 const result=allocateGiftCardFirstFood(food,input,11000);
 assert.deepEqual(result[0].funding,{direct_customer:3333,customer_funded:0,gift_card_funded:5000,reward_funded:1667,bonus:0});
 assert.equal(calculateRewardPoints(result,rules,time),33);
 const exhausted=allocateGiftCardFirstFood(food,{...input,direct_customer:0,gift_card_funded:10000,reward_funded:1000},11000);
 assert.equal(calculateRewardPoints(exhausted,rules,time),0);
 assert.throws(()=>allocateGiftCardFirstFood(food,{...input,reward_funded:0,bonus:2000},11000),/Bonus/);
});

test('verified food-only bonus earns zero points and Reward credit remains proportional after Gift Card and bonus',()=>{
 const food=[line({netMinor:10000})].map(({funding,...value})=>value);
 const result=allocateApprovedFoodFunding(food,{direct_customer:5000,customer_funded:0,gift_card_funded:3000,bonus:1000,reward_funded:2000},11000);
 assert.deepEqual(result[0].funding,{direct_customer:4286,customer_funded:0,gift_card_funded:3000,bonus:1000,reward_funded:1714});
 assert.equal(calculateRewardPoints(result,rules,time),42);
 assert.throws(()=>allocateApprovedFoodFunding(food,{direct_customer:0,customer_funded:0,gift_card_funded:10000,bonus:1000,reward_funded:0},11000),/Bonus exceeds/);
 assert.equal(calculateRewardPoints(allocateApprovedFoodFunding(food,{direct_customer:0,customer_funded:0,gift_card_funded:0,bonus:10000,reward_funded:0},10000),rules,time),0);
});

test('500 mixed-source purchases conserve every food cent and never award excluded funding',()=>{
 let seed=16062026;
 const pick=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%(max+1);};
 for(let sample=0;sample<500;sample++){
  const foodMinor=1+pick(50000),delivery=pick(2000),total=foodMinor+delivery;
  const wallet=pick(total),walletFood=Math.max(0,wallet-delivery);
  const gift=pick(total-wallet),giftFood=Math.min(foodMinor-walletFood,gift);
  const bonus=pick(foodMinor-walletFood-giftFood);
  const reward=pick(total-wallet-gift-bonus),customerPool=total-gift-bonus-reward;
  const funding={direct_customer:customerPool-wallet,customer_funded:wallet,gift_card_funded:gift,reward_funded:reward,bonus};
  const first=pick(foodMinor),second=pick(foodMinor-first),values=[first,second,foodMinor-first-second];
  const food=values.map((netMinor,index)=>({productGid:`gid://shopify/Product/${index+1}`,stream:'ready_series',netMinor,giftCard:false,walletTopUp:false}));
  const allocated=allocateApprovedFoodFunding(food,funding,total);
  const sums=Object.fromEntries(Object.keys(funding).map(kind=>[kind,allocated.reduce((sum,row)=>sum+row.funding[kind],0)]));
  for(const row of allocated){assert.equal(Object.values(row.funding).reduce((a,b)=>a+b,0),row.netMinor);assert.ok(Object.values(row.funding).every(n=>Number.isSafeInteger(n)&&n>=0));}
  for(const kind of Object.keys(funding))assert.ok(sums[kind]<=funding[kind],`source overspent: ${kind}, sample ${sample}`);
  assert.equal(sums.gift_card_funded,giftFood);assert.equal(sums.customer_funded,walletFood);assert.equal(sums.bonus,bonus);
  const spend=planApprovedWalletSpend(Object.entries(funding).filter(([kind])=>kind!=='direct_customer').map(([sourceKind,remainingMinor])=>({id:sourceKind,sourceKind,remainingMinor,issuedAt:'2026-01-01T00:00:00Z',expiresAt:'2027-01-01T00:00:00Z'})),[{id:'food',kind:'food',amountMinor:foodMinor},{id:'delivery',kind:'delivery',amountMinor:delivery}],time);
  for(const part of spend.allocations)assert.equal(sums[part.sourceKind],part.foodMinor,`planner mismatch: ${part.sourceKind}, sample ${sample}`);
  const eligible=sums.direct_customer+sums.customer_funded;
  assert.ok(eligible<=customerPool);assert.equal(calculateRewardPoints(allocated,rules,time),Math.floor(eligible/100));
  const withoutCustomer=allocated.map(row=>({...row,funding:{...row.funding,direct_customer:0,customer_funded:0,bonus:row.funding.bonus+row.funding.direct_customer+row.funding.customer_funded}}));
  assert.equal(calculateRewardPoints(withoutCustomer,rules,time),0);
 }
});

test('current Rewards follows principal delivery-first before Gift Card and Reward funding',()=>{
 const food=[line({netMinor:10000})].map(({funding,...value})=>value);
 const funding={direct_customer:0,customer_funded:5000,gift_card_funded:5000,reward_funded:1000,bonus:0};
 const current=allocateApprovedFoodFunding(food,funding,11000);
 assert.deepEqual(current[0].funding,{direct_customer:0,customer_funded:4000,gift_card_funded:5000,reward_funded:1000,bonus:0});
 assert.equal(calculateRewardPoints(current,rules,time),40);
 // Historical native readback must retain its original attribution.
 assert.equal(calculateRewardPoints(allocateGiftCardFirstFood(food,funding,11000),rules,time),41);
 const full=allocateApprovedFoodFunding(food,{direct_customer:0,customer_funded:11000,gift_card_funded:0,reward_funded:0,bonus:0},11000);
 assert.equal(full[0].funding.customer_funded,10000);
 assert.throws(()=>allocateApprovedFoodFunding(food,{direct_customer:0,customer_funded:500,gift_card_funded:0,reward_funded:0,bonus:10500},11000),/Bonus exceeds/);
});

test('no-food funding cannot disguise a food-only bonus as delivery payment',()=>{
 assert.throws(()=>allocateApprovedFoodFunding([],{direct_customer:0,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:1000},1000),/Bonus exceeds/);
 assert.deepEqual(allocateApprovedFoodFunding([],{direct_customer:1000,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0},1000),[]);
});
