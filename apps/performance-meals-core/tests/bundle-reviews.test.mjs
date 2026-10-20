import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/bundle-reviews.server.ts','app/services/orders.server.ts'],outdir:'.shopify/bundle-review-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {prepareBundleReview,bindBundleReview}=await import('../.shopify/bundle-review-test/bundle-reviews.server.js');
const {recordOrder}=await import('../.shopify/bundle-review-test/orders.server.js');
const db=new PrismaClient(),shop=`bundle-${randomUUID()}.myshopify.com`;
process.env.ALLOWED_SHOP=shop;
const gid=(kind,id)=>`gid://shopify/${kind}/${id}`;
const food=id=>({__typename:'Product',id:gid('Product',id),status:'ACTIVE',isGiftCard:false,requiresSellingPlan:false,stream:{type:'single_line_text_field',value:'ready_series'}});
function fixture(){const product=food(20);return {id:gid('ProductVariant',10),price:'109.80',contents:null,product:{...food(1),mealCount:{type:'number_integer',value:'14'},contents:{type:'list.metaobject_reference',value:JSON.stringify([gid('Metaobject',30)]),references:{pageInfo:{hasNextPage:false},nodes:[{id:gid('Metaobject',30),type:'performance_bundle_item',fields:[{key:'product',value:product.id,reference:product},{key:'variant',value:gid('ProductVariant',21),reference:{__typename:'ProductVariant',id:gid('ProductVariant',21),product}},{key:'quantity',value:'14',reference:null},{key:'label',value:'Approved meal',reference:null},{key:'business_stream',value:'ready_series',reference:null}]}]}}}};}
let native=fixture(),calls=0;
const admin={graphql:async()=>{calls++;return new Response(JSON.stringify({data:{shop:{myshopifyDomain:shop,currencyCode:'SGD'},productVariant:native}}));}};
const context={shop,customerGid:gid('Customer',90),productGid:gid('Product',1),variantGid:gid('ProductVariant',10),quantity:2};
async function review(){native=fixture();return prepareBundleReview(admin,context);}
function binding(row,extra={}){return {...context,reviewId:row.id,reviewHash:row.snapshotHash,orderGid:gid('Order',100),orderLineGid:gid('LineItem',101),unitPriceMinor:10980,createdAt:new Date(Date.now()+1000).toISOString(),currentSnapshot:JSON.parse(row.snapshot),...extra};}
test.after(async()=>{await db.operationalLine.deleteMany({where:{shop}});await db.webhookReceipt.deleteMany({where:{shop}});await db.bundlePurchaseReview.deleteMany({where:{shop}});await db.$disconnect();});
test('native review preserves exact quantities, price and customer identity',async()=>{const row=await review(),snapshot=JSON.parse(row.snapshot);assert.equal(snapshot.itemsPerBundle,14);assert.equal(snapshot.components[0].quantity,14);assert.equal(snapshot.unitPriceMinor,10980);assert.equal(row.quantity,2);assert.equal(row.state,'REVIEWED');assert.equal(row.orderGid,null);});
test('incomplete, mismatched, foreign and non-food catalogue evidence is rejected',async()=>{
 for(const mutate of [v=>v.product.mealCount.value='13',v=>v.product.contents.references.pageInfo.hasNextPage=true,v=>v.product.contents.references.nodes[0].fields[0].reference.isGiftCard=true,v=>v.product.contents.references.nodes[0].fields[1].reference.product={...food(99)},v=>v.product.contents.value='[]',v=>v.price='NaN']){native=fixture();mutate(native);await assert.rejects(prepareBundleReview(admin,context));}
 const before=calls;await assert.rejects(prepareBundleReview(admin,{...context,quantity:0}));assert.equal(calls,before);
});
test('binding preserves original purchase after catalogue edits and rejects reuse',async()=>{const row=await review(),input=binding(row);const first=await db.$transaction(tx=>bindBundleReview(tx,input));assert.equal(first.state,'ORDERED');const changed=structuredClone(input.currentSnapshot);changed.components[0].label='New catalogue meal';const again=await db.$transaction(tx=>bindBundleReview(tx,{...input,currentSnapshot:changed}));assert.equal(again.snapshot,first.snapshot);await assert.rejects(db.$transaction(tx=>bindBundleReview(tx,{...input,orderGid:gid('Order',102)})),/another order/);});
test('unbound catalogue changes, altered price, quantity and customer are held',async()=>{const row=await review(),input=binding(row,{orderLineGid:gid('LineItem',103)}),changed=structuredClone(input.currentSnapshot);changed.components[0].quantity=13;
 for(const extra of [{currentSnapshot:changed},{unitPriceMinor:10979},{quantity:1},{customerGid:gid('Customer',91)},{createdAt:'2020-01-01T00:00:00Z'},{reviewHash:'_'.repeat(64)}])await assert.rejects(db.$transaction(tx=>bindBundleReview(tx,{...input,...extra})));
 assert.equal((await db.bundlePurchaseReview.findUnique({where:{id:row.id}})).state,'REVIEWED');
});
test('stored snapshot corruption never silently substitutes a new purchase',async()=>{const row=await review(),input=binding(row,{orderLineGid:gid('LineItem',104)}),changed=JSON.parse(row.snapshot);changed.components[0].label='Tampered';await db.bundlePurchaseReview.update({where:{id:row.id},data:{snapshot:JSON.stringify(changed)}});await assert.rejects(db.$transaction(tx=>bindBundleReview(tx,input)),/snapshot or price/);});

test('order routing binds an opt-in review and later catalogue edits preserve purchased meals',async()=>{
 const row=await review(),order={id:gid('Order',200),createdAt:new Date(Date.now()+1000).toISOString(),customer:{id:context.customerGid},lineItems:{pageInfo:{hasNextPage:false},nodes:[{id:gid('LineItem',201),quantity:2,originalUnitPriceSet:{shopMoney:{amount:'109.80',currencyCode:'SGD'}},product:{id:context.productGid,isGiftCard:false,stream:{jsonValue:'ready_series'}},variant:{id:context.variantGid},customAttributes:[{key:'_pm_business_stream',value:'ready_series'},{key:'_pm_stream_schema_version',value:'1'},{key:'_pm_bundle_review_id',value:row.id},{key:'_pm_bundle_review_hash',value:row.snapshotHash}]}]}};
 let reads=0;
 const routingAdmin={graphql:async query=>{if(query.includes('query OperationalOrder'))return Response.json({data:{shop:{myshopifyDomain:shop},order}});reads++;return admin.graphql();}};
 await recordOrder(shop,order.id,'bundle-created',routingAdmin);
 const line=await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:gid('LineItem',201)}}});assert.equal(line.bundleReviewId,row.id);assert.equal(line.validationStatus,'VALIDATED');assert.equal(reads,1);
 native.price='120.00';await recordOrder(shop,order.id,'bundle-paid',routingAdmin,'ORDERS_PAID');assert.equal(reads,1);assert.equal((await db.bundlePurchaseReview.findUnique({where:{id:row.id}})).snapshot,row.snapshot);
 const other=structuredClone(order);other.id=gid('Order',202);other.lineItems.nodes[0].id=gid('LineItem',203);
 const otherAdmin={graphql:async query=>query.includes('query OperationalOrder')?Response.json({data:{shop:{myshopifyDomain:shop},order:other}}):admin.graphql()};
 await recordOrder(shop,other.id,'bundle-reused',otherAdmin);const held=await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:gid('LineItem',203)}}});assert.equal(held.validationStatus,'QUARANTINED');assert.equal(held.bundleReviewId,null);
});

test('competing checkouts cannot consume one bundle review twice',async()=>{
 const row=await review(),inputs=[300,302].map(id=>binding(row,{orderGid:gid('Order',id),orderLineGid:gid('LineItem',id+1)}));
 const results=await Promise.allSettled(inputs.map(input=>db.$transaction(tx=>bindBundleReview(tx,input))));
 for(const [i,result] of results.entries())if(result.status==='rejected')await assert.rejects(db.$transaction(tx=>bindBundleReview(tx,inputs[i])));
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 const saved=await db.bundlePurchaseReview.findUnique({where:{id:row.id}});assert.equal(saved.state,'ORDERED');assert.ok(inputs.some(input=>input.orderGid===saved.orderGid&&input.orderLineGid===saved.orderLineGid));
});

test('empty variant reference list uses the product default exactly like the Theme',async()=>{native=fixture();native.contents={type:'list.metaobject_reference',value:'[ ]',references:{nodes:[],pageInfo:{hasNextPage:false}}};const row=await prepareBundleReview(admin,context);assert.equal(JSON.parse(row.snapshot).itemsPerBundle,14);});
