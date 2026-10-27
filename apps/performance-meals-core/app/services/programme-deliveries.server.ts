import {createHash} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {savedSixtyDayEntitlement} from './programme-period';

export const PROGRAMME_DELIVERY_ORDER_QUERY=`#graphql
query CoreProgrammeDeliveryOrder($id:ID!){
 shop{myshopifyDomain}
 order(id:$id){id name test cancelledAt displayFinancialStatus customer{id}
  lineItems(first:100){nodes{id quantity currentQuantity variant{id product{id}}}pageInfo{hasNextPage}}
  fulfillmentsCount{count precision}
 }
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Programme=NonNullable<Awaited<ReturnType<typeof db.mealPlanSelection.findUnique>>>;
type Operation=NonNullable<Awaited<ReturnType<typeof db.planOperation.findUnique>>>;
type Batch={version:1;basisHash:string;reference:string;weekdayMeals:number;frozenMeals:number;revision:number;createdBy:string;dispatchedBy:string|null;dispatchedAt:string|null};
const BASIS='SIXTY_DAY_DELIVERY_BASIS',BATCH='SIXTY_DAY_DELIVERY_BATCH';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const basisId=(shop:string,id:string)=>'programme-basis:'+hash([shop,id]);
const validId=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(v);
const active=()=>process.env.NODE_ENV!=='production'&&process.env.SIXTY_DAY_BATCHES_ENABLED==='true';
function scope(shop:string){assertShop(shop);if(!active())throw Error('Programme delivery batches are not activated');}
function actor(v:string){if(!/^shopify-admin:[a-f0-9]{64}$/.test(v))throw Error('Authenticated delivery operator required');}
function units(a:number,b:number){if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<0||b<0||a+b<1||a>88||b>32)throw Error('Enter whole meal quantities within the purchased entitlement');}
function basis(p:Programme){
 const entitlement=savedSixtyDayEntitlement(p.entitlement,p.startsOn,p.endsOn);
 if(!entitlement||p.status!=='ORDERED'||p.sellingPlanGid||p.contractGid||p.businessStream!=='meal_plan'||!p.orderGid||!p.orderLineGid)throw Error('A verified original 60-day entitlement is required; legacy records need review');
 const value={version:1,shop:p.shop,customerGid:p.customerGid,selectionId:p.id,programmeGid:p.programmeGid,variantGid:p.variantGid,orderGid:p.orderGid,orderLineGid:p.orderLineGid,selectionHash:p.selectionHash,entitlement};
 return {value,hash:hash(value)};
}
async function programme(shop:string,id:string){
 if(!validId(id))throw Error('Invalid programme identity');
 const p=await db.mealPlanSelection.findFirst({where:{id,shop}});
 if(!p)throw Error('Programme unavailable');
 basis(p);return p;
}
async function nativePurchase(admin:Admin,p:Programme){
 const line=await db.operationalLine.findFirst({where:{shop:p.shop,selectionId:p.id,customerGid:p.customerGid,orderGid:p.orderGid!,orderLineGid:p.orderLineGid!,productGid:p.programmeGid,variantGid:p.variantGid,businessStream:'meal_plan',validationStatus:'VALIDATED',contractGid:null}});
 if(!line||!['UNASSIGNED','DISPATCHED'].includes(line.fulfillmentState))throw Error('Original programme routing requires review');
 const response=await admin.graphql(PROGRAMME_DELIVERY_ORDER_QUERY,{variables:{id:p.orderGid}}),body=await response.json(),o=body.data?.order;
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==p.shop||o?.id!==p.orderGid||o.test!==true||o.customer?.id!==p.customerGid||o.cancelledAt!==null||o.displayFinancialStatus!=='PAID'||!Array.isArray(o.lineItems?.nodes)||o.lineItems.pageInfo?.hasNextPage!==false||o.fulfillmentsCount?.precision!=='EXACT'||!Number.isSafeInteger(o.fulfillmentsCount.count)||o.fulfillmentsCount.count<0)throw Error('Complete paid programme proof unavailable');
 const lines=o.lineItems.nodes.filter((l:{id:string})=>l.id===p.orderLineGid);
 if(lines.length!==1||lines[0].quantity!==1||lines[0].currentQuantity!==1||lines[0].variant?.id!==p.variantGid||lines[0].variant?.product?.id!==p.programmeGid)throw Error('Native programme purchase quantity or identity differs');
 if(o.fulfillmentsCount.count!==0)throw Error('Native dispatch outside the Core batch record requires reconciliation');
 return line;
}
function readBatch(row:Operation,basisHash:string):Batch{
 if(row.kind!==BATCH||!row.productionReference||row.productionReference.length>4096||!['PLANNED','DISPATCHED','CANCELLED'].includes(row.state))throw Error('Programme batch requires reconciliation');
 const b=JSON.parse(row.productionReference) as Batch;units(b.weekdayMeals,b.frozenMeals);actor(b.createdBy);
 if(b.version!==1||b.basisHash!==basisHash||b.reference!==row.cycleReference||!validId(b.reference)||!Number.isSafeInteger(b.revision)||b.revision<1||row.state==='DISPATCHED'&&(!b.dispatchedAt||!Number.isFinite(Date.parse(b.dispatchedAt))||!b.dispatchedBy)||row.state!=='DISPATCHED'&&(b.dispatchedAt!==null||b.dispatchedBy!==null))throw Error('Programme batch evidence differs');
 if(b.dispatchedBy)actor(b.dispatchedBy);
 return b;
}
function progress(rows:Operation[],h:string){
 const totals={plannedWeekday:0,plannedFrozen:0,dispatchedWeekday:0,dispatchedFrozen:0};
 const batches=rows.map(row=>{const b=readBatch(row,h);if(row.state==='PLANNED'){totals.plannedWeekday+=b.weekdayMeals;totals.plannedFrozen+=b.frozenMeals;}if(row.state==='DISPATCHED'){totals.dispatchedWeekday+=b.weekdayMeals;totals.dispatchedFrozen+=b.frozenMeals;}return {id:row.id,state:row.state,...b};});
 if(totals.plannedWeekday+totals.dispatchedWeekday>88||totals.plannedFrozen+totals.dispatchedFrozen>32)throw Error('Recorded meals exceed the original entitlement');
 return {...totals,unallocatedWeekday:88-totals.plannedWeekday-totals.dispatchedWeekday,unallocatedFrozen:32-totals.plannedFrozen-totals.dispatchedFrozen,batches};
}
// Core records physical meal batches. A native programme unit is never treated
// as one meal, nor as proof that all120 meals have been sent. No native order,
// billing, refund, inventory or payment API is mutated by these operations.
export async function planProgrammeDeliveryBatch(admin:Admin,input:{shop:string;selectionId:string;reference:string;weekdayMeals:number;frozenMeals:number;actor:string}){
 scope(input.shop);actor(input.actor);units(input.weekdayMeals,input.frozenMeals);
 if(!validId(input.reference))throw Error('Use a unique delivery reference with letters, numbers or hyphens');
 const p=await programme(input.shop,input.selectionId),b=basis(p);await nativePurchase(admin,p);
 const id='programme-batch:'+hash([input.shop,p.id,input.reference]);
 return db.$transaction(async tx=>{
  const parent=await tx.planOperation.upsert({where:{id:basisId(input.shop,p.id)},create:{id:basisId(input.shop,p.id),shop:input.shop,selectionId:p.id,kind:BASIS,state:'ACTIVE',cycleReference:b.hash,productionReference:JSON.stringify(b.value)},update:{updatedAt:new Date()}});
  if(parent.kind!==BASIS||parent.state!=='ACTIVE'||parent.cycleReference!==b.hash||parent.productionReference!==JSON.stringify(b.value))throw Error('Programme entitlement basis changed');
  const current=await tx.mealPlanSelection.findUniqueOrThrow({where:{id:p.id}});if(basis(current).hash!==b.hash)throw Error('Programme changed during allocation');
  const rows=await tx.planOperation.findMany({where:{shop:input.shop,selectionId:p.id,kind:BATCH},take:251});if(rows.length>250)throw Error('Programme batch history requires review');
  const before=progress(rows,b.hash),existing=rows.find(row=>row.id===id);
  if(existing){const old=readBatch(existing,b.hash);if(existing.state==='CANCELLED'||old.weekdayMeals!==input.weekdayMeals||old.frozenMeals!==input.frozenMeals)throw Error('Delivery reference already describes another or cancelled batch');return {id,replayed:true,...before};}
  if(before.unallocatedWeekday<input.weekdayMeals||before.unallocatedFrozen<input.frozenMeals)throw Error('Not enough unallocated meals remain');
  const snapshot:Batch={version:1,basisHash:b.hash,reference:input.reference,weekdayMeals:input.weekdayMeals,frozenMeals:input.frozenMeals,revision:1,createdBy:input.actor,dispatchedBy:null,dispatchedAt:null};
  const row=await tx.planOperation.create({data:{id,shop:input.shop,selectionId:p.id,kind:BATCH,state:'PLANNED',cycleReference:input.reference,productionReference:JSON.stringify(snapshot)}});
  return {id,replayed:false,...progress([...rows,row],b.hash)};
 },{timeout:30000});
}
export async function changeProgrammeDeliveryBatch(admin:Admin,input:{shop:string;selectionId:string;batchId:string;revision:number;action:'dispatch'|'cancel';actor:string},now=new Date()){
 scope(input.shop);actor(input.actor);
 if(!Number.isFinite(now.getTime())||!Number.isSafeInteger(input.revision)||input.revision<1||!['dispatch','cancel'].includes(input.action))throw Error('Invalid delivery confirmation');
 const p=await programme(input.shop,input.selectionId),b=basis(p),line=await nativePurchase(admin,p);
 return db.$transaction(async tx=>{
  const lock=await tx.planOperation.updateMany({where:{id:basisId(input.shop,p.id),shop:input.shop,kind:BASIS,state:'ACTIVE',cycleReference:b.hash,productionReference:JSON.stringify(b.value)},data:{updatedAt:new Date()}});if(lock.count!==1)throw Error('Original delivery basis unavailable');
  const current=await tx.mealPlanSelection.findUniqueOrThrow({where:{id:p.id}});if(basis(current).hash!==b.hash)throw Error('Programme changed during confirmation');
  const row=await tx.planOperation.findFirst({where:{id:input.batchId,shop:input.shop,selectionId:p.id,kind:BATCH}});if(!row)throw Error('Owned programme batch unavailable');
  const old=readBatch(row,b.hash),target=input.action==='dispatch'?'DISPATCHED':'CANCELLED';
  if(row.state===target&&old.revision===input.revision+1)return {id:row.id,state:row.state,replayed:true};
  if(row.state!=='PLANNED'||old.revision!==input.revision)throw Error('Delivery batch changed; dispatched meals cannot be cancelled or restored automatically');
  const next={...old,revision:old.revision+1,...(target==='DISPATCHED'?{dispatchedAt:now.toISOString(),dispatchedBy:input.actor}:{})};
  const changed=await tx.planOperation.updateMany({where:{id:row.id,shop:input.shop,state:'PLANNED',productionReference:row.productionReference},data:{state:target,productionReference:JSON.stringify(next)}});if(changed.count!==1)throw Error('Delivery batch changed');
  if(target==='DISPATCHED'){
   const mark=await tx.operationalLine.updateMany({where:{id:line.id,shop:input.shop,selectionId:p.id,validationStatus:'VALIDATED',fulfillmentState:{in:['UNASSIGNED','DISPATCHED']}},data:{fulfillmentState:'DISPATCHED'}});if(mark.count!==1)throw Error('Programme dispatch binding changed');
  }
  const rows=await tx.planOperation.findMany({where:{shop:input.shop,selectionId:p.id,kind:BATCH},take:251});if(rows.length>250)throw Error('Programme batch history requires review');progress(rows,b.hash);
  return {id:row.id,state:target,replayed:false};
 },{timeout:30000});
}
export async function programmeDeliveryProgress(shop:string,customerGid:string,selectionId:string){
 assertShop(shop);if(!active())return {available:false as const};
 const p=await db.mealPlanSelection.findFirst({where:{id:selectionId,shop,customerGid,status:'ORDERED'}});if(!p)return {available:false as const};
 try{const b=basis(p),parent=await db.planOperation.findUnique({where:{id:basisId(shop,p.id)}});if(!parent)return {available:false as const,notStarted:true};if(parent.state!=='ACTIVE'||parent.cycleReference!==b.hash||parent.productionReference!==JSON.stringify(b.value))return {available:false as const,reviewRequired:true};
  const rows=await db.planOperation.findMany({where:{shop,selectionId:p.id,kind:BATCH},orderBy:{createdAt:'asc'},take:251});if(rows.length>250)throw Error('Batch history incomplete');
  return {available:true as const,totalWeekday:88,totalFrozen:32,...progress(rows,b.hash),source:'CORE_DELIVERY_BATCHES' as const};
 }catch{return {available:false as const,reviewRequired:true};}
}

// Customer responses contain meal counts and dispatch dates, never operator identities.
export async function customerProgrammeDeliveryProgress(shop:string,customerGid:string,selectionId:string){
 const result=await programmeDeliveryProgress(shop,customerGid,selectionId);
 if(!result.available)return result;
 return {...result,batches:result.batches.map(({weekdayMeals,frozenMeals,state,dispatchedAt})=>({weekdayMeals,frozenMeals,state,dispatchedAt}))};
}
