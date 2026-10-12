import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/catalog.server.ts','app/services/menu-validation.ts','app/services/security.server.ts','app/services/selections.server.ts','app/services/orders.server.ts'],outdir:'.shopify/test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {validateSelection,department,STREAMS}=await import('../.shopify/test/menu-validation.js');
const {issueNonce,validateNonce,assertShop}=await import('../.shopify/test/security.server.js');
const {saveDraft,reviewDraft}=await import('../.shopify/test/selections.server.js');
const {catalog}=await import('../.shopify/test/catalog.server.js');
const {recordOrder}=await import('../.shopify/test/orders.server.js');
const db=new PrismaClient();
const shop='core-fixture.myshopify.com',customer='gid://shopify/Customer/123';
const programme={id:'gid://shopify/Product/1',stream:'meal_plan',menuWeeks:1,variant:{id:'gid://shopify/ProductVariant/2',productGid:'gid://shopify/Product/1',available:true,mealsPerDay:2,requiresPlan:true,plans:['gid://shopify/SellingPlan/3']}};
const weeks=[{handle:'week',stream:'meal_plan',startsOn:'2099-01-01',endsOn:'2099-01-03',cutoffAt:'2098-12-31T00:00:00Z',programmes:[programme.id],windows:[{key:'lunch',stream:'meal_plan',days:3,meals:['gid://shopify/Product/4']}]}];
const input={programmeId:'1',variantId:'2',sellingPlanId:'3',selections:{week:{lunch:{'4':6}}}};
function catalogAdmin(){return {graphql:async()=>Response.json({data:{productVariant:{id:programme.variant.id,availableForSale:true,mealsPerDay:{jsonValue:2},sellingPlanGroups:{nodes:[{sellingPlans:{nodes:[{id:'gid://shopify/SellingPlan/3'}],pageInfo:{hasNextPage:false}}}],pageInfo:{hasNextPage:false}},product:{id:programme.id,requiresSellingPlan:true,stream:{jsonValue:'meal_plan'},menuWeeks:{jsonValue:1}}},metaobjects:{pageInfo:{hasNextPage:false},nodes:[{handle:'week',fields:[{key:'business_stream',value:'meal_plan'},{key:'starts_on',value:'2099-01-01'},{key:'ends_on',value:'2099-01-03'},{key:'cutoff_at',value:'2098-12-31T00:00:00Z'},{key:'programmes',value:'',references:{nodes:[{id:programme.id}]}},{key:'windows',value:'',references:{nodes:[{fields:[{key:'business_stream',value:'meal_plan'},{key:'key',value:'lunch'},{key:'days',value:'3'},{key:'meals',value:'',references:{nodes:[{id:'gid://shopify/Product/4',status:'ACTIVE'}]}}]}]}}]}]}}})};}
test('server rejects stream spoofing, wrong variants, plans, quantities and expired menus',()=>{
 assert.equal(validateSelection(input,programme,weeks,true).windows[0].meals[0].quantity,6);
 for(const invalid of [{...input,sellingPlanId:undefined},{...input,variantId:'999'},{...input,sellingPlanId:'99'},{...input,selections:{week:{lunch:{'4':7}}}},{...input,selections:{week:{lunch:{'4':-1}}}},{...input,selections:{week:{lunch:{'999':6}}}},{...input,selections:{unknown:{lunch:{'4':6}}}}]) assert.throws(()=>validateSelection(invalid,programme,weeks,true));
 assert.throws(()=>validateSelection(input,{...programme,stream:'ready_series'},weeks,true));
 assert.throws(()=>validateSelection(input,{...programme,variant:{...programme.variant,requiresPlan:false}},weeks,true));
 assert.throws(()=>validateSelection(input,programme,[{...weeks[0],cutoffAt:'2000-01-01'}],true));
 assert.throws(()=>validateSelection({...input,selections:{}},programme,weeks,true));
});
test('native catalog excludes unpublished menus and rejects truncated references',async()=>{
 const altered=(edit)=>({graphql:async()=>{const data=await catalogAdmin().graphql().then(r=>r.json());edit(data.data.metaobjects);return Response.json(data);}});
 assert.equal((await catalog(catalogAdmin(),input)).weeks.length,1);
 assert.equal((await catalog(altered(m=>m.nodes[0].capabilities={publishable:{status:'DRAFT'}}),input)).weeks.length,0);
 assert.equal((await catalog(altered(m=>m.nodes[0].fields.find(f=>f.key==='windows').references.nodes[0].capabilities={publishable:{status:'DRAFT'}}),input)).weeks[0].windows.length,0);
 await assert.rejects(()=>catalog(altered(m=>m.pageInfo.hasNextPage=true),input),/Catalog validation unavailable/);
 await assert.rejects(()=>catalog(altered(m=>m.nodes[0].fields.find(f=>f.key==='windows').references.pageInfo={hasNextPage:true}),input),/pagination/);
});
test('Gift Card operational routing stays separate from canonical business streams',()=>{
 assert.deepEqual([...STREAMS],['ready_series','meal_plan','shared']);
 assert.equal(STREAMS.includes('gift_card_sales'),false);
 assert.equal(department('shared',true),'gift_card_sales');
 assert.equal(department('gift_card_sales',true),null);
 assert.equal(department('ready_series',true),null);
 assert.equal(department('meal_plan',true),null);
 assert.equal(department('ready_series',false),'ready_series');
 assert.equal(department('meal_plan',false),'meal_plan');
});
test('signed save nonce binds customer and shop, expires; live stores fail allowlist',()=>{
 const n=issueNonce(shop,customer,'test-only-secret',1000000000000);
 assert.equal(validateNonce(n,shop,customer,'test-only-secret',1000000000001),true);
 assert.equal(validateNonce(n,shop,'other','test-only-secret',1000000000001),false);
 assert.equal(validateNonce(n,'other',customer,'test-only-secret',1000000000001),false);
 assert.equal(validateNonce(n,shop,customer,'test-only-secret',1000001000000),false);
 assert.throws(()=>assertShop('unauthorized.myshopify.com'));
});
test('persistent drafts, optimistic concurrency, locked review and mixed-order department routing',async()=>{
 const admin=catalogAdmin();
 const saved=await saveDraft(shop,customer,input,0,admin);
 await assert.rejects(()=>saveDraft(shop,customer,input,0,admin),e=>e.status===409);
 const updated=await saveDraft(shop,customer,input,saved.revision,admin);
 await assert.rejects(()=>saveDraft(shop,customer,input,saved.revision,admin),e=>e.status===409);
 const fresh=new PrismaClient();
 assert.equal((await fresh.mealPlanDraft.findUnique({where:{shop_customerGid:{shop,customerGid:customer}}})).revision,updated.revision);
 await fresh.$disconnect();
 const locked=await reviewDraft(shop,customer,updated.revision,admin);
 assert.equal(locked.windows[0].businessStream,'meal_plan');
 const attr=(stream,extra={})=>Object.entries({_pm_business_stream:stream,_pm_stream_schema_version:'1',...extra}).map(([key,value])=>({key,value}));
 const line=(id,stream,gift=false,extra={})=>({id:`gid://shopify/LineItem/${id}`,quantity:1,customAttributes:attr(stream,extra),product:{id:stream==='meal_plan'?programme.id:`gid://shopify/Product/${id}`,isGiftCard:gift,stream:{jsonValue:stream}},variant:{id:programme.variant.id},sellingPlan:stream==='meal_plan'?{sellingPlanId:'gid://shopify/SellingPlan/3'}:null});
 const order={id:'gid://shopify/Order/456',createdAt:new Date().toISOString(),customer:{id:customer},lineItems:{pageInfo:{hasNextPage:false},nodes:[line(1,'ready_series'),line(2,'meal_plan',false,{_pm_selection_id:locked.id,_pm_selection_hash:locked.hash}),line(3,'shared',true),{...line(4,'ready_series'),customAttributes:attr('meal_plan')}]}};
 const orderAdmin={graphql:async()=>Response.json({data:{order}})};
 await recordOrder(shop,order.id,'fixture-event',orderAdmin);
 await recordOrder(shop,order.id,'fixture-event',orderAdmin);
 const lines=await db.operationalLine.findMany({where:{shop}});
 assert.equal(lines.length,4);
 assert.deepEqual(lines.filter(l=>l.validationStatus==='VALIDATED').map(l=>[l.businessStream,l.department]).sort(),[
  ['meal_plan','meal_plan'],['ready_series','ready_series'],['shared','gift_card_sales']
 ]);
 assert.equal(lines.some(l=>l.businessStream==='gift_card_sales'),false);
 assert.deepEqual(lines.filter(l=>l.validationStatus==='VALIDATED').map(l=>l.department).sort(),['gift_card_sales','meal_plan','ready_series']);
 assert.equal(lines.filter(l=>l.validationStatus==='QUARANTINED').length,1);
 assert.equal(new Set(lines.map(l=>l.orderGid)).size,1);
 assert.equal((await db.mealPlanSelection.findUnique({where:{id:locked.id}})).status,'ORDERED');
 assert.equal(department('shared',true),'gift_card_sales');
});
test.after(async()=>{
 await db.$transaction([db.mealPlanDraft.deleteMany({where:{shop}}),db.mealPlanSelection.deleteMany({where:{shop}}),db.operationalLine.deleteMany({where:{shop}}),db.webhookReceipt.deleteMany({where:{shop}})]);await db.$disconnect();
});

test('period programmes accept only available customer Mondays and no selling plan',()=>{
 const periodProgramme={...programme,purchasePolicy:{mode:'period',durationDays:60,startDay:'MONDAY'},variant:{...programme.variant,requiresPlan:false,plans:[]}};
 const periodWeeks=[{...weeks[0],startsOn:'2099-01-05',endsOn:'2099-01-09'}];
 const periodInput={...input,sellingPlanId:undefined,startMonday:'2099-01-05'};
 const result=validateSelection(periodInput,periodProgramme,periodWeeks,true);
 assert.equal(result.sellingPlanGid,null);assert.equal(result.startsOn,'2099-01-05');assert.equal(result.endsOn,'2099-03-05');
 for(const bad of [{...periodInput,sellingPlanId:'3'},{...periodInput,startMonday:undefined},{...periodInput,startMonday:'2099-01-12'}]) assert.throws(()=>validateSelection(bad,periodProgramme,periodWeeks,true));
 assert.throws(()=>validateSelection(periodInput,{...periodProgramme,variant:{...programme.variant}},periodWeeks,true));
});

test('period draft create, retrieve, edit and locked review persist dates independently',async()=>{
 const periodCustomer='gid://shopify/Customer/124';
 const admin={graphql:async()=>{const body=await catalogAdmin().graphql().then(r=>r.json());const v=body.data.productVariant;v.product.requiresSellingPlan=false;v.product.purchasePolicy={jsonValue:{mode:'period',durationDays:60,startDay:'MONDAY'}};v.sellingPlanGroups.nodes=[];const w=body.data.metaobjects.nodes[0];w.fields.find(f=>f.key==='starts_on').value='2099-01-05';w.fields.find(f=>f.key==='ends_on').value='2099-01-09';return Response.json(body);}};
 const periodInput={...input,sellingPlanId:undefined,startMonday:'2099-01-05'};
 const created=await saveDraft(shop,periodCustomer,{...periodInput,selections:{}},0,admin);
 const reader=new PrismaClient();const retrieved=await reader.mealPlanDraft.findUnique({where:{shop_customerGid:{shop,customerGid:periodCustomer}}});await reader.$disconnect();
 assert.equal(retrieved.startsOn,'2099-01-05');assert.equal(retrieved.endsOn,'2099-03-05');assert.equal(retrieved.sellingPlanGid,null);
 const edited=await saveDraft(shop,periodCustomer,periodInput,created.revision,admin);
 assert.equal(JSON.parse(edited.selections).week.lunch['4'],6);
 const reviewed=await reviewDraft(shop,periodCustomer,edited.revision,admin);
 assert.equal(reviewed.startsOn,created.startsOn);assert.equal(reviewed.endsOn,created.endsOn);
 assert.equal((await db.mealPlanSelection.findUnique({where:{id:reviewed.id}})).sellingPlanGid,null);
});
