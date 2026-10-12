import db from '../db.server';
import {assertShop} from './security.server';
import {recordSettledWalletCredit} from './wallet.server';

export type ClaimCard = {id:string;recipientGid:string|null;enabled:boolean;expiresOn:string|null;amountMinor:number;currency:string};
type Receipt = {id:string;ownerGid:string;amountMinor:number;currency:string};
export type ClaimGateway = {
 resolve:(code:string)=>Promise<ClaimCard>;
 debit:(cardGid:string,amountMinor:number,reference:string)=>Promise<Receipt>;
 credit:(customerGid:string,amountMinor:number)=>Promise<Receipt>;
};

// Internal orchestration only. No public financial route is enabled.
export async function claimGiftCard(shop:string,customerGid:string,code:string,gateway:ClaimGateway){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^[a-z0-9]{8,20}$/i.test(code))throw new Error('Invalid Gift Card claim');
 const policy=await db.commercePolicy.findUnique({where:{shop}});
 if(!policy?.giftCardClaimsEnabled)throw new Error('Gift Card claims are not activated');
 const card=await gateway.resolve(code); // Never persist or log the code.
 if(!/^gid:\/\/shopify\/GiftCard\/\d+$/.test(card.id)||card.recipientGid!==customerGid||card.currency!=='SGD')throw new Error('Gift Card recipient or currency does not match');
 const key={shop_giftCardGid:{shop,giftCardGid:card.id}};
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 let claim=await db.giftCardWalletClaim.findUnique({where:key});
 if(claim&&claim.customerGid!==customerGid)throw new Error('Gift Card claim conflict');
 if(claim?.state==='COMPLETED')return claim;
 if(!claim){
  if(!card.enabled||(card.expiresOn&&card.expiresOn<today)||!Number.isSafeInteger(card.amountMinor)||card.amountMinor<1||card.amountMinor>2147483647)throw new Error('Gift Card is unavailable');
  // Unique card key allows only one recipient claim, including concurrent requests.
  claim=await db.giftCardWalletClaim.create({data:{shop,giftCardGid:card.id,customerGid,currency:card.currency,amountMinor:card.amountMinor}});
 }
 if(['DEBIT_PENDING','CREDIT_PENDING','RECONCILIATION_REQUIRED'].includes(claim.state))throw new Error('Gift Card transfer requires reconciliation; no automatic financial retry');
 const transition=async(from:string,to:string)=>{
  const result=await db.giftCardWalletClaim.updateMany({where:{id:claim!.id,shop,state:from},data:{state:to}});
  if(result.count!==1)throw new Error('Gift Card claim changed; reload');
 };
 const receiptMatches=(receipt:Receipt,type:string,ownerGid:string)=>new RegExp('^gid://shopify/'+type+'/\\d+$').test(receipt.id)&&receipt.ownerGid===ownerGid&&receipt.currency===claim!.currency&&receipt.amountMinor===claim!.amountMinor;
 if(claim.state==='PREPARED'){
  if(!card.enabled||(card.expiresOn&&card.expiresOn<today)||card.amountMinor!==claim.amountMinor)throw new Error('Gift Card balance or availability changed; reconciliation required');
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
 return db.giftCardWalletClaim.update({where:{id:claim.id},data:{state:'COMPLETED',ledgerEntryId:entry.id}});
}
