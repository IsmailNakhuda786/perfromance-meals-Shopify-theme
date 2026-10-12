import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const store='performance-meals-development.myshopify.com';
const dir=path.resolve('work/commerce-qa');
const cli=path.resolve('work/shopify-cli/node_modules/.bin/shopify');
const before=JSON.parse(fs.readFileSync(path.join(dir,'store-before.json')));
if(before.shop.myshopifyDomain!==store)throw Error('Wrong store');
const manifest=JSON.parse(fs.readFileSync('docs/MERCHANT-SETUP-MANIFEST.json'));
const ops=JSON.parse(fs.readFileSync(path.join(dir,'operations.json')));
const statePath=path.join(dir,'created.json');
const state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{store,products:{},definitions:{},metaobjects:{},collections:{},pages:{},plans:{},menus:{},events:[]};
function save(){fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');}
function run(name,variables){
 const file=path.join(dir,'operation.graphql'),vars=path.join(dir,'variables.json'),out=path.join(dir,'result.json');
 fs.writeFileSync(file,ops[name]);fs.writeFileSync(vars,JSON.stringify(variables));
 execFileSync(cli,['store','execute','--store',store,'--query-file',file,'--variable-file',vars,'--version','2026-10','--allow-mutations','--output-file',out,'--json'],{stdio:['ignore','pipe','pipe'],maxBuffer:2e6});
 const response=JSON.parse(fs.readFileSync(out));if(response.errors?.length)throw Error(JSON.stringify(response.errors));
 const payload=Object.values(response)[0];if(payload.userErrors?.length)throw Error(JSON.stringify(payload.userErrors));
 state.events.push({operation:name,time:new Date().toISOString(),resource:payload.product?.id||payload.metaobject?.id||payload.metaobjectDefinition?.id||payload.createdDefinition?.id||payload.page?.id||payload.collection?.id||payload.sellingPlanGroup?.id||payload.menu?.id||null});save();return payload;
}
const phase=process.argv[2];
if(phase==='definitions'){
 for(const def of manifest.metaobjectDefinitions){
  if(state.definitions[def.type])continue;
  const existing=before.metaobjectDefinitions.nodes.find(d=>d.type===def.type);if(existing){state.definitions[def.type]=existing;save();continue;}
  const fields=def.fields.map(f=>({key:f.key,name:f.key.replaceAll('_',' '),type:f.type,required:f.required,validations:f.referenceType?[{name:'metaobject_definition_id',value:state.definitions[f.referenceType].id}]:f.minimum?[{name:'min',value:String(f.minimum)}]:[]}));
  state.definitions[def.type]=run('metaDefinition',{input:{name:def.type.replaceAll('_',' '),type:def.type,displayNameKey:def.displayNameKey,access:{storefront:'PUBLIC_READ'},fieldDefinitions:fields}}).metaobjectDefinition;save();console.log('Created definition',def.type);
 }
 const needed=new Set(['protein_g','carbs_g','fat_g','calories_kcal','category','subscription_category','meal_count','menu_weeks','meals_per_day','bundle_contents','inclusions','highlights','accent_color']);
 for(const def of manifest.metafieldDefinitions.filter(d=>needed.has(d.key))){
  const key=def.owner+':'+def.key;if(state.definitions[key])continue;
  const existing=before.metafieldDefinitions.nodes.find(d=>def.owner==='PRODUCT'&&d.namespace===def.namespace&&d.key===def.key);if(existing){state.definitions[key]=existing;save();continue;}
  const input={name:def.key.replaceAll('_',' '),namespace:def.namespace,key:def.key,type:def.type,ownerType:def.owner,access:{storefront:'PUBLIC_READ'}};
  if(def.referenceType)input.validations=[{name:'metaobject_definition_id',value:state.definitions[def.referenceType].id}];else if(def.minimum)input.validations=[{name:'min',value:String(def.minimum)}];
  state.definitions[key]=run('fieldDefinition',{input}).createdDefinition;save();console.log('Created field',key);
 }
}
if(phase==='products'){
 const specs=[
  {handle:'pm-qa-low-carb-meal',title:'QA Low Carb Chicken Meal',templateSuffix:'ready-series',productType:'Low Carb',options:{Title:['Default Title']},price:'12.50'},
  {handle:'pm-qa-high-carb-meal',title:'QA High Carb Rice Meal',templateSuffix:'ready-series',productType:'High Carb',options:{Title:['Default Title']},price:'13.50'},
  {handle:'pm-qa-protein-meal',title:'QA Just Protein Meal',templateSuffix:'ready-series',productType:'Just Protein',options:{Title:['Default Title']},price:'14.50'},
  {handle:'pm-qa-bundle',title:'QA Mixed Bundle',templateSuffix:'bundle',productType:'Mixed Bundle',options:{Protein:['Beef','Non-Beef']},price:'60.00'},
  {handle:'pm-qa-subscription-bundle',title:'QA Subscription Bundle',templateSuffix:'subscription',productType:'Mixed Bundle',options:{Protein:['Beef','Non-Beef']},price:'55.00',requiresSellingPlan:true},
  {handle:'pm-qa-biweekly',title:'QA Biweekly Meal Plan',templateSuffix:'ready-series',productType:'Meal Plan',options:{'Meal plan':manifest.mealPlan.variantOptions,'Meal frequency':['Lunch only','Lunch & dinner']},price:'120.00',requiresSellingPlan:true},
  {handle:'pm-qa-fixed',title:'QA Fixed Meal Plan',templateSuffix:'ready-series',productType:'Meal Plan',options:{'Meal plan':manifest.mealPlan.variantOptions,'Meal frequency':['Lunch & dinner']},price:'180.00'}
 ];
 for(const spec of specs){
  if(state.products[spec.handle])continue;
  if(before.products.nodes.some(p=>p.handle===spec.handle))throw Error('Existing handle collision: '+spec.handle);
  let combos=[[]];for(const [name,values]of Object.entries(spec.options))combos=combos.flatMap(c=>values.map(value=>[...c,{optionName:name,name:value}]));
  const input={handle:spec.handle,title:spec.title,templateSuffix:spec.templateSuffix,productType:spec.productType,vendor:'Performance Meals QA',tags:['pm-storefront-qa','test-only'],status:'DRAFT',requiresSellingPlan:!!spec.requiresSellingPlan,descriptionHtml:'<p>Staging QA product only. Test price, ingredients and nutrition are not approved production data.</p>',productOptions:Object.entries(spec.options).map(([name,values],i)=>({name,position:i+1,values:values.map(name=>({name}))})),variants:combos.map((optionValues,i)=>({optionValues,price:spec.price,sku:'PM-QA-'+spec.handle.slice(6).toUpperCase()+'-'+(i+1),inventoryPolicy:'CONTINUE',inventoryItem:{tracked:false,requiresShipping:true}}))};
  state.products[spec.handle]=run('product',{input}).product;save();console.log('Created draft product',spec.handle);
 }
}
export {run,state,save,manifest,before};
