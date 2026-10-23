import {planReadyDeliveryReminders,reviewDeliveryChangeNotice} from './ready-series-calendar';

type Slot={id:string;deliveryAt:string;deliveryEndsAt:string;available:boolean};
type Occurrence={id:string;occurrence:number;revision:number;slotId:string;deliveryAt:string;deliveryEndsAt:string;dispatchState:'UNDISPATCHED'|'DISPATCHED'|'UNKNOWN'};
type Input={deliveries:3|6;occurrence:number;expectedRevision:number;requestedAt:string;replacementSlotId:string;noticeHours:number;current:Occurrence[];slots:Slot[]};
const text=(value:unknown)=>typeof value==='string'&&value.trim()===value&&value.length>0&&value.length<=128;
function instant(value:string){
 const time=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)?Date.parse(value):NaN;
 if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,19)!==value.slice(0,19))throw Error('Verified delivery timestamp required');
 return time;
}
function window(start:string,end:string){
 const a=instant(start),b=instant(end),localDate=(t:number)=>new Date(t+8*3600000).toISOString().slice(0,10);
 if(b<=a||localDate(a)!==localDate(b))throw Error('Verified same-day Singapore delivery window required');
 return {start:a,end:b};
}

// Pure preparation for one delivery change. Inputs must come from the server's
// authenticated current term and fresh merchant availability. This neither
// reserves capacity nor changes Shopify fulfillAt (which is a work-start date,
// not proof of the customer's delivery window). A persistent executor must
// recheck ownership, native dispatch, capacity and revision before any commit.
export function planReadySeriesDeliveryChange(input:Input){
 const {deliveries,occurrence,expectedRevision,requestedAt,replacementSlotId,noticeHours,current,slots}=input;
 if(![3,6].includes(deliveries)||!Number.isSafeInteger(occurrence)||occurrence<1||occurrence>deliveries||!Number.isSafeInteger(expectedRevision)||expectedRevision<1||expectedRevision>=2147483647||!text(replacementSlotId)||!Number.isSafeInteger(noticeHours)||noticeHours<1||noticeHours>8760||!Array.isArray(current)||current.length!==deliveries||!Array.isArray(slots)||slots.length>2000)throw Error('Complete current term and merchant slots required');
 instant(requestedAt);
 const occurrences=new Set<number>(),dates=new Set<string>(),ids=new Set<string>();
 for(const item of current){
  if(!item||!text(item.id)||ids.has(item.id)||!Number.isSafeInteger(item.occurrence)||item.occurrence<1||item.occurrence>deliveries||occurrences.has(item.occurrence)||!Number.isSafeInteger(item.revision)||item.revision<1||item.revision>=2147483647||!text(item.slotId)||!['UNDISPATCHED','DISPATCHED','UNKNOWN'].includes(item.dispatchState))throw Error('Current delivery identity is incomplete');
  window(item.deliveryAt,item.deliveryEndsAt);occurrences.add(item.occurrence);ids.add(item.id);
  const day=new Date(instant(item.deliveryAt)+8*3600000).toISOString().slice(0,10);
  if(dates.has(day))throw Error('Current deliveries overlap; Support review required');dates.add(day);
 }
 const identifiers=new Set<string>();
 for(const slot of slots){
  if(!slot||!text(slot.id)||identifiers.has(slot.id)||typeof slot.available!=='boolean')throw Error('Merchant slot evidence is ambiguous');
  window(slot.deliveryAt,slot.deliveryEndsAt);identifiers.add(slot.id);
 }
 const original=current.find(item=>item.occurrence===occurrence)!;
 if(original.revision!==expectedRevision)throw Error('Delivery changed; reload before choosing another date');
 const replacement=slots.find(slot=>slot.id===replacementSlotId);
 if(!replacement||!replacement.available)throw Error('Replacement delivery slot is unavailable');
 const notice=reviewDeliveryChangeNotice(requestedAt,original.deliveryAt,replacement.deliveryAt,noticeHours);
 const unchanged=original.slotId===replacement.id&&original.deliveryAt===replacement.deliveryAt&&original.deliveryEndsAt===replacement.deliveryEndsAt;
 const limits={planningOnly:true as const,bookingConfirmed:false as const,nativeScheduleChanged:false as const,billingScheduleChanged:false as const,paidEntitlementsChanged:false as const,refundIssued:false as const};
 if(original.dispatchState!=='UNDISPATCHED'||notice.supportRequired)return {...limits,state:'SUPPORT_REQUIRED' as const,reason:original.dispatchState==='DISPATCHED'?'DELIVERY_DISPATCHED':original.dispatchState==='UNKNOWN'?'DISPATCH_UNCONFIRMED':'NOTICE_NOT_MET',noticeHours,change:null};
 if(unchanged)return {...limits,state:'UNCHANGED' as const,reason:null,noticeHours,change:null};
 const replacementDay=new Date(instant(replacement.deliveryAt)+8*3600000).toISOString().slice(0,10);
 if(current.some(item=>item.occurrence!==occurrence&&new Date(instant(item.deliveryAt)+8*3600000).toISOString().slice(0,10)===replacementDay))throw Error('Replacement overlaps another paid delivery; Support review required');
 // Reusing an ID with a changed time is valid only as explicit fresh merchant
 // evidence; both exact timestamps are carried to the eventual revision check.
 const next={...original,revision:expectedRevision+1,slotId:replacement.id,deliveryAt:replacement.deliveryAt,deliveryEndsAt:replacement.deliveryEndsAt};
 const reminders=planReadyDeliveryReminders(original.id,next.revision,next.deliveryAt);
 return {...limits,state:'READY_FOR_REVALIDATION' as const,reason:null,noticeHours,change:{occurrence,expectedRevision,previous:{...original},replacement:next,term:current.map(item=>({... (item.occurrence===occurrence?next:item)})),remindersToSupersede:planReadyDeliveryReminders(original.id,original.revision,original.deliveryAt),reminders}};
}
