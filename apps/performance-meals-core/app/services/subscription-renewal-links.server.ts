import db from '../db.server';
import {assertShop} from './security.server';
import {inspectPrepaidRenewal,inspectCorrectedPrepaidRenewal,type PrepaidRenewalExpectation} from './prepaid-renewal.server';
import type {PrepaidPriceCorrection} from './prepaid-payment.server';

type Admin=Parameters<typeof inspectPrepaidRenewal>[0];
// Development recovery only. Native reads establish the exact successful attempt
// and captured payment before linking existing routing. Never bills, earns points,
// credits a Wallet, or creates/changes a Shopify order or paid delivery.
export async function linkVerifiedPrepaidRenewal(admin:Admin,shop:string,contractGid:string,expected:PrepaidRenewalExpectation,correction?:PrepaidPriceCorrection){
 assertShop(shop);
 if(process.env.NODE_ENV==='production')throw Error('Development renewal reconciliation only');
 const proof=correction?await inspectCorrectedPrepaidRenewal(admin,shop,contractGid,expected,correction):await inspectPrepaidRenewal(admin,shop,contractGid,expected);
 const receiptId=`${shop}:verified-renewal-link:${proof.attemptGid}${expected.paymentScope==='PREPAID_LINE'?':'+expected.renewalOrderLineGid:''}`;
 const persist=()=>db.$transaction(async tx=>{
  const originalRows=await tx.operationalLine.findMany({where:{shop,orderGid:expected.orderGid}});
  const renewalRows=await tx.operationalLine.findMany({where:{shop,orderGid:expected.renewalOrderGid}});
  const original=expected.paymentScope==='PREPAID_LINE'?originalRows.filter(row=>row.orderLineGid===expected.orderLineGid):originalRows;
  const renewal=expected.paymentScope==='PREPAID_LINE'?renewalRows.filter(row=>row.orderLineGid===expected.renewalOrderLineGid):renewalRows;
  const matches=(row:typeof original[number])=>row.validationStatus==='VALIDATED'&&row.businessStream==='ready_series'&&row.customerGid===expected.customerGid&&row.productGid===expected.productGid&&row.variantGid===expected.variantGid&&row.selectionId===null&&row.bundleReviewId===null;
  if(original.length!==1||renewal.length!==1||!matches(original[0])||!matches(renewal[0])||original[0].contractGid!==contractGid||renewal[0].orderLineGid!==expected.renewalOrderLineGid||renewal[0].contractGid!==null&&renewal[0].contractGid!==contractGid)throw Error('Validated matching original and renewal routing required');
  const existing=await tx.webhookReceipt.findUnique({where:{id:receiptId}});
  if(existing){
   if(existing.shop!==shop||existing.topic!==`CORE_RENEWAL_RECONCILIATION:${expected.renewalOrderGid}`||renewal[0].contractGid!==contractGid)throw Error('Reconciliation receipt differs');
   return {contractGid,orderGid:expected.renewalOrderGid,linked:1,replayed:true};
  }
  if(!renewal[0].contractGid){
   const updated=await tx.operationalLine.updateMany({where:{id:renewal[0].id,shop,customerGid:expected.customerGid,orderGid:expected.renewalOrderGid,orderLineGid:expected.renewalOrderLineGid,validationStatus:'VALIDATED',contractGid:null,updatedAt:renewal[0].updatedAt},data:{contractGid}});
   if(updated.count!==1)throw Error('Renewal link changed concurrently; retry verified read');
  }
  await tx.webhookReceipt.create({data:{id:receiptId,shop,topic:`CORE_RENEWAL_RECONCILIATION:${expected.renewalOrderGid}`}});
  return {contractGid,orderGid:expected.renewalOrderGid,linked:1,replayed:false};
 });
 try{return await persist();}catch(error){
  const conflict=error as {code?:string;meta?:{modelName?:string}};
  if(conflict?.code!=='P2002'||conflict.meta?.modelName!=='WebhookReceipt')throw error;
  return persist();
 }
}
