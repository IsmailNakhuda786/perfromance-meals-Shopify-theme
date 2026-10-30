import {createHash} from 'node:crypto';
import db from '../db.server';
import {programmeBookingBatchTransition} from './programme-booking-lifecycle.server';
import type {Prisma} from '@prisma/client';
import {programmeDishMenu,availableProgrammeDishes,allocateProgrammeDishes,validateProgrammeDishAllocation,assertProgrammeDishDispatch,type ProgrammeDishAllocation} from './programme-dish-allocation';
import {accountMealNames} from './account-programmes.server';
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
type Batch={basisHash:string;reference:string;weekdayMeals:number;frozenMeals:number;revision:number;createdBy:string;dispatchedBy:string|null;dispatchedAt:string|null}&({version:1}|{version:2;dishes:ProgrammeDishAllocation});
const BASIS='SIXTY_DAY_DELIVERY_BASIS',BATCH='SIXTY_DAY_DELIVERY_BATCH';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const basisId=(shop:string,id:string)=>'programme-basis:'+hash([shop,id]);
const validId=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(v);
export const programmeDeliveryEnabled=()=>process.env.NODE_ENV!=='production'&&process.env.SIXTY_DAY_BATCHES_ENABLED==='true'&&(process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID===undefined||validId(process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID));
const active=programmeDeliveryEnabled;
export const programmeDishAllocationEnabled=()=>active()&&process.env.SIXTY_DAY_DISH_ALLOCATION_ENABLED==='true';
const selectionAllowed=(id:string)=>validId(id)&&(process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID===undefined||id===process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID);
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
 if(!selectionAllowed(id))throw Error('Programme outside the approved delivery test');
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
 if(row.kind!==BATCH||!row.productionReference||row.productionReference.length>65536||!['PLANNED','DISPATCHED','CANCELLED'].includes(row.state))throw Error('Programme batch requires reconciliation');
 const b=JSON.parse(row.productionReference) as Batch;units(b.weekdayMeals,b.frozenMeals);actor(b.createdBy);
 if(row.id!=='programme-batch:'+hash([row.shop,row.selectionId,b.reference])||![1,2].includes(b.version)||b.basisHash!==basisHash||b.reference!==row.cycleReference||!validId(b.reference)||!Number.isSafeInteger(b.revision)||b.revision<1||row.state==='DISPATCHED'&&(!b.dispatchedAt||!Number.isFinite(Date.parse(b.dispatchedAt))||!b.dispatchedBy)||row.state!=='DISPATCHED'&&(b.dispatchedAt!==null||b.dispatchedBy!==null))throw Error('Programme batch evidence differs');
 if(b.version===2)validateProgrammeDishAllocation(b.dishes,basisHash,b.weekdayMeals,b.frozenMeals);
 if(b.dispatchedBy)actor(b.dispatchedBy);
 return b;
}
function progress(rows:Operation[],h:string){
 const totals={plannedWeekday:0,plannedFrozen:0,dispatchedWeekday:0,dispatchedFrozen:0};
 const batches=rows.map(row=>{const b=readBatch(row,h);if(row.state==='PLANNED'){totals.plannedWeekday+=b.weekdayMeals;totals.plannedFrozen+=b.frozenMeals;}if(row.state==='DISPATCHED'){totals.dispatchedWeekday+=b.weekdayMeals;totals.dispatchedFrozen+=b.frozenMeals;}return {id:row.id,state:row.state,...b};});
 if(totals.plannedWeekday+totals.dispatchedWeekday>88||totals.plannedFrozen+totals.dispatchedFrozen>32)throw Error('Recorded meals exceed the original entitlement');
 return {...totals,unallocatedWeekday:88-totals.plannedWeekday-totals.dispatchedWeekday,unallocatedFrozen:32-totals.plannedFrozen-totals.dispatchedFrozen,batches};
}
async function customerMenu(tx:Pick<Prisma.TransactionClient,'mealPlanMenuRevision'>,p:Programme,basisHash:string){
 const sources=[];
 for(let block=0;block<3;block++){
  const saved=await tx.mealPlanMenuRevision.findFirst({where:{shop:p.shop,selectionId:p.id,block,state:'SAVED'},orderBy:{revision:'desc'}});
  if(saved&&saved.customerGid!==p.customerGid)throw Error('Saved customer menu ownership differs');
  sources.push({block,revision:saved?.revision??0,recordId:saved?.id??null,selections:saved?.selections??(block===0?p.selections:'[]')});
 }
 return programmeDishMenu(basisHash,p.startsOn!,sources);
}
async function verifyMealReferences(admin:Admin,dishes:ProgrammeDishAllocation){
 const ids=[...new Set(dishes.picks.map(p=>p.productGid))];
 const names=await accountMealNames({graphql:async(q,o)=>{const response=await admin.graphql(q,o);if(!response.ok)throw Error('Selected meal catalogue unavailable');return response;}},ids);
 if(ids.some(id=>!names.get(id)?.trim()))throw Error('Selected meal details unavailable; Support review required');
}
async function lockCustomerMenu(tx:Prisma.TransactionClient,p:Programme){
 const locked=await tx.mealPlanSelection.updateMany({where:{id:p.id,shop:p.shop,customerGid:p.customerGid,status:'ORDERED',selectionHash:p.selectionHash},data:{updatedAt:new Date()}});
 if(locked.count!==1)throw Error('Original customer menu changed');
}
function sameDishRequest(input:unknown,dishes:ProgrammeDishAllocation){
 if(!Array.isArray(input)||input.length!==dishes.picks.length||input.some(p=>!p||Object.keys(p).sort().join(',')!=='quantity,sourceKey'))return false;
 const normalized=(rows:Array<{sourceKey:string;quantity:number}>)=>JSON.stringify(rows.map(p=>[p.sourceKey,p.quantity]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
 return normalized(input)===normalized(dishes.picks);
}
export async function readProgrammeDishChoices(admin:Admin,shop:string,selectionId:string){
 scope(shop);if(!programmeDishAllocationEnabled())return {available:false as const};
 const p=await programme(shop,selectionId),b=basis(p);await nativePurchase(admin,p);
 const rows=await db.planOperation.findMany({where:{shop,selectionId:p.id,kind:BATCH},take:251});if(rows.length>250)throw Error('Programme batch history requires review');
 const parent=await db.planOperation.findUnique({where:{id:basisId(shop,p.id)}});if(parent&&(parent.shop!==shop||parent.selectionId!==p.id||parent.kind!==BASIS||parent.state!=='ACTIVE'||parent.cycleReference!==b.hash||parent.productionReference!==JSON.stringify(b.value)))throw Error('Programme entitlement basis requires review');
 const history=progress(rows,b.hash).batches,menu=await customerMenu(db,p,b.hash);
 return {available:true as const,menuHash:menu.menuHash,choices:availableProgrammeDishes(menu,history)};
}
// Core records physical meal batches. A native programme unit is never treated
// as one meal, nor as proof that all120 meals have been sent. No native order,
// billing, refund, inventory or payment API is mutated by these operations.
export async function planProgrammeDeliveryBatch(admin:Admin,input:{shop:string;selectionId:string;reference:string;weekdayMeals:number;frozenMeals:number;actor:string;menuHash?:string;dishes?:unknown}){
 scope(input.shop);actor(input.actor);const dishMode=programmeDishAllocationEnabled();if(!dishMode){units(input.weekdayMeals,input.frozenMeals);if(input.dishes!==undefined||input.menuHash!==undefined)throw Error('Dish allocation is not activated');}
 if(!validId(input.reference))throw Error('Use a unique delivery reference with letters, numbers or hyphens');
 const p=await programme(input.shop,input.selectionId),b=basis(p);await nativePurchase(admin,p);
 const id='programme-batch:'+hash([input.shop,p.id,input.reference]);
 return db.$transaction(async tx=>{
  const parent=await tx.planOperation.upsert({where:{id:basisId(input.shop,p.id)},create:{id:basisId(input.shop,p.id),shop:input.shop,selectionId:p.id,kind:BASIS,state:'ACTIVE',cycleReference:b.hash,productionReference:JSON.stringify(b.value)},update:{updatedAt:new Date()}});
  if(parent.kind!==BASIS||parent.state!=='ACTIVE'||parent.cycleReference!==b.hash||parent.productionReference!==JSON.stringify(b.value))throw Error('Programme entitlement basis changed');
  if(dishMode)await lockCustomerMenu(tx,p);
  const current=await tx.mealPlanSelection.findUniqueOrThrow({where:{id:p.id}});if(basis(current).hash!==b.hash)throw Error('Programme changed during allocation');
  const rows=await tx.planOperation.findMany({where:{shop:input.shop,selectionId:p.id,kind:BATCH},take:251});if(rows.length>250)throw Error('Programme batch history requires review');
  const before=progress(rows,b.hash),existing=rows.find(row=>row.id===id);
  if(existing){const old=readBatch(existing,b.hash);if(existing.state==='CANCELLED'||(dishMode?(old.version!==2||input.menuHash!==old.dishes.menuHash||!sameDishRequest(input.dishes,old.dishes)):(old.version!==1||old.weekdayMeals!==input.weekdayMeals||old.frozenMeals!==input.frozenMeals)))throw Error('Delivery reference already describes another or cancelled batch');return {id,replayed:true,...before};}
  const dishes=dishMode?allocateProgrammeDishes(await customerMenu(tx,current,b.hash),before.batches,input.menuHash??'',input.dishes):null;
  if(dishes)await verifyMealReferences(admin,dishes);
  const weekdayMeals=dishes?dishes.picks.filter(p=>p.kind==='weekday').reduce((n,p)=>n+p.quantity,0):input.weekdayMeals,frozenMeals=dishes?dishes.picks.filter(p=>p.kind==='frozen').reduce((n,p)=>n+p.quantity,0):input.frozenMeals;units(weekdayMeals,frozenMeals);
  if(before.unallocatedWeekday<weekdayMeals||before.unallocatedFrozen<frozenMeals)throw Error('Not enough unallocated meals remain');
  const snapshot:Batch={...(dishes?{version:2 as const,dishes}:{version:1 as const}),basisHash:b.hash,reference:input.reference,weekdayMeals,frozenMeals,revision:1,createdBy:input.actor,dispatchedBy:null,dispatchedAt:null};
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
  await lockCustomerMenu(tx,p);
  const current=await tx.mealPlanSelection.findUniqueOrThrow({where:{id:p.id}});if(basis(current).hash!==b.hash)throw Error('Programme changed during confirmation');
  const row=await tx.planOperation.findFirst({where:{id:input.batchId,shop:input.shop,selectionId:p.id,kind:BATCH}});if(!row)throw Error('Owned programme batch unavailable');
  const old=readBatch(row,b.hash),target=input.action==='dispatch'?'DISPATCHED':'CANCELLED';
  if(row.state===target&&old.revision===input.revision+1)return {id:row.id,state:row.state,replayed:true};
  if(row.state!=='PLANNED'||old.revision!==input.revision)throw Error('Delivery batch changed; dispatched meals cannot be cancelled or restored automatically');
  if(target==='DISPATCHED'&&old.version===2){if(!programmeDishAllocationEnabled())throw Error('Dish allocation is not activated');const rows=await tx.planOperation.findMany({where:{shop:input.shop,selectionId:p.id,kind:BATCH},take:251});if(rows.length>250)throw Error('Programme batch history requires review');const history=progress(rows,b.hash).batches.filter(x=>x.id!==row.id);assertProgrammeDishDispatch(await customerMenu(tx,current,b.hash),history,old.dishes);await verifyMealReferences(admin,old.dishes);}
  await programmeBookingBatchTransition(tx,{shop:input.shop,customerGid:p.customerGid,batchId:row.id,target});
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
 assertShop(shop);if(!active()||!selectionAllowed(selectionId))return {available:false as const};
 const p=await db.mealPlanSelection.findFirst({where:{id:selectionId,shop,customerGid,status:'ORDERED'}});if(!p)return {available:false as const};
 try{const b=basis(p),parent=await db.planOperation.findUnique({where:{id:basisId(shop,p.id)}});if(!parent)return {available:false as const,notStarted:true};if(parent.kind!==BASIS||parent.shop!==shop||parent.selectionId!==p.id||parent.state!=='ACTIVE'||parent.cycleReference!==b.hash||parent.productionReference!==JSON.stringify(b.value))return {available:false as const,reviewRequired:true};
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

// Merchant list for general development activation; a configured QA selection
// still narrows every page and mutation. Native paid proof remains mandatory
// at allocation/dispatch, not inferred from these saved labels.
export async function listProgrammeDeliverySelections(shop:string,options:{after?:string;limit?:number}={}){
 scope(shop);const limit=options.limit??25;
 if(!Number.isSafeInteger(limit)||limit<1||limit>50||options.after!==undefined&&!selectionAllowed(options.after))throw Error('Invalid programme page');
 const where={shop,status:'ORDERED',businessStream:'meal_plan',sellingPlanGid:null,contractGid:null,startsOn:{not:null},endsOn:{not:null},...(process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID?{id:process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID}:{})};
 const cursor=options.after?await db.mealPlanSelection.findFirst({where:{...where,id:options.after}}):null;
 if(options.after&&!cursor)throw Error('Programme page unavailable');
 const rows=await db.mealPlanSelection.findMany({where:{...where,...(cursor?{OR:[{createdAt:{lt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{lt:cursor.id}}]}:{})},orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit+1});
 return {programmes:rows.slice(0,limit),nextCursor:rows.length>limit?rows[limit-1].id:null};
}

// Server-only evidence for the independent booking layer. A booking cannot
// turn a count-only/legacy batch into an approved customer dish allocation.
export async function verifiedProgrammeBookingBatch(admin:Admin,shop:string,selectionId:string,batchId:string){
 scope(shop);if(!programmeDishAllocationEnabled())throw Error('Dish allocation is not activated');
 const p=await programme(shop,selectionId),b=basis(p);await nativePurchase(admin,p);
 const parent=await db.planOperation.findUnique({where:{id:basisId(shop,p.id)}});
 if(!parent||parent.shop!==shop||parent.selectionId!==p.id||parent.kind!==BASIS||parent.state!=='ACTIVE'||parent.cycleReference!==b.hash||parent.productionReference!==JSON.stringify(b.value))throw Error('Original delivery basis unavailable');
 const rows=await db.planOperation.findMany({where:{shop,selectionId:p.id,kind:BATCH},take:251});if(rows.length>250)throw Error('Programme history incomplete');
 const batches=progress(rows,b.hash).batches,row=rows.find(x=>x.id===batchId),batch=batches.find(x=>x.id===batchId);
 if(!row||!batch||batch.state!=='PLANNED'||batch.version!==2)throw Error('Only an owned unsent dish batch can be booked');
 assertProgrammeDishDispatch(await customerMenu(db,p,b.hash),batches.filter(x=>x.id!==batchId),batch.dishes);await verifyMealReferences(admin,batch.dishes);
 return {programme:p,parent,row,batchHash:hash([p.id,b.hash,row.productionReference])};
}
