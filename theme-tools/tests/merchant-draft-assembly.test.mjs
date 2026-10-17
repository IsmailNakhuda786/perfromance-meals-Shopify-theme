import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {planMerchantDraftAssembly} from '../catalogue/plan-draft-assembly.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../merchant-catalogue-20261015.json',import.meta.url)));
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,16);
function fixture(){
 const names=[...new Set([...source.bundles,...source.subscriptions].flatMap(record=>record.contents.map(item=>item.name)))];
 const bindings=Object.fromEntries(names.map((name,index)=>[name,`gid://shopify/ProductVariant/${index+1}`]));
 const fields=values=>({nodes:Object.entries(values).map(([key,value])=>({namespace:'performance',key,value:String(value)}))});
 const products=names.map((title,index)=>({id:`gid://shopify/Product/${index+1}`,title,status:'DRAFT',tags:['pm-merchant-20261015'],isGiftCard:false,requiresSellingPlan:false,metafields:fields({business_stream:'ready_series'}),variants:{pageInfo:{hasNextPage:false},nodes:[{id:bindings[title]}]}}));
 let id=100;
 for(const [kind,records]of [['bundle',source.bundles],['subscription',source.subscriptions]])for(const record of records){
  const subscription=kind==='subscription';
  products.push({id:`gid://shopify/Product/${++id}`,title:record.title,handle:`pm-merchant-${kind}-${hash(record.title)}`,status:'DRAFT',tags:['pm-merchant-20261015'],isGiftCard:false,requiresSellingPlan:subscription,metafields:fields({business_stream:'ready_series',meal_count:record.itemsPerDelivery,delivery_included:subscription}),variants:{pageInfo:{hasNextPage:false},nodes:subscription?record.terms.map(term=>({id:`gid://shopify/ProductVariant/${++id}`,price:(term.upfrontMinor/100).toFixed(2),selectedOptions:[{name:'Term',value:`${term.months} months`}]})):[{id:`gid://shopify/ProductVariant/${++id}`,price:(record.purchasePriceMinor/100).toFixed(2)}]}});
 }
 return {native:{shop:{myshopifyDomain:'performance-meals-development.myshopify.com',currencyCode:'SGD'},products:{nodes:products,pageInfo:{hasNextPage:false}}},bindings};
}
test('managed draft assembly preserves every component quantity across products and both prepaid variants',()=>{
 const {native,bindings}=fixture(),before=JSON.stringify(native);
 const plan=planMerchantDraftAssembly(source,native,bindings),objects=new Map(plan.objects.map(item=>[item.handle,item]));
 assert.equal(plan.attachments.length,50);assert.equal(plan.objects.length,47);assert.equal(plan.readyForActivation,false);assert.equal(plan.nativeWritesPerformed,false);
 for(const owner of plan.attachments){
  assert.equal(owner.componentHandles.reduce((sum,handle)=>sum+Number(objects.get(handle).fields.find(field=>field.key==='quantity').value),0),owner.itemsPerDelivery);
  assert.ok(owner.componentHandles.every(handle=>objects.get(handle).fields.some(field=>field.key==='business_stream'&&field.value==='ready_series')));
 }
 assert.equal(JSON.stringify(native),before);
 assert.deepEqual(planMerchantDraftAssembly(source,native,bindings),plan,'resume produces stable component keys');
});
test('a published or reclassified package, changed price, wrong term or missing owner cannot be linked',()=>{
 for(const change of [p=>p.status='ACTIVE',p=>p.requiresSellingPlan=false,p=>p.isGiftCard=true,p=>p.metafields.nodes.find(f=>f.key==='meal_count').value='999',p=>p.metafields.nodes.find(f=>f.key==='business_stream').value='meal_plan',p=>p.variants.nodes[0].price='0.00',p=>p.variants.nodes[0].selectedOptions[0].value='1 month',p=>p.handle='unmanaged']){
  const {native,bindings}=fixture(),p=native.products.nodes.find(p=>p.requiresSellingPlan);change(p);
  assert.throws(()=>planMerchantDraftAssembly(source,native,bindings));
 }
 const {native,bindings}=fixture();native.products.nodes.push(structuredClone(native.products.nodes.at(-1)));
 assert.throws(()=>planMerchantDraftAssembly(source,native,bindings));
});
