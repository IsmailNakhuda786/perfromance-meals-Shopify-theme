// Read-only panel loader. A stalled token or fetch cannot hold the entire account.
export async function loadOrderSupportHistory({origin,getToken,fetchImpl=fetch,signal,timeoutMs=30000}){
 const url=new URL('/api/order-support-history',origin);if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid Core endpoint');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('Invalid read timeout');
 const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});let rejectAbort;
 const interrupted=new Promise((_,reject)=>{rejectAbort=()=>reject(Error('Order history loading interrupted'));controller.signal.addEventListener('abort',rejectAbort,{once:true});if(controller.signal.aborted)rejectAbort();});
 const timer=setTimeout(abort,timeoutMs);
 try{return await Promise.race([(async()=>{const token=await getToken();if(controller.signal.aborted)throw Error();const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});if(!response.ok)throw Error('Order history unavailable');const data=await response.json();if(controller.signal.aborted||data?.enabled!==true||!Array.isArray(data.orders)||data.orders.length>10||typeof data.hasMore!=='boolean')throw Error('Incomplete order Support history');return data;})(),interrupted]);}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);}
}
