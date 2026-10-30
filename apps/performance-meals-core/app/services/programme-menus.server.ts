import type {AdminApiContext} from '@shopify/shopify-app-react-router/server';
import db from '../db.server';
import {assertShop} from './security.server';
import {catalog} from './catalog.server';
import {validateSelection,type DraftInput,type MenuWeek,type Programme} from './menu-validation';
import {programmeMenuBlock,sixtyDayPeriod} from './programme-period';

export const PAID_PROGRAMME_QUERY=`#graphql
query PaidProgramme($id:ID!){shop{myshopifyDomain}order(id:$id){id cancelledAt displayFinancialStatus customer{id}}}`;

export function validateProgrammeMenuBlock(input:DraftInput,programme:Programme,weeks:MenuWeek[],startsOn:string,block:number,complete:boolean,now=Date.now(),previous:ReturnType<typeof validateSelection>["windows"]=[]) {
 const period=sixtyDayPeriod(startsOn);
 const window=programmeMenuBlock(startsOn,block);
 if(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now))>period.endsOn) throw new Error('Programme has ended');
 const eligible=weeks.filter(w=>w.startsOn>=window.startsOn&&w.startsOn<=window.endsOn).map(week=>{
  const required=block===2?{'mon-tue':2,'wed-thu':2}:{'mon-tue':2,'wed-thu':2,fri:1};
  for(const [key,days] of Object.entries(required)) if(!week.windows.some(w=>w.key===key&&w.days===days)) throw new Error('Weekday menu configuration incomplete');
  if(week.windows.some(w=>!['mon-tue','wed-thu','fri'].includes(w.key))) throw new Error('Unrecognized delivery window');
  return {...week,endsOn:week.endsOn>window.endsOn?window.endsOn:week.endsOn,windows:week.windows.filter(w=>w.key in required).map(w=>({...w,meals:[...w.meals]}))};
 });
 // Closed weeks remain visible and immutable; later open weeks can still be edited.
 const canonical=(meals:{productGid:string;quantity:number}[])=>JSON.stringify(meals.map(m=>[m.productGid,m.quantity]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
 for(const week of eligible) if(Date.parse(week.cutoffAt)<=now) {
  for(const delivery of week.windows) {
   const saved=previous.find(w=>w.week===week.handle&&w.window===delivery.key);
   if(!saved) throw new Error('Closed menu has no saved selection');
   const requested=Object.entries(input.selections?.[week.handle]?.[delivery.key]||{}).map(([id,quantity])=>({productGid:id.startsWith('gid://')?id:`gid://shopify/Product/${id}`,quantity}));
   if(canonical(requested)!==canonical(saved.meals)) throw new Error('Closed menu cannot be changed');
   // A merchant's later catalogue change must not invalidate an already locked selection.
   delivery.meals=saved.meals.map(m=>m.productGid);
  }
 }
 const normalized=validateSelection({...input,startMonday:window.startsOn},{...programme,menuWeeks:window.menuWeeks},eligible,complete,Number.NEGATIVE_INFINITY);
 for(let i=0;i<normalized.windows.length;i++) {
  const item=normalized.windows[i];
  if(Date.parse(eligible.find(w=>w.handle===item.week)!.cutoffAt)<=now) normalized.windows[i]=previous.find(w=>w.week===item.week&&w.window===item.window)!;
 }
 return {block:window,windows:normalized.windows,cutoffAt:normalized.cutoffAt};
}

export async function paidProgramme(shop:string,customerGid:string,selectionId:string,admin:AdminApiContext) {
 assertShop(shop);
 const record=await db.mealPlanSelection.findFirst({where:{id:selectionId,shop,customerGid,status:'ORDERED',sellingPlanGid:null}});
 if(!record?.startsOn||!record.endsOn||!record.orderGid||!record.orderLineGid) throw new Response('Programme unavailable',{status:404});
 if(sixtyDayPeriod(record.startsOn).endsOn!==record.endsOn) throw new Error('Invalid programme period');
 const line=await db.operationalLine.findUnique({where:{shop_orderLineGid:{shop,orderLineGid:record.orderLineGid}}});
 if(line?.selectionId!==record.id||line.validationStatus!=='VALIDATED'||line.customerGid!==customerGid||line.businessStream!=='meal_plan'||line.orderGid!==record.orderGid||line.productGid!==record.programmeGid||line.variantGid!==record.variantGid) throw new Response('Programme unavailable',{status:404});
 const response=await admin.graphql(PAID_PROGRAMME_QUERY,{variables:{id:record.orderGid}});
 const result=await response.json() as {errors?:unknown;data?:{shop?:{myshopifyDomain:string};order?:{id:string;customer?:{id:string};cancelledAt:string|null;displayFinancialStatus:string}}};
 const order=result.data?.order;
 if(!response.ok||result.errors||result.data?.shop?.myshopifyDomain!==shop||!order||order.id!==record.orderGid||order.customer?.id!==customerGid||order.cancelledAt||order.displayFinancialStatus!=='PAID') throw new Response('Paid programme unavailable',{status:409});
 return record;
}

export async function saveProgrammeMenu(shop:string,customerGid:string,selectionId:string,block:number,input:DraftInput,revision:number,complete:boolean,admin:AdminApiContext) {
 if(!Number.isSafeInteger(revision)||revision<0) throw new Response('Invalid revision',{status:400});
 const record=await paidProgramme(shop,customerGid,selectionId,admin);
 if(input.programmeId!==record.programmeGid||input.variantId!==record.variantGid||input.sellingPlanId) throw new Response('Programme cannot be changed',{status:422});
 const {programme,weeks}=await catalog(admin,input,shop);
 if(programme.purchasePolicy?.mode!=='period') throw new Response('Programme policy unavailable',{status:409});
 // Existing paid entitlements do not depend on stock available for a new purchase.

 return db.$transaction(async tx=>{
  const locked=await tx.mealPlanSelection.updateMany({where:{id:record.id,shop,customerGid,status:'ORDERED',selectionHash:record.selectionHash,orderGid:record.orderGid,orderLineGid:record.orderLineGid,programmeGid:record.programmeGid,variantGid:record.variantGid,startsOn:record.startsOn,endsOn:record.endsOn},data:{updatedAt:new Date()}});
  if(locked.count!==1)throw new Response('Programme changed; reload before saving',{status:409});
  const previous=await tx.mealPlanMenuRevision.findFirst({where:{shop,selectionId,block},orderBy:{revision:'desc'}});
  if((previous?.revision||0)!==revision) throw new Response('Menu changed; reload before saving',{status:409});
  const baseline=previous?JSON.parse(previous.selections):block===0?JSON.parse(record.selections):[];
  const normalized=validateProgrammeMenuBlock(input,{...programme,variant:{...programme.variant,available:true}},weeks,record.startsOn!,block,complete,Date.now(),baseline);
  return tx.mealPlanMenuRevision.create({data:{shop,customerGid,selectionId,block,revision:revision+1,state:complete?'SAVED':'DRAFT',inputSelections:JSON.stringify(input.selections),selections:JSON.stringify(normalized.windows),cutoffAt:normalized.cutoffAt}});
 });
}
