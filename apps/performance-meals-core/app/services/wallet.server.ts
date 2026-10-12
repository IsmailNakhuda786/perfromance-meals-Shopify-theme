import db from '../db.server';
import {allocateWallet,type WalletLine,money} from './wallet-policy';
// Internal reservation only. No public top-up/debit route or custom payment engine exists.
// Caller must supply freshly verified Shopify lines; browser prices/categories are never trusted.
export async function reserveWallet(shop:string,customerGid:string,currency:string,checkoutReference:string,lines:WalletLine[]){
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^\w{3}$/.test(currency)||!checkoutReference)throw new Error('Invalid wallet context');
 return db.$transaction(async tx=>{
  const policy=await tx.commercePolicy.findUnique({where:{shop}});
  if(!policy?.walletEnabled)throw new Error('Wallet checkout is not activated');
  const existing=await tx.walletReservation.findUnique({where:{shop_checkoutReference:{shop,checkoutReference}}});
  const snapshot=JSON.stringify(lines);
  if(existing){if(existing.customerGid!==customerGid||existing.currency!==currency||existing.nativeLineSnapshot!==snapshot||existing.state!=='RESERVED'||existing.expiresAt<=new Date())throw new Error('Wallet reservation conflict');return existing;}
  const wallet=await tx.customerWallet.findUniqueOrThrow({where:{shop_customerGid_currency:{shop,customerGid,currency}}});
  const amounts=allocateWallet(lines,money(wallet.fundedBalance-wallet.fundedReserved),money(wallet.bonusBalance-wallet.bonusReserved));
  const changed=await tx.customerWallet.updateMany({where:{id:wallet.id,revision:wallet.revision},data:{fundedReserved:{increment:amounts.fundedUsed},bonusReserved:{increment:amounts.bonusUsed},revision:{increment:1}}});
  if(changed.count!==1)throw new Error('Wallet changed; retry');
  return tx.walletReservation.create({data:{shop,customerGid,currency,checkoutReference,nativeLineSnapshot:snapshot,fundedMinor:amounts.fundedUsed,bonusMinor:amounts.bonusUsed,expiresAt:new Date(Date.now()+10*60*1000)}});
 });
}
export async function releaseWalletReservation(shop:string,id:string){
 return db.$transaction(async tx=>{
  const reservation=await tx.walletReservation.findFirst({where:{shop,id}});
  if(!reservation||reservation.state!=='RESERVED')return;
  const changed=await tx.walletReservation.updateMany({where:{id,shop,state:'RESERVED'},data:{state:'RELEASED'}});
  if(!changed.count)return;
  const wallet=await tx.customerWallet.updateMany({where:{shop,customerGid:reservation.customerGid,currency:reservation.currency,fundedReserved:{gte:reservation.fundedMinor},bonusReserved:{gte:reservation.bonusMinor}},data:{fundedReserved:{decrement:reservation.fundedMinor},bonusReserved:{decrement:reservation.bonusMinor},revision:{increment:1}}});
  if(wallet.count!==1)throw new Error('Wallet reservation inconsistent');
 });
}

export type WalletCreditSource='customer_funded'|'gift_card_funded'|'bonus';
// Internal settlement hook only. Gift Card value may be credited only after both
// the native Gift Card debit and native store-credit settlement are reconciled.
// This function is deliberately not exposed as a browser top-up endpoint.
export async function recordSettledWalletCredit(input:{shop:string;customerGid:string;currency:string;sourceEvent:string;sourceKind:WalletCreditSource;amountMinor:number;sourceGid:string;nativeTransactionGid:string;nativeSourceTransactionGid?:string}){
 const {shop,customerGid,currency,sourceEvent,sourceKind,amountMinor,sourceGid,nativeTransactionGid,nativeSourceTransactionGid}=input;
 money(amountMinor);
 if(!amountMinor||!shop||!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^[A-Z]{3}$/.test(currency)||!sourceEvent||!sourceGid||!nativeTransactionGid||!['customer_funded','gift_card_funded','bonus'].includes(sourceKind)||(sourceKind==='gift_card_funded'&&!nativeSourceTransactionGid))throw Error('Invalid settled wallet credit');
 return db.$transaction(async tx=>{
  const existing=await tx.walletEntry.findUnique({where:{shop_sourceEvent:{shop,sourceEvent}}});
  const fundedDelta=sourceKind==='bonus'?0:amountMinor,bonusDelta=sourceKind==='bonus'?amountMinor:0;
  if(existing){if(existing.customerGid!==customerGid||existing.currency!==currency||existing.sourceKind!==sourceKind||existing.sourceGid!==sourceGid||existing.nativeTransactionGid!==nativeTransactionGid||existing.nativeSourceTransactionGid!==(nativeSourceTransactionGid||null)||existing.fundedDelta!==fundedDelta||existing.bonusDelta!==bonusDelta)throw Error('Wallet settlement conflict');return existing;}
  const wallet=await tx.customerWallet.upsert({where:{shop_customerGid_currency:{shop,customerGid,currency}},create:{shop,customerGid,currency},update:{}});
  money(wallet.fundedBalance+fundedDelta);money(wallet.bonusBalance+bonusDelta);
  const changed=await tx.customerWallet.updateMany({where:{id:wallet.id,revision:wallet.revision},data:{fundedBalance:{increment:fundedDelta},bonusBalance:{increment:bonusDelta},revision:{increment:1}}});
  if(changed.count!==1)throw Error('Wallet changed; retry');
  return tx.walletEntry.create({data:{shop,customerGid,currency,sourceEvent,sourceKind,sourceGid,nativeTransactionGid,nativeSourceTransactionGid,fundedDelta,bonusDelta}});
 });
}
