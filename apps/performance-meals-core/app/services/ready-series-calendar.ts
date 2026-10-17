// Calendar planning only: no checkout, contract, entitlement or billing mutation.
function civil(value:string){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('A verified delivery date is required');
 const time=Date.parse(value+'T00:00:00Z');
 if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw Error('Invalid delivery date');
 return time;
}
function date(time:number){return new Date(time).toISOString().slice(0,10);}
// Availability comes from merchant slots, including closures/holidays. Never
// infer holidays or use an adjusted occurrence as the next occurrence's anchor.
export function planReadySeriesDeliveries(firstDate:string,count:3|6,availableDates:string[]){
 const anchor=new Date(civil(firstDate));
 if(![3,6].includes(count)||!Array.isArray(availableDates)||availableDates.length>2000||new Set(availableDates).size!==availableDates.length)throw Error('Invalid delivery calendar evidence');
 const available=availableDates.map(value=>({value,time:civil(value)})).sort((a,b)=>a.time-b.time);
 const planned=Array.from({length:count},(_,index)=>{
  const monthStart=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+index,1));
  const lastDay=new Date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth()+1,0)).getUTCDate();
  const nominal=date(Date.UTC(monthStart.getUTCFullYear(),monthStart.getUTCMonth(),Math.min(anchor.getUTCDate(),lastDay)));
  const next=available.find(day=>day.time>=civil(nominal));
  if(!next)throw Error('Merchant delivery availability does not cover the term');
  return {occurrence:index+1,nominalDate:nominal,deliveryDate:next.value,adjusted:next.value!==nominal};
 });
 if(new Set(planned.map(item=>item.deliveryDate)).size!==planned.length)throw Error('Delivery availability merges occurrences; Support review required');
 return planned;
}
function instant(value:string){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))throw Error('Verified delivery timestamp required');
 const time=Date.parse(value);
 if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,19)!==value.slice(0,19))throw Error('Invalid delivery timestamp');
 return time;
}
// Use only merchant-provided, currently bookable slots. This is a read-only
// choice, not a capacity reservation; checkout must revalidate the chosen slot.
export function nextReadySeriesDeliverySlot(now:string,slots:{id:string;deliveryAt:string}[]){
 const current=instant(now);
 if(!Array.isArray(slots)||slots.length>2000||new Set(slots.map(slot=>slot?.id)).size!==slots.length)throw Error('Invalid merchant delivery slots');
 const candidates=slots.map(slot=>{
  if(!slot||typeof slot.id!=='string'||!slot.id.trim()||slot.id.length>128)throw Error('Invalid merchant delivery slot');
  return {...slot,time:instant(slot.deliveryAt)};
 }).filter(slot=>slot.time>current).sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
 if(!candidates.length)throw Error('No future merchant delivery slot is available');
 const {id,deliveryAt}=candidates[0];
 return {id,deliveryAt,deliveryDate:new Date(instant(deliveryAt)+8*3600000).toISOString().slice(0,10)};
}

// This checks the notice window only. Authentication, slot capacity, programme
// state and dispatch checks remain mandatory before any stored change.
export function reviewDeliveryChangeNotice(requestedAt:string,currentDeliveryAt:string,replacementDeliveryAt:string,noticeHours=72){
 if(!Number.isSafeInteger(noticeHours)||noticeHours<1||noticeHours>8760)throw Error('Invalid configured delivery notice');
 const requested=instant(requestedAt),current=instant(currentDeliveryAt),replacement=instant(replacementDeliveryAt);
 const minimum=requested+noticeHours*3600000;
 return {noticeHours,selfServiceNoticeMet:current>=minimum&&replacement>=minimum,supportRequired:current<minimum||replacement<minimum};
}

export function planReadyDeliveryReminders(occurrenceId:string,revision:number,deliveryAt:string){
 if(typeof occurrenceId!=='string'||!occurrenceId.trim()||occurrenceId.length>128||!Number.isSafeInteger(revision)||revision<1)throw Error('Verified delivery occurrence and revision required');
 const delivery=instant(deliveryAt);
 return ([72,24] as const).flatMap(hours=>(['email','whatsapp'] as const).map(channel=>({occurrenceId,revision,channel,hoursBefore:hours,scheduledAt:new Date(delivery-hours*3600000).toISOString(),idempotencyKey:JSON.stringify(['ready-delivery',occurrenceId,revision,channel,hours])})));
}
