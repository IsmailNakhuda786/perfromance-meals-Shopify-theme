import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/programme-menus.server.ts'],outdir:'.shopify/menu-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {validateProgrammeMenuBlock,paidProgramme,saveProgrammeMenu}=await import('../.shopify/menu-test/programme-menus.server.js');
const db=new PrismaClient();
const shop='menu-fixture.myshopify.com',customer='gid://shopify/Customer/987';
const programme={id:'gid://shopify/Product/901',stream:'meal_plan',menuWeeks:4,purchasePolicy:{mode:'period',durationDays:60,startDay:'MONDAY'},variant:{id:'gid://shopify/ProductVariant/902',productGid:'gid://shopify/Product/901',available:true,mealsPerDay:2,requiresPlan:false,plans:[]}};
const windows=['mon-tue','wed-thu','fri'].map((key,i)=>({key,stream:'meal_plan',days:i===2?1:2,meals:['gid://shopify/Product/903','gid://shopify/Product/904']}));
const dates=['2099-02-02','2099-02-09','2099-02-16','2099-02-23','2099-03-02'];
const weeks=dates.map((startsOn,i)=>({handle:`internal-week-${i}`,stream:'meal_plan',startsOn,endsOn:new Date(Date.parse(startsOn+'T00:00:00Z')+4*86400000).toISOString().slice(0,10),cutoffAt:'2098-12-31T00:00:00Z',programmes:[programme.id],windows}));
const selection=(list)=>Object.fromEntries(list.map(w=>[w.handle,Object.fromEntries(w.windows.map(x=>[x.key,{'903':x.days*2}]))]));
const input={programmeId:programme.id,variantId:programme.variant.id,selections:selection(weeks.slice(0,4))};
function admin(status='PAID'){return {graphql:async q=>{
 if(q.includes('PaidProgramme')) return Response.json({data:{order:{id:'gid://shopify/Order/905',cancelledAt:null,displayFinancialStatus:status,customer:{id:customer}}}});
 const refs=nodes=>({nodes,pageInfo:{hasNextPage:false}});
 const fields=entries=>Object.entries(entries).map(([key,value])=>({key,value}));
 return Response.json({data:{productVariant:{id:programme.variant.id,availableForSale:true,mealsPerDay:{jsonValue:2},sellingPlanGroups:refs([]),product:{id:programme.id,requiresSellingPlan:false,stream:{jsonValue:'meal_plan'},menuWeeks:{jsonValue:4},purchasePolicy:{jsonValue:programme.purchasePolicy}}},metaobjects:refs(weeks.map(w=>({handle:w.handle,fields:[...fields({business_stream:w.stream,starts_on:w.startsOn,ends_on:w.endsOn,cutoff_at:w.cutoffAt}),{key:'programmes',references:refs([{id:programme.id}])},{key:'windows',references:refs(windows.map(x=>({fields:[...fields({business_stream:x.stream,key:x.key,days:String(x.days)}),{key:'meals',references:refs(x.meals.map(id=>({id,status:'ACTIVE'})))}]})))}]})))}});
}};}
test('second four weeks and final Monday–Thursday validate within the original prepaid period',()=>{
 assert.equal(validateProgrammeMenuBlock(input,programme,weeks,'2099-01-05',1,true).windows.reduce((n,w)=>n+w.meals.reduce((s,m)=>s+m.quantity,0),0),40);
 const finalWeek={...weeks[4],windows:windows.slice(0,2)};
 const finalInput={...input,selections:selection([finalWeek])};
 const result=validateProgrammeMenuBlock(finalInput,programme,weeks,'2099-01-05',2,true);
 assert.equal(result.windows.length,2);assert.equal(result.windows[0].endsOn,'2099-03-05');
 assert.throws(()=>validateProgrammeMenuBlock(finalInput,programme,weeks,'2099-01-05',2,true,Date.parse('2099-03-05T16:00:00Z')),/Programme has ended/);assert.equal(result.windows.some(w=>w.window==='fri'),false);
 assert.equal(result.windows.reduce((n,w)=>n+w.meals.reduce((s,m)=>s+m.quantity,0),0),8);
 assert.throws(()=>validateProgrammeMenuBlock({...finalInput,selections:selection([weeks[4]])},programme,weeks,'2099-01-05',2,true));
 assert.throws(()=>validateProgrammeMenuBlock(input,programme,weeks,'2099-01-05',3,true));
 assert.throws(()=>validateProgrammeMenuBlock(input,programme,weeks,'2099-01-05',1,true,Date.parse('2099-03-06T00:00:00Z')));
 assert.throws(()=>validateProgrammeMenuBlock(input,programme,weeks.slice(1),'2099-01-05',1,true));
});
test('a closed week stays immutable while later weeks remain editable without moving paid dates',()=>{
 const now=Date.parse('2099-02-04T05:00:00Z');
 const configured=weeks.map(w=>structuredClone(w));
 configured.forEach((w,i)=>w.cutoffAt=i===0?'2099-02-03T05:00:00Z':'2099-02-25T05:00:00Z');
 const baseline=validateProgrammeMenuBlock(input,programme,configured,'2099-01-05',1,true,Date.parse('2099-01-01T00:00:00Z')).windows;
 // Merchant removes the old dish after the cutoff; the paid snapshot still survives.
 configured[0].windows.forEach(w=>w.meals=['gid://shopify/Product/904']);
 const edited=structuredClone(input);edited.selections['internal-week-1']['mon-tue']={'903':3,'904':1};
 const saved=validateProgrammeMenuBlock(edited,programme,configured,'2099-01-05',1,true,now,baseline);
 assert.deepEqual(saved.windows.filter(w=>w.week==='internal-week-0'),baseline.filter(w=>w.week==='internal-week-0'));
 assert.equal(saved.block.startsOn,'2099-02-02');
 assert.equal(saved.windows.find(w=>w.week==='internal-week-1'&&w.window==='mon-tue').meals.length,2);
 const tampered=structuredClone(edited);tampered.selections['internal-week-0']['mon-tue']={'904':4};
 assert.throws(()=>validateProgrammeMenuBlock(tampered,programme,configured,'2099-01-05',1,true,now,baseline),/Closed menu cannot be changed/);
 assert.throws(()=>validateProgrammeMenuBlock(edited,programme,configured,'2099-01-05',1,true,now),/Closed menu has no saved selection/);
});
test('paid programme edits preserve the original order and retain auditable revisions with owner/concurrency checks',async()=>{
 const record=await db.mealPlanSelection.create({data:{shop,customerGid:customer,programmeGid:programme.id,variantGid:programme.variant.id,startsOn:'2099-01-05',endsOn:'2099-03-05',selections:'[]',selectionHash:'internal-fixture',cutoffAt:new Date('2098-12-31'),status:'ORDERED',orderGid:'gid://shopify/Order/905',orderLineGid:'gid://shopify/LineItem/906'}});
 await db.operationalLine.create({data:{shop,orderGid:record.orderGid,orderLineGid:record.orderLineGid,customerGid:customer,businessStream:'meal_plan',department:'meal_plan',validationStatus:'VALIDATED',selectionId:record.id}});
 await assert.rejects(()=>paidProgramme(shop,'gid://shopify/Customer/999',record.id,admin()),e=>e.status===404);
 await assert.rejects(()=>paidProgramme(shop,customer,record.id,admin('PENDING')),e=>e.status===409);
 const created=await saveProgrammeMenu(shop,customer,record.id,1,{...input,selections:{}},0,false,admin());
 const reader=new PrismaClient();assert.equal((await reader.mealPlanMenuRevision.findUnique({where:{id:created.id}})).revision,1);await reader.$disconnect();
 const edited=structuredClone(input);edited.selections['internal-week-0']['mon-tue']={'903':3,'904':1};
 const saved=await saveProgrammeMenu(shop,customer,record.id,1,edited,created.revision,true,admin());
 assert.equal(saved.state,'SAVED');assert.equal(saved.revision,2);
 await assert.rejects(()=>saveProgrammeMenu(shop,customer,record.id,1,input,created.revision,true,admin()),e=>e.status===409);
 await assert.rejects(()=>saveProgrammeMenu(shop,customer,record.id,1,{...input,variantId:'gid://shopify/ProductVariant/999'},saved.revision,true,admin()),e=>e.status===422);
 assert.equal(await db.mealPlanMenuRevision.count({where:{shop,selectionId:record.id}}),2);
 const original=await db.mealPlanSelection.findUnique({where:{id:record.id}});
 assert.equal(original.orderGid,record.orderGid);assert.equal(original.selections,'[]');assert.equal(original.endsOn,'2099-03-05');assert.equal(original.sellingPlanGid,null);
 if(process.env.CORE_TEST_POSTGRES_CLIENT) {
  const concurrent=await Promise.allSettled([
   saveProgrammeMenu(shop,customer,record.id,1,input,saved.revision,true,admin()),
   saveProgrammeMenu(shop,customer,record.id,1,edited,saved.revision,true,admin())
  ]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(concurrent.find(r=>r.status==='rejected').reason.status,409);
  assert.equal(await db.mealPlanMenuRevision.count({where:{shop,selectionId:record.id}}),3);
 }
});
test.after(async()=>{await db.$transaction([db.mealPlanMenuRevision.deleteMany({where:{shop}}),db.operationalLine.deleteMany({where:{shop}}),db.mealPlanSelection.deleteMany({where:{shop}})]);await db.$disconnect();});
