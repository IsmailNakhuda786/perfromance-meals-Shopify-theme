export const ORDER_EVENT_PATHS={ORDERS_CREATE:'/webhooks/orders/create',ORDERS_UPDATED:'/webhooks/orders/create',ORDERS_PAID:'/webhooks/orders/paid'} as const;
type Subscription={topic:string;uri:string};
// Registration acknowledgements alone do not prove every required event exists.
// An old tunnel, missing payment event or truncated native read stays unverified.
export function reviewOrderEventConnections(appUrl:string|undefined,subscriptions:Subscription[],complete:boolean){
 let base:URL;
 try{base=new URL(appUrl??'');}catch{return {connected:false,missing:Object.keys(ORDER_EVENT_PATHS)};}
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||!Array.isArray(subscriptions)||complete!==true)return {connected:false,missing:Object.keys(ORDER_EVENT_PATHS)};
 const missing=Object.entries(ORDER_EVENT_PATHS).filter(([topic,path])=>subscriptions.filter(s=>s.topic===topic&&s.uri===new URL(path,base).href).length!==1).map(([topic])=>topic);
 return {connected:missing.length===0,missing};
}
