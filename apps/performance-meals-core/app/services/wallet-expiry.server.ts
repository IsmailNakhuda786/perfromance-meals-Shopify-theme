import {randomUUID} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {settledWalletCreditTerm} from './wallet-credit-term.server';
import {remainingFundedLots} from './wallet-fifo';
import {readNativeWallet} from './native-wallet.server';
import {coreWalletPolicyStartedAt} from './wallet-core-policy.server';

export const NATIVE_CREDIT_EXPIRY_QUERY=`#graphql
query WalletCreditExpiryEvidence($id:ID!){
 shop{myshopifyDomain currencyCode}
 node(id:$id){...on StoreCreditAccountCreditTransaction{
  id createdAt expiresAt amount{amount currencyCode} remainingAmount{amount currencyCode}
  account{id owner{...on Customer{id}}}
 }}
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Credit={id:string;createdAt:string;expiresAt:string|null;amount:{amount:string;currencyCode:string};remainingAmount:{amount:string;currencyCode:string};account:{id:string;owner:{id:string}|null}};
const customerId=(value:string)=>/^gid:\/\/shopify\/Customer\/\d+$/.test(value);
function instant(value:string){
 const date=new Date(value);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,19)!==value.slice(0,19))throw Error('Invalid native expiry time');
 return date;
}
// Calendar-month reminder, starting at midnight Singapore time on the date.
// The native receipt remains authoritative for the actual expiration instant.
export function nativeExpiryReminderAt(expiresAt:string){
 const local=new Date(instant(expiresAt).getTime()+8*60*60*1000);
 const month=local.getUTCMonth(),year=local.getUTCFullYear();
 const day=Math.min(local.getUTCDate(),new Date(Date.UTC(year,month,0)).getUTCDate());
 return new Date(Date.UTC(year,month-1,day)-8*60*60*1000);
}
export async function readNativeWalletCreditExpiry(admin:Admin,shop:string,customerGid:string,creditGid:string){
 assertShop(shop);
 if(!customerId(customerGid)||!/^gid:\/\/shopify\/StoreCreditAccountCreditTransaction\/\d+$/.test(creditGid))throw Error('Invalid expiry context');
 const response=await admin.graphql(NATIVE_CREDIT_EXPIRY_QUERY,{variables:{id:creditGid}}),body=await response.json();
 const credit=body.data?.node as Credit|undefined;
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop||body.data.shop.currencyCode!=='SGD'||credit?.id!==creditGid||credit.account?.owner?.id!==customerGid||!/^gid:\/\/shopify\/StoreCreditAccount\/\d+$/.test(credit.account.id)||credit.amount.currencyCode!=='SGD'||credit.remainingAmount.currencyCode!=='SGD')throw Error('Native expiry evidence unavailable');
 const amountMinor=minorAmount(credit.amount.amount),remainingMinor=minorAmount(credit.remainingAmount.amount);
 if(amountMinor<1||amountMinor>2147483647||remainingMinor>amountMinor)throw Error('Native credit amounts differ');
 const issuedAt=instant(credit.createdAt),expiresAt=credit.expiresAt?instant(credit.expiresAt):null;
 if(expiresAt&&expiresAt<=issuedAt)throw Error('Native expiry precedes issuance');
 return {credit,amountMinor,remainingMinor,issuedAt,expiresAt};
}
function creditMatches(entry:{customerGid:string;currency:string;fundedDelta:number;bonusDelta:number;sourceKind:string;nativeTransactionGid:string|null},customerGid:string,proof:Awaited<ReturnType<typeof readNativeWalletCreditExpiry>>){
 // Food-only bonus must not be inferred from unrestricted native store credit.
 return entry.customerGid===customerGid&&entry.currency==='SGD'&&entry.bonusDelta===0&&entry.fundedDelta===proof.amountMinor&&['customer_funded','gift_card_funded','reward_funded','funded_return'].includes(entry.sourceKind)&&entry.nativeTransactionGid===proof.credit.id;
}
// Register observed expiry only after a fresh native read and matching settled
// ledger credit. No inferred backfill, financial write or notification is made.
export async function registerWalletCreditExpiry(admin:Admin,shop:string,customerGid:string,walletEntryId:string){
 assertShop(shop);
 const entry=await db.walletEntry.findFirst({where:{id:walletEntryId,shop,customerGid}});
 if(!entry?.nativeTransactionGid)throw Error('Settled credit receipt required');
 const proof=await readNativeWalletCreditExpiry(admin,shop,customerGid,entry.nativeTransactionGid);
 if(!creditMatches(entry,customerGid,proof))throw Error('Ledger and native credit differ');
 if(!proof.expiresAt)return {state:'NO_NATIVE_EXPIRY' as const};
 const values={shop,customerGid,currency:'SGD',walletEntryId,nativeCreditGid:proof.credit.id,nativeAccountGid:proof.credit.account.id,sourceKind:entry.sourceKind,amountMinor:proof.amountMinor,remainingMinor:proof.remainingMinor,issuedAt:proof.issuedAt,expiresAt:proof.expiresAt,reminderAt:nativeExpiryReminderAt(proof.credit.expiresAt!),observedAt:new Date()};
 return db.$transaction(async tx=>{
  const previous=await tx.walletCreditExpiry.findUnique({where:{shop_walletEntryId:{shop,walletEntryId}}});
  if(previous){
   if(previous.customerGid!==customerGid||previous.nativeCreditGid!==values.nativeCreditGid||previous.nativeAccountGid!==values.nativeAccountGid||previous.currency!==values.currency||previous.sourceKind!==values.sourceKind||previous.amountMinor!==values.amountMinor||previous.issuedAt.getTime()!==values.issuedAt.getTime()||previous.expiresAt.getTime()!==values.expiresAt.getTime())throw Error('Credit expiry changed; review required');
   return previous;
  }
  // Recheck the immutable settled receipt inside the transaction before insert.
  const settled=await tx.walletEntry.findFirst({where:{id:walletEntryId,shop,customerGid}});
  if(!settled||!creditMatches(settled,customerGid,proof))throw Error('Settled credit changed');
  return tx.walletCreditExpiry.create({data:values});
 });
}
// Internal delivery preparation. A provider must support the returned stable
// idempotency key and receipt recovery before notification delivery is enabled.
// Uncertain outcomes stay held; this function never automatically resends them.
export async function prepareWalletExpiryReminder(admin:Admin,shop:string,customerGid:string,id:string,now=new Date()){
 assertShop(shop);
 if(process.env.WALLET_EXPIRY_REMINDERS_ENABLED!=='true')throw Error('Expiry reminders are not activated');
 if(!customerId(customerGid)||!Number.isFinite(now.getTime()))throw Error('Invalid reminder context');
 const record=await db.walletCreditExpiry.findFirst({where:{id,shop,customerGid}});
 if(!record)throw Error('Credit expiry record unavailable');
 if(record.reminderState!=='PENDING')return {state:record.reminderState};
 if(now<record.reminderAt)return {state:'NOT_DUE'};
 const proof=await readNativeWalletCreditExpiry(admin,shop,customerGid,record.nativeCreditGid);
 const entry=await db.walletEntry.findFirst({where:{id:record.walletEntryId,shop,customerGid}});
 const coreManaged=record.enforcementMode==='CORE_MANAGED';
 const expectedExpiry=coreManaged&&!proof.expiresAt&&entry?new Date((await settledWalletCreditTerm(entry,proof.issuedAt)).expiresAt):proof.expiresAt;
 if(!entry||!creditMatches(entry,customerGid,proof)||!expectedExpiry||expectedExpiry.getTime()!==record.expiresAt.getTime()||proof.issuedAt.getTime()!==record.issuedAt.getTime()||proof.credit.account.id!==record.nativeAccountGid||coreManaged&&proof.expiresAt)throw Error('Reminder requires expiry reconciliation');
 let remainingMinor=proof.remainingMinor;
 if(coreManaged){
  if(record.issuedAt<coreWalletPolicyStartedAt())throw Error('Historical expiry reminder requires reconciliation');
  const [native,wallet,entries]=await Promise.all([
   readNativeWallet(admin,shop,customerGid),
   db.customerWallet.findUnique({where:{shop_customerGid_currency:{shop,customerGid,currency:'SGD'}}}),
   db.walletEntry.findMany({where:{shop,customerGid,currency:'SGD'},orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,sourceKind:true,fundedDelta:true,fundedAllocations:true}}),
  ]);
  if(!wallet||wallet.fundedReserved||native.currency!=='SGD'||native.balanceMinor!==wallet.fundedBalance||entries.reduce((sum,row)=>sum+row.fundedDelta,0)!==wallet.fundedBalance)throw Error('Reminder Wallet requires reconciliation');
  remainingMinor=remainingFundedLots(entries).filter(lot=>lot.id===record.walletEntryId||lot.id.startsWith(record.walletEntryId+':')).reduce((sum,lot)=>sum+lot.remaining,0);
 }
 const state=now>=record.expiresAt?'EXPIRED':remainingMinor===0?'SPENT':'DELIVERING';
 const deliveryKey=state==='DELIVERING'?randomUUID():null;
 const changed=await db.walletCreditExpiry.updateMany({where:{id,shop,customerGid,revision:record.revision,reminderState:'PENDING'},data:{reminderState:state,deliveryKey,remainingMinor,observedAt:now,revision:{increment:1}}});
 if(changed.count!==1)throw Error('Reminder already claimed; reload');
 return {state,...(deliveryKey?{deliveryKey,currency:record.currency,remainingMinor,expiresAt:record.expiresAt.toISOString()}: {})};
}
export async function finishWalletExpiryReminder(shop:string,customerGid:string,id:string,deliveryKey:string,outcome:{reference:string}|{unknown:true}){
 assertShop(shop);
 if(!customerId(customerGid)||!deliveryKey)throw Error('Invalid reminder completion');
 const record=await db.walletCreditExpiry.findFirst({where:{id,shop,customerGid,deliveryKey}});
 if(!record)throw Error('Reminder delivery differs');
 const reference='reference' in outcome?outcome.reference:null;
 if(reference!==null&&(!reference.trim()||reference.length>512))throw Error('Provider receipt required');
 const state=reference?'SENT':'UNKNOWN';
 if(record.reminderState===state&&record.deliveryReference===reference)return record;
 if(record.reminderState!=='DELIVERING')throw Error('Reminder is held; provider reconciliation required');
 const changed=await db.walletCreditExpiry.updateMany({where:{id,shop,customerGid,deliveryKey,revision:record.revision,reminderState:'DELIVERING'},data:{reminderState:state,deliveryReference:reference,notifiedAt:reference?new Date():null,revision:{increment:1}}});
 if(changed.count!==1)throw Error('Reminder changed; reload');
 return db.walletCreditExpiry.findUniqueOrThrow({where:{id}});
}
