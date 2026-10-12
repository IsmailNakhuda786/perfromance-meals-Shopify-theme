import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
export const NATIVE_WALLET_QUERY=`query CustomerWalletBalance($id: ID!) { shop { myshopifyDomain currencyCode } customer(id:$id) { id storeCreditAccounts(first:50) { nodes { balance { amount currencyCode } } pageInfo { hasNextPage } } } }`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export async function readNativeWallet(admin:Admin,shop:string,customerGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw new Error('Invalid Wallet customer');
 const response=await admin.graphql(NATIVE_WALLET_QUERY,{variables:{id:customerGid}});
 const body=await response.json();
 const data=body.data;
 if(!response.ok||body.errors||data?.shop?.myshopifyDomain!==shop||data.customer?.id!==customerGid||data.customer.storeCreditAccounts.pageInfo.hasNextPage)throw new Error('Native Wallet unavailable');
 const currency=data.shop.currencyCode;
 const accounts=data.customer.storeCreditAccounts.nodes.filter((account:{balance:{currencyCode:string}})=>account.balance.currencyCode===currency);
 if(accounts.length>1)throw new Error('Native Wallet balance is ambiguous');
 return {currency,balanceMinor:accounts.length?minorAmount(accounts[0].balance.amount):0};
}
