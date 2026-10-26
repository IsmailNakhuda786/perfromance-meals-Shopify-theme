import db from '../db.server';
import {assertShop} from './security.server';

const topics={
 CUSTOMERS_DATA_REQUEST:'PRIVACY_DATA_REQUEST',
 CUSTOMERS_REDACT:'PRIVACY_CUSTOMER_REDACTION',
 SHOP_REDACT:'PRIVACY_SHOP_REDACTION',
} as const;
export class PrivacyRequestError extends Error {}

function customerId(payload:unknown){
 if(!payload||typeof payload!=='object')throw new PrivacyRequestError('Invalid privacy customer');
 const customer=('customer' in payload)?payload.customer:null;
 const value=customer&&typeof customer==='object'&&'id' in customer?customer.id:null;
 if(typeof value==='number'&&(!Number.isSafeInteger(value)||value<=0))throw new PrivacyRequestError('Invalid privacy customer');
 if((typeof value!=='string'&&typeof value!=='number')||! /^[1-9]\d{0,29}$/.test(String(value)))throw new PrivacyRequestError('Invalid privacy customer');
 return String(value);
}

// Durable intake only. The previous handler deleted payment idempotency records
// and omitted newer customer tables. Never erase those records before a reviewed
// minimal-audit replacement and its replay protection are in place.
export async function queuePrivacyRequest(shop:string,topic:string,payload:unknown,eventId:string|null){
 assertShop(shop);
 if(!Object.hasOwn(topics,topic)||typeof eventId!=='string'||!/^[-a-zA-Z0-9_:]{1,200}$/.test(eventId))throw new PrivacyRequestError('Invalid privacy event');
 if(!payload||typeof payload!=='object'||('shop_domain' in payload&&payload.shop_domain!==shop))throw new PrivacyRequestError('Privacy store identity differs');
 const kind=topics[topic as keyof typeof topics];
 const selectionId=topic==='SHOP_REDACT'?'shop':`customer:${customerId(payload)}`;
 const id=`privacy:${shop}:${eventId}`;
 try{
  return await db.$transaction(async tx=>{
   const previous=await tx.webhookReceipt.findUnique({where:{id}});
   if(previous){
    if(previous.shop!==shop||previous.topic!==topic)throw Error('Privacy event identity differs');
    const operation=await tx.planOperation.findFirst({where:{shop,kind,cycleReference:id}});
    if(!operation||operation.selectionId!==selectionId)throw Error('Privacy event identity differs');
    return operation;
   }
   const operation=await tx.planOperation.create({data:{shop,selectionId,kind,state:'PENDING_REVIEW',cycleReference:id}});
   await tx.webhookReceipt.create({data:{id,shop,topic}});
   return operation;
  });
 }catch(error){
  // Verify the winner of a concurrent unique insert; no blind write retry.
  if(!(error&&typeof error==='object'&&'code' in error&&error.code==='P2002'))throw error;
  const receipt=await db.webhookReceipt.findUnique({where:{id}});
  const operation=await db.planOperation.findFirst({where:{shop,kind,cycleReference:id}});
  if(receipt?.shop!==shop||receipt.topic!==topic||!operation||operation.selectionId!==selectionId)throw Error('Privacy event identity differs');
  return operation;
 }
}

// Schema coverage is verified in QA. Counts expose no contact or menu data.
export const privacyCustomerModels=[
 'mealPlanDraft','mealPlanSelection','operationalLine','customerWallet',
 'walletEntry','walletReservation','orderCancellation','rewardsAccount',
 'rewardsEntry','giftCardWalletClaim','walletTopUpSettlement','walletTopUpIntent',
 'mealPlanMenuRevision','rewardRedemption','orderSupportRequest','walletCreditExpiry',
 'giftCardExpiryReminder','readyDeliveryDraft','readyDeliveryReminder','readyDeliverySlotReservation','readyDeliveryVisit','readyDeliveryVisitMember','bundlePurchaseReview','coreWalletRedemptionDraft','subscriptionRenewalStop','prepaidPurchaseEvidence','prepaidRenewalEvidence','prepaidRenewalInbox','prepaidPricingApproval','prepaidPurchaseInbox',
] as const;
export const privacyShopOnlyModels=[
 'session','webhookReceipt','commercePolicy','rewardRuleVersion','rewardRuleActivation','readyDeliverySlot',
] as const;
export const privacyIndirectModels=['planOperation','migrationMapping'] as const;

export async function inspectCustomerPrivacyData(shop:string,rawCustomerId:unknown){
 assertShop(shop);
 const id=customerId({customer:{id:rawCustomerId}}),customerGid=`gid://shopify/Customer/${id}`;
 return db.$transaction(async tx=>{
  const counts:Record<string,number>={};
  for(const model of privacyCustomerModels){
   // Prisma generates a different generic count overload per delegate. All
   // models in this reviewed list share these two fields (schema-tested).
   const delegate=tx[model] as unknown as {count:(input:{where:{shop:string;customerGid:string}})=>Promise<number>};
   counts[model]=await delegate.count({where:{shop,customerGid}});
  }
  const selections=await tx.mealPlanSelection.findMany({where:{shop,customerGid},select:{id:true}});
  counts.planOperation=await tx.planOperation.count({where:{shop,OR:[{selectionId:{in:selections.map(row=>row.id)}},{selectionId:`customer:${id}`} ]}});
  counts.migrationMapping=await tx.migrationMapping.count({where:{shop,sourceCustomerId:id}});
  return {counts,financialAuditRequired:true,executionReady:false as const};
 // This read-only inventory spans every customer model. Remote PostgreSQL
 // exceeded Prisma's five-second default while counting, without any faulty
 // record. Keep a bounded review window rather than failing a valid request.
 },{maxWait:5000,timeout:30000});
}

// Internal review backlog, not a customer endpoint or automatic erasure worker.
// Shopify's documented 30-day completion window is an operational review target,
// not a legal retention period. Duplicate deliveries never reset receivedAt.
export async function readPrivacyReviewQueue(shop:string,options:{now?:Date;limit?:number;after?:string}={}){
 assertShop(shop);
 const now=options.now??new Date(),limit=options.limit??25;
 if(!Number.isFinite(now.getTime())||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new PrivacyRequestError('Invalid privacy review bounds');
 const where={shop,state:'PENDING_REVIEW',kind:{in:Object.values(topics)}};
 const cursor=options.after?await db.planOperation.findFirst({where:{...where,id:options.after},select:{id:true,createdAt:true}}):null;
 if(options.after&&!cursor)throw new PrivacyRequestError('Invalid privacy review cursor');
 const windowMs=30*24*60*60*1000;
 const [records,pending,overdue]=await db.$transaction([
  db.planOperation.findMany({where:{...where,...(cursor?{OR:[{createdAt:{gt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{gt:cursor.id}}]}:{})},orderBy:[{createdAt:'asc'},{id:'asc'}],take:limit+1,select:{id:true,kind:true,state:true,createdAt:true}}),
  db.planOperation.count({where}),
  db.planOperation.count({where:{...where,createdAt:{lte:new Date(now.getTime()-windowMs)}}}),
 ]);
 const requests=records.slice(0,limit).map(record=>({requestId:record.id,kind:record.kind,state:record.state,receivedAt:record.createdAt.toISOString(),reviewDueAt:new Date(record.createdAt.getTime()+windowMs).toISOString(),overdue:record.createdAt.getTime()+windowMs<=now.getTime()}));
 return {requests,pending,overdue,hasMore:records.length>limit,nextCursor:records.length>limit?requests.at(-1)?.requestId:null};
}
