type Member={draftId:string;revision:number;operationalLineId:string;occurrence:number;packages:number};
type VisitInput={shop:string;customerGid:string;orderGid:string;destinationKey:string;slotId:string;slotRevision:number;deliveryAt:string;deliveryEndsAt:string;members:Member[]};
const identity=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const positive=(v:number)=>Number.isSafeInteger(v)&&v>0&&v<=2147483647;
function instant(v:string){
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('Verified delivery window required');
 return Date.parse(v);
}
// Internal planning only. The caller must verify every member belongs to this
// paid order, owner, exact destination and slot. destinationKey is a server-side
// address identity, never a customer-provided address or inferred match. This
// does not merge separate orders or reserve a slot. Native mapping is required
// before this plan may become a confirmed customer booking.
export function planReadyDeliveryVisit(input:VisitInput){
 const {shop,customerGid,orderGid,destinationKey,slotId,slotRevision,deliveryAt,deliveryEndsAt,members}=input;
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)||!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid)||!identity(destinationKey)||!identity(slotId)||!positive(slotRevision)||!Array.isArray(members)||members.length<1||members.length>250)throw Error('Verified visit owner, destination, slot and members required');
 const start=instant(deliveryAt),end=instant(deliveryEndsAt),day=(t:number)=>new Date(t+8*3600000).toISOString().slice(0,10);
 if(end<=start||day(start)!==day(end))throw Error('Same-day Singapore delivery window required');
 const drafts=new Set<string>(),occurrences=new Set<string>();let packageCount=0;
 for(const m of members){
  if(!m||!identity(m.draftId)||drafts.has(m.draftId)||!identity(m.operationalLineId)||!positive(m.revision)||!Number.isSafeInteger(m.occurrence)||m.occurrence<1||m.occurrence>6||!positive(m.packages))throw Error('Distinct verified delivery members required');
  const occurrence=JSON.stringify([m.operationalLineId,m.occurrence]);
  if(occurrences.has(occurrence))throw Error('Duplicate delivery entitlement');
  drafts.add(m.draftId);occurrences.add(occurrence);packageCount+=m.packages;
  if(!positive(packageCount))throw Error('Delivery package quantity exceeds supported bounds');
 }
 const ordered=members.map(m=>({...m})).sort((a,b)=>a.draftId.localeCompare(b.draftId));
 return {planningOnly:true as const,bookingConfirmed:false as const,capacityPlaces:1 as const,packageCount,shop,customerGid,orderGid,destinationKey,slotId,slotRevision,deliveryAt:new Date(start).toISOString(),deliveryEndsAt:new Date(end).toISOString(),members:ordered};
}
