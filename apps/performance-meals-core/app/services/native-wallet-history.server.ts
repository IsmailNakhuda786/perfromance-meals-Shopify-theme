import {assertShop} from './security.server';
import type {WalletNativeTransaction} from './native-wallet-returns.server';

export const WALLET_ACCOUNTS_QUERY=`#graphql
query WalletAccounts($id:ID!,$after:String){shop{myshopifyDomain} customer(id:$id){id storeCreditAccounts(first:50,after:$after){nodes{id}pageInfo{hasNextPage endCursor}}}}`;
export const WALLET_ACCOUNT_HISTORY_QUERY=`#graphql
query WalletAccountHistory($id:ID!,$after:String){
 shop{myshopifyDomain} storeCreditAccount(id:$id){id owner{...on Customer{id}}
  transactions(first:100,after:$after,sortKey:CREATED_AT,reverse:false){nodes{
   ...on Node{id} createdAt amount{amount currencyCode} event
   origin{...on OrderTransaction{id status kind gateway amountSet{shopMoney{amount currencyCode}} order{id currencyCode customer{id}} parentTransaction{id gateway}}}
   ...on StoreCreditAccountDebitRevertTransaction{debitTransaction{id}}
  }pageInfo{hasNextPage endCursor}}
 }
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type PageInfo={hasNextPage:boolean;endCursor:string|null};
function nextCursor(page:PageInfo,seen:Set<string>){
 if(!page.hasNextPage)return null;
 if(!page.endCursor||seen.has(page.endCursor))throw Error('Wallet pagination did not advance');
 seen.add(page.endCursor);return page.endCursor;
}
// Read every native page before applying ledger mutations. Missing ownership or
// a broken cursor cannot turn a partial financial history into successful proof.
export async function readNativeWalletHistory(admin:Admin,shop:string,customerGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw Error('Invalid Wallet customer');
 const request=async(query:string,id:string,after:string|null)=>{
  const response=await admin.graphql(query,{variables:{id,after}}),body=await response.json();
  if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop)throw Error('Native Wallet history unavailable');
  return body.data;
 };
 const accounts:string[]=[],seenAccounts=new Set<string>(),accountCursors=new Set<string>();
 let after:string|null=null;
 do{
  const data=await request(WALLET_ACCOUNTS_QUERY,customerGid,after);
  if(data.customer?.id!==customerGid)throw Error('Native Wallet owner differs');
  for(const account of data.customer.storeCreditAccounts.nodes){
   if(!/^gid:\/\/shopify\/StoreCreditAccount\/\d+$/.test(account.id)||seenAccounts.has(account.id))throw Error('Native Wallet account evidence differs');
   accounts.push(account.id);seenAccounts.add(account.id);
  }
  after=nextCursor(data.customer.storeCreditAccounts.pageInfo,accountCursors);
 }while(after);
 const receipts:WalletNativeTransaction[]=[],seenReceipts=new Set<string>();
 for(const id of accounts){
  after=null;const cursors=new Set<string>();
  do{
   const data=await request(WALLET_ACCOUNT_HISTORY_QUERY,id,after),account=data.storeCreditAccount;
   if(account?.id!==id||account.owner?.id!==customerGid)throw Error('Native Wallet owner differs');
   for(const receipt of account.transactions.nodes as WalletNativeTransaction[]){
    if(!['ORDER_PAYMENT','ORDER_REFUND','ORDER_CANCELLATION','PAYMENT_FAILURE','PAYMENT_RETURNED'].includes(receipt.event))continue;
    if(!receipt.id||seenReceipts.has(receipt.id)||!Number.isFinite(Date.parse(receipt.createdAt)))throw Error('Native Wallet transaction evidence differs');
    seenReceipts.add(receipt.id);receipts.push(receipt);
   }
   after=nextCursor(account.transactions.pageInfo,cursors);
  }while(after);
 }
 // Keep Shopify cursor order when timestamps tie; type-specific GID sorting
 // could incorrectly place a refund credit before its original debit.
 return receipts.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
}
