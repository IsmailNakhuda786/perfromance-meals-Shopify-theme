import {useEffect,useRef,useState} from 'preact/hooks';
import {APP_URL} from './app-endpoint.generated';
import {createReadyBookingClient} from './ready-booking-client';
const date=at=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(at));
const clock=at=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));
const slotLabel=s=>`${date(s.deliveryAt)} · ${clock(s.deliveryAt)}–${clock(s.deliveryEndsAt)} (Singapore)`;
export function ReadyDeliveries(){
 const [data,setData]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[selected,setSelected]=useState({}),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[reload,setReload]=useState(0);
 const client=useRef(null),lastIntent=useRef(null);
 if(!client.current)client.current=createReadyBookingClient({origin:APP_URL,getToken:()=>shopify.sessionToken.get()});
 async function load(after,signal=null){
  const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,30000);
  if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});
  let listener;
  const cancelled=new Promise((_,reject)=>{listener=()=>reject(Error('Delivery loading interrupted'));controller.signal.addEventListener('abort',listener,{once:true});if(controller.signal.aborted)listener();});
  const request=async()=>{const token=await shopify.sessionToken.get();if(controller.signal.aborted)throw Error();const url=new URL('/api/ready-deliveries',APP_URL);if(after)url.searchParams.set('afterSlot',after);const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});if(!r.ok)throw Error();const value=await r.json();if(controller.signal.aborted)throw Error();if(value.visible!==false&&(!Array.isArray(value.groups)||!Array.isArray(value.bookings)||!Array.isArray(value.slots)))throw Error();return value;};
  try{const value=await Promise.race([request(),cancelled]);if(controller.signal.aborted)throw Error();setData(previous=>after&&previous&&value.visible?{...value,slots:[...new Map([...previous.slots,...value.slots].map(s=>[s.id,s])).values()]}:value);setError('');}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',listener);}
 }

 useEffect(()=>{let active=true;const controller=new AbortController();load(null,controller.signal).catch(()=>{if(!active)return;if(!controller.signal.aborted)setError('Your deliveries could not be loaded. Please try again or contact Support.');else setError('Loading your deliveries took too long. Please try again.');});return()=>{active=false;controller.abort();};},[reload]);
 async function submit(intent){
  if(busy)return;setBusy(true);setMessage('');lastIntent.current=intent;
  try{const result=await client.current.submit(intent,true);if(result.state==='COMPLETED'){setUncertain(false);lastIntent.current=null;setMessage(result.result.replayed?'The previous change was saved. Showing your latest delivery details.':`Delivery confirmed: ${slotLabel(result.result)}. Your renewal billing is unchanged.`);setSelected({});setReload(v=>v+1);}else if(result.state==='REJECTED'){setUncertain(false);setMessage(result.message||'The change was not accepted. Reload deliveries before trying again.');setReload(v=>v+1);}else{setUncertain(true);setMessage('We could not confirm the result. Check the previous change before choosing another slot.');}}catch{setUncertain(true);setMessage('We could not confirm the result. Check the previous change or contact Support.');}finally{setBusy(false);}
 }
 async function check(){if(busy)return;setBusy(true);try{const result=await client.current.check();if(result.state==='COMPLETED'){setUncertain(false);lastIntent.current=null;setMessage('The previous change was saved. Showing your latest delivery details.');setReload(v=>v+1);}else setMessage('The previous change is still unconfirmed. You can retry that same change or contact Support.');}finally{setBusy(false);}}
 function chooser(key,onConfirm){return <s-stack gap="small" direction="block"><s-select label="Available delivery slot" value={selected[key]||''} disabled={busy||uncertain||!!error} onChange={event=>{const target=event.currentTarget;if(target&&'value' in target)setSelected(v=>({...v,[key]:String(target.value)}));}}><s-option value="">Choose a slot</s-option>{data.slots.map(s=><s-option key={s.id} value={s.id}>{slotLabel(s)}</s-option>)}</s-select><s-button disabled={busy||uncertain||!!error||!data.slots.some(s=>s.id===selected[key])} onClick={()=>{const slot=data.slots.find(s=>s.id===selected[key]);if(slot)onConfirm(slot);}}>Confirm delivery slot</s-button></s-stack>;}
 if(data?.visible===false)return null;
 return <s-section heading="Your Ready Series deliveries">
  {!data&&!error&&<s-spinner accessibilityLabel="Loading deliveries"/>}
  {error&&<s-banner tone="warning">{error}<s-button disabled={busy} onClick={()=>setReload(v=>v+1)}>Reload deliveries</s-button></s-banner>}
  {message&&<s-paragraph>{message}</s-paragraph>}
  {uncertain&&<s-stack gap="small"><s-button disabled={busy} onClick={check}>Check previous change</s-button>{lastIntent.current&&<s-button disabled={busy} onClick={()=>submit(lastIntent.current)}>Retry same change</s-button>}</s-stack>}
  {data?.visible&&<>
   <s-paragraph>All delivery dates and times use Singapore time. Changing a delivery does not change your renewal billing date.</s-paragraph>
   {data.noticeHours&&<s-paragraph>Changing the planned delivery date requires at least {data.noticeHours} hours’ notice before both the current and replacement delivery. Contact Support for later requests.</s-paragraph>}
   {data.nativePending&&<s-paragraph>Some delivery details could not be verified. Changes are unavailable until the details can be checked.</s-paragraph>}
   {!data.calendarPrepared&&<s-paragraph>Your delivery calendar is being prepared. Contact Support if you need assistance.</s-paragraph>}
   {data.bookings.map(b=><s-section key={b.id+':'+b.revision} heading={b.orderName}>
    <s-paragraph>{b.deliveryAt?slotLabel(b):'Delivery details require Support review.'}{b.packages?` · ${b.packages} package${b.packages===1?'':'s'} in one visit`:''}</s-paragraph>
    {b.canChange?chooser(b.id,s=>submit({intent:'reschedule',bookingId:b.id,revision:b.revision,slotId:s.id,slotRevision:s.revision})):<s-paragraph>{b.reviewRequired?'Contact Support to check this delivery.':'Contact Support for delivery changes.'}</s-paragraph>}
   </s-section>)}
   {data.groups.map(g=><s-section key={g.sourceKey} heading={g.orderName}>
    <s-paragraph>{g.occurrences.map(o=>`${o.packages} × delivery ${o.number} of ${o.deliveries}`).join(' · ')}</s-paragraph>
    {g.plannedAt&&<s-paragraph>Planned delivery date: {date(g.plannedAt)}</s-paragraph>}
    {g.canBook?chooser(g.sourceKey,s=>submit({intent:'book',orderGid:g.orderGid,sourceKey:g.sourceKey,slotId:s.id,slotRevision:s.revision})):<s-paragraph>Your delivery details need merchant preparation before booking.</s-paragraph>}
   </s-section>)}
   {data.calendarPrepared&&!data.groups.length&&!data.bookings.length&&!data.nativePending&&<s-paragraph>No deliveries are available to book here.</s-paragraph>}
   {!data.slots.length&&<s-paragraph>No available slots are shown on this page. Contact Support if you need another date.</s-paragraph>}
   {data.nextSlotCursor&&<s-button disabled={busy||uncertain||!!error} onClick={async()=>{setBusy(true);try{await load(data.nextSlotCursor);}catch{setError('More delivery slots could not be loaded.');}finally{setBusy(false);}}}>More delivery slots</s-button>}
   {data.supportUrl&&<s-link href={data.supportUrl}>Contact Support on WhatsApp</s-link>}
  </>}
 </s-section>;
}
