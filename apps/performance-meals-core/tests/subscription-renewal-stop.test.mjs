import test from 'node:test';import assert from 'node:assert/strict';import{randomUUID}from'node:crypto';
import{PrismaClient,buildServices}from'./support/database.mjs';
await buildServices({entryPoints:['app/services/subscription-renewal-stop.server.ts'],outdir:'.shopify/renewal-stop-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const{stopFutureSubscriptionRenewals:stop}=await import('../.shopify/renewal-stop-test/subscription-renewal-stop.server.js');
const db=new PrismaClient(),shop=`renewal-stop-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/1';let seq=100;
process.env.ALLOWED_SHOP=shop;process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='true';process.env.CORE_SUBSCRIPTION_RENEWAL_STOP_QA_CUSTOMER=customer;
async function fixture({status='ACTIVE',mealPlan=false}={}){
 const n=seq++,id=`gid://shopify/SubscriptionContract/${n}`,order=`gid://shopify/Order/${n}`,orderLine=`gid://shopify/LineItem/${n}`,product=`gid://shopify/Product/${n}`,variant=`gid://shopify/ProductVariant/${n}`,plan=`gid://shopify/SellingPlan/${n}`;
 process.env.CORE_SUBSCRIPTION_RENEWAL_STOP_QA_CONTRACTS=(process.env.CORE_SUBSCRIPTION_RENEWAL_STOP_QA_CONTRACTS||'')+','+id;
 let selection=null;if(mealPlan)selection=await db.mealPlanSelection.create({data:{shop,customerGid:customer,programmeGid:product,variantGid:variant,sellingPlanGid:plan,selections:'[]',selectionHash:'unchanged-paid-menu',cutoffAt:new Date('2026-11-01'),status:'ORDERED',entitlement:'{"totalMeals":120}',orderGid:order,orderLineGid:orderLine,contractGid:id}});
 const row=await db.operationalLine.create({data:{shop,customerGid:customer,orderGid:order,orderLineGid:orderLine,productGid:product,variantGid:variant,businessStream:mealPlan?'meal_plan':'ready_series',validationStatus:'VALIDATED',contractGid:id,selectionId:selection?.id,fulfillmentState:'DISPATCHED'}});
 const contract={id,status,currencyCode:'SGD',app:{id:'gid://shopify/App/2'},customer:{id:customer},originOrder:{id:order,customer:{id:customer}},lines:{nodes:[{id:`gid://shopify/SubscriptionLine/${n}`,productId:product,variantId:variant,sellingPlanId:plan,quantity:1}],pageInfo:{hasNextPage:false}}};
 const f={id,row,selection,contract,reads:0,writes:0,readEdit:null,mutation:null};
 f.admin={graphql:async(q)=>{
  if(q.includes('mutation CoreStopFutureRenewals')){f.writes++;assert.match(q,/actor:CUSTOMER/);if(f.mutation)return f.mutation(f);f.contract.status='CANCELLED';return Response.json({data:{subscriptionContractCancel:{contract:{id,status:'CANCELLED'},userErrors:[]}}});}
  f.reads++;const data={shop:{myshopifyDomain:shop,currencyCode:'SGD'},currentAppInstallation:{app:{id:'gid://shopify/App/2'}},subscriptionContract:structuredClone(f.contract)};if(f.readEdit)f.readEdit(data,f.reads);return Response.json({data});
 }};f.run=()=>stop(f.admin,shop,customer,id,randomUUID());return f;
}
test.after(async()=>{for(const model of ['subscriptionRenewalStop','operationalLine','mealPlanSelection','customerWallet','walletEntry','orderCancellation'])await db[model].deleteMany({where:{shop}});await db.$disconnect();});
test('future-renewal stop preserves all already-paid programme and dispatch records and issues no refund',async()=>{
 for(const mealPlan of [false,true]){
  const f=await fixture({mealPlan});const before=await db.operationalLine.findUnique({where:{id:f.row.id}}),selection=f.selection&&await db.mealPlanSelection.findUnique({where:{id:f.selection.id}});
  const result=await f.run();assert.equal(result.state,'COMPLETED');assert.equal(result.futureRenewalsStopped,true);assert.equal(result.refundIssued,false);assert.equal(f.writes,1);
  assert.deepEqual(await db.operationalLine.findUnique({where:{id:f.row.id}}),before);if(selection)assert.deepEqual(await db.mealPlanSelection.findUnique({where:{id:selection.id}}),selection);
  assert.equal(await db.walletEntry.count({where:{shop}}),0);assert.equal(await db.orderCancellation.count({where:{shop}}),0);
 }
});
test('already-cancelled and repeated requests confirm the same durable operation without another mutation',async()=>{
 const f=await fixture({status:'CANCELLED'}),first=await f.run(),again=await f.run();assert.equal(first.id,again.id);assert.equal(again.state,'COMPLETED');assert.equal(f.writes,0);assert.equal(await db.subscriptionRenewalStop.count({where:{shop,contractGid:f.id}}),1);
 const active=await fixture();await active.run();assert.equal((await active.run()).state,'COMPLETED');assert.equal(active.writes,1);
});
test('lost native response remains unknown until fresh cancellation evidence; no blind resubmission',async()=>{
 const f=await fixture();f.mutation=()=>{throw Error('Network response lost');};assert.equal((await f.run()).state,'UNKNOWN');assert.equal((await f.run()).state,'UNKNOWN');assert.equal(f.writes,1);
 f.contract.status='CANCELLED';assert.equal((await f.run()).state,'COMPLETED');assert.equal(f.writes,1);
});
test('native rejection and mismatched final response cannot claim success or repeat the mutation',async()=>{
 for(const mutation of [()=>Response.json({data:{subscriptionContractCancel:{contract:null,userErrors:[{message:'Not allowed'}]}}}),()=>Response.json({data:{subscriptionContractCancel:{contract:{id:'gid://shopify/SubscriptionContract/999',status:'CANCELLED'},userErrors:[]}}}),()=>Response.json({errors:[{message:'Unavailable'}]})]){
  const f=await fixture();f.mutation=mutation;const r=await f.run();assert.equal(r.futureRenewalsStopped,false);assert.ok(['REVIEW','UNKNOWN'].includes(r.state));await f.run();assert.equal(f.writes,1);
 }
});
test('foreign customer/app/order, unknown status and missing lines stop before any mutation or operation',async()=>{
 for(const edit of [d=>d.shop.myshopifyDomain='other',d=>d.subscriptionContract.customer.id='gid://shopify/Customer/99',d=>d.subscriptionContract.originOrder.customer.id='gid://shopify/Customer/99',d=>d.subscriptionContract.originOrder.id='gid://shopify/Order/99',d=>d.subscriptionContract.app.id='gid://shopify/App/99',d=>d.subscriptionContract.status='FAILED',d=>d.subscriptionContract.lines.pageInfo.hasNextPage=true,d=>d.subscriptionContract.lines.nodes.push(d.subscriptionContract.lines.nodes[0])]){
  const f=await fixture();f.readEdit=edit;await assert.rejects(f.run());assert.equal(f.writes,0);assert.equal(await db.subscriptionRenewalStop.count({where:{shop,contractGid:f.id}}),0);
 }
});
test('quarantined, unlinked and incompletely mapped shared contracts cannot be cancelled',async()=>{
 for(const edit of [async f=>db.operationalLine.update({where:{id:f.row.id},data:{validationStatus:'QUARANTINED'}}),async f=>db.operationalLine.update({where:{id:f.row.id},data:{contractGid:null}}),async f=>{f.contract.lines.nodes.push({...f.contract.lines.nodes[0],id:'gid://shopify/SubscriptionLine/999',variantId:'gid://shopify/ProductVariant/999'});}]){
  const f=await fixture();await edit(f);await assert.rejects(f.run());assert.equal(f.writes,0);
 }
});
test('changed paid Meal Plan binding and changed native scope before submission require review',async()=>{
 const f=await fixture({mealPlan:true});await db.mealPlanSelection.update({where:{id:f.selection.id},data:{customerGid:'gid://shopify/Customer/99'}});await assert.rejects(f.run());assert.equal(f.writes,0);
 const changed=await fixture();changed.readEdit=(d,reads)=>{if(reads===2)d.subscriptionContract.lines.nodes[0].quantity=2;};assert.equal((await changed.run()).state,'REVIEW');assert.equal(changed.writes,0);
});
test('two simultaneous requests never submit two native cancellations',async()=>{
 const f=await fixture();const results=await Promise.allSettled([f.run(),f.run()]);assert.equal(f.writes,1);assert.ok(results.some(r=>r.status==='fulfilled'&&r.value.state==='COMPLETED'));assert.equal(await db.subscriptionRenewalStop.count({where:{shop,contractGid:f.id}}),1);
});
test('a stopped contract later reactivated by another actor is not cancelled again automatically',async()=>{
 const f=await fixture();await f.run();f.contract.status='ACTIVE';await assert.rejects(f.run(),/changed/);assert.equal(f.writes,1);
});
test('disabled, production, foreign QA scope and malformed requests cannot read or write native data',async()=>{
 const f=await fixture();process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='false';await assert.rejects(f.run(),/not activated/);process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='true';
 const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(f.run(),/not activated/);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
 await assert.rejects(stop(f.admin,shop,'gid://shopify/Customer/99',f.id,randomUUID()),/QA scope/);await assert.rejects(stop(f.admin,shop,customer,f.id,'not-a-key'));await assert.rejects(stop(f.admin,'other.myshopify.com',customer,f.id,randomUUID()));assert.equal(f.reads,0);assert.equal(f.writes,0);
});

test('account availability stays closed for disabled, pending and incompletely mapped contracts',async()=>{
 const{readRenewalStopAvailability:availability}=await import('../.shopify/renewal-stop-test/subscription-renewal-stop.server.js');
 const f=await fixture();assert.deepEqual(await availability(f.admin,shop,customer,f.id),{canStop:true,reviewRequired:false});
 f.mutation=()=>{throw Error('Lost');};await f.run();assert.deepEqual(await availability(f.admin,shop,customer,f.id),{canStop:false,reviewRequired:true});
 process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='false';const reads=f.reads;assert.deepEqual(await availability(f.admin,shop,customer,f.id),{canStop:false,reviewRequired:false});assert.equal(f.reads,reads);process.env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED='true';
 const invalid=await fixture();await db.operationalLine.update({where:{id:invalid.row.id},data:{validationStatus:'QUARANTINED'}});assert.equal((await availability(invalid.admin,shop,customer,invalid.id)).canStop,false);
});
