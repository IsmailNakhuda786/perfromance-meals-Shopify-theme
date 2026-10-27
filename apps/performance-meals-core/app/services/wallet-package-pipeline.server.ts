import {createHash} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {prepareApprovedWalletTopUpDraft} from './wallet-top-up-checkout.server';
import {nativeTopUpDraftGateway} from './wallet-top-up-draft-native.server';
import {readNativeTopUpOrder} from './wallet-top-up-native.server';
import {verifyPaidApprovedTopUp,type TopUpOrder} from './wallet-top-up-policy';
import {approvedTopUpPackage,WALLET_CREDIT_POLICY_VERSION} from './wallet-credit-policy';

type Admin=Parameters<typeof readNativeTopUpOrder>[0];
type Catalogue={productGid:string;variantGid:string;paymentGateways:string[]};
type Draft=Awaited<ReturnType<ReturnType<typeof nativeTopUpDraftGateway>['read']>>;
type Proof=ReturnType<typeof verifyPaidApprovedTopUp>;
type Allocation={sourceKind:'customer_funded'|'bonus';amountMinor:number;foodOnly:boolean;spendable:false;nativeTransactionGid:null;issuedAt:null;expiresAt:null};
type Saved={version:1;shop:string;customerGid:string;requestKey:string;paidMinor:number;policyVersion:string;catalogue:Catalogue;draft:Draft|null;proof:Proof|null;allocations:Allocation[];incident:string|null};
type Operation=NonNullable<Awaited<ReturnType<typeof db.planOperation.findUnique>>>;
class FundingConflict extends Error {}
const KIND='WALLET_PACKAGE_SETTLEMENT',VERIFIED='PAYMENT_VERIFIED_ISSUANCE_BLOCKED';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const ref=(kind:string,v:unknown):v is string=>typeof v==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(v);
const operationId=(shop:string,customer:string,key:string)=>'wallet-package:'+hash([shop,customer,key]);
const orderClaim=(shop:string,id:string)=>`wallet-package-order:${shop}:${id}`;
const paymentClaim=(shop:string,id:string)=>`wallet-package-payment:${shop}:${id}`;
function scope(shop:string){
 assertShop(shop);
 const customer=process.env.WALLET_PACKAGE_QA_CUSTOMER;
 if(process.env.NODE_ENV==='production'||process.env.WALLET_PACKAGE_PIPELINE_ENABLED!=='true'||!ref('Customer',customer))throw Error('Wallet package verification pipeline is not activated');
 return customer;
}
function catalogue(c:Catalogue):Catalogue{
 if(!ref('Product',c.productGid)||!ref('ProductVariant',c.variantGid)||!Array.isArray(c.paymentGateways)||!c.paymentGateways.length||c.paymentGateways.some(g=>typeof g!=='string'||!g.trim()||g.length>100||/store.?credit|gift.?card|redeemable|manual/i.test(g)))throw Error('Explicit external-payment catalogue required');
 return {productGid:c.productGid,variantGid:c.variantGid,paymentGateways:[...new Set(c.paymentGateways)].sort()};
}
function decode(row:Operation):Saved{
 if(row.kind!==KIND||!row.productionReference||row.productionReference.length>32768)throw Error('Wallet package record unavailable');
 const s=JSON.parse(row.productionReference) as Saved;
 if(s.version!==1||s.shop!==row.shop||!ref('Customer',s.customerGid)||row.selectionId!==`customer:${s.customerGid.split('/').at(-1)}`||row.id!==operationId(s.shop,s.customerGid,s.requestKey)||s.policyVersion!==WALLET_CREDIT_POLICY_VERSION||JSON.stringify(catalogue(s.catalogue))!==JSON.stringify(s.catalogue))throw Error('Wallet package identity differs');
 const p=approvedTopUpPackage(s.paidMinor);
 if(s.proof){
  if(s.proof.orderGid!==row.cycleReference||s.proof.customerGid!==s.customerGid||s.proof.amountMinor!==p.paidMinor||s.proof.currency!=='SGD'||!ref('OrderTransaction',s.proof.paymentGid)||JSON.stringify(s.proof.creditPlan)!==JSON.stringify({policyVersion:s.policyVersion,packageId:p.id,customerFundedMinor:p.paidMinor,foodOnlyBonusMinor:p.bonusMinor,totalMinor:p.totalMinor,expiryYears:1,reminderMonthsBefore:1})||JSON.stringify(s.allocations)!==JSON.stringify(allocations(p.paidMinor,p.bonusMinor)))throw Error('Wallet package accounting differs');
 }else if(s.allocations.length||row.cycleReference)throw Error('Accounting cannot precede payment proof');
 return s;
}
function allocations(principal:number,bonus:number):Allocation[]{return [
 {sourceKind:'customer_funded',amountMinor:principal,foodOnly:false,spendable:false,nativeTransactionGid:null,issuedAt:null,expiresAt:null},
 {sourceKind:'bonus',amountMinor:bonus,foodOnly:true,spendable:false,nativeTransactionGid:null,issuedAt:null,expiresAt:null},
];}
async function disabledPolicy(shop:string){if((await db.commercePolicy.findUnique({where:{shop}}))?.walletTopUpsEnabled!==false)throw Error('General Wallet top-ups must remain disabled');}
async function owned(shop:string,id:string){
 const customer=scope(shop),row=await db.planOperation.findFirst({where:{id,shop,kind:KIND}});
 if(!row||decode(row).customerGid!==customer)throw Error('Owned Wallet package record unavailable');
 return row;
}
async function hold(row:Operation,reason:string){
 const current=await db.planOperation.findUniqueOrThrow({where:{id:row.id}}),s=decode(current);
 if(current.state==='RECONCILIATION_REQUIRED')return current;
 return db.planOperation.updateMany({where:{id:current.id,shop:current.shop,kind:KIND,state:current.state,productionReference:current.productionReference},data:{state:'RECONCILIATION_REQUIRED',productionReference:JSON.stringify({...s,incident:reason})}});
}
function draftMatches(d:Draft,s:Saved){
 let url:URL;try{url=new URL(d.checkoutUrl);}catch{return false;}
 return ref('DraftOrder',d.id)&&d.customerGid===s.customerGid&&d.productGid===s.catalogue.productGid&&d.variantGid===s.catalogue.variantGid&&d.amountMinor===s.paidMinor&&d.currency==='SGD'&&url.protocol==='https:'&&url.hostname===s.shop&&!url.username&&!url.password&&(!s.draft||d.id===s.draft.id&&d.checkoutUrl===s.draft.checkoutUrl);
}
// Development-only checkout orchestration. No balance, credit/debit, capture or
// refund API exists in this module. Current unpaid QA drafts are not recreated.
export async function createApprovedPackageCheckout(admin:Admin,shop:string,customerGid:string,requestKey:string,paidMinor:number,configuration:Catalogue){
 if(scope(shop)!==customerGid||!/^[-a-zA-Z0-9]{16,80}$/.test(requestKey))throw Error('Invalid Wallet package owner/request');
 await disabledPolicy(shop);
 const c=catalogue(configuration),p=approvedTopUpPackage(paidMinor),id=operationId(shop,customerGid,requestKey);
 let row=await db.planOperation.findUnique({where:{id}});
 if(!row){
  const saved:Saved={version:1,shop,customerGid,requestKey,paidMinor:p.paidMinor,policyVersion:WALLET_CREDIT_POLICY_VERSION,catalogue:c,draft:null,proof:null,allocations:[],incident:null};
  try{row=await db.planOperation.create({data:{id,shop,selectionId:`customer:${customerGid.split('/').at(-1)}`,kind:KIND,state:'PREPARED',productionReference:JSON.stringify(saved)}});}catch(error){if((error as {code?:string}).code!=='P2002')throw error;row=await db.planOperation.findUniqueOrThrow({where:{id}});}
 }
 const saved=decode(row);
 if(saved.paidMinor!==paidMinor||JSON.stringify(saved.catalogue)!==JSON.stringify(c))throw Error('Wallet package request changed');
 if(row.state==='DRAFT_READY'||row.state===VERIFIED)return {id:row.id,state:row.state,checkout:saved.draft,creditIssued:false as const};
 if(row.state!=='PREPARED')throw Error('Wallet package requires reconciliation; no automatic checkout retry');
 const prepared=await prepareApprovedWalletTopUpDraft(admin,shop,customerGid,paidMinor,c);
 const claim=await db.planOperation.updateMany({where:{id,shop,state:'PREPARED',productionReference:row.productionReference},data:{state:'DRAFT_PENDING'}});
 if(claim.count!==1)throw Error('Wallet package changed; reload');
 try{
  const d=await nativeTopUpDraftGateway(admin,shop).create({...prepared.input,customAttributes:[{key:'_pm_wallet_package_intent',value:id}]});
  if(!draftMatches(d,saved)||d.orderGid!==null)throw Error('Draft binding differs');
  const changed=await db.planOperation.updateMany({where:{id,shop,state:'DRAFT_PENDING'},data:{state:'DRAFT_READY',productionReference:JSON.stringify({...saved,draft:d})}});
  if(changed.count!==1)throw Error('Draft outcome requires reconciliation');
  return {id,state:'DRAFT_READY',checkout:d,creditIssued:false as const};
 }catch{await hold(row,'DRAFT_OUTCOME_UNCERTAIN');throw Error('Wallet package checkout requires reconciliation; no automatic retry');}
}

// Called only after Shopify SDK webhook authentication. Payload attributes are
// routing hints; they can never establish customer, amount or payment proof.
export async function receiveWalletPackageEvent(shop:string,topic:string,eventId:string,payload:{admin_graphql_api_id?:unknown;note_attributes?:Array<{name?:unknown;value?:unknown}>}){
 scope(shop);
 if(!['ORDERS_PAID','ORDERS_UPDATED'].includes(topic)||!/^[-a-zA-Z0-9_:]{1,200}$/.test(eventId)||!ref('Order',payload.admin_graphql_api_id))throw Error('Invalid authenticated Wallet event');
 const orderGid=payload.admin_graphql_api_id,claim=await db.webhookReceipt.findUnique({where:{id:orderClaim(shop,orderGid)}});
 const hints=(payload.note_attributes??[]).filter(a=>a.name==='_pm_wallet_package_intent');
 if(hints.length>1)throw Error('Ambiguous Wallet event hint');
 const id=claim?.topic??hints[0]?.value;
 if(id===undefined)return null;
 if(typeof id!=='string'||!/^wallet-package:[a-f0-9]{64}$/.test(id)||claim&&hints.length&&hints[0].value!==id)throw Error('Wallet event routing differs');
 await owned(shop,id);
 const receiptId=`wallet-package-event:${shop}:${eventId}`,content=JSON.stringify({version:1,topic,operationId:id,orderGid});
 try{await db.webhookReceipt.create({data:{id:receiptId,shop,topic:content}});}catch(error){if((error as {code?:string}).code!=='P2002')throw error;const previous=await db.webhookReceipt.findUnique({where:{id:receiptId}});if(previous?.shop!==shop||previous.topic!==content)throw Error('Wallet event replay differs');}
 return receiptId;
}

export async function verifyWalletPackageEvent(admin:Admin,shop:string,receiptId:string){
 scope(shop);await disabledPolicy(shop);
 const receipt=await db.webhookReceipt.findFirst({where:{id:receiptId,shop}});
 if(!receipt||!receiptId.startsWith(`wallet-package-event:${shop}:`))throw Error('Authenticated Wallet event receipt required');
 const event=JSON.parse(receipt.topic);
 if(event.version!==1||!['ORDERS_PAID','ORDERS_UPDATED'].includes(event.topic)||!ref('Order',event.orderGid))throw Error('Invalid stored Wallet event');
 const row=await owned(shop,event.operationId),saved=decode(row);
 if(row.state==='RECONCILIATION_REQUIRED')throw Error('Wallet package requires explicit reconciliation');
 if(!['DRAFT_READY',VERIFIED].includes(row.state)||!saved.draft)throw Error('Confirmed Wallet checkout required');
 // API/network failure remains retryable, with the durable receipt retained.
 const draft=await nativeTopUpDraftGateway(admin,shop).read(saved.draft.id);
 if(!draftMatches(draft,saved)){await hold(row,'NATIVE_DRAFT_ORDER_DIFFERS');throw Error('Wallet draft/order binding differs');}
 // An attacker can copy a routing hint onto another order. It must neither
 // consume this intent nor poison a valid customer's funding operation.
 if(draft.orderGid!==event.orderGid)return {id:row.id,state:row.state,ignored:true,creditIssued:false as const};
 const order:TopUpOrder=await readNativeTopUpOrder(admin,shop,event.orderGid);
 let proof:Proof;
 try{proof=verifyPaidApprovedTopUp(order,saved.customerGid,{productGid:saved.catalogue.productGid,variants:{[saved.catalogue.variantGid]:saved.paidMinor},paymentGateways:saved.catalogue.paymentGateways});}
 catch{await hold(row,'PAYMENT_REFUND_DISPUTE_OR_ELIGIBILITY_REVIEW');throw Error('Wallet funding proof requires reconciliation; no credit issued');}
 if(saved.proof&&JSON.stringify(saved.proof)!==JSON.stringify(proof)){await hold(row,'PAYMENT_PROOF_CHANGED');throw Error('Wallet payment proof changed');}
 try{return await db.$transaction(async tx=>{
  const locked=await tx.planOperation.updateMany({where:{id:row.id,shop,kind:KIND,state:{in:['DRAFT_READY',VERIFIED]}},data:{updatedAt:new Date()}});
  if(locked.count!==1)throw new FundingConflict('Wallet package changed during verification');
  const current=await tx.planOperation.findUniqueOrThrow({where:{id:row.id}}),s=decode(current);
  if(JSON.stringify(s.catalogue)!==JSON.stringify(saved.catalogue)||JSON.stringify(s.draft)!==JSON.stringify(saved.draft))throw new FundingConflict('Wallet checkout changed during verification');
  if(await tx.walletTopUpSettlement.findUnique({where:{shop_orderGid:{shop,orderGid:event.orderGid}}}))throw new FundingConflict('Order already belongs to another settlement');
  for(const id of [orderClaim(shop,event.orderGid),paymentClaim(shop,proof.paymentGid)]){
   const existing=await tx.webhookReceipt.findUnique({where:{id}});
   if(existing&&existing.topic!==row.id)throw new FundingConflict('Order/payment already belongs to another Wallet package');
   if(!existing&&current.state===VERIFIED)throw new FundingConflict('Confirmed Wallet funding claim missing');
   if(!existing)await tx.webhookReceipt.create({data:{id,shop,topic:row.id}});
  }
  if(current.state===VERIFIED){if(JSON.stringify(s.proof)!==JSON.stringify(proof))throw new FundingConflict('Wallet proof replay differs');return {id:row.id,state:VERIFIED,replayed:true,creditIssued:false as const};}
  const next={...s,proof,allocations:allocations(proof.creditPlan.customerFundedMinor,proof.creditPlan.foodOnlyBonusMinor)};
  await tx.planOperation.update({where:{id:row.id},data:{state:VERIFIED,cycleReference:event.orderGid,productionReference:JSON.stringify(next)}});
  return {id:row.id,state:VERIFIED,replayed:false,creditIssued:false as const};
 },{timeout:30000});}catch(error){
  if(error instanceof FundingConflict||(error as {code?:string}).code==='P2002'){await hold(row,'DUPLICATE_OR_CHANGED_FUNDING_CLAIM');}
  throw error;
 }
}

export async function handleWalletPackageWebhook(admin:Admin,shop:string,topic:string,eventId:string,payload:Parameters<typeof receiveWalletPackageEvent>[3]){
 if(process.env.WALLET_PACKAGE_PIPELINE_ENABLED!=='true')return false;
 const id=await receiveWalletPackageEvent(shop,topic,eventId,payload);
 if(!id)return false;
 const result=await verifyWalletPackageEvent(admin,shop,id);
 return !('ignored' in result&&result.ignored);
}

// Non-spendable funding obligations, not CustomerWallet/WalletEntry balances.
// Native issuance/expiry start is deliberately absent until an approved adapter
// exists. Every allocation remains food-restricted where required and unissued.
export async function readWalletPackageAccounting(shop:string,id:string){
 const row=await owned(shop,id),s=decode(row);
 return {id,state:row.state,paymentVerified:s.proof!==null,allocations:s.allocations,creditIssued:false as const,spendable:false as const,reconciliationRequired:row.state==='RECONCILIATION_REQUIRED'};
}
