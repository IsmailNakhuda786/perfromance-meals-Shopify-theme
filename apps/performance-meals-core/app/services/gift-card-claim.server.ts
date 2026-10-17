import db from '../db.server';
import {giftCardClaimTerm} from './wallet-credit-policy';
import {assertShop} from './security.server';
import {recordSettledWalletCredit} from './wallet.server';
import type {CreditContext} from './native-wallet-credit-ready.server';

export type ClaimCard = {id:string;recipientGid:string|null;enabled:boolean;expiresOn:string|null;amountMinor:number;currency:string};
type Receipt = {id:string;ownerGid:string;amountMinor:number;currency:string};
export function assertClaimCardAvailable(card:ClaimCard,now=new Date()){
 if(!Number.isFinite(now.getTime())||card.enabled!==true||!Number.isSafeInteger(card.amountMinor)||card.amountMinor<1||card.amountMinor>2147483647)throw new Error('Gift Card is unavailable');
 if(card.expiresOn!==null){
  if(typeof card.expiresOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(card.expiresOn))throw new Error('Gift Card expiry evidence is invalid');
  const expiry=new Date(card.expiresOn+'T00:00:00Z');
  if(!Number.isFinite(expiry.getTime())||expiry.toISOString().slice(0,10)!==card.expiresOn)throw new Error('Gift Card expiry evidence is invalid');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  if(card.expiresOn<today)throw new Error('Gift Card is unavailable');
 }
}
export type ClaimGateway = {
 assertWalletReady:(customerGid:string,context?:CreditContext)=>Promise<void>;
 resolve:(code:string)=>Promise<ClaimCard>;
 debit:(cardGid:string,amountMinor:number,reference:string)=>Promise<Receipt>;
 credit:(customerGid:string,amountMinor:number)=>Promise<Receipt>;
};

// Authenticated claim orchestration; activation is controlled by merchant policy.
export async function claimGiftCard(shop:string,customerGid:string,code:string,gateway:ClaimGateway){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^[a-z0-9]{8,20}$/i.test(code))throw new Error('Invalid Gift Card claim');
 const policy=await db.commercePolicy.findUnique({where:{shop},select:{giftCardClaimsEnabled:true}});
 if(!policy?.giftCardClaimsEnabled)throw new Error('Gift Card claims are not activated');
 const card=await gateway.resolve(code); // Never persist or log the code.
 if(!/^gid:\/\/shopify\/GiftCard\/\d+$/.test(card.id)||card.recipientGid!==customerGid||card.currency!=='SGD')throw new Error('Gift Card recipient or currency does not match');
 const key={shop_giftCardGid:{shop,giftCardGid:card.id}};
 let claim=await db.giftCardWalletClaim.findUnique({where:key});
 if(claim&&claim.customerGid!==customerGid)throw new Error('Gift Card claim conflict');
 if(claim?.state==='COMPLETED')return {...claim,alreadyCompleted:true};
 const newClaim=!claim;
 if(!claim){
  assertClaimCardAvailable(card);
  giftCardClaimTerm(card.expiresOn as string,new Date().toISOString());
  await gateway.assertWalletReady(customerGid);
  // Unique card key allows only one recipient claim, including concurrent requests.
  claim=await db.giftCardWalletClaim.create({data:{shop,giftCardGid:card.id,customerGid,currency:card.currency,amountMinor:card.amountMinor,giftCardExpiresOn:card.expiresOn}});
 }
 // Never infer expiry for an in-flight historical transfer or reset it on recovery.
 const originalExpiry=claim.giftCardExpiresOn;
 if(!originalExpiry)throw new Error('Gift Card expiry requires reconciliation');
 if(['DEBIT_PENDING','CREDIT_PENDING','RECONCILIATION_REQUIRED'].includes(claim.state))throw new Error('Gift Card transfer requires reconciliation; no automatic financial retry');
 const transition=async(from:string,to:string)=>{
  const result=await db.giftCardWalletClaim.updateMany({where:{id:claim!.id,shop,state:from},data:{state:to}});
  if(result.count!==1)throw new Error('Gift Card claim changed; reload');
 };
 const receiptMatches=(receipt:Receipt,type:string,ownerGid:string)=>new RegExp('^gid://shopify/'+type+'/\\d+$').test(receipt.id)&&receipt.ownerGid===ownerGid&&receipt.currency===claim!.currency&&receipt.amountMinor===claim!.amountMinor;
 if(claim.state==='PREPARED'){
  if(!newClaim)await gateway.assertWalletReady(customerGid,{giftCardClaimId:claim.id});
  // Recheck the Singapore date after asynchronous readiness work, which can cross midnight.
  assertClaimCardAvailable(card);
  giftCardClaimTerm(originalExpiry,new Date().toISOString());
  if(card.expiresOn!==originalExpiry)throw new Error('Gift Card expiry changed; reconciliation required');
  if(card.amountMinor!==claim.amountMinor)throw new Error('Gift Card balance or availability changed; reconciliation required');
  await transition('PREPARED','DEBIT_PENDING');
  try{
   const debit=await gateway.debit(card.id,claim.amountMinor,claim.id);
   if(!receiptMatches(debit,'GiftCardDebitTransaction',card.id))throw new Error('Native debit evidence does not match');
   claim=await db.giftCardWalletClaim.update({where:{id:claim.id},data:{state:'DEBIT_CONFIRMED',debitGid:debit.id}});
  }catch{
   await db.giftCardWalletClaim.updateMany({where:{id:claim.id,state:'DEBIT_PENDING'},data:{state:'RECONCILIATION_REQUIRED'}});
   throw new Error('Gift Card debit requires reconciliation; no automatic financial retry');
  }
 }
 if(claim.state==='DEBIT_CONFIRMED'){
  giftCardClaimTerm(originalExpiry,new Date().toISOString());
  await transition('DEBIT_CONFIRMED','CREDIT_PENDING');
  try{
   const credit=await gateway.credit(customerGid,claim.amountMinor);
   if(!receiptMatches(credit,'StoreCreditAccountCreditTransaction',customerGid))throw new Error('Native credit evidence does not match');
   claim=await db.giftCardWalletClaim.update({where:{id:claim.id},data:{state:'AWAITING_LEDGER',creditGid:credit.id}});
  }catch{
   await db.giftCardWalletClaim.updateMany({where:{id:claim.id,state:'CREDIT_PENDING'},data:{state:'RECONCILIATION_REQUIRED'}});
   throw new Error('Wallet credit requires reconciliation; no automatic financial retry');
  }
 }
 if(claim.state!=='AWAITING_LEDGER'||!claim.debitGid||!claim.creditGid)throw new Error('Gift Card transfer evidence is incomplete');
 const entry=await recordSettledWalletCredit({shop,customerGid,currency:claim.currency,sourceEvent:'gift-card-claim:'+claim.id,sourceKind:'gift_card_funded',amountMinor:claim.amountMinor,sourceGid:claim.giftCardGid,nativeSourceTransactionGid:claim.debitGid,nativeTransactionGid:claim.creditGid});
 const completed=await db.giftCardWalletClaim.update({where:{id:claim.id},data:{state:'COMPLETED',ledgerEntryId:entry.id}});
 return {...completed,alreadyCompleted:false};
}
