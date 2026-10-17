import db from '../db.server';
import {assertShop} from './security.server';
import {readNativeWallet} from './native-wallet.server';
import {reconcileNativeWalletHistory} from './native-wallet-returns.server';
import {coreWalletPolicyStartedAt} from './wallet-core-policy.server';

type Admin=Parameters<typeof readNativeWallet>[0];
export type CreditContext={giftCardClaimId?:string;rewardRedemptionId?:string;topUpSettlementId?:string;expiryId?:string};

// Reconcile only verified historical receipts. This never creates native credit,
// invents missing funding or retries a financial operation with an unknown result.
export async function hasPendingNativeWalletCredit(shop:string,customerGid:string,context:CreditContext={}){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw Error('Invalid Wallet customer');
 const where={shop,customerGid};
 const pending=await Promise.all([
  db.giftCardWalletClaim.count({where:{...where,state:{not:'COMPLETED'},...(context.giftCardClaimId?{id:{not:context.giftCardClaimId}}:{})}}),
  db.rewardRedemption.count({where:{...where,state:{not:'COMPLETED'},...(context.rewardRedemptionId?{id:{not:context.rewardRedemptionId}}:{})}}),
  db.walletTopUpSettlement.count({where:{...where,state:{not:'COMPLETED'},...(context.topUpSettlementId?{id:{not:context.topUpSettlementId}}:{})}}),
  db.orderCancellation.count({where:{...where,state:{in:['CANCEL_PENDING','AWAITING_NATIVE_REFUND','RECONCILIATION_REQUIRED']}}}),
  process.env.WALLET_CORE_EXPIRY_ENABLED==='true'?db.walletCreditExpiry.count({where:{...where,OR:[{expiryState:{in:['DEBIT_PENDING','AWAITING_LEDGER','UNKNOWN']}},...(!context.expiryId?[{enforcementMode:'CORE_MANAGED',expiryState:'PENDING',expiresAt:{lte:new Date()}}]:[])],...(context.expiryId?{id:{not:context.expiryId}}:{})}}):Promise.resolve(0),
 ]);
 if(pending.some(count=>count>0))return true;
 if(process.env.WALLET_CORE_EXPIRY_ENABLED==='true'){
  const startsAt=coreWalletPolicyStartedAt();
  const registered=await db.walletCreditExpiry.findMany({where:{...where,enforcementMode:'CORE_MANAGED'},select:{walletEntryId:true}});
  // An unregistered new monetary receipt must not silently become an
  // unrestricted credit without its one-year term. Registration is read-only
  // native verification and is recovered independently of financial issuance.
  if(await db.walletEntry.count({where:{...where,currency:'SGD',fundedDelta:{gt:0},createdAt:{gte:startsAt},id:{notIn:registered.map(row=>row.walletEntryId)}}}))return true;
 }
 return false;
}

export async function assertNativeWalletCreditReady(admin:Admin,shop:string,customerGid:string,context:CreditContext={}){
 if(await hasPendingNativeWalletCredit(shop,customerGid,context))throw Error('Wallet requires reconciliation before new credit');
 await reconcileNativeWalletHistory(admin,shop,customerGid);
 const native=await readNativeWallet(admin,shop,customerGid);
 if(native.currency!=='SGD')throw Error('Wallet currency requires reconciliation');
 const where={shop,customerGid};
 const [wallet,ledger]=await Promise.all([
  db.customerWallet.findUnique({where:{shop_customerGid_currency:{...where,currency:'SGD'}}}),
  db.walletEntry.aggregate({where:{...where,currency:'SGD'},_sum:{fundedDelta:true}}),
 ]);
 const balance=wallet?.fundedBalance??0;
 if(balance!==(ledger._sum.fundedDelta??0)||balance!==native.balanceMinor)throw Error('Wallet requires reconciliation before new credit');
}
