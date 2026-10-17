import db from '../db.server';
import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {allocateFundedFifo,parseFundedAllocations} from './wallet-fifo';
import {recordNativeWalletDebit} from './native-wallet-debits.server';
import {readNativeWalletHistory} from './native-wallet-history.server';

type Origin={id:string;status:string;kind:string;gateway:string;amountSet:{shopMoney:{amount:string;currencyCode:string}};order:{id:string;currencyCode:string;customer:{id:string}|null};parentTransaction:{id:string;gateway:string}|null};
export type WalletNativeTransaction={id:string;createdAt:string;amount:{amount:string;currencyCode:string};event:string;origin:Origin|null;debitTransaction?:{id:string}};
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export const REFUND_FUNDING_QUERY=`#graphql
query WalletRefundFunding($id:ID!){shop{myshopifyDomain} order(id:$id){id customer{id} currencyCode totalReceivedSet{shopMoney{amount currencyCode}} totalRefundedSet{shopMoney{amount currencyCode}} transactions(first:100){id status kind gateway amountSet{shopMoney{amount currencyCode}}}}}`;
type RefundFunding={id:string;customer:{id:string}|null;currencyCode:string;totalReceivedSet:{shopMoney:{amount:string;currencyCode:string}};totalRefundedSet:{shopMoney:{amount:string;currencyCode:string}};transactions:Array<{id:string;status:string;kind:string;gateway:string;amountSet:{shopMoney:{amount:string;currencyCode:string}}}>};

// Bookkeeping only: a verified Shopify return is required; no credit is issued.
export async function recordNativeWalletReturn(shop:string,customerGid:string,receipt:WalletNativeTransaction,funding?:RefundFunding){
 assertShop(shop);
 const currency=receipt.amount.currencyCode,origin=receipt.origin;
 const revert=/^gid:\/\/shopify\/StoreCreditAccountDebitRevertTransaction\/\d+$/.test(receipt.id);
 const walletRefund=!revert&&origin?.kind==='REFUND'&&origin.parentTransaction?.gateway==='shopify_store_credit';
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!['ORDER_REFUND','ORDER_CANCELLATION','PAYMENT_FAILURE','PAYMENT_RETURNED'].includes(receipt.event)||(!revert&&!/^gid:\/\/shopify\/StoreCreditAccountCreditTransaction\/\d+$/.test(receipt.id))||!origin||origin.order.customer?.id!==customerGid||origin.order.currencyCode!==currency||origin.status!=='SUCCESS')throw Error('Native Wallet return evidence invalid');
 const amount=minorAmount(receipt.amount.amount);
 if(!amount)throw Error('Native Wallet return amount invalid');
 const sourceEvent=!origin.parentTransaction&&origin.gateway==='shopify_store_credit'&&origin.kind==='REFUND'?'native-wallet-full-refund:'+origin.id:'native-wallet-return:'+receipt.id;
 return db.$transaction(async tx=>{
  const where={shop,customerGid,currency};
  const existing=await tx.walletEntry.findFirst({where:{shop,OR:[{nativeTransactionGid:receipt.id},{sourceEvent}]}});
  if(existing){if(existing.nativeTransactionGid!==receipt.id||existing.customerGid!==customerGid||existing.currency!==currency||existing.fundedDelta!==amount||existing.sourceGid!==origin.order.id)throw Error('Wallet return conflict');return existing;}
  let parts;
  const nonWalletSource=async(gateway:string)=>{
   if(gateway==='gift_card')return 'gift_card_funded';
   const policy=await tx.commercePolicy.findUnique({where:{shop},select:{rewardsRules:true}});
   const approved=policy?.rewardsRules?JSON.parse(policy.rewardsRules).directPaymentGateways:null;
   if(!Array.isArray(approved)||!approved.includes(gateway))throw Error('Original refund payment gateway requires verification');
   return 'customer_funded';
  };
  let restoredDebitGid:string|undefined;
  const restoreDebit=async(debit:Awaited<ReturnType<typeof tx.walletEntry.findUnique>>,expected:number)=>{
   if(!debit||debit.customerGid!==customerGid||debit.currency!==currency||debit.sourceGid!==origin.order.id||debit.fundedDelta!==-expected||!debit.nativeTransactionGid)throw Error('Original Wallet debit requires reconciliation');
   if(restoredDebitGid&&restoredDebitGid!==debit.nativeTransactionGid)throw Error('Multiple Wallet payments require reconciliation');
   restoredDebitGid=debit.nativeTransactionGid;
   if(await tx.walletEntry.findFirst({where:{...where,nativeSourceTransactionGid:restoredDebitGid}}))throw Error('Wallet debit already restored');
   if(debit.fundedAllocations!=='[]')return parseFundedAllocations(debit.fundedAllocations,expected);
   const priorEntries=await tx.walletEntry.findMany({where:{...where,OR:[{createdAt:{lt:debit.createdAt}},{createdAt:debit.createdAt,id:{lt:debit.id}}]},orderBy:[{createdAt:'asc'},{id:'asc'}]});
   const allocations=allocateFundedFifo(priorEntries,expected);
   if(allocations.length!==1||allocations[0].sourceKind!==debit.sourceKind)throw Error('Legacy Wallet reversal requires allocation reconciliation');
   return allocations;
  };
  if(revert||walletRefund){
   const debit=await tx.walletEntry.findUnique({where:revert?{shop_nativeTransactionGid:{shop,nativeTransactionGid:receipt.debitTransaction?.id||''}}:{shop_nativeSourceTransactionGid:{shop,nativeSourceTransactionGid:origin.parentTransaction!.id}}});
   parts=await restoreDebit(debit,amount);
  }else if(!origin.parentTransaction&&origin.gateway==='shopify_store_credit'&&origin.kind==='REFUND'){
   // Native orderCancel can return one credit without a parent transaction.
   // Full original payment and refund evidence establishes funding, never balance deltas.
   if(receipt.event!=='ORDER_REFUND'||!funding||funding.id!==origin.order.id||funding.customer?.id!==customerGid||funding.currencyCode!==currency||funding.transactions.length>=100)throw Error('Full refund funding evidence required');
   for(const money of [funding.totalReceivedSet.shopMoney,funding.totalRefundedSet.shopMoney,origin.amountSet.shopMoney])if(money.currencyCode!==currency||minorAmount(money.amount)!==amount)throw Error('Full refund amounts differ');
   const refund=funding.transactions.find(t=>t.id===origin.id&&t.kind==='REFUND'&&t.status==='SUCCESS');
   if(!refund||refund.amountSet.shopMoney.currencyCode!==currency||minorAmount(refund.amountSet.shopMoney.amount)!==amount)throw Error('Native refund transaction differs');
   const payments=funding.transactions.filter(t=>t.status==='SUCCESS'&&['SALE','CAPTURE'].includes(t.kind));
   if(!payments.length||new Set(payments.map(p=>p.id)).size!==payments.length||payments.some(p=>!p.gateway||!/^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(p.id)||p.amountSet.shopMoney.currencyCode!==currency)||payments.reduce((sum,p)=>sum+minorAmount(p.amountSet.shopMoney.amount),0)!==amount)throw Error('Original paid funding incomplete');
   parts=[];
   for(const payment of payments){
    const paid=minorAmount(payment.amountSet.shopMoney.amount);
    if(payment.gateway==='shopify_store_credit'){
     const debit=await tx.walletEntry.findUnique({where:{shop_nativeSourceTransactionGid:{shop,nativeSourceTransactionGid:payment.id}}});
     parts.push(...await restoreDebit(debit,paid));
    }else parts.push({creditEntryId:payment.id,sourceKind:await nonWalletSource(payment.gateway),amountMinor:paid});
   }
   parseFundedAllocations(JSON.stringify(parts),amount);
  }else{
   if(receipt.event!=='ORDER_REFUND'||origin.kind!=='REFUND'||!origin.parentTransaction||origin.parentTransaction.gateway==='shopify_store_credit'||origin.amountSet.shopMoney.currencyCode!==currency||minorAmount(origin.amountSet.shopMoney.amount)!==amount)throw Error('Refund funding requires reconciliation');
   parts=[{creditEntryId:origin.parentTransaction.id,sourceKind:await nonWalletSource(origin.parentTransaction.gateway),amountMinor:amount}];
  }
  const wallet=await tx.customerWallet.upsert({where:{shop_customerGid_currency:where},create:where,update:{}});
  if(!Number.isSafeInteger(wallet.fundedBalance+amount)||wallet.fundedBalance+amount>2147483647)throw Error('Wallet balance overflow');
  const changed=await tx.customerWallet.updateMany({where:{id:wallet.id,revision:wallet.revision},data:{fundedBalance:{increment:amount},revision:{increment:1}}});
  if(changed.count!==1)throw Error('Wallet changed; retry reconciliation');
  return tx.walletEntry.create({data:{...where,sourceEvent,sourceGid:origin.order.id,sourceKind:'funded_return',fundedAllocations:JSON.stringify(parts),nativeTransactionGid:receipt.id,nativeSourceTransactionGid:restoredDebitGid,fundedDelta:amount,bonusDelta:0}});
 });
}

export async function reconcileNativeWalletHistory(admin:Admin,shop:string,customerGid:string){
 assertShop(shop);
 const receipts=await readNativeWalletHistory(admin,shop,customerGid);
 for(const receipt of receipts){
  if(!Number.isFinite(Date.parse(receipt.createdAt)))throw Error('Invalid Wallet transaction time');
  if(receipt.amount.amount.startsWith('-')&&receipt.event==='ORDER_PAYMENT')await recordNativeWalletDebit(shop,customerGid,receipt);
  else if(!receipt.amount.amount.startsWith('-')&&['ORDER_REFUND','ORDER_CANCELLATION','PAYMENT_FAILURE','PAYMENT_RETURNED'].includes(receipt.event)){
   let funding;
   const recorded=await db.walletEntry.findUnique({where:{shop_nativeTransactionGid:{shop,nativeTransactionGid:receipt.id}}});
   if(!recorded&&receipt.origin?.kind==='REFUND'&&receipt.origin.gateway==='shopify_store_credit'&&!receipt.origin.parentTransaction){
    const response=await admin.graphql(REFUND_FUNDING_QUERY,{variables:{id:receipt.origin.order.id}}),body=await response.json();
    if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop)throw Error('Native refund funding unavailable');
    funding=body.data.order;
   }
   await recordNativeWalletReturn(shop,customerGid,receipt,funding);
  }
 }
 return receipts;
}
