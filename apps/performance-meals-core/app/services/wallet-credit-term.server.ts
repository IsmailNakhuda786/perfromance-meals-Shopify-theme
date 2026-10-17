import db from '../db.server';
import {walletCreditTerm,giftCardClaimTerm} from './wallet-credit-policy';
// Shared immutable receipt check for registration, reminders and expiry debits.
// Historical Gift Card claims without an expiry snapshot require review.
export async function settledWalletCreditTerm(entry:{id:string;shop:string;customerGid:string;sourceKind:string;currency:string;fundedDelta:number;sourceGid:string|null;nativeTransactionGid:string|null},issuedAt:Date){
 if(entry.sourceKind!=='gift_card_funded')return walletCreditTerm(issuedAt.toISOString());
 const claim=await db.giftCardWalletClaim.findFirst({where:{shop:entry.shop,customerGid:entry.customerGid,giftCardGid:entry.sourceGid??'',creditGid:entry.nativeTransactionGid,ledgerEntryId:entry.id,state:'COMPLETED'}});
 if(!claim?.giftCardExpiresOn||!claim.debitGid||!entry.nativeTransactionGid||claim.currency!==entry.currency||claim.amountMinor!==entry.fundedDelta)throw Error('Gift Card original expiry requires reconciliation');
 return giftCardClaimTerm(claim.giftCardExpiresOn,issuedAt.toISOString());
}
