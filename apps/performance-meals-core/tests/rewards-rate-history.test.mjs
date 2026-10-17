import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/rewards-ledger.server.ts'],outdir:'.shopify/reward-history-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {configureRewards,rewardRulesAtPayment,earnVerifiedOrderRewards}=await import('../.shopify/reward-history-test/rewards-ledger.server.js');
const db=new PrismaClient(),shop=`reward-history-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/1600';process.env.ALLOWED_SHOP=shop;
const old={version:'rate-one',merchantApproved:true,defaultPointsPerSgd:1,rules:[]},next={...old,version:'rate-two',defaultPointsPerSgd:2};
const order=(id,paidAt)=>({shop,customerGid:customer,orderGid:`gid://shopify/Order/${id}`,paidAt,lines:[{productGid:'gid://shopify/Product/1601',stream:'ready_series',netMinor:1290,funding:{direct_customer:1290,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0},giftCard:false,walletTopUp:false}]});
test.after(async()=>{for(const table of ['rewardsEntry','rewardsAccount','rewardRuleActivation','rewardRuleVersion','commercePolicy'])await db[table].deleteMany({where:{shop}});await db.$disconnect();});

test('delayed processing preserves the paid-time rate and the change instant starts the new rate',async()=>{
 await configureRewards(shop,old,new Date('2026-10-12T00:00:00Z'));
 await configureRewards(shop,next,new Date('2026-10-13T00:00:00Z'));
 await db.commercePolicy.update({where:{shop},data:{rewardsEnabled:true}});
 const monday=await earnVerifiedOrderRewards(order(1610,'2026-10-12T12:00:00Z'));
 const tuesday=await earnVerifiedOrderRewards(order(1611,'2026-10-13T00:00:00Z'));
 assert.equal(monday.pointsDelta,12);assert.equal(monday.rulesVersion,'rate-one');
 assert.equal(tuesday.pointsDelta,24);assert.equal(tuesday.rulesVersion,'rate-two');
 assert.equal((await earnVerifiedOrderRewards(order(1610,'2026-10-12T12:00:00Z'))).id,monday.id);
 assert.equal((await db.rewardsAccount.findFirst({where:{shop}})).points,36);
});

test('unknown historical rate holds earning rather than using the current setting',async()=>{
 const before=await db.rewardsEntry.count({where:{shop}});
 await assert.rejects(earnVerifiedOrderRewards(order(1612,'2026-10-11T23:59:59Z')),/not recorded/);
 assert.equal(await db.rewardsEntry.count({where:{shop}}),before);
});

test('rate versions remain immutable, activation cannot move backwards and saving again is idempotent',async()=>{
 await assert.rejects(configureRewards(shop,{...old,defaultPointsPerSgd:9},new Date('2026-10-14T00:00:00Z')),/immutable/);
 await assert.rejects(configureRewards(shop,old,new Date('2026-10-12T12:00:00Z')),/follow/);
 await configureRewards(shop,next,new Date('2026-10-14T00:00:00Z'));
 assert.equal(await db.rewardRuleActivation.count({where:{shop}}),2);
 await configureRewards(shop,old,new Date('2026-10-15T00:00:00Z'));
 assert.equal((await rewardRulesAtPayment(shop,'2026-10-14T12:00:00Z')).version,'rate-two');
 assert.equal((await rewardRulesAtPayment(shop,'2026-10-15T00:00:00Z')).version,'rate-one');
});

test('historical rates do not bypass current customer QA restrictions',async()=>{
 await configureRewards(shop,{...old,version:'restricted',qaCustomerGid:'gid://shopify/Customer/999'},new Date('2026-10-16T00:00:00Z'));
 await assert.rejects(earnVerifiedOrderRewards(order(1613,'2026-10-12T12:00:00Z')),/QA scope/);
 assert.equal((await db.rewardsAccount.findFirst({where:{shop}})).points,36);
});
