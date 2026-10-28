import {assertShop} from './security.server';

type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export const READY_RENEWAL_CYCLE_CONTEXT_QUERY=`#graphql
query ReadyRenewalCalendarContext($contract:ID!,$attempt:ID!){
 shop{myshopifyDomain}
 currentAppInstallation{app{id}}
 subscriptionContract(id:$contract){id createdAt app{id} customer{id} originOrder{id createdAt} billingPolicy{interval intervalCount}}
 subscriptionBillingAttempt(id:$attempt){id originTime idempotencyKey subscriptionContract{id} state{__typename ...on SubscriptionBillingAttemptSuccessState{order{id}}}}
}`;
export const READY_RENEWAL_CYCLE_QUERY=`#graphql
query ReadyRenewalCalendarCycle($input:SubscriptionBillingCycleInput!,$after:String){
 shop{myshopifyDomain}
 subscriptionBillingCycle(billingCycleInput:$input){
  cycleIndex cycleStartAt cycleEndAt edited skipped sourceContract{id}
  billingAttempts(first:50,after:$after){nodes{id state{__typename ...on SubscriptionBillingAttemptSuccessState{order{id}}}} pageInfo{hasNextPage endCursor}}
 }
}`;
type Expected={contractGid:string;attemptGid:string;idempotencyKey:string;originalOrderGid:string;renewalOrderGid:string;appGid:string;customerGid:string;months:3|6};
const gid=(kind:string,v:unknown):v is string=>typeof v==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(v);
const instant=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('Exact native billing-cycle time required');return v;};
// Read-only: a successful payment alone does not prove which delivery term was
// renewed. Bind it to the native billing cycle, never count webhook arrival order.
export async function readReadyRenewalCycle(admin:Admin,shop:string,e:Expected){
 assertShop(shop);
 for(const[k,t]of [['contractGid','SubscriptionContract'],['attemptGid','SubscriptionBillingAttempt'],['originalOrderGid','Order'],['renewalOrderGid','Order'],['appGid','App'],['customerGid','Customer']]as const)if(!gid(t,e[k]))throw Error('Exact renewal cycle identities required');
 if(![3,6].includes(e.months)||e.originalOrderGid===e.renewalOrderGid||!e.idempotencyKey||e.idempotencyKey.length>255)throw Error('Distinct verified renewal required');
 const response=await admin.graphql(READY_RENEWAL_CYCLE_CONTEXT_QUERY,{variables:{contract:e.contractGid,attempt:e.attemptGid}}),body=await response.json(),d=body.data,c=d?.subscriptionContract,a=d?.subscriptionBillingAttempt;
 if(!response.ok||body.errors||d?.shop?.myshopifyDomain!==shop||d.currentAppInstallation?.app?.id!==e.appGid||c?.id!==e.contractGid||c.app?.id!==e.appGid||c.customer?.id!==e.customerGid||c.originOrder?.id!==e.originalOrderGid||c.billingPolicy?.interval!=='MONTH'||c.billingPolicy.intervalCount!==e.months||a?.id!==e.attemptGid||a.idempotencyKey!==e.idempotencyKey||a.subscriptionContract?.id!==e.contractGid||a.state?.__typename!=='SubscriptionBillingAttemptSuccessState'||a.state.order?.id!==e.renewalOrderGid)throw Error('Owned successful renewal cycle unavailable');
 // Shopify may create the contract a few seconds after its origin order. The
 // order timestamp can therefore precede cycle 1 and is not a cycle selector.
 const originalDate=instant(c.createdAt),renewalDate=instant(a.originTime);
 if(Date.parse(instant(c.originOrder.createdAt))>Date.parse(originalDate))throw Error('Original contract creation precedes its paid order');
 async function cycle(date:string,attemptRequired:boolean){
  let after:string|null=null,identity:string|null=null,result:{index:number;start:string;end:string}|null=null;const cursors=new Set<string>(),ids=new Set<string>();let successful=0,matched=0;
  for(let page=0;page<5;page++){
   const r=await admin.graphql(READY_RENEWAL_CYCLE_QUERY,{variables:{input:{contractId:e.contractGid,selector:attemptRequired?{date}:{index:1}},after}}),b=await r.json(),v=b.data?.subscriptionBillingCycle;
   if(!r.ok||b.errors||b.data?.shop?.myshopifyDomain!==shop||!v||v.sourceContract?.id!==e.contractGid||!Number.isSafeInteger(v.cycleIndex)||v.cycleIndex<1||v.edited!==false||v.skipped!==false)throw Error('Unedited native cycle proof required');
   const start=instant(v.cycleStartAt),end=instant(v.cycleEndAt);
   if(start>=end||Date.parse(date)>=Date.parse(end)||attemptRequired&&Date.parse(start)>Date.parse(date)||!attemptRequired&&(v.cycleIndex!==1||Date.parse(start)<Date.parse(date)))throw Error('Cycle does not contain its native timestamp');
   const current=JSON.stringify([v.cycleIndex,start,end]);if(identity&&identity!==current)throw Error('Billing cycle changed during pagination');identity=current;result={index:v.cycleIndex,start,end};
   const connection=v.billingAttempts;if(!connection||!Array.isArray(connection.nodes)||connection.nodes.length>50||typeof connection.pageInfo?.hasNextPage!=='boolean')throw Error('Complete cycle attempts required');
   for(const item of connection.nodes){if(!gid('SubscriptionBillingAttempt',item?.id)||ids.has(item.id)||!item.state?.__typename)throw Error('Ambiguous cycle attempts');ids.add(item.id);if(item.state.__typename==='SubscriptionBillingAttemptSuccessState'){if(!gid('Order',item.state.order?.id))throw Error('Invalid cycle payment association');successful++;if(item.id===e.attemptGid&&item.state.order.id===e.renewalOrderGid)matched++;}}
   if(!connection.pageInfo.hasNextPage){if(attemptRequired&&(matched!==1||successful!==1))throw Error('Successful attempt is not uniquely bound to the renewed cycle');return result;}
   const next=connection.pageInfo.endCursor;if(!connection.nodes.length||typeof next!=='string'||!next||cursors.has(next))throw Error('Complete cycle pagination required');cursors.add(next);after=next;
  }
  throw Error('Billing cycle attempt coverage exceeds the verified bound');
 }
 const original=await cycle(originalDate,false),renewal=await cycle(renewalDate,true);
 if(renewal.index<=original.index||renewal.index-original.index>120||Date.parse(renewal.start)<Date.parse(original.end))throw Error('Renewal has no later verified delivery cycle');
 return {contractGid:e.contractGid,attemptGid:e.attemptGid,originalOrderGid:e.originalOrderGid,renewalOrderGid:e.renewalOrderGid,originalCycleIndex:original.index,renewalCycleIndex:renewal.index,monthOffset:(renewal.index-original.index)*e.months,cycleStartAt:renewal.start,cycleEndAt:renewal.end};
}
