import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync(new URL('../docs/MERCHANT-SETUP-MANIFEST.json',import.meta.url)));
const input=process.argv[2];if(!input)throw Error('Provide an ignored native catalogue audit JSON file.');
const native=JSON.parse(fs.readFileSync(input));if(native.shop.myshopifyDomain!=='performance-meals-development.myshopify.com')throw Error('Wrong staging store');
const products=native.products.nodes.filter(p=>p.handle.startsWith('pm-qa-'));
const allowedNames=new Set([...manifest.readySeries.singlePurchase.map(p=>p.name),...manifest.readySeries.subscriptionVariants.map(p=>p.name),...manifest.mealPlan.products.map(p=>p.name)]);
const bundleGroups=manifest.readySeries.oneTimeBundles;
const failures=[];
for(const p of products){
 const fields=Object.fromEntries(p.metafields.nodes.filter(m=>m.namespace==='performance').map(m=>[m.key,m.value]));
 const bundleGroup=bundleGroups.find(g=>g.category===fields.category&&p.variants.nodes.every(v=>g.items.some(item=>item.name===`${p.title} — ${v.title}`)));
 if(!allowedNames.has(p.title)&&!bundleGroup)failures.push(`${p.handle}: name/variant mapping absent from approved source`);
 if(fields.business_stream==='meal_plan'){
  if(!p.requiresSellingPlan)failures.push(`${p.handle}: Meal Plan permits one-time purchase`);
  const expectedInterval=p.title==='Biweekly'?['WEEK',2]:p.title==='Monthly'?['MONTH',1]:null;
  if(expectedInterval&&!p.sellingPlanGroups.nodes.some(g=>g.appId==='gid://shopify/App/66228322305'&&g.sellingPlans.nodes.some(plan=>plan.billingPolicy?.interval===expectedInterval[0]&&plan.billingPolicy?.intervalCount===expectedInterval[1])))failures.push(`${p.handle}: required Shopify Subscriptions recurring plan missing`);
  const option=p.options.find(o=>o.name==='Meal plan');
  if(!option||option.values.some(v=>!manifest.mealPlan.variantOptions.includes(v)))failures.push(`${p.handle}: unapproved Meal Plan variant`);
 }
 for(const value of [p.title,p.vendor,p.descriptionHtml,...p.options.flatMap(o=>o.values),...p.media.nodes.map(m=>m.alt||''),...p.sellingPlanGroups.nodes.flatMap(g=>[g.name,...g.sellingPlans.nodes.map(s=>s.name)]),fields.highlights||'',fields.inclusions||''])if(/\bQA\b|test subscription product|QA Monthly/i.test(value))failures.push(`${p.handle}: fixture display label leaked`);
}
if(products.length!==7)failures.push('Unexpected staging catalogue membership; review source mapping before QA');
console.log(JSON.stringify({sourceCommit:manifest.sourceCommit,store:native.shop.myshopifyDomain,checked:products.length,currency:native.shop.currencyCode,namingFailures:failures,subscriptionQaReady:false,pending:['Complete approved variant-specific bundle contents and images','Create remaining approved catalogue resources as needed','Ready Series Shopify Subscriptions-owned term plans and real customer contracts/renewals','Four configured Monthly menu weeks and remaining approved source images']},null,2));
if(failures.length)process.exitCode=1;
