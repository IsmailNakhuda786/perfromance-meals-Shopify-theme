// Unknown responses retain the same customer intent/key. No timer retries a
// change; an authenticated receipt check can recover a committed response.
export function createProgrammeBookingClient({origin,getToken,transport=fetch,newKey=()=>crypto.randomUUID(),timeoutMs=30000}){
 const base=new URL(origin);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||typeof getToken!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Delivery connection unavailable');
 let pending=null,inflight=null;
 const valid=result=>typeof result?.visitId==='string'&&pending!==null&&result.visitId===pending.input.visitId&&Number.isSafeInteger(result.revision)&&result.revision===pending.input.visitRevision+1&&Number.isFinite(Date.parse(result.deliveryAt))&&Number.isFinite(Date.parse(result.deliveryEndsAt))&&Date.parse(result.deliveryEndsAt)>Date.parse(result.deliveryAt);
 async function send(path,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  let abortListener;
  const aborted=new Promise((_,reject)=>{abortListener=()=>reject(Error('Delivery outcome unconfirmed'));controller.signal.addEventListener('abort',abortListener,{once:true});});
  const request=async()=>{const token=await getToken();if(controller.signal.aborted||typeof token!=='string'||!token)throw Error();const response=await transport(new URL(path,base),{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},signal:controller.signal});const body=await response.json();if(controller.signal.aborted)throw Error();return {response,body};};
  try{return await Promise.race([request(),aborted]);}finally{clearTimeout(timer);controller.signal.removeEventListener('abort',abortListener);}
 }

 async function check(){
  if(!pending)return {state:'IDLE'};
  try{const {response,body}=await send('/api/programme-bookings?requestKey='+encodeURIComponent(pending.requestKey));if(response.ok&&body.state==='COMPLETED'&&valid(body.result)){pending=null;return {state:'COMPLETED',result:{...body.result,replayed:true}};}return {state:'UNKNOWN'};}catch{return {state:'UNKNOWN'};}
 }
 return {check,get hasPending(){return !!pending;},async submit(input,confirmed){
  if(confirmed!==true)throw Error('Confirm your chosen delivery slot');
  const fingerprint=JSON.stringify(input);
  if(pending&&pending.fingerprint!==fingerprint)return {state:'CHECK_REQUIRED'};
  if(inflight)return inflight;
  if(!pending){const requestKey=newKey();if(typeof requestKey!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestKey))throw Error('Delivery request unavailable');pending={fingerprint,requestKey,input};}
  inflight=(async()=>{
   try{const {response,body}=await send('/api/programme-bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pending.input,requestKey:pending.requestKey})});
    if(response.ok&&valid(body)){pending=null;return {state:'COMPLETED',result:body};}
    if([400,401,403,405].includes(response.status)||response.status===409&&body.state==='REJECTED'){pending=null;return {state:'REJECTED',message:body.error};}
    if(response.status===409){const status=await check();if(status.state==='COMPLETED')return status;/* Retain key if the outcome cannot be established. */}
    return {state:'UNKNOWN'};
   }catch{return {state:'UNKNOWN'};}finally{inflight=null;}
  })();return inflight;
 }};
}
