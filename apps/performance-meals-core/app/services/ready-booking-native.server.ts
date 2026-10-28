import {createHash} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {readPrepaidScheduleSource} from './prepaid-schedule.server';
import {readReadyDeliveryEntitlement} from './ready-delivery-entitlement.server';

type Admin=Parameters<typeof readPrepaidScheduleSource>[0];
export type ReadyBookingMember={operationalLineId:string;occurrence:number;deliveries:3|6;packages:number;purchaseEvidenceId:string;renewalEvidenceId:string|null;purchaseHash:string;orderLineGid:string;productGid:string;variantGid:string};
export type ReadyBookingSource={key:string;orderName:string;shop:string;customerGid:string;orderGid:string;fulfillmentOrderGid:string;workStartsAt:string;destinationKey:string;members:ReadyBookingMember[]};
export const bookingHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const gid=(kind:string,v:unknown):v is string=>typeof v==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(v);
type PaidLine=Omit<ReadyBookingMember,'occurrence'|'deliveries'>&{months:3|6};
type Item={id:string;totalQuantity:number;remainingQuantity:number;lineItem:{id:string}};
type Parent={id:string;order:{id:string};status:string;fulfillAt:string|null;lineItems:{nodes:Item[]};deliveryMethod?:{methodType:string}|null;destination?:{id:string;address1:string|null;address2:string|null;city:string|null;company:string|null;countryCode:string|null;province:string|null;zip:string|null}|null};
type Source={order:{id:string;name:string;customer:{id:string};displayFinancialStatus:string;lineItems:{nodes:Array<{id:string;quantity:number;currentQuantity:number;variant?:{id:string;product:{id:string}}|null}>}};fulfillments:Parent[]};

// Native work-start timestamps order the purchased occurrences. They are never
// presented as customer delivery promises or silently rewritten by Core.
export function readyBookingGroups(source:Source,shop:string,customerGid:string,orderGid:string,paid:PaidLine[]):ReadyBookingSource[]{
 assertShop(shop);
 if(!gid('Customer',customerGid)||!gid('Order',orderGid)||source.order.id!==orderGid||source.order.customer?.id!==customerGid||source.order.displayFinancialStatus!=='PAID'||!paid.length||paid.length>100||new Set(paid.map(p=>p.orderLineGid)).size!==paid.length)throw Error('Complete owned paid delivery evidence required');
 const parents=source.fulfillments;
 if(!Array.isArray(parents)||parents.length>100||new Set(parents.map(p=>p.id)).size!==parents.length)throw Error('Ambiguous native delivery coverage');
 for(const parent of parents){if(!gid('FulfillmentOrder',parent.id)||parent.order?.id!==orderGid||!Array.isArray(parent.lineItems?.nodes)||!parent.lineItems.nodes.length||parent.lineItems.nodes.length>250||new Set(parent.lineItems.nodes.map(i=>i.id)).size!==parent.lineItems.nodes.length||new Set(parent.lineItems.nodes.map(i=>i.lineItem?.id)).size!==parent.lineItems.nodes.length)throw Error('Invalid native fulfilment coverage');for(const item of parent.lineItems.nodes)if(!gid('FulfillmentOrderLineItem',item.id)||!gid('LineItem',item.lineItem?.id)||!Number.isSafeInteger(item.totalQuantity)||item.totalQuantity<1||!Number.isSafeInteger(item.remainingQuantity)||item.remainingQuantity<0||item.remainingQuantity>item.totalQuantity)throw Error('Invalid native fulfilment quantities');}
 const nativeLines=source.order.lineItems.nodes;
 const members=new Map<string,ReadyBookingMember[]>();
 for(const p of paid){
  if(![3,6].includes(p.months)||!Number.isSafeInteger(p.packages)||p.packages<1||p.packages*p.months>2147483647)throw Error('Invalid purchased delivery quantity');
  const native=nativeLines.filter(l=>l.id===p.orderLineGid);
  if(native.length!==1||native[0].quantity!==p.months*p.packages||native[0].currentQuantity!==native[0].quantity||native[0].variant?.id!==p.variantGid||native[0].variant?.product.id!==p.productGid)throw Error('Original paid native line changed');
  const occurrences=parents.filter(parent=>parent.lineItems.nodes.some(i=>i.lineItem.id===p.orderLineGid));
  if(occurrences.length!==p.months)throw Error('Native delivery count differs from the purchased term');
  for(const parent of occurrences){
   if(!gid('FulfillmentOrder',parent.id)||parent.order.id!==orderGid||!parent.fulfillAt||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(parent.fulfillAt)||!Number.isFinite(Date.parse(parent.fulfillAt))||new Date(parent.fulfillAt).toISOString().slice(0,19)!==parent.fulfillAt.slice(0,19))throw Error('Exact native work schedule required');
   const items=parent.lineItems.nodes.filter(i=>i.lineItem.id===p.orderLineGid);
   if(items.length!==1||!gid('FulfillmentOrderLineItem',items[0].id)||items[0].totalQuantity!==p.packages||!Number.isSafeInteger(items[0].remainingQuantity)||items[0].remainingQuantity<0||items[0].remainingQuantity>items[0].totalQuantity)throw Error('Native delivery quantity differs');
  }
  occurrences.sort((a,b)=>a.fulfillAt!.localeCompare(b.fulfillAt!)||a.id.localeCompare(b.id));
  if(new Set(occurrences.map(o=>o.fulfillAt)).size!==occurrences.length)throw Error('Ambiguous native occurrence ordering');
  for(const [index,parent]of occurrences.entries()){
   const list=members.get(parent.id)??[];list.push({operationalLineId:p.operationalLineId,occurrence:index+1,deliveries:p.months,packages:p.packages,purchaseEvidenceId:p.purchaseEvidenceId,renewalEvidenceId:p.renewalEvidenceId,purchaseHash:p.purchaseHash,orderLineGid:p.orderLineGid,productGid:p.productGid,variantGid:p.variantGid});members.set(parent.id,list);
  }
 }
 const groups:ReadyBookingSource[]=[];
 for(const parent of parents){
  const lines=members.get(parent.id);
  if(!lines||!['OPEN','SCHEDULED'].includes(parent.status)||parent.lineItems.nodes.some(i=>i.remainingQuantity!==i.totalQuantity)||parent.lineItems.nodes.length!==lines.length||parent.lineItems.nodes.some(i=>!lines.some(m=>m.orderLineGid===i.lineItem.id)))continue;
  const d=parent.destination;
  if(!d||!gid('FulfillmentOrderDestination',d.id)||!['SHIPPING','LOCAL'].includes(parent.deliveryMethod?.methodType??'')||d.countryCode!=='SG'||!d.address1?.trim()||!/^\d{6}$/.test(d.zip??''))throw Error('Complete Singapore destination required');
  const fields=[d.address1,d.address2,d.city,d.company,d.countryCode,d.province,d.zip];
  if(fields.some(v=>v!==null&&(typeof v!=='string'||v.length>1024)))throw Error('Invalid native destination');
  groups.push({key:bookingHash([shop,orderGid,parent.id]),orderName:source.order.name,shop,customerGid,orderGid,fulfillmentOrderGid:parent.id,workStartsAt:new Date(parent.fulfillAt!).toISOString(),destinationKey:bookingHash([shop,customerGid,orderGid,JSON.stringify(fields)]),members:lines.sort((a,b)=>a.operationalLineId.localeCompare(b.operationalLineId))});
 }
 return groups;
}

export async function readOwnedReadyBookingSources(admin:Admin,shop:string,customerGid:string,orderGid:string){
 assertShop(shop);
 if(!gid('Customer',customerGid)||!gid('Order',orderGid))throw Error('Owned order required');
 const linked=await db.operationalLine.findMany({where:{shop,customerGid,orderGid,businessStream:'ready_series',validationStatus:'VALIDATED',contractGid:{not:null},fulfillmentState:{in:['UNASSIGNED','DISPATCHED']}},take:101});
 if(!linked.length||linked.length>100)throw Error('Owned paid package lines unavailable');
 const paid:PaidLine[]=[];let appGid:string|undefined;
 for(const line of linked){
  const e=await readReadyDeliveryEntitlement(db,shop,customerGid,line);
  const original=await db.prepaidPurchaseEvidence.findUniqueOrThrow({where:{id:e.purchaseEvidenceId}}),snapshot=JSON.parse(original.snapshot),app=snapshot.expected?.appGid;
  if(!gid('App',app)||appGid&&appGid!==app)throw Error('Original payment application differs');appGid=app;
  if(!line.productGid||!line.variantGid)throw Error('Original native product mapping required');
  paid.push({operationalLineId:line.id,months:e.months,packages:e.packages,purchaseEvidenceId:original.id,renewalEvidenceId:e.renewalEvidenceId,purchaseHash:original.snapshotHash,orderLineGid:line.orderLineGid,productGid:line.productGid,variantGid:line.variantGid});
 }
 const native=await readPrepaidScheduleSource(admin,shop,{appGid:appGid!,customerGid,orderGid});
 return readyBookingGroups(native,shop,customerGid,orderGid,paid);
}
