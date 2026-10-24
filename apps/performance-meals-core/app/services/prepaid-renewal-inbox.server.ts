import db from '../db.server';
import {PREPAID_PAYMENT_QUERY,PREPAID_CORRECTED_PAYMENT_QUERY,type PrepaidPriceCorrection} from './prepaid-payment.server';
import {minorAmount} from './gift-card-native.server';
import {assertPrepaidEvidenceId,assertPrepaidRenewalEvidenceScope,registerPrepaidRenewalEvidence,processPrepaidRenewalEvidence} from './prepaid-renewal-evidence.server';
import type {inspectPrepaidContract} from './prepaid-verification.server';

type Admin=Parameters<typeof inspectPrepaidContract>[0];
const reference=(type:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+type+'/\\d+$').test(value);
function trigger(payload:unknown){
 if(!payload||typeof payload!=='object')throw Error('Invalid renewal event');
 const p=payload as Record<string,unknown>;
 if(!reference('SubscriptionBillingAttempt',p.admin_graphql_api_id)||!reference('SubscriptionContract',p.admin_graphql_api_subscription_contract_id)||!reference('Order',p.admin_graphql_api_order_id)||typeof p.idempotency_key!=='string'||!p.idempotency_key.trim()||p.idempotency_key.length>255||p.ready!==true||p.error_code!=null||p.error_message!=null)throw Error('Incomplete successful renewal trigger');
 return {attemptGid:p.admin_graphql_api_id as string,contractGid:p.admin_graphql_api_subscription_contract_id as string,renewalOrderGid:p.admin_graphql_api_order_id as string,idempotencyKey:p.idempotency_key};
}

// Called only after SDK signature authentication. Persist minimal trigger first;
// defer all native API reads and routing so slow proof does not hold HTTP open.
export async function receivePrepaidRenewalTrigger(shop:string,payload:unknown,eventId:string){
 const customer=assertPrepaidRenewalEvidenceScope(shop),t=trigger(payload);
 if(typeof eventId!=='string'||!/^[-a-zA-Z0-9_:]{1,200}$/.test(eventId))throw Error('Invalid renewal delivery identity');
 const purchase=await db.prepaidPurchaseEvidence.findFirst({where:{shop,contractGid:t.contractGid,customerGid:customer}});
 if(!purchase)throw Error('Original purchase registration pending');
 const receiptId=`${shop}:renewal-intake:${eventId}`,topic=`CORE_RENEWAL_INTAKE:${t.attemptGid}`;
 const persist=()=>db.$transaction(async tx=>{
  const receipt=await tx.webhookReceipt.findUnique({where:{id:receiptId}});
  const previous=await tx.prepaidRenewalInbox.findUnique({where:{shop_attemptGid:{shop,attemptGid:t.attemptGid}}});
  if(previous&&(previous.customerGid!==customer||previous.purchaseEvidenceId!==purchase.id||previous.contractGid!==t.contractGid||previous.renewalOrderGid!==t.renewalOrderGid||previous.idempotencyKey!==t.idempotencyKey)||receipt&&(receipt.shop!==shop||receipt.topic!==topic||!previous))throw Error('Renewal delivery identity conflict');
  const row=previous??await tx.prepaidRenewalInbox.create({data:{shop,customerGid:customer,purchaseEvidenceId:purchase.id,...t}});
  if(!receipt)await tx.webhookReceipt.create({data:{id:receiptId,shop,topic}});
  return {inboxId:row.id,received:true as const,replayed:!!previous};
 });
 try{return await persist();}catch(error){
  if((error as {code?:string}).code!=='P2002')throw error;
  return persist();
 }
}

export async function processPrepaidRenewalTrigger(admin:Admin,shop:string,inboxId:string){
 const customer=assertPrepaidRenewalEvidenceScope(shop);assertPrepaidEvidenceId(inboxId);
 const row=await db.prepaidRenewalInbox.findFirst({where:{id:inboxId,shop,customerGid:customer}});
 if(!row||!['PENDING_VERIFY','COMPLETED'].includes(row.state)||row.state==='COMPLETED'&&!row.completedAt)throw Error('Renewal inbox unavailable');
 const purchase=await db.prepaidPurchaseEvidence.findFirst({where:{id:row.purchaseEvidenceId,shop,customerGid:customer,contractGid:row.contractGid}});
 if(!purchase)throw Error('Purchased context unavailable');
 const saved=JSON.parse(purchase.snapshot) as {correction:PrepaidPriceCorrection|null};
 const response=await admin.graphql(saved.correction?PREPAID_CORRECTED_PAYMENT_QUERY:PREPAID_PAYMENT_QUERY,{variables:{id:row.renewalOrderGid}}),body=await response.json(),data=body.data,order=data?.order;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||order?.id!==row.renewalOrderGid||order.customer?.id!==customer||order.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(order.lineItems.nodes)||order.lineItems.nodes.length!==1||!reference('LineItem',order.lineItems.nodes[0].id))throw Error('Native renewal line unavailable');
 // Read the actual allocation kind and GST, then verify them against fresh paid
 // proof and the immutable purchase. Never guess that a discount propagated.
 let correction:PrepaidPriceCorrection|undefined;
 if(saved.correction){
  const allocations=order.lineItems.nodes[0].discountAllocations,application=allocations?.[0]?.discountApplication;
  const kind=application?.__typename==='ManualDiscountApplication'?'MANUAL':application?.__typename==='AutomaticDiscountApplication'?'AUTOMATIC':null;
  if(!Array.isArray(allocations)||allocations.length!==1||!kind||application.title!==saved.correction.title||order.totalTaxSet?.shopMoney?.currencyCode!=='SGD')throw Error('Renewal correction propagation unavailable');
  correction={...saved.correction,applicationKind:kind,taxMinor:minorAmount(order.totalTaxSet.shopMoney.amount)};
 }
 const evidence=await registerPrepaidRenewalEvidence(admin,shop,purchase.id,{attemptGid:row.attemptGid,idempotencyKey:row.idempotencyKey,renewalOrderGid:row.renewalOrderGid,renewalOrderLineGid:order.lineItems.nodes[0].id},correction);
 await processPrepaidRenewalEvidence(admin,shop,evidence.id);
 if(row.state!=='COMPLETED')await db.prepaidRenewalInbox.updateMany({where:{id:row.id,shop,state:'PENDING_VERIFY'},data:{state:'COMPLETED',completedAt:new Date()}});
 const final=await db.prepaidRenewalInbox.findUnique({where:{id:row.id}});if(final?.state!=='COMPLETED'||!final.completedAt)throw Error('Renewal inbox completion requires recovery');
 return {inboxId:row.id,linked:true as const,replayed:row.state==='COMPLETED'};
}

export async function processPrepaidRenewalTriggerBatch(admin:Admin,shop:string,options:{limit?:number;after?:string}={}){
 const customer=assertPrepaidRenewalEvidenceScope(shop),limit=options.limit??10;
 if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw Error('Invalid renewal inbox bounds');
 if(options.after!==undefined)assertPrepaidEvidenceId(options.after);
 const cursor=options.after?await db.prepaidRenewalInbox.findFirst({where:{id:options.after,shop,customerGid:customer}}):null;
 if(options.after&&!cursor)throw Error('Invalid renewal inbox cursor');
 const rows=await db.prepaidRenewalInbox.findMany({where:{shop,customerGid:customer,state:'PENDING_VERIFY',...(cursor?{OR:[{createdAt:{gt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{gt:cursor.id}}]}:{})},orderBy:[{createdAt:'asc'},{id:'asc'}],take:limit+1});
 const results=[];
 for(const row of rows.slice(0,limit)){
  try{await processPrepaidRenewalTrigger(admin,shop,row.id);results.push({inboxId:row.id,state:'COMPLETED'});}catch{results.push({inboxId:row.id,state:'HELD'});}
 }
 return {results,hasMore:rows.length>limit,nextCursor:rows.length>limit?results.at(-1)?.inboxId:null};
}
