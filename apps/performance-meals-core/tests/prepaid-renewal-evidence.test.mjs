import test from 'node:test';
import assert from 'node:assert/strict';
import{randomUUID,createHash}from'node:crypto';
import{PrismaClient,buildServices}from'./support/database.mjs';
import{renewalData,setShop,contract,expected as renewal,correction}from'./support/renewal-evidence.mjs';
await buildServices({entryPoints:['app/services/prepaid-renewal-evidence.server.ts'],outdir:'.shopify/renewal-evidence-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const svc=await import('../.shopify/renewal-evidence-test/prepaid-renewal-evidence.server.js');
const db=new PrismaClient(),shop=`renewal-evidence-${randomUUID()}.myshopify.com`;setShop(shop);
process.env.ALLOWED_SHOP=shop;process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED='true';process.env.CORE_PREPAID_RENEWAL_LINKS_QA_CUSTOMER=renewal.customerGid;
const initial={...renewal,orderLineGid:'gid://shopify/LineItem/9'},initialCorrection={...correction,applicationKind:'AUTOMATIC'};
const attempts=[renewal,{...renewal,attemptGid:'gid://shopify/SubscriptionBillingAttempt/30',idempotencyKey:'second-attempt',renewalOrderGid:'gid://shopify/Order/31',renewalOrderLineGid:'gid://shopify/LineItem/32'}];
let nativeReads=0;
const gateway=(edit=()=>{})=>({graphql:async(query,{variables})=>{
 assert.doesNotMatch(query,/\bmutation\b/);nativeReads++;
 const a=attempts.find(x=>[x.attemptGid,x.renewalOrderGid].includes(variables.id))??renewal,d=renewalData();
 d.subscriptionBillingAttempt={...d.subscriptionBillingAttempt,id:a.attemptGid,idempotencyKey:a.idempotencyKey,state:{__typename:'SubscriptionBillingAttemptSuccessState',order:{id:a.renewalOrderGid}}};
 const origin=variables.id===initial.orderGid;
 d.order.id=origin?initial.orderGid:a.renewalOrderGid;
 const line=d.order.lineItems.nodes[0];line.id=origin?initial.orderLineGid:a.renewalOrderLineGid;
 if(origin)line.discountAllocations[0].discountApplication.__typename='AutomaticDiscountApplication';
 line.customAttributes=[{key:'_pm_business_stream',value:'ready_series'},{key:'_pm_stream_schema_version',value:'1'}];
 line.product.isGiftCard=false;line.product.stream={jsonValue:'ready_series'};
 edit(d,query,variables);return Response.json({data:d});
}});
async function seed(){
 await db.prepaidRenewalEvidence.deleteMany({where:{shop}});await db.prepaidPurchaseEvidence.deleteMany({where:{shop}});await db.webhookReceipt.deleteMany({where:{shop}});await db.operationalLine.deleteMany({where:{shop}});
 process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED='true';process.env.CORE_PREPAID_RENEWAL_LINKS_QA_CUSTOMER=renewal.customerGid;
 return db.operationalLine.create({data:{shop,customerGid:initial.customerGid,orderGid:initial.orderGid,orderLineGid:initial.orderLineGid,productGid:initial.productGid,variantGid:initial.variantGid,contractGid:contract,businessStream:'ready_series',department:'ready_series',validationStatus:'VALIDATED'}});
}
const purchase=()=>svc.registerPrepaidPurchaseEvidence(gateway(),shop,contract,initial,initialCorrection);
const stage=(p,a=renewal,api=gateway())=>svc.registerPrepaidRenewalEvidence(api,shop,p.id,a,correction);
test.after(async()=>{await seed();await db.operationalLine.deleteMany({where:{shop}});await db.$disconnect();});
test('immutable purchase evidence replays and rejects altered price, binding or correction',async()=>{
 const before=await seed(),p=await purchase();assert.equal((await purchase()).id,p.id);
 assert.deepEqual(await db.operationalLine.findUnique({where:{id:before.id}}),before);
 await assert.rejects(svc.registerPrepaidPurchaseEvidence(gateway(),shop,contract,{...initial,upfrontMinor:25519},initialCorrection));
 await db.operationalLine.update({where:{id:before.id},data:{validationStatus:'QUARANTINED'}});await assert.rejects(purchase());
 assert.equal(await db.prepaidPurchaseEvidence.count({where:{shop}}),1);
});
test('default-off, production, foreign shop and wrong QA customer gates precede native reads',async()=>{
 await seed();const api={graphql:()=>assert.fail('Unexpected native read')},old=process.env.NODE_ENV;
 process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED='false';await assert.rejects(svc.registerPrepaidPurchaseEvidence(api,shop,contract,initial));
 process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED='true';process.env.NODE_ENV='production';try{await assert.rejects(svc.registerPrepaidPurchaseEvidence(api,shop,contract,initial));}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
 await assert.rejects(svc.registerPrepaidPurchaseEvidence(api,'foreign.myshopify.com',contract,initial));
 await assert.rejects(svc.registerPrepaidPurchaseEvidence(api,shop,contract,{...initial,customerGid:'gid://shopify/Customer/99'}));
});
test('successful registered renewal survives late order routing and links exactly once from saved evidence',async()=>{
 const before=await seed(),p=await purchase(),job=await stage(p);assert.equal(job.state,'PENDING_LINK');assert.equal(await db.operationalLine.count({where:{shop}}),1);
 const first=await svc.processPrepaidRenewalEvidence(gateway(),shop,job.id);assert.equal(first.replayed,false);
 const rows=await db.operationalLine.findMany({where:{shop},orderBy:{id:'asc'}}),completed=await db.prepaidRenewalEvidence.findUnique({where:{id:job.id}});
 assert.equal(rows.length,2);assert.equal(rows.find(x=>x.orderGid===renewal.renewalOrderGid).contractGid,contract);assert.equal(completed.state,'COMPLETED');assert.ok(completed.completedAt);
 assert.equal((await svc.processPrepaidRenewalEvidence(gateway(),shop,job.id)).replayed,true);
 assert.deepEqual(await db.operationalLine.findMany({where:{shop},orderBy:{id:'asc'}}),rows);
 assert.deepEqual(await db.prepaidRenewalEvidence.findUnique({where:{id:job.id}}),completed);
 assert.deepEqual(await db.operationalLine.findUnique({where:{id:before.id}}),before);
 assert.equal((await stage(p)).id,job.id);
});
test('failed or mismatched native attempts cannot be staged and a registered purchase is mandatory',async()=>{
 await seed();const p=await purchase();
 for(const edit of[d=>d.subscriptionBillingAttempt.idempotencyKey='wrong',d=>d.order.test=false,d=>d.subscriptionContract.app.id='gid://shopify/App/99',d=>d.subscriptionBillingAttempt.state.__typename='SubscriptionBillingAttemptFailedState',d=>d.order.customer.id='gid://shopify/Customer/99'])await assert.rejects(stage(p,renewal,gateway(edit)));
 await assert.rejects(stage({id:'missing'}));assert.equal(await db.prepaidRenewalEvidence.count({where:{shop}}),0);
});
test('changed or missing correction cannot replace purchased economics',async()=>{
 await seed();const p=await purchase(),before=nativeReads;
 for(const c of[undefined,{...correction,discountMinor:2},{...correction,title:'different'},{...correction,baseMinor:25522}])await assert.rejects(svc.registerPrepaidRenewalEvidence(gateway(),shop,p.id,renewal,c));
 assert.equal(nativeReads,before);assert.equal(await db.prepaidRenewalEvidence.count({where:{shop}}),0);
});
test('changed payment after registration cannot route or complete a renewal',async()=>{
 await seed();const p=await purchase(),job=await stage(p);
 await assert.rejects(svc.processPrepaidRenewalEvidence(gateway(d=>{d.order.totalRefundedSet.shopMoney.amount='1';}),shop,job.id));
 assert.equal(await db.operationalLine.count({where:{shop}}),1);assert.equal((await db.prepaidRenewalEvidence.findUnique({where:{id:job.id}})).state,'PENDING_LINK');
});
test('corrupted purchase and renewal records hold before native processing or routing',async()=>{
 await seed();const p=await purchase(),job=await stage(p),before=nativeReads;
 await db.prepaidRenewalEvidence.update({where:{id:job.id},data:{snapshot:'{}'}});await assert.rejects(svc.processPrepaidRenewalEvidence(gateway(),shop,job.id));
 assert.equal(nativeReads,before);await db.prepaidRenewalEvidence.update({where:{id:job.id},data:{snapshot:job.snapshot}});
 const invalid=JSON.stringify({...JSON.parse(job.snapshot),purchaseHash:'changed'});await db.prepaidRenewalEvidence.update({where:{id:job.id},data:{snapshot:invalid,snapshotHash:createHash('sha256').update(invalid).digest('hex')}});await assert.rejects(svc.processPrepaidRenewalEvidence(gateway(),shop,job.id));
 await db.prepaidPurchaseEvidence.update({where:{id:p.id},data:{snapshotHash:'broken'}});await assert.rejects(stage(p));assert.equal(await db.operationalLine.count({where:{shop}}),1);
});
test('batch cursor survives completion and reaches later pending renewals without rerouting earlier work',async()=>{
 await seed();const p=await purchase(),one=await stage(p),two=await stage(p,attempts[1]);
 const first=await svc.processPrepaidRenewalEvidenceBatch(gateway(),shop,{limit:1});assert.equal(first.hasMore,true);assert.equal(first.results[0].state,'COMPLETED');
 const second=await svc.processPrepaidRenewalEvidenceBatch(gateway(),shop,{limit:1,after:first.nextCursor});assert.equal(second.hasMore,false);assert.equal(second.results[0].state,'COMPLETED');assert.notEqual(first.results[0].evidenceId,second.results[0].evidenceId);
 assert.equal(await db.prepaidRenewalEvidence.count({where:{shop,state:'COMPLETED'}}),2);assert.equal(await db.operationalLine.count({where:{shop}}),3);
 await assert.rejects(svc.processPrepaidRenewalEvidenceBatch(gateway(),shop,{limit:51}));await assert.rejects(svc.processPrepaidRenewalEvidenceBatch(gateway(),shop,{after:'foreign'}));
 assert.notEqual(one.id,two.id);
});
test('a failed proof remains pending and does not prevent later evidence from being processed',async()=>{
 await seed();const p=await purchase();await stage(p);await stage(p,attempts[1]);
 const result=await svc.processPrepaidRenewalEvidenceBatch(gateway((d,q,v)=>{if(v.id===renewal.attemptGid)d.subscriptionBillingAttempt.state.__typename='SubscriptionBillingAttemptFailedState';}),shop);
 assert.deepEqual(result.results.map(x=>x.state),['HELD','COMPLETED']);assert.equal(await db.prepaidRenewalEvidence.count({where:{shop,state:'PENDING_LINK'}}),1);
});
test('competing workers and registrations converge on one renewal and completion record',async()=>{
 await seed();const p=await purchase();const jobs=await Promise.all([stage(p),stage(p)]);assert.equal(jobs[0].id,jobs[1].id);
 await Promise.allSettled(jobs.map(j=>svc.processPrepaidRenewalEvidence(gateway(),shop,j.id)));await svc.processPrepaidRenewalEvidence(gateway(),shop,jobs[0].id);
 assert.equal(await db.prepaidRenewalEvidence.count({where:{shop}}),1);assert.equal(await db.operationalLine.count({where:{shop}}),2);assert.equal((await db.prepaidRenewalEvidence.findUnique({where:{id:jobs[0].id}})).state,'COMPLETED');
});
test('an interrupted completion resumes the existing link without duplicate routing or audit receipts',async()=>{
 await seed();const p=await purchase(),job=await stage(p),delegate=globalThis.prismaGlobal.prepaidRenewalEvidence,originalUpdate=delegate.updateMany.bind(delegate);
 delegate.updateMany=async()=>{throw Error('Simulated completion persistence outage');};
 try{await assert.rejects(svc.processPrepaidRenewalEvidence(gateway(),shop,job.id),/outage/);}finally{delegate.updateMany=originalUpdate;}
 const rows=await db.operationalLine.findMany({where:{shop},orderBy:{id:'asc'}}),receipts=await db.webhookReceipt.findMany({where:{shop},orderBy:{id:'asc'}});
 assert.equal(rows.length,2);assert.equal((await db.prepaidRenewalEvidence.findUnique({where:{id:job.id}})).state,'PENDING_LINK');
 await svc.processPrepaidRenewalEvidence(gateway(),shop,job.id);
 assert.deepEqual(await db.operationalLine.findMany({where:{shop},orderBy:{id:'asc'}}),rows);assert.deepEqual(await db.webhookReceipt.findMany({where:{shop},orderBy:{id:'asc'}}),receipts);
});
test('a second successful attempt cannot claim an already registered renewal order',async()=>{
 await seed();const p=await purchase(),job=await stage(p);
 const second={...attempts[1],renewalOrderGid:renewal.renewalOrderGid,renewalOrderLineGid:renewal.renewalOrderLineGid};
 await assert.rejects(stage(p,second,gateway((d,q,v)=>{if(v.id===second.attemptGid)d.subscriptionBillingAttempt.state.order.id=second.renewalOrderGid;})),/already bound/);
 assert.equal(await db.prepaidRenewalEvidence.count({where:{shop}}),1);assert.deepEqual(await db.prepaidRenewalEvidence.findUnique({where:{id:job.id}}),job);
});
test('exactly divisible package prices need no correction and retain the same evidence protections',async()=>{
 await seed();const api=gateway(d=>{d.subscriptionContract.lines.nodes[0].currentPrice.amount='255.20';d.order.totalDiscountsSet.shopMoney.amount='0';d.order.lineItems.nodes[0].discountAllocations=[];});
 const p=await svc.registerPrepaidPurchaseEvidence(api,shop,contract,initial),job=await svc.registerPrepaidRenewalEvidence(api,shop,p.id,renewal);
 assert.equal(JSON.parse(job.snapshot).correction,null);await svc.processPrepaidRenewalEvidence(api,shop,job.id);assert.equal((await db.prepaidRenewalEvidence.findUnique({where:{id:job.id}})).state,'COMPLETED');
});
test('missing database IDs and empty cursors never select an arbitrary saved renewal',async()=>{
 await seed();const p=await purchase(),job=await stage(p),before=readsCount();
 for(const id of[undefined,null,'',' ',{},'../other']){await assert.rejects(svc.processPrepaidRenewalEvidence(gateway(),shop,id));await assert.rejects(svc.registerPrepaidRenewalEvidence(gateway(),shop,id,renewal,correction));}
 await assert.rejects(svc.processPrepaidRenewalEvidenceBatch(gateway(),shop,{after:''}));assert.equal(readsCount(),before);assert.equal((await db.prepaidRenewalEvidence.findUnique({where:{id:job.id}})).state,'PENDING_LINK');
});
function readsCount(){return nativeReads;}
