export const ORDER_EVENT_PATHS={ORDERS_CREATE:'/webhooks/orders/create',ORDERS_UPDATED:'/webhooks/orders/create',ORDERS_PAID:'/webhooks/orders/paid',SUBSCRIPTION_CONTRACTS_CREATE:'/webhooks/subscriptions/create'} as const;
type Subscription={topic:string;uri:string};
// Registration acknowledgements alone do not prove every required event exists.
// An old tunnel, missing payment event or truncated native read stays unverified.
export function reviewOrderEventConnections(appUrl:string|undefined,subscriptions:Subscription[],complete:boolean,options:{renewalEvidenceEnabled?:boolean}={}){
 const required={...ORDER_EVENT_PATHS,...(options.renewalEvidenceEnabled?{SUBSCRIPTION_BILLING_ATTEMPTS_SUCCESS:'/webhooks/subscriptions/billing-success'}:{})};
 let base:URL;
 try{base=new URL(appUrl??'');}catch{return {connected:false,missing:Object.keys(required)};}
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash||!Array.isArray(subscriptions)||complete!==true)return {connected:false,missing:Object.keys(required)};
 const missing=Object.entries(required).filter(([topic,path])=>{
  const matches=subscriptions.filter(s=>s.topic===topic);
  return matches.length!==1||matches[0].uri!==new URL(path,base).href;
 }).map(([topic])=>topic);
 return {connected:missing.length===0,missing};
}
