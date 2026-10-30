import {useCallback,useEffect,useRef,useState} from 'preact/hooks';
import {APP_URL} from './app-endpoint.generated';
import {createProgrammeBookingClient} from './programme-booking-client';
const label=s=>new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'medium',timeStyle:'short'}).format(new Date(s.deliveryAt))+' – '+new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',timeStyle:'short'}).format(new Date(s.deliveryEndsAt))+' (Singapore)';
export function ProgrammeBookings({selectionId}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[selected,setSelected]=useState({}),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false),[reload,setReload]=useState(0);
 const client=useRef(null),last=useRef(null);
 if(!client.current)client.current=createProgrammeBookingClient({origin:APP_URL,getToken:()=>shopify.sessionToken.get()});
 const load=useCallback(async(after,signal=null)=>{
  const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,30000);
  if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});
  let listener;
  const cancelled=new Promise((_,reject)=>{listener=()=>reject(Error('Delivery loading interrupted'));controller.signal.addEventListener('abort',listener,{once:true});if(controller.signal.aborted)listener();});
  const request=async()=>{const token=await shopify.sessionToken.get();if(controller.signal.aborted)throw Error();const url=new URL('/api/programme-bookings',APP_URL);url.searchParams.set('selectionId',selectionId);if(after)url.searchParams.set('afterSlot',after);const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});if(!r.ok)throw Error();const value=await r.json();if(controller.signal.aborted)throw Error();if(value.visible!==false&&(!Array.isArray(value.visits)||!Array.isArray(value.slots)))throw Error();return value;};
  try{const value=await Promise.race([request(),cancelled]);if(controller.signal.aborted)throw Error();setData(previous=>after&&previous&&value.visible?{...value,slots:[...new Map([...previous.slots,...value.slots].map(s=>[s.id,s])).values()]}:value);setError('');}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',listener);}
 },[selectionId]);

 useEffect(()=>{let active=true;const controller=new AbortController();load(null,controller.signal).catch(()=>{if(!active)return;if(!controller.signal.aborted)setError('Your deliveries could not be loaded. Please try again or contact Support.');else setError('Loading your deliveries took too long. Please try again.');});return()=>{active=false;controller.abort();};},[reload,load]);
 async function submit(intent){if(busy)return;setBusy(true);last.current=intent;try{const result=await client.current.submit(intent,true);if(result.state==='COMPLETED'){setUncertain(false);last.current=null;setMessage('Delivery saved: '+label(result.result)+'. Your meal allowance and renewal billing are unchanged.');setSelected({});setReload(v=>v+1);}else if(result.state==='REJECTED'){setUncertain(false);setMessage(result.message||'The change was not accepted. Reload before trying again.');setReload(v=>v+1);}else{setUncertain(true);setMessage('The result is unconfirmed. Check this change before choosing another time.');}}finally{setBusy(false);}}
 async function check(){if(busy)return;setBusy(true);try{const result=await client.current.check();if(result.state==='COMPLETED'){setUncertain(false);last.current=null;setMessage('Your previous change was saved. Showing the latest delivery times.');setReload(v=>v+1);}else setMessage('The previous change is still unconfirmed. Retry that same change or contact Support.');}finally{setBusy(false);}}
 if(data?.visible===false)return null;
 return <s-section heading="Your Meal Plan delivery times">
  {!data&&!error&&<s-spinner accessibilityLabel="Loading Meal Plan delivery times"/>}
  {error&&<s-banner tone="warning">{error}</s-banner>}
  {message&&<s-paragraph>{message}</s-paragraph>}
  <s-button disabled={busy} onClick={()=>setReload(v=>v+1)}>Reload delivery times</s-button>
  {uncertain&&<s-stack gap="small"><s-button disabled={busy} onClick={check}>Check previous change</s-button>{last.current&&<s-button disabled={busy} onClick={()=>submit(last.current)}>Retry same change</s-button>}</s-stack>}
  {data?.visible&&<>
   <s-paragraph>Your team arranges the first delivery. Changes require {data.noticeHours} hours’ notice before both the original and replacement times. Contact Support for later changes. Batches arriving in one visit move together.</s-paragraph>
   {!data.visits.length&&<s-paragraph>Your delivery times are being arranged by the team.</s-paragraph>}
   {data.visits.map(v=><s-section key={v.id+':'+v.revision} heading={label(v)}>
    <s-paragraph>{v.combinedBatchCount} meal batch{v.combinedBatchCount===1?'':'es'} · {v.state.toLowerCase()}</s-paragraph>
    {v.canReschedule?<s-stack direction="block" gap="small"><s-select label="Replacement delivery time" value={selected[v.id]||''} disabled={busy||uncertain||!!error} onChange={event=>{const target=event.currentTarget;if(target&&'value' in target)setSelected(s=>({...s,[v.id]:String(target.value)}));}}><s-option value="">Choose a time</s-option>{data.slots.filter(s=>s.canReplace&&(s.deliveryAt!==v.deliveryAt||s.deliveryEndsAt!==v.deliveryEndsAt)).map(s=><s-option key={s.id} value={s.id}>{label(s)}</s-option>)}</s-select><s-button disabled={busy||uncertain||!!error||!data.slots.some(s=>s.id===selected[v.id]&&s.canReplace)} onClick={()=>{const slot=data.slots.find(s=>s.id===selected[v.id]);if(slot)submit({visitId:v.id,visitRevision:v.revision,slotId:slot.id,slotRevision:slot.revision});}}>Confirm new delivery time</s-button></s-stack>:<s-paragraph>Contact Support if you need help with this delivery.</s-paragraph>}
   </s-section>)}
   {data.nextSlotCursor&&<s-button disabled={busy||uncertain} onClick={async()=>{setBusy(true);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);try{await load(data.nextSlotCursor,controller.signal);}catch{setError('More delivery times could not be loaded.');}finally{clearTimeout(timer);setBusy(false);}}}>More delivery times</s-button>}
  </>}
 </s-section>;
}
