import db from '../db.server';
import {assertShop} from './security.server';
import {settledWalletCreditTerm} from './wallet-credit-term.server';
import {remainingFundedLots,parseFundedAllocations} from './wallet-fifo';
import {readNativeWalletCreditExpiry} from './wallet-expiry.server';
import {assertNativeWalletCreditReady} from './native-wallet-credit-ready.server';
import {minorAmount} from './gift-card-native.server';
import {coreWalletPolicyStartedAt} from './wallet-core-policy.server';

type Admin=Parameters<typeof readNativeWalletCreditExpiry>[0];
type CreditProof=Awaited<ReturnType<typeof readNativeWalletCreditExpiry>>;
type DebitReceipt={id:string;ownerGid:string;accountGid:string;amountMinor:number;currency:string};
export type CoreExpiryGateway={assertWalletReady:(customerGid:string,expiryId:string)=>Promise<void>;readCredit:(customerGid:string,creditGid:string)=>Promise<CreditProof>;debit:(customerGid:string,accountGid:string,amountMinor:number)=>Promise<DebitReceipt>};

function sourceMatches(entry:{customerGid:string;currency:string;fundedDelta:number;bonusDelta:number;sourceKind:string;nativeTransactionGid:string|null},customerGid:string,proof:CreditProof,startsAt:Date){
 if(proof.credit.account.owner?.id!==customerGid||entry.customerGid!==customerGid||entry.currency!=='SGD'||entry.bonusDelta!==0||entry.fundedDelta!==proof.amountMinor||entry.nativeTransactionGid!==proof.credit.id||!['customer_funded','gift_card_funded','reward_funded','funded_return'].includes(entry.sourceKind)||proof.expiresAt)throw Error('Core-managed expiry source differs');
 if(proof.issuedAt<startsAt)throw Error('Historical credit is not automatically assigned expiry');
}
export function expiryCreditParts(entries:Parameters<typeof remainingFundedLots>[0],creditEntryId:string){
 return remainingFundedLots(entries).filter(lot=>lot.remaining>0&&(lot.id===creditEntryId||lot.id.startsWith(creditEntryId+':'))).map(lot=>({creditEntryId:lot.id,sourceKind:lot.sourceKind,amountMinor:lot.remaining}));
}
export async function registerCoreManagedWalletCredit(admin:Admin,shop:string,customerGid:string,walletEntryId:string){
 assertShop(shop);const startsAt=coreWalletPolicyStartedAt();
 const entry=await db.walletEntry.findFirst({where:{id:walletEntryId,shop,customerGid}});
 if(!entry?.nativeTransactionGid)throw Error('Settled native credit required');
 const proof=await readNativeWalletCreditExpiry(admin,shop,customerGid,entry.nativeTransactionGid);
 sourceMatches(entry,customerGid,proof,startsAt);
 const term=await settledWalletCreditTerm(entry,proof.issuedAt);
 const entries=await db.walletEntry.findMany({where:{shop,customerGid,currency:'SGD'},orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,sourceKind:true,fundedDelta:true,fundedAllocations:true}});
 const remainingMinor=expiryCreditParts(entries,entry.id).reduce((sum,part)=>sum+part.amountMinor,0);
 const values={shop,customerGid,currency:'SGD',walletEntryId,nativeCreditGid:proof.credit.id,nativeAccountGid:proof.credit.account.id,sourceKind:entry.sourceKind,amountMinor:proof.amountMinor,remainingMinor,issuedAt:proof.issuedAt,expiresAt:new Date(term.expiresAt),reminderAt:new Date(term.reminderDate+'T00:00:00+08:00'),observedAt:new Date(),enforcementMode:'CORE_MANAGED'};
 const existing=await db.walletCreditExpiry.findUnique({where:{shop_walletEntryId:{shop,walletEntryId}}});
 if(existing){if(existing.enforcementMode!=='CORE_MANAGED'||existing.customerGid!==customerGid||existing.nativeCreditGid!==values.nativeCreditGid||existing.nativeAccountGid!==values.nativeAccountGid||existing.amountMinor!==values.amountMinor||existing.expiresAt.getTime()!==values.expiresAt.getTime())throw Error('Core expiry registration conflict');return existing;}
 return db.walletCreditExpiry.create({data:values});
}
// Receipt registration only: no debit, no email and no activation. A scheduler
// must run this independently of account visits before top-ups can be enabled.
export async function syncCoreManagedWalletCredits(admin:Admin,shop:string,customerGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw Error('Invalid expiry customer');
 if(process.env.WALLET_CORE_EXPIRY_ENABLED!=='true')return {state:'DISABLED' as const,registered:0};
 const startsAt=coreWalletPolicyStartedAt();
 const registeredEntries=await db.walletCreditExpiry.findMany({where:{shop,customerGid,enforcementMode:'CORE_MANAGED'},select:{walletEntryId:true}});
 const entries=await db.walletEntry.findMany({where:{shop,customerGid,currency:'SGD',fundedDelta:{gt:0},createdAt:{gte:startsAt},id:{notIn:registeredEntries.map(row=>row.walletEntryId)}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:101,select:{id:true}});
 let registered=0;
 for(const entry of entries.slice(0,100)){
  await registerCoreManagedWalletCredit(admin,shop,customerGid,entry.id);registered++;
 }
 return {state:entries.length>100?'PENDING' as const:'VERIFIED' as const,registered};
}
// Internal worker only, default off. Checkout protection and reliable scheduling
// must pass before activation. Native debit has no assumed idempotent retry.
export async function expireCoreManagedWalletCredit(shop:string,customerGid:string,id:string,gateway:CoreExpiryGateway,now=new Date()){
 assertShop(shop);const startsAt=coreWalletPolicyStartedAt();
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!Number.isFinite(now.getTime()))throw Error('Invalid expiry context');
 let record=await db.walletCreditExpiry.findFirst({where:{id,shop,customerGid}});
 if(!record||record.enforcementMode!=='CORE_MANAGED'||record.issuedAt<startsAt)throw Error('Core expiry record unavailable');
 if(record.expiryState==='COMPLETED')return record;
 if(['DEBIT_PENDING','UNKNOWN'].includes(record.expiryState))throw Error('Expiry outcome requires reconciliation; no financial retry');
 if(now<record.expiresAt)throw Error('Credit has not expired');
 if(record.expiryState==='PENDING'){
  await gateway.assertWalletReady(customerGid,id);
  const proof=await gateway.readCredit(customerGid,record.nativeCreditGid);
  const source=await db.walletEntry.findFirst({where:{id:record.walletEntryId,shop,customerGid}});
  if(!source)throw Error('Expiry source unavailable');
  sourceMatches(source,customerGid,proof,startsAt);
  if(proof.issuedAt.getTime()!==record.issuedAt.getTime()||proof.credit.account.id!==record.nativeAccountGid||new Date((await settledWalletCreditTerm(source,proof.issuedAt)).expiresAt).getTime()!==record.expiresAt.getTime())throw Error('Expiry receipt changed');
  record=await db.$transaction(async tx=>{
   const current=await tx.walletCreditExpiry.findFirstOrThrow({where:{id,shop,customerGid,expiryState:'PENDING',revision:record!.revision}});
   const context={shop,customerGid,currency:'SGD'};
   const wallet=await tx.customerWallet.findUniqueOrThrow({where:{shop_customerGid_currency:context}});
   const entries=await tx.walletEntry.findMany({where:context,orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,sourceKind:true,fundedDelta:true,fundedAllocations:true}});
   if(wallet.fundedReserved!==0||entries.reduce((sum,entry)=>sum+entry.fundedDelta,0)!==wallet.fundedBalance)throw Error('Wallet reservation or balance needs reconciliation');
   const parts=expiryCreditParts(entries,current.walletEntryId),amount=parts.reduce((sum,part)=>sum+part.amountMinor,0);
   if(amount>current.amountMinor||amount>wallet.fundedBalance)throw Error('Expiry amount differs');
   const changed=await tx.walletCreditExpiry.updateMany({where:{id,shop,customerGid,expiryState:'PENDING',revision:current.revision},data:{expiryState:amount?'DEBIT_PENDING':'COMPLETED',expiredMinor:amount,remainingMinor:amount,expiryAllocations:JSON.stringify(parts),revision:{increment:1}}});
   if(changed.count!==1)throw Error('Expiry already claimed');
   if(amount){const reserved=await tx.customerWallet.updateMany({where:{id:wallet.id,revision:wallet.revision,fundedReserved:0},data:{fundedReserved:{increment:amount},revision:{increment:1}}});if(reserved.count!==1)throw Error('Wallet changed before expiry');}
   return tx.walletCreditExpiry.findUniqueOrThrow({where:{id}});
  });
  if(record.expiryState==='COMPLETED')return record;
  try{
   const receipt=await gateway.debit(customerGid,record.nativeAccountGid,record.expiredMinor);
   if(!/^gid:\/\/shopify\/StoreCreditAccountDebitTransaction\/\d+$/.test(receipt.id)||receipt.ownerGid!==customerGid||receipt.accountGid!==record.nativeAccountGid||receipt.amountMinor!==record.expiredMinor||receipt.currency!=='SGD')throw Error('Native expiry debit differs');
   record=await db.walletCreditExpiry.update({where:{id},data:{expiryState:'AWAITING_LEDGER',nativeExpiryDebitGid:receipt.id,revision:{increment:1}}});
  }catch{
   await db.walletCreditExpiry.updateMany({where:{id,shop,customerGid,expiryState:'DEBIT_PENDING'},data:{expiryState:'UNKNOWN',revision:{increment:1}}});
   throw Error('Expiry outcome requires reconciliation; no financial retry');
  }
 }
 if(record.expiryState!=='AWAITING_LEDGER'||!record.nativeExpiryDebitGid)throw Error('Expiry evidence incomplete');
 return db.$transaction(async tx=>{
  const current=await tx.walletCreditExpiry.findUniqueOrThrow({where:{id}});
  if(current.expiryState==='COMPLETED')return current;
  if(current.expiryState!=='AWAITING_LEDGER'||!current.nativeExpiryDebitGid)throw Error('Expiry changed');
  const context={shop,customerGid,currency:'SGD'};
  const allocations=parseFundedAllocations(current.expiryAllocations,current.expiredMinor);
  const wallet=await tx.customerWallet.findUniqueOrThrow({where:{shop_customerGid_currency:context}});
  const entries=await tx.walletEntry.findMany({where:context,orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,sourceKind:true,fundedDelta:true,fundedAllocations:true}});
  if(JSON.stringify(expiryCreditParts(entries,current.walletEntryId))!==JSON.stringify(allocations)||entries.reduce((sum,entry)=>sum+entry.fundedDelta,0)!==wallet.fundedBalance||wallet.fundedBalance<current.expiredMinor||wallet.fundedReserved<current.expiredMinor)throw Error('Expiry ledger requires reconciliation');
  const changed=await tx.customerWallet.updateMany({where:{id:wallet.id,revision:wallet.revision,fundedBalance:{gte:current.expiredMinor},fundedReserved:{gte:current.expiredMinor}},data:{fundedBalance:{decrement:current.expiredMinor},fundedReserved:{decrement:current.expiredMinor},revision:{increment:1}}});
  if(changed.count!==1)throw Error('Wallet changed; reconcile recorded debit');
  const entry=await tx.walletEntry.create({data:{...context,sourceEvent:'core-wallet-expiry:'+id,sourceGid:current.nativeCreditGid,sourceKind:'funded_expiry',nativeTransactionGid:current.nativeExpiryDebitGid,fundedAllocations:current.expiryAllocations,fundedDelta:-current.expiredMinor,bonusDelta:0}});
  return tx.walletCreditExpiry.update({where:{id},data:{expiryState:'COMPLETED',remainingMinor:0,expiryLedgerEntryId:entry.id,revision:{increment:1}}});
 });
}
export const CORE_EXPIRY_DEBIT_MUTATION=`#graphql
mutation CoreWalletExpiryDebit($id:ID!,$debitInput:StoreCreditAccountDebitInput!){
 storeCreditAccountDebit(id:$id,debitInput:$debitInput){
  storeCreditAccountTransaction{id amount{amount currencyCode} account{id owner{...on Customer{id}}}}
  userErrors{field message}
 }
}`;
export function nativeCoreExpiryGateway(admin:Admin,shop:string):CoreExpiryGateway{
 assertShop(shop);
 return {assertWalletReady:(customerGid,expiryId)=>assertNativeWalletCreditReady(admin,shop,customerGid,{expiryId}),readCredit:(customerGid,creditGid)=>readNativeWalletCreditExpiry(admin,shop,customerGid,creditGid),async debit(customerGid,accountGid,amountMinor){
  coreWalletPolicyStartedAt();
  if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^gid:\/\/shopify\/StoreCreditAccount\/\d+$/.test(accountGid)||!Number.isSafeInteger(amountMinor)||amountMinor<1||amountMinor>2147483647)throw Error('Invalid expiry debit request');
  const amount=(amountMinor/100).toFixed(2);
  const response=await admin.graphql(CORE_EXPIRY_DEBIT_MUTATION,{variables:{id:accountGid,debitInput:{debitAmount:{amount,currencyCode:'SGD'}}}}),body=await response.json(),result=body.data?.storeCreditAccountDebit,receipt=result?.storeCreditAccountTransaction;
  if(!response.ok||body.errors||result?.userErrors?.length||!receipt||!receipt.amount.amount.startsWith('-'))throw Error('Native expiry debit unconfirmed');
  return {id:receipt.id,ownerGid:receipt.account.owner?.id,accountGid:receipt.account.id,amountMinor:minorAmount(receipt.amount.amount.slice(1)),currency:receipt.amount.currencyCode};
 }};
}
