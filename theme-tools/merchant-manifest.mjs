import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url).pathname;
const ready = fs.readFileSync(path.join(root, 'src/pages/ReadySeriesPage.tsx'), 'utf8');
const mealSource = fs.readFileSync(path.join(root, 'src/data.ts'), 'utf8').match(/export const MEALS: Meal\[\] = (\[[\s\S]*?\n\]);/)?.[1];
function array(name) {
  const expression = ready.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`))?.[1];
  if (!expression) throw new Error(`Missing approved catalog: ${name}`);
  return JSON.parse(JSON.stringify(vm.runInNewContext(expression, {}, { timeout: 1000 })));
}
const sections = {};
for (const file of fs.readdirSync(path.join(root, 'theme/sections')).filter(file => file.endsWith('.liquid'))) sections[file] = JSON.parse(fs.readFileSync(path.join(root, 'theme/sections', file), 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)?.[1] || '{}');
const definitions = [
  {owner:'PRODUCT',namespace:'performance',key:'business_stream',type:'single_line_text_field',choices:['ready_series','meal_plan','shared'],storefrontAccess:'PUBLIC_READ',requiredFor:'Every Performance Meals commerce product; all variants inherit the product classification. Gift Cards use shared. Mixed carts are allowed.'},
  ...['protein_g','carbs_g','fat_g','sugar_g','saturated_fat_g','fibre_g','sodium_mg'].map(key => ({ owner: 'PRODUCT', namespace: 'performance', key, type: 'number_decimal', requiredFor: 'Recorded nutrition only; optional if unknown' })),
  {owner:'PRODUCT',namespace:'performance',key:'calories_kcal',type:'number_integer'},
  ...['category','subscription_category','badge','prep_time','storage','heat_method','nutrition_note'].map(key => ({owner:'PRODUCT',namespace:'performance',key,type:'single_line_text_field'})),
  ...['ingredients','allergens','preparation'].map(key => ({owner:'PRODUCT',namespace:'performance',key,type:'multi_line_text_field'})),
  ...['highlights','inclusions'].map(key => ({owner:'PRODUCT',namespace:'performance',key,type:'list.single_line_text_field'})),
  ...['meal_count','menu_weeks','meals_per_day'].map(key => ({owner:'PRODUCT',namespace:'performance',key,type:'number_integer',minimum:1})),
  {owner:'PRODUCTVARIANT',namespace:'performance',key:'meals_per_day',type:'number_integer',minimum:1},
  {owner:'PRODUCT',namespace:'performance',key:'accent_color',type:'color'},
  {owner:'PRODUCT',namespace:'performance',key:'related_products',type:'list.product_reference'},
  {owner:'PRODUCT',namespace:'performance',key:'bundle_contents',type:'list.metaobject_reference',referenceType:'performance_bundle_item',requiredFor:'Bundles and Subscription'}
];
const metaobjects = [
  {type:'performance_bundle_item',displayNameKey:'label',storefrontAccess:'PUBLIC_READ',fields:[{key:'label',type:'single_line_text_field',required:true},{key:'variant',type:'variant_reference',required:true},{key:'product',type:'product_reference',required:false},{key:'quantity',type:'number_integer',required:true,minimum:1}]},
  {type:'performance_menu_window',displayNameKey:'label',storefrontAccess:'PUBLIC_READ',fields:[{key:'key',type:'single_line_text_field',required:true},{key:'label',type:'single_line_text_field',required:true},{key:'days',type:'number_integer',required:true,minimum:1},{key:'meals',type:'list.product_reference',required:true}]},
  {type:'performance_menu_week',displayNameKey:'label',storefrontAccess:'PUBLIC_READ',fields:[{key:'label',type:'single_line_text_field',required:true},{key:'starts_on',type:'date',required:true},{key:'ends_on',type:'date',required:true},{key:'cutoff_at',type:'date_time',required:true},{key:'programmes',type:'list.product_reference',required:false},{key:'windows',type:'list.metaobject_reference',referenceType:'performance_menu_window',required:true}]}
];
for (const definition of metaobjects) definition.fields.push({key:'business_stream',type:'single_line_text_field',choices:['ready_series','meal_plan'],required:false,requiredByOperationalPolicy:true});
const manifest = {
  sourceCommit:execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8'}).trim(),
  warning:'Prototype values are reference content, not approved live prices, nutrition, inventory, discounts, billing or legal promises. Merchant must confirm before entering Shopify. No records are created by these tools.',
  readySeries:{ singlePurchase:array('MEALS'), oneTimeBundles:array('PREDEFINED_BUNDLES'), subscriptionVariants:array('SUBSCRIPTION_PRODUCTS') },
  mealPlanMenuReference:JSON.parse(JSON.stringify(vm.runInNewContext(mealSource,{}, {timeout:1000}))),
  collections:[{handle:'ready-series',template:'collection.ready-series',products:'Single meals; one-time only'},{handle:'ready-series-bundles',template:'collection.bundles',products:'Predefined one-time bundles'},{handle:'ready-series-subscriptions',template:'collection.subscriptions',products:'Recurring predefined bundle products with actual allocations'}],
  pages:[{handle:'meal-plan',template:'page.meal-plan'},{handle:'meal-plan-builder',template:'page.meal-plan-builder'},{handle:'about',template:'page.about'},{handle:'rewards',template:'page.rewards'},{handle:'gift-card',template:'page.gift-card'},{handle:'ready-series',template:'page.ready-series',optional:true}],
  giftCard:{handle:'gift-card',template:'product.gift-card',nativeGiftCardProduct:true,referenceDenominations:[25,50,100,150]},
  mealPlan:{marketingMessaging:['6 by 60','6 by 60 Plus'],products:[{name:'Biweekly',kind:'recurring',menuWeeks:2},{name:'Monthly',kind:'recurring',menuWeeks:4},{name:'2 Months',kind:'recurring',menuWeeks:4},{name:'6 by 60',kind:'recurring',menuWeeks:4},{name:'6 by 60 Plus',kind:'recurring',menuWeeks:4}],variantOptions:['Low Carb Regular','Low Carb Regular+','Balance Regular','Balance Regular+'],mealFrequency:[{name:'Lunch Only',mealsPerDay:1},{name:'Lunch & Dinner',mealsPerDay:2}],note:'Every programme is subscription-only. Configure native variants and recurring allocations; 6 by 60 is marketing messaging, never a billing or order type. Merchant confirms every native price, menu_weeks, selling plan and coverage day. Populate matched programme blocks on both landing and builder. Published menu weeks represent initial choices, not full 60-day fulfilment.'},
  sellingPlans:{readySeries:['3-month term','6-month term'],mealPlan:['Recurring programme billing plan'],note:'Shopify Subscriptions is the preferred engine. Every Meal Plan product requires a recurring selling plan. Single Purchase and Bundles stay one-time; only Ready Series Subscription is recurring. 6 by 60 is marketing only.'},
  menus:[{handle:'main-menu',items:['Home','Ready Series','Meal Plan','About Us','Rewards','Gift Cards','Account','Search','Cart'],note:'Header already supplies brands/About/Rewards/Account/Cart. Assign an optional header menu for extra links such as Gift Cards and Search; avoid duplicates.'}],
  metafieldDefinitions:definitions,metaobjectDefinitions:metaobjects,
  reviewMetafields:[{owner:'PRODUCT',namespace:'reviews',key:'rating',type:'rating'},{owner:'PRODUCT',namespace:'reviews',key:'rating_count',type:'number_integer',note:'Review app-owned data, never seed fake reviews.'}],
  globalThemeSettings:JSON.parse(fs.readFileSync(path.join(root,'theme/config/settings_schema.json'))),sectionSchemas:sections,
  themeTemplates:Object.fromEntries(fs.readdirSync(path.join(root,'theme/templates')).filter(file=>file.endsWith('.json')).map(file=>[file,JSON.parse(fs.readFileSync(path.join(root,'theme/templates',file)))])),
  assetDependencies:fs.readdirSync(path.join(root,'theme/assets')).filter(file=>/\.(png|jpg|ttf)$/.test(file)),
  merchantMissing:['Store collaborator access','Verified products, prices, inventory, allergens and nutrition','Shopify Subscriptions configuration and final billing terms','Published menu weeks/windows','Loyalty provider and approved rewards rules','Verified support number','Gift card denominations/content approval','Shipping, delivery eligibility, taxes, discounts and policies','Actual customer account configuration']
};
fs.writeFileSync(path.join(root,'docs/MERCHANT-SETUP-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Manifest: ${manifest.readySeries.singlePurchase.length} meals, ${manifest.readySeries.oneTimeBundles.reduce((sum,group)=>sum+group.items.length,0)} one-time bundle offers, ${manifest.readySeries.subscriptionVariants.length} subscription variants; ${definitions.length} metafield definitions; ${metaobjects.length} metaobject definitions.`);
