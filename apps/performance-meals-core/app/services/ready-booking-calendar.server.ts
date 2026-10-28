import type {Prisma} from '@prisma/client';
import db from '../db.server';
import {assertShop} from './security.server';
import {bookingHash,readOwnedReadyBookingSources,type ReadyBookingSource} from './ready-booking-native.server';
import {readyBookingActive,readyHolidayCalendar,readyBookingSlotAllowed,readyBookingSlotScope} from './ready-booking-policy.server';
import {nextReadySeriesDeliverySlot,planReadySeriesDeliveries} from './ready-series-calendar';
import {stageReadyDeliveryRemindersTx} from './ready-delivery-draft.server';
type Admin=Parameters<typeof readOwnedReadyBookingSources>[0];
type Calendar={version:1;shop:string;customerGid:string;orderGid:string;anchor:string;policyRevision:number;sources:Array<{key:string;nativeHash:string}>;drafts:Array<{operationalLineId:string;occurrence:number;deliveryAt:string}>};
const calendarId=(shop:string,orderGid:string)=>'ready-calendar:'+bookingHash([shop,orderGid]);
const civil=(at:Date)=>new Date(at.getTime()+8*3600000).toISOString().slice(0,10);
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
 if(sources.some(s=>s.members.some(m=>m.renewalEvidenceId)))throw Error('A renewal calendar requires its original anchor and verified cycle; no new start date was chosen');
 const perLine=new Map<string,ReadyBookingSource['members']>();
 for(const group of sources)for(const m of group.members){const list=perLine.get(m.operationalLineId)??[];list.push(m);perLine.set(m.operationalLineId,list);}
 for(const members of perLine.values())if(members.length!==members[0].deliveries||members.some(m=>m.deliveries!==members[0].deliveries)||new Set(members.map(m=>m.occurrence)).size!==members.length||members.some(m=>m.occurrence<1||m.occurrence>m.deliveries))throw Error('Earlier delivery history needs merchant reconciliation before calendar creation');
 const terms=[...perLine.values()].map(m=>m[0].deliveries),count=Math.max(...terms) as 3|6;
 if(![3,6].includes(count))throw Error('Verified package term required');
 const policy=await db.readyDeliveryPolicy.findUniqueOrThrow({where:{shop}}),holiday=readyHolidayCalendar(JSON.parse(policy.holidayCalendar));
 const rows=await db.readyDeliverySlot.findMany({where:{...readyBookingSlotScope(shop),available:true,deliveryAt:{gt:now}},orderBy:[{deliveryAt:'asc'},{id:'asc'}],take:2001});
 if(rows.length>2000)throw Error('Merchant slot coverage requires a bounded calendar');
 const slots=rows.filter(s=>s.reserved<s.capacity&&readyBookingSlotAllowed(s.deliveryAt,holiday));
 const first=nextReadySeriesDeliverySlot(now.toISOString(),slots.map(s=>({id:s.id,deliveryAt:s.deliveryAt.toISOString()})));
 const plan=planReadySeriesDeliveries(first.deliveryDate,count,[...new Set(slots.map(s=>civil(s.deliveryAt)))]);
 const dates=plan.map(p=>slots.find(s=>civil(s.deliveryAt)===p.deliveryDate)!.deliveryAt.toISOString());
 const value:Calendar={version:1,shop,customerGid,orderGid,anchor:first.deliveryDate,policyRevision:policy.revision,sources:sources.map(s=>({key:s.key,nativeHash:bookingHash(s)})).sort((a,b)=>a.key.localeCompare(b.key)),drafts:[...perLine.values()].flatMap(m=>m.map(x=>({operationalLineId:x.operationalLineId,occurrence:x.occurrence,deliveryAt:dates[x.occurrence-1]}))).sort((a,b)=>a.operationalLineId.localeCompare(b.operationalLineId)||a.occurrence-b.occurrence)};
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
  await tx.planOperation.create({data:{id:calendarId(shop,orderGid),shop,selectionId:'customer:'+customerGid.split('/').at(-1),kind:'READY_DELIVERY_CALENDAR',state:'ACTIVE',cycleReference:bookingHash(value),productionReference:JSON.stringify(value)}});
  return {created:true,calendar:value};
 },{timeout:60000});
}
