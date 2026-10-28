import type {Prisma} from '@prisma/client';
import db from '../db.server';
import {assertShop} from './security.server';
import {bookingHash,readOwnedReadyBookingSources,type ReadyBookingSource} from './ready-booking-native.server';
import {readyBookingActive,readyHolidayCalendar,readyBookingSlotAllowed,readyBookingSlotScope} from './ready-booking-policy.server';
import {nextReadySeriesDeliverySlot,planReadySeriesDeliveries} from './ready-series-calendar';
import {stageReadyDeliveryRemindersTx} from './ready-delivery-draft.server';
import {readReadyRenewalCycle} from './ready-renewal-cycle.server';
import {readRegisteredPrepaidPurchase} from './prepaid-renewal-evidence.server';
type Admin=Parameters<typeof readOwnedReadyBookingSources>[0];
type RenewalBinding={operationalLineId:string;purchaseEvidenceId:string;renewalEvidenceId:string;purchaseHash:string;originalCalendarHash:string;anchor:string;cycle:Awaited<ReturnType<typeof readReadyRenewalCycle>>};
type Calendar={version:1;shop:string;customerGid:string;orderGid:string;anchor:string;policyRevision:number;sources:Array<{key:string;nativeHash:string}>;drafts:Array<{operationalLineId:string;occurrence:number;deliveryAt:string}>;renewalBindings?:RenewalBinding[]};
const calendarId=(shop:string,orderGid:string)=>'ready-calendar:'+bookingHash([shop,orderGid]);
const civil=(at:Date)=>new Date(at.getTime()+8*3600000).toISOString().slice(0,10);
async function renewalBinding(admin:Admin,shop:string,customerGid:string,orderGid:string,m:ReadyBookingSource['members'][number]):Promise<RenewalBinding>{
 const purchase=await db.prepaidPurchaseEvidence.findFirstOrThrow({where:{id:m.purchaseEvidenceId,shop,customerGid}}),original=readRegisteredPrepaidPurchase(purchase);
 const renewal=await db.prepaidRenewalEvidence.findFirstOrThrow({where:{id:m.renewalEvidenceId!,shop,customerGid,purchaseEvidenceId:purchase.id,contractGid:purchase.contractGid,renewalOrderGid:orderGid,state:'COMPLETED'}});
 const r=JSON.parse(renewal.snapshot),e=r.expected;
 // Reuse immutable financial evidence; this path never registers a payment.
 const {createHash}=await import('node:crypto');
 if(!renewal.completedAt||createHash('sha256').update(renewal.snapshot).digest('hex')!==renewal.snapshotHash||r.version!==1||r.purchaseHash!==purchase.snapshotHash||purchase.snapshotHash!==m.purchaseHash||e?.attemptGid!==renewal.attemptGid||e.renewalOrderGid!==orderGid||e.renewalOrderLineGid!==m.orderLineGid||!Object.entries(original.expected).every(([k,v])=>JSON.stringify(e[k])===JSON.stringify(v))||original.expected.months!==m.deliveries||(original.expected.packageQuantity??1)!==m.packages)throw Error('Renewal calendar payment binding differs');
 const line=await db.operationalLine.findFirstOrThrow({where:{shop,customerGid,orderGid:purchase.originalOrderGid,orderLineGid:purchase.originalLineGid,contractGid:purchase.contractGid,businessStream:'ready_series',validationStatus:'VALIDATED'}});
 const calendar=await readReadyBookingCalendar(db,shop,customerGid,purchase.originalOrderGid);
 const drafts=calendar.drafts.filter(d=>d.operationalLineId===line.id);
 if(calendar.renewalBindings?.length||drafts.length!==m.deliveries||new Set(drafts.map(d=>d.occurrence)).size!==m.deliveries||drafts.some(d=>d.occurrence<1||d.occurrence>m.deliveries))throw Error('Original purchased calendar anchor requires reconciliation');
 const cycle=await readReadyRenewalCycle(admin,shop,{contractGid:purchase.contractGid,attemptGid:renewal.attemptGid,idempotencyKey:e.idempotencyKey,originalOrderGid:purchase.originalOrderGid,renewalOrderGid:orderGid,appGid:original.expected.appGid,customerGid,months:m.deliveries});
 return {operationalLineId:m.operationalLineId,purchaseEvidenceId:purchase.id,renewalEvidenceId:renewal.id,purchaseHash:purchase.snapshotHash,originalCalendarHash:bookingHash(calendar),anchor:calendar.anchor,cycle};
}
export async function readReadyBookingCalendar(tx:Prisma.TransactionClient,shop:string,customerGid:string,orderGid:string){
 const row=await tx.planOperation.findUnique({where:{id:calendarId(shop,orderGid)}});
 if(!row||row.shop!==shop||row.kind!=='READY_DELIVERY_CALENDAR'||row.state!=='ACTIVE'||row.selectionId!=='customer:'+customerGid.split('/').at(-1)||!row.productionReference||bookingHash(JSON.parse(row.productionReference))!==row.cycleReference)throw Error('Merchant must prepare the original delivery calendar');
 const saved=JSON.parse(row.productionReference) as Calendar;
 if(saved.version!==1||saved.shop!==shop||saved.customerGid!==customerGid||saved.orderGid!==orderGid||!Array.isArray(saved.sources)||!saved.sources.length||!Array.isArray(saved.drafts)||!saved.drafts.length)throw Error('Original delivery calendar requires review');
 return saved;
}
// Authenticated merchant preparation, also reusable by the eventual verified
// paid-intake worker. It never derives a customer delivery date from fulfillAt.
// The first date is the next available merchant slot; later dates use the same
// monthly anchor with the approved short-month/closure adjustment.
export async function prepareReadyBookingCalendar(admin:Admin,shop:string,customerGid:string,orderGid:string,options:{now?:Date}={}){
 assertShop(shop);
 if(!readyBookingActive(shop,customerGid)||process.env.CORE_READY_BOOKING_QA_ORDER!==orderGid)throw Error('Delivery calendar preparation is not activated');
 const existing=await db.planOperation.findUnique({where:{id:calendarId(shop,orderGid)}});
 if(existing)return {created:false,calendar:await readReadyBookingCalendar(db,shop,customerGid,orderGid)};
 const now=options.now??new Date();if(!Number.isFinite(now.getTime()))throw Error('Verified server time required');
 const sources=await readOwnedReadyBookingSources(admin,shop,customerGid,orderGid);
 if(!sources.length)throw Error('No complete paid term available');
 const perLine=new Map<string,ReadyBookingSource['members']>();
 for(const group of sources)for(const m of group.members){const list=perLine.get(m.operationalLineId)??[];list.push(m);perLine.set(m.operationalLineId,list);}
 for(const members of perLine.values())if(members.length!==members[0].deliveries||members.some(m=>m.deliveries!==members[0].deliveries)||new Set(members.map(m=>m.occurrence)).size!==members.length||members.some(m=>m.occurrence<1||m.occurrence>m.deliveries))throw Error('Earlier delivery history needs merchant reconciliation before calendar creation');
 const terms=[...perLine.values()].map(m=>m[0].deliveries),count=Math.max(...terms) as 3|6;
 if(![3,6].includes(count))throw Error('Verified package term required');
 const policy=await db.readyDeliveryPolicy.findUniqueOrThrow({where:{shop}}),holiday=readyHolidayCalendar(JSON.parse(policy.holidayCalendar));
 const rows=await db.readyDeliverySlot.findMany({where:{...readyBookingSlotScope(shop),available:true,deliveryAt:{gt:now}},orderBy:[{deliveryAt:'asc'},{id:'asc'}],take:2001});
 if(rows.length>2000)throw Error('Merchant slot coverage requires a bounded calendar');
 const slots=rows.filter(s=>s.reserved<s.capacity&&readyBookingSlotAllowed(s.deliveryAt,holiday));
 const firstMembers=[...perLine.values()].map(m=>m[0]),renewal=firstMembers.some(m=>m.renewalEvidenceId);
 if(renewal&&firstMembers.some(m=>!m.renewalEvidenceId))throw Error('Mixed initial and renewed delivery terms require reconciliation');
 const bindings:RenewalBinding[]=[];if(renewal)for(const m of firstMembers)bindings.push(await renewalBinding(admin,shop,customerGid,orderGid,m));
 const first=renewal?null:nextReadySeriesDeliverySlot(now.toISOString(),slots.map(s=>({id:s.id,deliveryAt:s.deliveryAt.toISOString()})));
 const available=[...new Set(slots.map(s=>civil(s.deliveryAt)))],drafts:Calendar['drafts']=[];
 for(const members of perLine.values()){
  const binding=bindings.find(b=>b.operationalLineId===members[0].operationalLineId),anchor=binding?.anchor??first!.deliveryDate;
  const plan=planReadySeriesDeliveries(anchor,binding?members[0].deliveries:count,available,binding?.cycle.monthOffset??0);
  // Late recovery must not silently slide an overdue paid term onto today's
  // availability. Existing entitlements remain held for merchant reconciliation.
  if(binding&&plan.some(p=>p.nominalDate<civil(now)))throw Error('Overdue renewal delivery dates require Support reconciliation');
  for(const m of members)drafts.push({operationalLineId:m.operationalLineId,occurrence:m.occurrence,deliveryAt:slots.find(s=>civil(s.deliveryAt)===plan[m.occurrence-1].deliveryDate)!.deliveryAt.toISOString()});
 }
 for(const group of sources)if(new Set(group.members.map(m=>drafts.find(d=>d.operationalLineId===m.operationalLineId&&d.occurrence===m.occurrence)!.deliveryAt)).size!==1)throw Error('Grouped renewal calendars differ; Support must reconcile the visit');
 const value:Calendar={version:1,shop,customerGid,orderGid,anchor:first?.deliveryDate??bindings[0].anchor,policyRevision:policy.revision,sources:sources.map(s=>({key:s.key,nativeHash:bookingHash(s)})).sort((a,b)=>a.key.localeCompare(b.key)),drafts:drafts.sort((a,b)=>a.operationalLineId.localeCompare(b.operationalLineId)||a.occurrence-b.occurrence),...(renewal?{renewalBindings:bindings}:{})};
 return db.$transaction(async tx=>{
  if((await tx.readyDeliveryPolicy.updateMany({where:{shop,revision:policy.revision},data:{updatedAt:new Date()}})).count!==1)throw Error('Merchant calendar policy changed');
  const old=await tx.planOperation.findUnique({where:{id:calendarId(shop,orderGid)}});if(old)return {created:false,calendar:await readReadyBookingCalendar(tx,shop,customerGid,orderGid)};
  const verifiedUnsentLineIds=new Set(perLine.keys());
  for(const draft of value.drafts){
   if(await tx.readyDeliveryDraft.count({where:{shop,operationalLineId:draft.operationalLineId,occurrence:draft.occurrence}}))throw Error('Existing delivery dates need reconciliation; no dates overwritten');
   await stageReadyDeliveryRemindersTx(tx,{shop,customerGid,...draft,expectedRevision:0},{verifiedUnsentLineIds});
  }
  const latest=await readOwnedReadyBookingSources(admin,shop,customerGid,orderGid);
  if(bookingHash(latest.map(s=>({key:s.key,nativeHash:bookingHash(s)})).sort((a,b)=>a.key.localeCompare(b.key)))!==bookingHash(value.sources))throw Error('Native term changed during calendar preparation');
  for(const m of firstMembers.filter(m=>m.renewalEvidenceId))if(bookingHash(await renewalBinding(admin,shop,customerGid,orderGid,m))!==bookingHash(bindings.find(b=>b.operationalLineId===m.operationalLineId)))throw Error('Renewal cycle changed during preparation');
  await tx.planOperation.create({data:{id:calendarId(shop,orderGid),shop,selectionId:'customer:'+customerGid.split('/').at(-1),kind:'READY_DELIVERY_CALENDAR',state:'ACTIVE',cycleReference:bookingHash(value),productionReference:JSON.stringify(value)}});
  return {created:true,calendar:value};
 },{timeout:60000});
}
