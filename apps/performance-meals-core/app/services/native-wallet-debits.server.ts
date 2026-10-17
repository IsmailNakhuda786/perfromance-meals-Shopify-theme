import db from '../db.server';
import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {allocateFundedFifo,allocateFundedPriority} from './wallet-fifo';
import {coreWalletPolicyStartedAt} from './wallet-core-policy.server';
export const NATIVE_DEBITS_QUERY="query NativeWalletDebits($id:ID!) { shop { myshopifyDomain } customer(id:$id) { id storeCreditAccounts(first:50) { nodes { transactions(first:50,query:\"type:debit\") { nodes { ... on StoreCreditAccountDebitTransaction { id createdAt amount { amount currencyCode } event origin { ... on OrderTransaction { status kind gateway amountSet { shopMoney { amount currencyCode } } order { id currencyCode customer { id } } } } } } pageInfo { hasNextPage } } } pageInfo { hasNextPage } } } }";
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Debit={id:string;createdAt:string;event:string;amount:{amount:string;currencyCode:string};origin:null|{id?:string;status:string;kind:string;gateway:string;amountSet:{shopMoney:{amount:string;currencyCode:string}};order:{id:string;currencyCode:string;customer:{id:string}|null}}};
export async function recordNativeWalletDebit(shop:string,customerGid:string,debit:Debit){
 assertShop(shop);
 const origin=debit.origin,currency=debit.amount.currencyCode;
 if(!Number.isFinite(Date.parse(debit.createdAt)))throw new Error('Native Wallet debit time unavailable');
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^gid:\/\/shopify\/StoreCreditAccountDebitTransaction\/\d+$/.test(debit.id)||debit.event!=='ORDER_PAYMENT'||!debit.amount.amount.startsWith('-')||!origin||origin.status!=='SUCCESS'||!['SALE','CAPTURE'].includes(origin.kind)||origin.gateway!=='shopify_store_credit'||origin.order.customer?.id!==customerGid||!/^gid:\/\/shopify\/Order\/\d+$/.test(origin.order.id)||origin.order.currencyCode!==currency||origin.amountSet.shopMoney.currencyCode!==currency)throw new Error('Native Wallet debit evidence invalid');
 const amount=minorAmount(debit.amount.amount.slice(1));
 if(origin.id&&!/^gid:\/\/shopify\/OrderTransaction\/\d+$/.test(origin.id))throw Error('Native Wallet payment reference invalid');
 if(!amount||minorAmount(origin.amountSet.shopMoney.amount)!==amount)throw new Error('Native Wallet debit amounts differ');
 return db.$transaction(async tx=>{
  const existing=await tx.walletEntry.findUnique({where:{shop_nativeTransactionGid:{shop,nativeTransactionGid:debit.id}}});
  if(existing){
   if(existing.customerGid!==customerGid||existing.currency!==currency||existing.sourceGid!==origin.order.id||existing.fundedDelta!==-amount||existing.bonusDelta!==0||(origin.id&&existing.nativeSourceTransactionGid&&existing.nativeSourceTransactionGid!==origin.id))throw new Error('Wallet debit conflict');
   // Fresh native evidence can enrich a historical receipt without changing money.
   if(origin.id&&!existing.nativeSourceTransactionGid)return tx.walletEntry.update({where:{id:existing.id},data:{nativeSourceTransactionGid:origin.id}});
   return existing;
  }
  const where={shop,customerGid,currency};
  const wallet=await tx.customerWallet.findUniqueOrThrow({where:{shop_customerGid_currency:where}});
  const entries=await tx.walletEntry.findMany({where,orderBy:[{createdAt:'asc'},{id:'asc'}],select:{id:true,sourceKind:true,fundedDelta:true,fundedAllocations:true}});
  if(entries.reduce((sum,entry)=>sum+entry.fundedDelta,0)!==wallet.fundedBalance||wallet.fundedBalance-wallet.fundedReserved<amount)throw new Error('Wallet balance requires reconciliation');
  const sourcePriority=process.env.WALLET_CORE_EXPIRY_ENABLED==='true'&&new Date(debit.createdAt)>=coreWalletPolicyStartedAt();
  const allocations=sourcePriority?allocateFundedPriority(entries,amount):allocateFundedFifo(entries,amount);
  const kinds=new Set(allocations.map(allocation=>allocation.sourceKind));
  const sourceKind=kinds.size===1?allocations[0].sourceKind:'funded_spend';
  const changed=await tx.customerWallet.updateMany({where:{id:wallet.id,revision:wallet.revision},data:{fundedBalance:{decrement:amount},revision:{increment:1}}});
  if(changed.count!==1)throw new Error('Wallet changed; retry reconciliation');
  return tx.walletEntry.create({data:{...where,sourceEvent:'native-wallet-debit:'+debit.id,sourceGid:origin.order.id,sourceKind,fundedAllocations:JSON.stringify(allocations),nativeTransactionGid:debit.id,nativeSourceTransactionGid:origin.id,fundedDelta:-amount,bonusDelta:0}});
 });
}
export async function reconcileNativeWalletDebits(admin:Admin,shop:string,customerGid:string){
 assertShop(shop);
 const earliest=await db.walletEntry.findFirst({where:{shop,customerGid,fundedDelta:{gt:0}},orderBy:{createdAt:'asc'},select:{createdAt:true}});
 if(!earliest)return;
 const response=await admin.graphql(NATIVE_DEBITS_QUERY,{variables:{id:customerGid}});
 const body=await response.json(),data=body.data;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.customer?.id!==customerGid||data.customer.storeCreditAccounts.pageInfo.hasNextPage)throw new Error('Wallet debit read unavailable');
 const debits:Debit[]=[];
 for(const account of data.customer.storeCreditAccounts.nodes){
  if(account.transactions.pageInfo.hasNextPage)throw new Error('Wallet debit history requires paginated reconciliation');
  debits.push(...account.transactions.nodes);
 }
 for(const debit of debits.sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){
  const date=new Date(debit.createdAt);
  if(Number.isNaN(date.getTime()))throw new Error('Invalid native transaction date');
  if(date>=earliest.createdAt)await recordNativeWalletDebit(shop,customerGid,debit);
 }
}

