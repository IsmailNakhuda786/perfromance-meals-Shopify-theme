import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {planIndividualPrices} from '../catalogue/plan-individual-prices.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../fresher-individual-prices-20261016.json',import.meta.url)));
function fixture(){return {shop:{myshopifyDomain:'performance-meals-development.myshopify.com',currencyCode:'SGD'},products:{pageInfo:{hasNextPage:false},nodes:source.prices.map((r,i)=>({id:`gid://shopify/Product/${i+1}`,title:r.title,handle:'pm-merchant-'+createHash('sha256').update(r.title).digest('hex').slice(0,16),status:'DRAFT',tags:['pm-merchant-20261015'],isGiftCard:false,requiresSellingPlan:false,variants:{pageInfo:{hasNextPage:false},nodes:[{id:`gid://shopify/ProductVariant/${i+1}`,price:'0.00'}]}}))}};}
test('reviewed individual prices target only managed drafts and replay without another update',()=>{
 const n=fixture(),before=JSON.stringify(n),plan=planIndividualPrices(source,n);
 assert.equal(plan.length,23);assert.equal(JSON.stringify(n),before);
 for(const row of plan)n.products.nodes.find(p=>p.id===row.productId).variants.nodes[0].price=row.price;
 assert.ok(planIndividualPrices(source,n).every(row=>!row.needsUpdate));
 assert.equal(source.pending.length,5);assert.equal(source.mediaApproved,false);
});
test('wrong store, incomplete reads, changed native owners or prices stop the entire plan',()=>{
 for(const mutate of [n=>n.shop.currencyCode='USD',n=>n.shop.myshopifyDomain='other.myshopify.com',n=>n.products.pageInfo.hasNextPage=true,n=>n.products.nodes.push(structuredClone(n.products.nodes[0])),n=>n.products.nodes[0].status='ACTIVE',n=>n.products.nodes[0].title='Other',n=>n.products.nodes[0].tags=[],n=>n.products.nodes[0].isGiftCard=true,n=>n.products.nodes[0].requiresSellingPlan=true,n=>n.products.nodes[0].variants.pageInfo.hasNextPage=true,n=>n.products.nodes[0].variants.nodes[0].price='99.00']){const n=fixture();mutate(n);assert.throws(()=>planIndividualPrices(source,n));}
 for(const mutate of [s=>s.prices.push(s.prices[0]),s=>s.prices[0].priceMinor=0,s=>s.prices[0].priceMinor=1.5,s=>s.prices[0].sourceUrl='https://other.com/product/a']){const s=structuredClone(source);mutate(s);assert.throws(()=>planIndividualPrices(s,fixture()));}
});
