import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/subscription-links.server.ts'],outdir:'.shopify/subscription-links-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {linkSubscriptionOrigin}=await import('../.shopify/subscription-links-test/subscription-links.server.js');
const db=new PrismaClient(),shop='contract-link-fixture.myshopify.com',customer='gid://shopify/Customer/1',contract='gid://shopify/SubscriptionContract/2';process.env.ALLOWED_SHOP=shop;
const base={shop,customerGid:customer,orderGid:'gid://shopify/Order/3',orderLineGid:'gid://shopify/LineItem/4',productGid:'gid://shopify/Product/5',variantGid:'gid://shopify/ProductVariant/6',businessStream:'ready_series',department:'ready_series',validationStatus:'VALIDATED'};
function fixture(){return {shop:{myshopifyDomain:shop},currentAppInstallation:{app:{id:'gid://shopify/App/7'}},subscriptionContract:{id:contract,app:{id:'gid://shopify/App/7'},customer:{id:customer},originOrder:{id:base.orderGid,customer:{id:customer},lineItems:{pageInfo:{hasNextPage:false},nodes:[{id:base.orderLineGid,quantity:1,product:{id:base.productGid},variant:{id:base.variantGid},sellingPlan:{sellingPlanId:'gid://shopify/SellingPlan/8'}}]}},lines:{pageInfo:{hasNextPage:false},nodes:[{id:'gid://shopify/SubscriptionLine/9',productId:base.productGid,variantId:base.variantGid,sellingPlanId:'gid://shopify/SellingPlan/8',quantity:1}]}}};}
const gateway=(edit=()=>{},status=200)=>({graphql:async query=>{assert.doesNotMatch(query,/mutation/);const data=fixture();edit(data);return Response.json({data},{status});}});
test('verified original subscription links once and replay preserves the original operational record',async()=>{
 await db.operationalLine.deleteMany({where:{shop}});const original=await db.operationalLine.create({data:base});
 assert.equal((await linkSubscriptionOrigin(gateway(),shop,contract)).linked,1);await linkSubscriptionOrigin(gateway(),shop,contract);
 assert.equal(await db.operationalLine.count({where:{shop}}),1);const saved=await db.operationalLine.findUnique({where:{id:original.id}});assert.equal(saved.contractGid,contract);assert.equal(saved.orderGid,base.orderGid);assert.equal(saved.fulfillmentState,original.fulfillmentState);
});
test('wrong ownership, incomplete evidence, mismatched plan or ambiguous lines cannot bind an order',async()=>{
 await db.operationalLine.deleteMany({where:{shop}});const original=await db.operationalLine.create({data:base});
 for(const edit of [d=>d.shop.myshopifyDomain='other',d=>d.subscriptionContract.app.id='gid://shopify/App/99',d=>d.subscriptionContract.customer.id='gid://shopify/Customer/99',d=>d.subscriptionContract.originOrder.customer.id='gid://shopify/Customer/99',d=>delete d.subscriptionContract.lines.pageInfo,d=>d.subscriptionContract.originOrder.lineItems.pageInfo.hasNextPage=true,d=>d.subscriptionContract.lines.nodes[0].sellingPlanId='gid://shopify/SellingPlan/99',d=>d.subscriptionContract.lines.nodes[0].quantity=2,d=>d.subscriptionContract.originOrder.lineItems.nodes.push(d.subscriptionContract.originOrder.lineItems.nodes[0])]){
  await assert.rejects(()=>linkSubscriptionOrigin(gateway(edit),shop,contract));assert.equal((await db.operationalLine.findUnique({where:{id:original.id}})).contractGid,null);
 }
 await assert.rejects(()=>linkSubscriptionOrigin(gateway(()=>{},503),shop,contract));
 await db.operationalLine.update({where:{id:original.id},data:{contractGid:'gid://shopify/SubscriptionContract/99'}});
 await assert.rejects(()=>linkSubscriptionOrigin(gateway(),shop,contract));
 assert.equal((await db.operationalLine.findUnique({where:{id:original.id}})).contractGid,'gid://shopify/SubscriptionContract/99');
});
test('Meal Plan binding requires the exact saved paid selection and preserves its menu evidence',async()=>{
 await db.operationalLine.deleteMany({where:{shop}});await db.mealPlanSelection.deleteMany({where:{shop}});
 const selection=await db.mealPlanSelection.create({data:{shop,customerGid:customer,programmeGid:base.productGid,variantGid:base.variantGid,sellingPlanGid:'gid://shopify/SellingPlan/8',selections:'[]',selectionHash:'original-review-hash',cutoffAt:new Date('2099-01-01T00:00:00Z'),status:'ORDERED',orderGid:base.orderGid,orderLineGid:base.orderLineGid}});
 const row=await db.operationalLine.create({data:{...base,businessStream:'meal_plan',department:'meal_plan',selectionId:selection.id}});
 await db.mealPlanSelection.update({where:{id:selection.id},data:{variantGid:'gid://shopify/ProductVariant/99'}});
 await assert.rejects(()=>linkSubscriptionOrigin(gateway(),shop,contract));assert.equal((await db.operationalLine.findUnique({where:{id:row.id}})).contractGid,null);
 await db.mealPlanSelection.update({where:{id:selection.id},data:{variantGid:base.variantGid}});
 await linkSubscriptionOrigin(gateway(),shop,contract);
 const saved=await db.mealPlanSelection.findUnique({where:{id:selection.id}});
 assert.equal(saved.contractGid,contract);assert.equal(saved.selections,selection.selections);assert.equal(saved.selectionHash,selection.selectionHash);assert.equal(saved.status,'ORDERED');
});
test('one unmapped component rolls back the entire contract link',async()=>{
 await db.operationalLine.deleteMany({where:{shop}});const row=await db.operationalLine.create({data:base});
 const admin=gateway(d=>{d.subscriptionContract.lines.nodes.push({...d.subscriptionContract.lines.nodes[0],id:'gid://shopify/SubscriptionLine/19',productId:'gid://shopify/Product/15',variantId:'gid://shopify/ProductVariant/16'});d.subscriptionContract.originOrder.lineItems.nodes.push({...d.subscriptionContract.originOrder.lineItems.nodes[0],id:'gid://shopify/LineItem/14',product:{id:'gid://shopify/Product/15'},variant:{id:'gid://shopify/ProductVariant/16'}});});
 await assert.rejects(()=>linkSubscriptionOrigin(admin,shop,contract));assert.equal((await db.operationalLine.findUnique({where:{id:row.id}})).contractGid,null);
});
test.after(async()=>{await db.operationalLine.deleteMany({where:{shop}});await db.mealPlanSelection.deleteMany({where:{shop}});await db.$disconnect();});
