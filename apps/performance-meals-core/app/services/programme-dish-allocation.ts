import {createHash} from 'node:crypto';
import {programmeMenuBlock} from './programme-period';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const digest=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const product=(v:unknown):v is string=>typeof v==='string'&&v.length<=100&&/^gid:\/\/shopify\/Product\/\d+$/.test(v);
export type DishChoice={sourceKey:string;windowKey:string|null;kind:'weekday'|'frozen';productGid:string;quantity:number;block:number|null;week:string|null;window:string|null;startsOn:string|null};
export type DishPick=Pick<DishChoice,'sourceKey'|'windowKey'|'kind'|'productGid'|'block'|'startsOn'|'window'>&{quantity:number};
type MenuSource={block:number;revision:number;recordId:string|null;sourceHash:string};
export type ProgrammeDishAllocation={version:1;menuHash:string;menuSources:MenuSource[];picks:DishPick[]};
export type ProgrammeDishMenu={menuHash:string;menuSources:MenuSource[];choices:DishChoice[]};
export type DishHistory={state:string;version:number;weekdayMeals:number;frozenMeals:number;dishes?:ProgrammeDishAllocation};
type SavedSource={block:number;revision:number;recordId:string|null;selections:string};
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
// Customer choices are historical order/menu records, never today's catalogue.
// The frozen pool is eligibility only; its quantities have a separate32-meal cap.
export function programmeDishMenu(basisHash:string,startsOn:string,sources:SavedSource[]):ProgrammeDishMenu{
 if(!digest(basisHash)||sources.length!==3||sources.some((s,i)=>s.block!==i||!Number.isSafeInteger(s.revision)||s.revision<0||s.revision===0&&s.recordId!==null||s.revision>0&&(typeof s.recordId!=='string'||!/^[A-Za-z0-9-]{1,100}$/.test(s.recordId))||typeof s.selections!=='string'||s.selections.length>131072))throw Error('Complete saved customer menu sources required');
 const choices:DishChoice[]=[],menuSources:MenuSource[]=[],products=new Set<string>();
 for(const source of sources){
  const block=programmeMenuBlock(startsOn,source.block),rows=JSON.parse(source.selections) as Array<{schemaVersion:number;businessStream:string;week:string;window:string;startsOn:string;endsOn:string;meals:Array<{productGid:string;quantity:number}>}>;
  if(!Array.isArray(rows)||rows.length>block.menuWeeks*3)throw Error('Customer menu history requires review');
  const windows=new Set<string>(),weeks=new Map<string,string>(),weekNames=new Map<string,string>();
  for(const row of rows){
   const max=row?.window==='fri'?2:4;
   if(row?.schemaVersion!==1||row.businessStream!=='meal_plan'||typeof row.week!=='string'||!row.week.trim()||row.week.length>100||!['mon-tue','wed-thu','fri'].includes(row.window)||source.block===2&&row.window==='fri'||!date(row.startsOn)||!date(row.endsOn)||row.startsOn<block.startsOn||row.endsOn>block.endsOn||row.endsOn<row.startsOn||Date.parse(row.endsOn+'T00:00:00Z')-Date.parse(row.startsOn+'T00:00:00Z')>6*86400000||new Date(row.startsOn+'T00:00:00Z').getUTCDay()!==1||!Array.isArray(row.meals)||row.meals.length>4||row.meals.some(m=>!product(m?.productGid)||!Number.isSafeInteger(m.quantity)||m.quantity<1||m.quantity>max)||new Set(row.meals.map(m=>m.productGid)).size!==row.meals.length||row.meals.reduce((n,m)=>n+m.quantity,0)>max)throw Error('Customer meal selection requires review');
   if(weeks.has(row.week)&&weeks.get(row.week)!==row.startsOn)throw Error('Customer menu week differs');weeks.set(row.week,row.startsOn);if(weekNames.has(row.startsOn)&&weekNames.get(row.startsOn)!==row.week)throw Error('Customer menu week identity differs');weekNames.set(row.startsOn,row.week);
   const windowKey=hash([source.block,row.startsOn,row.window]);if(windows.has(windowKey))throw Error('Duplicate customer menu window');windows.add(windowKey);
   for(const meal of row.meals){products.add(meal.productGid);choices.push({sourceKey:hash([windowKey,meal.productGid]),windowKey,kind:'weekday',productGid:meal.productGid,quantity:meal.quantity,block:source.block,week:row.week,window:row.window,startsOn:row.startsOn});}
  }
  menuSources.push({block:source.block,revision:source.revision,recordId:source.recordId,sourceHash:hash(rows)});
 }
 if(choices.reduce((n,c)=>n+c.quantity,0)>88)throw Error('Customer choices exceed weekday entitlement');
 for(const productGid of [...products].sort())choices.push({sourceKey:hash(['frozen',productGid]),windowKey:null,kind:'frozen',productGid,quantity:32,block:null,week:null,window:null,startsOn:null});
 return {menuHash:hash([basisHash,menuSources]),menuSources,choices};
}
export function validateProgrammeDishAllocation(value:ProgrammeDishAllocation,basisHash:string,weekdayMeals:number,frozenMeals:number){
 if(!value||value.version!==1||!digest(value.menuHash)||!Array.isArray(value.menuSources)||value.menuSources.length!==3||value.menuSources.some((s,i)=>s.block!==i||!digest(s.sourceHash)||!Number.isSafeInteger(s.revision)||s.revision<0||s.revision===0&&s.recordId!==null||s.revision>0&&(typeof s.recordId!=='string'||!/^[A-Za-z0-9-]{1,100}$/.test(s.recordId)))||hash([basisHash,value.menuSources])!==value.menuHash||!Array.isArray(value.picks)||!value.picks.length||value.picks.length>120)throw Error('Dish allocation evidence requires review');
 const seen=new Set<string>();let weekday=0,frozen=0;
 for(const p of value.picks){if(!p||!digest(p.sourceKey)||!product(p.productGid)||!Number.isSafeInteger(p.quantity)||p.quantity<1||!['weekday','frozen'].includes(p.kind)||p.kind==='weekday'&&(!digest(p.windowKey)||!Number.isSafeInteger(p.block)||p.block!<0||p.block!>2||!date(p.startsOn)||!['mon-tue','wed-thu','fri'].includes(p.window??'')||p.windowKey!==hash([p.block,p.startsOn,p.window])||p.sourceKey!==hash([p.windowKey,p.productGid]))||p.kind==='frozen'&&(p.windowKey!==null||p.block!==null||p.startsOn!==null||p.window!==null||p.sourceKey!==hash(['frozen',p.productGid]))||seen.has(p.sourceKey))throw Error('Dish allocation binding differs');seen.add(p.sourceKey);if(p.kind==='weekday')weekday+=p.quantity;else frozen+=p.quantity;}
 if(weekday!==weekdayMeals||frozen!==frozenMeals||weekday>88||frozen>32)throw Error('Dish quantities differ from batch meal totals');return value;
}
function usedDishes(history:DishHistory[]){
 const used=new Map<string,number>(),windows=new Map<string,number>();let frozen=0;
 for(const b of history){if(b.state==='CANCELLED')continue;if(!['PLANNED','DISPATCHED'].includes(b.state)||b.version!==2||!b.dishes)throw Error('Existing count-only batches need dish reconciliation');
  for(const p of b.dishes.picks){used.set(p.sourceKey,(used.get(p.sourceKey)??0)+p.quantity);if(p.windowKey)windows.set(p.windowKey,(windows.get(p.windowKey)??0)+p.quantity);if(p.kind==='frozen')frozen+=p.quantity;}}
 if(frozen>32)throw Error('Frozen allowance exceeded');return {used,windows,frozen};
}
export function availableProgrammeDishes(menu:ProgrammeDishMenu,history:DishHistory[]){
 const use=usedDishes(history),totals=new Map<string,number>();for(const c of menu.choices)if(c.windowKey)totals.set(c.windowKey,(totals.get(c.windowKey)??0)+c.quantity);
 return menu.choices.map(c=>({...c,remaining:c.kind==='frozen'?32-use.frozen:Math.max(0,Math.min(c.quantity-(use.used.get(c.sourceKey)??0),(totals.get(c.windowKey!)??0)-(use.windows.get(c.windowKey!)??0)))}));
}
export function allocateProgrammeDishes(menu:ProgrammeDishMenu,history:DishHistory[],expectedMenuHash:string,input:unknown):ProgrammeDishAllocation{
 if(expectedMenuHash!==menu.menuHash)throw Error('Customer menu changed; reload before allocating');
 if(!Array.isArray(input)||!input.length||input.length>120)throw Error('Select customer dishes and whole quantities');
 const available=availableProgrammeDishes(menu,history),seen=new Set<string>(),picks:DishPick[]=[];
 for(const raw of input){if(!raw||typeof raw!=='object'||Object.keys(raw).sort().join(',')!=='quantity,sourceKey'||!digest(raw.sourceKey)||!Number.isSafeInteger(raw.quantity)||raw.quantity<1||seen.has(raw.sourceKey))throw Error('Exact unique dish selections required');seen.add(raw.sourceKey);const choice=available.find(c=>c.sourceKey===raw.sourceKey);if(!choice||raw.quantity>choice.remaining)throw Error('Dish is not selected or its remaining quantity is insufficient');picks.push({kind:choice.kind,sourceKey:choice.sourceKey,windowKey:choice.windowKey,productGid:choice.productGid,block:choice.block,startsOn:choice.startsOn,window:choice.window,quantity:raw.quantity});}
 const byWindow=new Map<string,number>();let frozen=0;for(const p of picks){if(p.kind==='frozen')frozen+=p.quantity;if(p.windowKey)byWindow.set(p.windowKey,(byWindow.get(p.windowKey)??0)+p.quantity);}
 const use=usedDishes(history);if(frozen+use.frozen>32)throw Error('Not enough frozen meals remain');for(const[key,amount]of byWindow){const selected=menu.choices.filter(c=>c.windowKey===key).reduce((n,c)=>n+c.quantity,0);if(amount+(use.windows.get(key)??0)>selected)throw Error('Customer window quantity exceeded');}
 return {version:1,menuHash:menu.menuHash,menuSources:menu.menuSources,picks:picks.sort((a,b)=>a.sourceKey.localeCompare(b.sourceKey))};
}
export function assertProgrammeDishDispatch(menu:ProgrammeDishMenu,history:DishHistory[],current:ProgrammeDishAllocation){
 const available=availableProgrammeDishes(menu,history),use=usedDishes([...history,{state:'PLANNED',version:2,weekdayMeals:0,frozenMeals:0,dishes:current}]),totals=new Map<string,number>();for(const c of menu.choices)if(c.windowKey)totals.set(c.windowKey,(totals.get(c.windowKey)??0)+c.quantity);
 for(const p of current.picks){const selected=available.find(c=>c.sourceKey===p.sourceKey);if(!selected||selected.productGid!==p.productGid||selected.kind!==p.kind||p.quantity>selected.remaining||p.windowKey&&(use.windows.get(p.windowKey)??0)>(totals.get(p.windowKey)??0))throw Error('Customer changed the selected dishes; review this unsent batch');}
}
