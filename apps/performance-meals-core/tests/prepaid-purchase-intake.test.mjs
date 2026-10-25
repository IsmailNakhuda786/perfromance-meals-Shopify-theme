import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
import {renewalData,setShop,contract,expected as base,correction} from './support/renewal-evidence.mjs';
await buildServices({entryPoints:['app/services/prepaid-purchase-intake.server.ts'],outdir:'.shopify/purchase-intake-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const svc=await import('../.shopify/purchase-intake-test/prepaid-purchase-intake.server.js');
await buildServices({entryPoints:['app/routes/webhooks.subscriptions.create.tsx'],outfile:'.shopify/purchase-intake-route-test.mjs',bundle:true,packages:'external',format:'esm',platform:'node',plugins:[{name:'purchase-intake-auth',setup(b){b.onResolve({filter:/shopify\.server$/},args=>({path:args.path,namespace:'purchase-auth'}));b.onLoad({filter:/.*/,namespace:'purchase-auth'},()=>({loader:'js',contents:'export const authenticate={webhook:async()=>{const f=globalThis.purchaseIntakeAuth;if(f.fail)throw new Response(null,{status:401});return f;}};'}));}}]});
const{action:purchaseAction}=await import('../.shopify/purchase-intake-route-test.mjs');

const db=new PrismaClient(),shop=`purchase-intake-${randomUUID()}.myshopify.com`;
const spec={productGid:base.productGid,variantGid:base.variantGid,sellingPlanGid:base.sellingPlanGid,appGid:base.appGid,months:3,upfrontMinor:25520,correctionTitle:correction.title};
let reads=0;
function api(edit=()=>{}){return {graphql:async(q,{variables:v})=>{
 assert.doesNotMatch(q,/\bmutation\b/);reads++;
 const d=renewalData(),c=d.subscriptionContract,o=d.order,l=o.lineItems.nodes[0];
 d.shop.plan={partnerDevelopment:true};c.status='ACTIVE';c.deliveryPrice={amount:'0',currencyCode:'SGD'};o.id=base.orderGid;l.id='gid://shopify/LineItem/9';
 l.discountAllocations[0].discountApplication.__typename='AutomaticDiscountApplication';
 l.customAttributes=[{key:'_pm_business_stream',value:'ready_series'},{key:'_pm_stream_schema_version',value:'1'}];l.product.isGiftCard=false;l.product.stream={jsonValue:'ready_series'};
 c.originOrder.lineItems=structuredClone(o.lineItems);
 c.discounts={nodes:[{id:'gid://shopify/SubscriptionManualDiscount/100',title:correction.title,recurringCycleLimit:null,rejectionReason:null,targetType:'LINE_ITEM',type:'AUTOMATIC_DISCOUNT',value:{__typename:'SubscriptionDiscountFixedAmountValue',amount:{amount:'0.01',currencyCode:'SGD'},appliesOnEachItem:false},entitledLines:{all:false,lines:{nodes:[{id:c.lines.nodes[0].id}],pageInfo:{hasNextPage:false}}}}],pageInfo:{hasNextPage:false}};
 edit(d,q,v);return Response.json({data:d});
}};}
async function seed(){
 setShop(shop);process.env.ALLOWED_SHOP=shop;process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED='true';process.env.CORE_PREPAID_RENEWAL_LINKS_QA_CUSTOMER=base.customerGid;process.env.CORE_PREPAID_PURCHASE_INTAKE_ENABLED='true';
 for(const m of ['prepaidPurchaseInbox','prepaidPricingApproval','prepaidPurchaseEvidence','operationalLine','webhookReceipt'])await db[m].deleteMany({where:{shop}});
}
const approve=()=>svc.registerPrepaidPricingApproval(shop,spec),receive=(event='contract-created',id=contract)=>svc.receivePrepaidPurchaseTrigger(shop,id,event);
test.after(async()=>{await seed();await db.$disconnect();});
test('intake persists before any native reads or original-order routing; duplicates converge',async()=>{
 await seed();const before=reads,a=await receive(),b=await receive('redelivered');assert.equal(a.inboxId,b.inboxId);assert.equal(b.replayed,true);assert.equal(reads,before);assert.equal(await db.operationalLine.count({where:{shop}}),0);assert.equal(await db.prepaidPurchaseInbox.count({where:{shop}}),1);
 await assert.rejects(receive('contract-created','gid://shopify/SubscriptionContract/99'));assert.equal(await db.prepaidPurchaseInbox.count({where:{shop}}),1);
});
test('approved immutable pricing is replayable but changed price, term, title or owner cannot overwrite it',async()=>{
 await seed();const p=await approve();assert.equal((await approve()).id,p.id);
 for(const change of[{upfrontMinor:25521},{months:6},{correctionTitle:'another correction'},{appGid:'gid://shopify/App/99'}])await assert.rejects(svc.registerPrepaidPricingApproval(shop,{...spec,...change}));
 assert.equal(await db.prepaidPricingApproval.count({where:{shop}}),1);
});
test('default-off, production, invalid reference and wrong shop stop before persistence/native reads',async()=>{
 await seed();const before=reads;process.env.CORE_PREPAID_PURCHASE_INTAKE_ENABLED='false';await assert.rejects(approve());await assert.rejects(receive());process.env.CORE_PREPAID_PURCHASE_INTAKE_ENABLED='true';
 const prior=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(approve());}finally{if(prior===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=prior;}
 await assert.rejects(svc.receivePrepaidPurchaseTrigger('foreign.myshopify.com',contract,'x'));await assert.rejects(receive('bad event'));await assert.rejects(receive('valid','invalid'));assert.equal(reads,before);assert.equal(await db.prepaidPurchaseInbox.count({where:{shop}}),0);
});
test('missing approval holds the durable job; later explicit approval completes existing paid purchase',async()=>{
 await seed();const j=await receive();await assert.rejects(svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId));assert.equal(await db.operationalLine.count({where:{shop}}),0);assert.equal((await db.prepaidPurchaseInbox.findUnique({where:{id:j.inboxId}})).state,'PENDING_VERIFY');
 await approve();const done=await svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId);assert.equal(done.registeredLines,1);assert.equal(done.replayed,false);assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop}}),1);const row=await db.operationalLine.findFirst({where:{shop}});assert.equal(row.contractGid,contract);assert.equal(row.customerGid,base.customerGid);assert.equal(row.validationStatus,'VALIDATED');
});
test('completed purchase replay retains immutable evidence, routing, receipt and completion timestamps',async()=>{
 await seed();await approve();const j=await receive();await svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId);const before={};for(const m of['prepaidPurchaseInbox','prepaidPurchaseEvidence','operationalLine','webhookReceipt'])before[m]=await db[m].findMany({where:{shop},orderBy:{id:'asc'}});
 assert.equal((await svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId)).replayed,true);for(const m of Object.keys(before))assert.deepEqual(await db[m].findMany({where:{shop},orderBy:{id:'asc'}}),before[m]);
});
test('unpaid, refunded, real payment, foreign customer/app, incomplete pages and unexpected discounts cannot register a purchase',async()=>{
 for(const edit of[d=>d.order.displayFinancialStatus='PENDING',d=>d.order.totalRefundedSet.shopMoney.amount='1',d=>d.order.test=false,d=>d.subscriptionContract.customer.id='gid://shopify/Customer/99',d=>d.subscriptionContract.app.id='gid://shopify/App/99',d=>d.subscriptionContract.lines.pageInfo.hasNextPage=true,d=>d.subscriptionContract.discounts.pageInfo.hasNextPage=true,d=>d.subscriptionContract.discounts.nodes.push(structuredClone(d.subscriptionContract.discounts.nodes[0])),d=>d.order.totalReceivedSet.shopMoney.amount='255.19']){
  await seed();await approve();const j=await receive();await assert.rejects(svc.processPrepaidPurchaseTrigger(api(edit),shop,j.inboxId));assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop}}),0);assert.equal(await db.operationalLine.count({where:{shop}}),0);
 }
});
test('limited/rejected/wrong-line recurring correction, gross price and quantity errors fail before routing',async()=>{
 for(const edit of[d=>d.subscriptionContract.discounts.nodes[0].recurringCycleLimit=1,d=>d.subscriptionContract.discounts.nodes[0].rejectionReason='NOT_APPLICABLE',d=>d.subscriptionContract.discounts.nodes[0].value.appliesOnEachItem=true,d=>d.subscriptionContract.discounts.nodes[0].entitledLines.lines.nodes[0].id='gid://shopify/SubscriptionLine/99',d=>d.subscriptionContract.discounts.nodes[0].value.amount.amount='0.02',d=>d.subscriptionContract.lines.nodes[0].currentPrice.amount='255.22',d=>d.subscriptionContract.lines.nodes[0].quantity=2,d=>d.order.lineItems.nodes.push(structuredClone(d.order.lineItems.nodes[0]))]){
  await seed();await approve();const j=await receive();await assert.rejects(svc.processPrepaidPurchaseTrigger(api(edit),shop,j.inboxId));assert.equal(await db.operationalLine.count({where:{shop}}),0);
 }
});
test('corrupt pricing approval is held rather than trusted',async()=>{
 await seed();const p=await approve(),j=await receive();await db.prepaidPricingApproval.update({where:{id:p.id},data:{snapshot:'{}'}});await assert.rejects(svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId));assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop}}),0);
});
test('interrupted completion retries proof and converges without extra purchases or routing records',async()=>{
 await seed();await approve();const j=await receive(),delegate=globalThis.prismaGlobal.prepaidPurchaseInbox,update=delegate.updateMany.bind(delegate);delegate.updateMany=async()=>{throw Error('Simulated persistence outage');};
 try{await assert.rejects(svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId));}finally{delegate.updateMany=update;}
 const before=await db.operationalLine.findMany({where:{shop}});await svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId);assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop}}),1);assert.deepEqual(await db.operationalLine.findMany({where:{shop}}),before);
});
test('bounded worker continues after held job and cursor remains usable after completed rows',async()=>{
 await seed();await approve();await receive('first','gid://shopify/SubscriptionContract/99');const good=await receive('second');const native=api((d,q,v)=>{if(v.id==='gid://shopify/SubscriptionContract/99')d.subscriptionContract.customer.id='gid://shopify/Customer/99';});
 const first=await svc.processPrepaidPurchaseTriggerBatch(native,shop,{limit:1});assert.equal(first.hasMore,true);assert.equal(first.results[0].state,'HELD');const next=await svc.processPrepaidPurchaseTriggerBatch(native,shop,{limit:1,after:first.nextCursor});assert.equal(next.results[0].inboxId,good.inboxId);assert.equal(next.results[0].state,'COMPLETED');assert.equal(next.hasMore,false);await assert.rejects(svc.processPrepaidPurchaseTriggerBatch(native,shop,{limit:51}));await assert.rejects(svc.processPrepaidPurchaseTriggerBatch(native,shop,{after:'foreign'}));
});
test('two identical packages multiply gross, correction, native quantity and immutable net together',async()=>{
 await seed();await approve();const j=await receive();const native=api(d=>{const c=d.subscriptionContract,o=d.order,l=o.lineItems.nodes[0];c.lines.nodes[0].quantity=2;c.discounts.nodes[0].value.amount.amount='0.02';l.quantity=6;l.currentQuantity=6;l.originalTotalSet.shopMoney.amount='510.42';l.discountAllocations[0].allocatedAmountSet.shopMoney.amount='0.02';c.originOrder.lineItems=structuredClone(o.lineItems);for(const k of['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])o[k].shopMoney.amount='510.40';o.totalDiscountsSet.shopMoney.amount='0.02';o.transactions[0].amountSet.shopMoney.amount='510.40';});
 await svc.processPrepaidPurchaseTrigger(native,shop,j.inboxId);const row=await db.prepaidPurchaseEvidence.findFirst({where:{shop}}),saved=JSON.parse(row.snapshot);assert.equal(saved.expected.packageQuantity,2);assert.equal(saved.expected.upfrontMinor,51040);assert.equal(saved.correction.baseMinor,51042);assert.equal(saved.correction.discountMinor,2);
});
test('six-delivery price and nonzero included GST are retained from verified paid evidence',async()=>{
 await seed();await svc.registerPrepaidPricingApproval(shop,{...spec,months:6,upfrontMinor:49360});const j=await receive();const native=api(d=>{const c=d.subscriptionContract,o=d.order,l=o.lineItems.nodes[0];c.billingPolicy.intervalCount=6;c.lines.nodes[0].currentPrice.amount='493.62';c.discounts.nodes[0].value.amount.amount='0.02';l.quantity=6;l.currentQuantity=6;l.originalTotalSet.shopMoney.amount='493.62';l.discountAllocations[0].allocatedAmountSet.shopMoney.amount='0.02';c.originOrder.lineItems=structuredClone(o.lineItems);for(const k of['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])o[k].shopMoney.amount='493.60';for(const k of['totalTaxSet','currentTotalTaxSet'])o[k].shopMoney.amount='40.76';o.totalDiscountsSet.shopMoney.amount='0.02';o.transactions[0].amountSet.shopMoney.amount='493.60';});
 await svc.processPrepaidPurchaseTrigger(native,shop,j.inboxId);const saved=JSON.parse((await db.prepaidPurchaseEvidence.findFirst({where:{shop}})).snapshot);assert.equal(saved.expected.months,6);assert.equal(saved.expected.upfrontMinor,49360);assert.equal(saved.correction.taxMinor,4076);
});
test('mixed-term contracts register their own line of one fully captured shared order',async()=>{
 await seed();const six={...spec,months:6,upfrontMinor:49360,productGid:'gid://shopify/Product/14',variantGid:'gid://shopify/ProductVariant/15',sellingPlanGid:'gid://shopify/SellingPlan/16',correctionTitle:'Six-delivery correction'},sixContract='gid://shopify/SubscriptionContract/17';await approve();await svc.registerPrepaidPricingApproval(shop,six);
 const mixed=(term)=>api(d=>{const c=d.subscriptionContract,o=d.order,l=o.lineItems.nodes[0],other=structuredClone(l);Object.assign(other,{id:'gid://shopify/LineItem/19',quantity:6,currentQuantity:6,product:{id:six.productGid,isGiftCard:false,stream:{jsonValue:'ready_series'}},variant:{id:six.variantGid},sellingPlan:{sellingPlanId:six.sellingPlanGid}});other.originalTotalSet.shopMoney.amount='493.62';other.discountAllocations[0].allocatedAmountSet.shopMoney.amount='0.02';other.discountAllocations[0].discountApplication.title=six.correctionTitle;o.lineItems.nodes.push(other);for(const k of['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])o[k].shopMoney.amount='748.80';o.totalDiscountsSet.shopMoney.amount='0.03';o.transactions[0].amountSet.shopMoney.amount='748.80';c.originOrder.lineItems=structuredClone(o.lineItems);
 if(term===6){c.id=sixContract;c.billingPolicy.intervalCount=6;Object.assign(c.lines.nodes[0],{id:'gid://shopify/SubscriptionLine/18',productId:six.productGid,variantId:six.variantGid,sellingPlanId:six.sellingPlanGid,currentPrice:{amount:'493.62',currencyCode:'SGD'}});const discount=c.discounts.nodes[0];discount.title=six.correctionTitle;discount.value.amount.amount='0.02';discount.entitledLines.lines.nodes[0].id=c.lines.nodes[0].id;}});
 const a=await receive(),b=await receive('six-created',sixContract);await svc.processPrepaidPurchaseTrigger(mixed(3),shop,a.inboxId);await svc.processPrepaidPurchaseTrigger(mixed(6),shop,b.inboxId);const proofs=await db.prepaidPurchaseEvidence.findMany({where:{shop}});assert.equal(proofs.length,2);assert.deepEqual(proofs.map(p=>JSON.parse(p.snapshot).expected.upfrontMinor).sort((a,b)=>a-b),[25520,49360]);assert.ok(proofs.every(p=>JSON.parse(p.snapshot).expected.paymentScope==='PREPAID_LINE'));assert.equal(await db.operationalLine.count({where:{shop,contractGid:contract}}),1);assert.equal(await db.operationalLine.count({where:{shop,contractGid:sixContract}}),1);
});
test('exactly divisible package does not invent any correction or accept an extra discount',async()=>{
 await seed();await svc.registerPrepaidPricingApproval(shop,{...spec,upfrontMinor:25521,correctionTitle:null});const j=await receive();const native=api(d=>{const o=d.order;d.subscriptionContract.discounts.nodes=[];o.lineItems.nodes[0].discountAllocations=[];for(const k of['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])o[k].shopMoney.amount='255.21';o.totalDiscountsSet.shopMoney.amount='0';o.transactions[0].amountSet.shopMoney.amount='255.21';});await svc.processPrepaidPurchaseTrigger(native,shop,j.inboxId);assert.equal(JSON.parse((await db.prepaidPurchaseEvidence.findFirst({where:{shop}})).snapshot).correction,null);
});
test('concurrent intake and workers converge on one purchase binding',async()=>{
 await seed();await approve();const entries=await Promise.all([receive(),receive()]);assert.equal(entries[0].inboxId,entries[1].inboxId);await Promise.allSettled(entries.map(j=>svc.processPrepaidPurchaseTrigger(api(),shop,j.inboxId)));await svc.processPrepaidPurchaseTrigger(api(),shop,entries[0].inboxId);assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop}}),1);assert.equal(await db.operationalLine.count({where:{shop}}),1);
});

test('authenticated route durably saves before a missing app session or missing original order; invalid signatures cannot enqueue',async()=>{
 await seed();const request=()=>({request:new Request('https://fixture.test/webhooks/subscriptions/create',{method:'POST',headers:{'X-Shopify-Event-Id':'http-original-trigger'}})});
 globalThis.purchaseIntakeAuth={fail:true,shop,topic:'SUBSCRIPTION_CONTRACTS_CREATE',payload:{admin_graphql_api_id:contract},admin:null};await assert.rejects(purchaseAction(request()),e=>e instanceof Response&&e.status===401);assert.equal(await db.prepaidPurchaseInbox.count({where:{shop}}),0);
 globalThis.purchaseIntakeAuth.fail=false;await assert.rejects(purchaseAction(request()),e=>e instanceof Response&&e.status===503);assert.equal(await db.prepaidPurchaseInbox.count({where:{shop}}),1);
 globalThis.purchaseIntakeAuth.admin=api();await assert.rejects(purchaseAction(request()));assert.equal(await db.prepaidPurchaseInbox.count({where:{shop}}),1);
 await approve();const row=await db.prepaidPurchaseInbox.findFirst({where:{shop}});await svc.processPrepaidPurchaseTrigger(api(),shop,row.id);assert.equal((await purchaseAction(request())).status,200);assert.equal((await purchaseAction(request())).status,200);assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop}}),1);
 globalThis.purchaseIntakeAuth.topic='ORDERS_PAID';await assert.rejects(purchaseAction(request()),e=>e instanceof Response&&e.status===400);
});
test('explicit per-package correction accepts quantity-scaled capture and refuses the old fixed-total mode',async()=>{
 await seed();await svc.registerPrepaidPricingApproval(shop,{...spec,correctionApplication:'PER_PACKAGE'});const j=await receive();const native=api(d=>{const c=d.subscriptionContract,o=d.order,l=o.lineItems.nodes[0];c.lines.nodes[0].quantity=2;c.discounts.nodes[0].value.appliesOnEachItem=true;l.quantity=6;l.currentQuantity=6;l.originalTotalSet.shopMoney.amount='510.42';l.discountAllocations[0].allocatedAmountSet.shopMoney.amount='0.02';c.originOrder.lineItems=structuredClone(o.lineItems);for(const k of['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])o[k].shopMoney.amount='510.40';o.totalDiscountsSet.shopMoney.amount='0.02';o.transactions[0].amountSet.shopMoney.amount='510.40';});
 await assert.rejects(svc.processPrepaidPurchaseTrigger({graphql:async(q,v)=>{const r=await native.graphql(q,v),b=await r.json();b.data.subscriptionContract.discounts.nodes[0].value.appliesOnEachItem=false;return Response.json(b);}},shop,j.inboxId));
 await svc.processPrepaidPurchaseTrigger(native,shop,j.inboxId);const saved=JSON.parse((await db.prepaidPurchaseEvidence.findFirst({where:{shop}})).snapshot);assert.equal(saved.expected.upfrontMinor,51040);assert.equal(saved.correction.discountMinor,2);
});
