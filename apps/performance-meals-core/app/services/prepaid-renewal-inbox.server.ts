import db from '../db.server';
import {PREPAID_PAYMENT_QUERY,PREPAID_CORRECTED_PAYMENT_QUERY,type PrepaidPriceCorrection} from './prepaid-payment.server';
import {prepaidPackageQuantity} from './prepaid-package-quantity';
import {minorAmount} from './gift-card-native.server';
import {assertPrepaidEvidenceId,assertPrepaidRenewalEvidenceScope,readRegisteredPrepaidPurchase,registerPrepaidRenewalEvidence,processPrepaidRenewalEvidence} from './prepaid-renewal-evidence.server';
import {inspectPrepaidContract} from './prepaid-verification.server';

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
 const purchase=await db.prepaidPurchaseEvidence.findFirst({where:{shop,contractGid:t.contractGid,customerGid:customer},orderBy:[{createdAt:'asc'},{id:'asc'}]});
 if(!purchase)throw Error('Original purchase registration pending');
 const receiptId=`${shop}:renewal-intake:${eventId}`,topic=`CORE_RENEWAL_INTAKE:${t.attemptGid}`;
 const persist=()=>db.$transaction(async tx=>{
  const receipt=await tx.webhookReceipt.findUnique({where:{id:receiptId}});
  const previous=await tx.prepaidRenewalInbox.findUnique({where:{shop_attemptGid:{shop,attemptGid:t.attemptGid}}});
  if(previous&&(previous.customerGid!==customer||previous.contractGid!==t.contractGid||previous.renewalOrderGid!==t.renewalOrderGid||previous.idempotencyKey!==t.idempotencyKey)||receipt&&(receipt.shop!==shop||receipt.topic!==topic||!previous))throw Error('Renewal delivery identity conflict');
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
 const purchases=await db.prepaidPurchaseEvidence.findMany({where:{shop,customerGid:customer,contractGid:row.contractGid},orderBy:[{createdAt:'asc'},{id:'asc'}],take:101});
 if(!purchases.length||purchases.length>100||!purchases.some(p=>p.id===row.purchaseEvidenceId))throw Error('Purchased context unavailable');
 const saved=purchases.map(p=>({purchase:p,context:readRegisteredPrepaidPurchase(p)}));
 const native=await inspectPrepaidContract(admin,shop,row.contractGid,saved[0].context.expected);
 if(!native.billingConfigurationMatches||!native.deliveryPolicyMatches||native.contract.lines.nodes.length!==saved.length)throw Error('Complete purchased contract coverage required');
 const mapped=new Set<string>();
 for(const item of saved){
  const e=item.context.expected,lines=native.contract.lines.nodes.filter(line=>line.productId===e.productGid&&line.variantId===e.variantGid&&line.sellingPlanId===e.sellingPlanGid&&line.quantity===prepaidPackageQuantity(e.months,e.packageQuantity).packages);
  if(lines.length!==1||mapped.has(lines[0].id))throw Error('Purchased contract lines are ambiguous');mapped.add(lines[0].id);
 }
 const query=saved.some(s=>s.context.correction||s.context.expected.paymentScope==='PREPAID_LINE')?PREPAID_CORRECTED_PAYMENT_QUERY:PREPAID_PAYMENT_QUERY;
 const response=await admin.graphql(query,{variables:{id:row.renewalOrderGid}}),body=await response.json(),data=body.data,order=data?.order;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||order?.id!==row.renewalOrderGid||order.customer?.id!==customer||order.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(order.lineItems.nodes)||order.lineItems.nodes.length!==saved.length)throw Error('Complete native renewal lines unavailable');
 const jobs=[];
 for(const item of saved){
  const e=item.context.expected,c=item.context.correction;
  const lines=order.lineItems.nodes.filter((line:{product?:{id:string};variant?:{id:string};sellingPlan?:{sellingPlanId:string};quantity:number})=>line.product?.id===e.productGid&&line.variant?.id===e.variantGid&&line.sellingPlan?.sellingPlanId===e.sellingPlanGid&&line.quantity===prepaidPackageQuantity(e.months,e.packageQuantity).nativeOrderQuantity);
  if(lines.length!==1||!reference('LineItem',lines[0].id))throw Error('Native renewal line is ambiguous');
  let correction:PrepaidPriceCorrection|undefined;
  if(c){
   const allocations=lines[0].discountAllocations,application=allocations?.[0]?.discountApplication;
   const kind=application?.__typename==='ManualDiscountApplication'?'MANUAL':application?.__typename==='AutomaticDiscountApplication'?'AUTOMATIC':null;
   if(!Array.isArray(allocations)||allocations.length!==1||!kind||application.title!==c.title||order.totalTaxSet?.shopMoney?.currencyCode!=='SGD')throw Error('Renewal correction propagation unavailable');
   correction={...c,applicationKind:kind,taxMinor:minorAmount(order.totalTaxSet.shopMoney.amount)};
  }
  jobs.push(await registerPrepaidRenewalEvidence(admin,shop,item.purchase.id,{attemptGid:row.attemptGid,idempotencyKey:row.idempotencyKey,renewalOrderGid:row.renewalOrderGid,renewalOrderLineGid:lines[0].id},correction));
 }
 for(const job of jobs)await processPrepaidRenewalEvidence(admin,shop,job.id);
 if(row.state!=='COMPLETED')await db.prepaidRenewalInbox.updateMany({where:{id:row.id,shop,state:'PENDING_VERIFY'},data:{state:'COMPLETED',completedAt:new Date()}});
 const final=await db.prepaidRenewalInbox.findUnique({where:{id:row.id}});if(final?.state!=='COMPLETED'||!final.completedAt)throw Error('Renewal inbox completion requires recovery');
 return {inboxId:row.id,linked:true as const,linkedLines:jobs.length,replayed:row.state==='COMPLETED'};
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
