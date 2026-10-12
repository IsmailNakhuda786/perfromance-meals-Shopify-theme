import fs from 'node:fs';
import vm from 'node:vm';
import {mealPlanBilling} from './meal-plan-billing.mjs';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const read=file=>execFileSync('git',['show',`origin/main:${file}`],{cwd:root,encoding:'utf8'});
const ready=read('src/pages/ReadySeriesPage.tsx'), wizard=read('src/pages/MealPlanWizardPage.tsx');
const ts = (await import('../apps/performance-meals-core/node_modules/typescript/lib/typescript.js')).default;
const evaluate=(expression,context={})=>{const js=ts.transpileModule(`result = (${expression})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;const sandbox={...context,result:null};vm.runInNewContext(js,sandbox,{timeout:1000});return JSON.parse(JSON.stringify(sandbox.result));};
const initializer=(source,name)=>{
 const file=ts.createSourceFile('approved.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 for(const statement of file.statements) if(ts.isVariableStatement(statement)) for(const declaration of statement.declarationList.declarations) if(declaration.name.getText(file)===name&&declaration.initializer) return declaration.initializer.getText(file);
 throw Error(`Approved source declaration missing: ${name}`);
};
const readyMeals=evaluate(initializer(read('src/readySeriesData.ts'),'READY_SERIES_MEALS'));
const array=name=>evaluate(initializer(ready,name),{READY_SERIES_MEALS:readyMeals});
const details=evaluate(initializer(ready,'SUB_MEAL_DETAILS'));
const programmes=Object.entries(evaluate(initializer(wizard,'PROGRAMME_DETAILS'))).map(([key,p])=>({key,name:p.label,description:p.description,menuWeeks:p.menuWeeks,...mealPlanBilling(key),frequencies:key.startsWith('6by60')?['Lunch & Dinner']:['Lunch Only','Lunch & Dinner']}));
const basePrices=evaluate(initializer(wizard,'BASE_PRICES'));
const mealTypes=evaluate(initializer(wizard,'MEAL_PLANS')).map(p=>p.id);
const menuMeals=evaluate(initializer(read('src/data.ts'),'MEAL_PLAN_MEALS'));
const weekMenus=evaluate(initializer(wizard,'WEEK_MENUS'));
const deliveryWindows=evaluate(initializer(wizard,'DELIVERY_WINDOWS'));
export const catalogue={sourceCommit:execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8'}).trim(),singles:array('MEALS'),bundleGroups:array('PREDEFINED_BUNDLES'),subscriptions:array('SUBSCRIPTION_PRODUCTS').map(s=>({...s,...details[s.sku]})),programmes,mealTypes,basePrices,menuMeals,weekMenus,deliveryWindows,mealPlanImage:read('src/pages/MealPlanLandingPage.tsx').match(/src="(https:\/\/images\.unsplash\.com\/[^\"]+)"/)?.[1]};
if(programmes.length!==5||catalogue.singles.length!==12||catalogue.subscriptions.length!==10||!weekMenus)throw Error('Incomplete approved source extraction');
for(const s of catalogue.subscriptions)if(s.meals.reduce((n,m)=>n+m.qty,0)!==s.items)throw Error('Source meal-count conflict: '+s.sku);
export function bundleProducts(){
 return catalogue.bundleGroups.flatMap(g=>{const grouped=new Map();for(const offer of g.items){const name=offer.variant&&offer.name.endsWith(' — '+offer.variant)?offer.name.slice(0,-(' — '+offer.variant).length):offer.name;const group=grouped.get(name)||{name,category:g.category,color:g.color,offers:[]};group.offers.push(offer);grouped.set(name,group);}return [...grouped.values()];});
}
