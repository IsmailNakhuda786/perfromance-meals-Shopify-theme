import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/programme-deliveries.server.ts','app/services/programme-period.ts'],outdir:'.shopify/programme-batch-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {planProgrammeDeliveryBatch:plan,changeProgrammeDeliveryBatch:change,programmeDeliveryProgress:progress,customerProgrammeDeliveryProgress:customerProgress}=await import('../.shopify/programme-batch-test/programme-deliveries.server.js');
const {sixtyDayEntitlement}=await import('../.shopify/programme-batch-test/programme-period.js');
const db=new PrismaClient(),shop='batch-fixture.myshopify.com',owner='gid://shopify/Customer/801',actor='shopify-admin:'+'a'.repeat(64);
process.env.ALLOWED_SHOP=shop;process.env.SIXTY_DAY_BATCHES_ENABLED='true';
let index=0;
async function fixture(){
 const n=++index;
 const p=await db.mealPlanSelection.create({data:{id:`batch-fixture-${n}`,shop,customerGid:owner,programmeGid:'gid://shopify/Product/802',variantGid:'gid://shopify/ProductVariant/803',startsOn:'2099-01-05',endsOn:'2099-03-05',entitlement:JSON.stringify(sixtyDayEntitlement('2099-01-05')),selections:'[]',selectionHash:'preserved',cutoffAt:new Date('2098-12-31'),status:'ORDERED',orderGid:`gid://shopify/Order/${810+n}`,orderLineGid:`gid://shopify/LineItem/${910+n}`}});
 await db.operationalLine.create({data:{shop,selectionId:p.id,orderGid:p.orderGid,orderLineGid:p.orderLineGid,customerGid:owner,productGid:p.programmeGid,variantGid:p.variantGid,businessStream:'meal_plan',department:'meal_plan',validationStatus:'VALIDATED'}});
 process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID=p.id;
 const native={shop:{myshopifyDomain:shop},order:{id:p.orderGid,test:true,cancelledAt:null,displayFinancialStatus:'PAID',customer:{id:owner},lineItems:{nodes:[{id:p.orderLineGid,quantity:1,currentQuantity:1,variant:{id:p.variantGid,product:{id:p.programmeGid}}}],pageInfo:{hasNextPage:false}},fulfillmentsCount:{count:0,precision:'EXACT'}}};
 const admin={graphql:async query=>{assert.ok(!query.includes('mutation'));return Response.json({data:native});}};
 const input={shop,selectionId:p.id,actor,reference:'first',weekdayMeals:4,frozenMeals:8};
 return {p,native,admin,input};
}
test('default-off and production gates prevent mutations',async()=>{
 const {admin,input}=await fixture();delete process.env.SIXTY_DAY_BATCHES_ENABLED;
 await assert.rejects(plan(admin,input),/not activated/);assert.deepEqual(await progress(shop,owner,input.selectionId),{available:false});
 process.env.SIXTY_DAY_BATCHES_ENABLED='true';const old=process.env.NODE_ENV;process.env.NODE_ENV='production';
 await assert.rejects(plan(admin,input),/not activated/);process.env.NODE_ENV=old||'test';
});
test('original entitlement required; missing historical snapshots never silently backfill',async()=>{
 const {p,admin,input}=await fixture();await db.mealPlanSelection.update({where:{id:p.id},data:{entitlement:null}});
 await assert.rejects(plan(admin,input),/original 60-day entitlement/);assert.equal((await progress(shop,owner,p.id)).reviewRequired,true);
 assert.equal(await db.planOperation.count({where:{selectionId:p.id}}),0);
});
test('allocation conserves separate meal totals and replay cannot reserve twice',async()=>{
 const {p,admin,input}=await fixture();const before=await db.mealPlanSelection.findUnique({where:{id:p.id}});
 assert.equal((await progress(shop,owner,p.id)).notStarted,true);
 const first=await plan(admin,input);assert.equal(first.unallocatedWeekday,84);assert.equal(first.unallocatedFrozen,24);
 assert.equal((await plan(admin,input)).replayed,true);
 await assert.rejects(plan(admin,{...input,frozenMeals:9}),/reference already/);
 await plan(admin,{...input,reference:'remaining',weekdayMeals:84,frozenMeals:24});
 await assert.rejects(plan(admin,{...input,reference:'over',weekdayMeals:1,frozenMeals:0}),/Not enough/);
 assert.deepEqual(await db.mealPlanSelection.findUnique({where:{id:p.id}}),before);
 assert.equal(await db.planOperation.count({where:{selectionId:p.id,kind:'SIXTY_DAY_DELIVERY_BATCH'}}),2);
});
test('dispatch is recorded once; delivered meals cannot be cancelled and no native mutation occurs',async()=>{
 const {p,admin,input}=await fixture(),batch=await plan(admin,input);
 const request={shop,selectionId:p.id,batchId:batch.id,revision:1,action:'dispatch',actor};
 assert.equal((await change(admin,request,new Date('2099-01-05T02:00:00Z'))).state,'DISPATCHED');
 assert.equal((await change(admin,request)).replayed,true);
 await assert.rejects(change(admin,{...request,revision:2,action:'cancel'}),/cannot be cancelled/);
 const result=await progress(shop,owner,p.id);assert.equal(result.dispatchedWeekday,4);assert.equal(result.dispatchedFrozen,8);assert.equal(result.plannedWeekday,0);
 const safe=await customerProgress(shop,owner,p.id);assert.equal(JSON.stringify(safe).includes(actor),false);assert.equal('reference' in safe.batches[0],false);
 assert.equal((await db.operationalLine.findFirst({where:{selectionId:p.id}})).fulfillmentState,'DISPATCHED');
});
test('cancelling an unsent batch releases only its allocation and rejects reuse',async()=>{
 const {p,admin,input}=await fixture(),batch=await plan(admin,input);
 const request={shop,selectionId:p.id,batchId:batch.id,revision:1,action:'cancel',actor};
 await change(admin,request);assert.equal((await change(admin,request)).replayed,true);
 assert.equal((await progress(shop,owner,p.id)).unallocatedWeekday,88);
 await assert.rejects(plan(admin,input),/cancelled batch/);
 assert.equal((await db.operationalLine.findFirst({where:{selectionId:p.id}})).fulfillmentState,'UNASSIGNED');
});
test('native ownership, payment, quantity, complete data and external dispatch must match',async()=>{
 for(const mutate of [o=>o.test=false,o=>o.customer.id='other',o=>o.displayFinancialStatus='REFUNDED',o=>o.cancelledAt='2099-01-06',o=>o.lineItems.nodes[0].quantity=2,o=>o.lineItems.pageInfo.hasNextPage=true,o=>o.fulfillmentsCount.count=1,o=>o.fulfillmentsCount.precision='AT_LEAST']){
  const {p,admin,input,native}=await fixture();mutate(native.order);await assert.rejects(plan(admin,input));assert.equal(await db.planOperation.count({where:{selectionId:p.id}}),0);
 }
});
test('invalid actors, quantities and foreign shop cannot allocate meals',async()=>{
 const {admin,input}=await fixture();
 for(const value of [{actor:'anonymous'},{weekdayMeals:-1},{weekdayMeals:1.5},{weekdayMeals:89},{frozenMeals:33},{weekdayMeals:0,frozenMeals:0},{reference:'../unsafe'}])await assert.rejects(plan(admin,{...input,...value}));
 await assert.rejects(plan(admin,{...input,shop:'foreign.myshopify.com'}));
 assert.equal((await progress(shop,'foreign',input.selectionId)).available,false);
 await assert.rejects(plan(admin,{...input,selectionId:'unapproved-programme'}),/outside the approved/);
 assert.deepEqual(await progress(shop,owner,'unapproved-programme'),{available:false});
});
test('changed original entitlement or stale batch revision fails closed',async()=>{
 const {p,admin,input}=await fixture(),batch=await plan(admin,input);
 await assert.rejects(change(admin,{shop,selectionId:p.id,batchId:batch.id,revision:2,action:'dispatch',actor}),/changed/);
 await db.mealPlanSelection.update({where:{id:p.id},data:{selectionHash:'changed'}});
 await assert.rejects(plan(admin,{...input,reference:'later'}),/basis changed/);
 assert.equal((await progress(shop,owner,p.id)).reviewRequired,true);
});
test('concurrent allocation cannot exceed the purchased entitlement',async t=>{
 if(!process.env.CORE_TEST_POSTGRES_CLIENT){t.skip('Requires PostgreSQL row-lock integration');return;}
 const {p,admin,input}=await fixture();
 const results=await Promise.allSettled(['a','b'].map(reference=>plan(admin,{...input,reference,weekdayMeals:88,frozenMeals:32})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await progress(shop,owner,p.id)).unallocatedWeekday,0);
});
test.after(async()=>{await db.planOperation.deleteMany({where:{shop}});await db.operationalLine.deleteMany({where:{shop}});await db.mealPlanSelection.deleteMany({where:{shop}});await db.$disconnect();});
