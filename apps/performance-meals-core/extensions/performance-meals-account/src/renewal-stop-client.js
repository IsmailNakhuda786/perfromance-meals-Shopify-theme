// One explicit customer intent, one request. Unknown outcomes are held for
// account/Support reconciliation; never retry a side effect from a timer.
export function createRenewalStopClient({origin,contractGid,getToken,transport=fetch,newKey=()=>crypto.randomUUID(),timeoutMs=15000}){
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||!/^gid:\/\/shopify\/SubscriptionContract\/\d+$/.test(contractGid)||typeof getToken!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Renewal management context unavailable');
 let pending=null,result=null;
 return {async submit(confirmed){
  if(confirmed!==true)throw Error('Explicit confirmation required');
  if(result)return result;
  if(pending)return pending;
  pending=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   let rejectAbort;
   const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(Error('Outcome unconfirmed'));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
   const request=async()=>{
    const requestKey=newKey();if(typeof requestKey!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestKey))throw Error();
    const token=await getToken();if(controller.signal.aborted||typeof token!=='string'||!token)throw Error();
    const response=await transport(new URL('/api/subscription-renewal-stop',base),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({contractGid,requestKey,confirmation:'STOP_FUTURE_RENEWALS'}),signal:controller.signal});
    const body=await response.json();
    return response.ok&&body.contractGid===contractGid&&body.state==='COMPLETED'&&body.futureRenewalsStopped===true&&body.paidEntitlementsUnchanged===true&&body.refundIssued===false?{state:'COMPLETED',futureRenewalsStopped:true}:{state:'UNKNOWN',futureRenewalsStopped:false};
   };
   try{result=await Promise.race([request(),aborted]);}
   catch{result={state:'UNKNOWN',futureRenewalsStopped:false};}
   finally{clearTimeout(timer);controller.signal.removeEventListener('abort',rejectAbort);}
   return result;
  })();
  return pending;
 }};
}
