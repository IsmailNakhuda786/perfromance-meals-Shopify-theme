import fs from 'node:fs';
import {catalogue as c} from '../approved-catalogue.mjs';
const a=JSON.parse(fs.readFileSync('work/completion-gate-after.json'));
if(a.shop.myshopifyDomain!=='performance-meals-development.myshopify.com'||a.shop.currencyCode!=='SGD')throw Error('Wrong store');
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const groups=[];
for(const name of [...new Set(c.subscriptions.map(s=>s.name))]){
 const p=a.products.nodes.find(p=>p.handle===(name==='Just Protein'?'pm-qa-subscription-bundle':'pm-subscription-'+slug(name)));
 if(!p||p.metafields.nodes.some(f=>f.key==='prepaid_term_verified'&&f.value==='true'))throw Error('Must audit prepaid engine before updating');
 groups.push({productId:p.id,variants:p.variants.nodes.map(v=>{const s=c.subscriptions.find(s=>s.name===name&&s.variant===v.title);if(!s)throw Error('Source variant mismatch');return {id:v.id,price:s.price3m.toFixed(2),inventoryItem:{sku:s.sku},metafields:[{namespace:'performance',key:'prepaid_terms',type:'json',value:JSON.stringify({currency:'SGD',billingInterval:'MONTH',deliveryInterval:'MONTH',deliveryIntervalCount:1,terms:[{months:3,amount:s.price3m},{months:6,amount:s.price6m}],sourceCommit:c.sourceCommit})}]};})});
}
const values=[];for(const g of groups)for(const v of g.variants){for(const m of v.metafields)values.push({ownerId:v.id,...m});delete v.metafields;}
fs.writeFileSync('work/completion-gate/subscription-source.json',JSON.stringify(groups,null,2));
fs.writeFileSync('work/completion-gate/term-values.json',JSON.stringify({input:values}));
fs.writeFileSync('work/completion-gate/definition.graphql','mutation($input:MetafieldDefinitionInput!){metafieldDefinitionCreate(definition:$input){createdDefinition{id} userErrors{field message}}}');
fs.writeFileSync('work/completion-gate/definition-variables.json',JSON.stringify({input:{name:'Approved prepaid term prices',namespace:'performance',key:'prepaid_terms',ownerType:'PRODUCTVARIANT',type:'json',access:{storefront:'PUBLIC_READ'},description:'Approved upfront 3- and 6-month prices. Informational until a verified prepaid subscription engine is installed. Shared between theme and Core.'}}));
