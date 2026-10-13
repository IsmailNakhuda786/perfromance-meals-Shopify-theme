import {assertShop} from './security.server';
import {verifyPaidTopUp,type TopUpConfiguration,type TopUpOrder} from './wallet-top-up-policy';

export const TOP_UP_ORDER_QUERY=`#graphql
query WalletTopUpPaidOrder($id:ID!) {
 shop { myshopifyDomain }
 order(id:$id) {
  id cancelledAt displayFinancialStatus currencyCode customer { id }
  disputes { id status }
  totalPriceSet { shopMoney { amount currencyCode } }
  totalReceivedSet { shopMoney { amount currencyCode } }
  totalRefundedSet { shopMoney { amount currencyCode } }
  totalDiscountsSet { shopMoney { amount currencyCode } }
  totalTaxSet { shopMoney { amount currencyCode } }
  totalShippingPriceSet { shopMoney { amount currencyCode } }
  lineItems(first:2) {
   nodes {
    quantity requiresShipping taxable variant { id } product { id isGiftCard }
    originalTotalSet { shopMoney { amount currencyCode } }
    discountedTotalSet { shopMoney { amount currencyCode } }
   }
   pageInfo { hasNextPage }
  }
  transactions(first:100) { id status kind gateway amountSet { shopMoney { amount currencyCode } } }
 }
}
`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};

// Read-only proof. This does not issue credit, mutate an order, or enable top-ups.
export async function readNativeTopUpOrder(admin:Admin,shop:string,orderGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid))throw new Error('Invalid top-up order');
 const response=await admin.graphql(TOP_UP_ORDER_QUERY,{variables:{id:orderGid}});
 const body=await response.json() as {errors?:unknown;data?:{shop:{myshopifyDomain:string};order:TopUpOrder|null}};
 if(!response.ok||body.errors||body.data?.shop.myshopifyDomain!==shop||body.data.order?.id!==orderGid||body.data.order.transactions.length>=100)throw new Error('Top-up native proof unavailable');
 return body.data.order;
}
export async function readPaidTopUp(admin:Admin,shop:string,customerGid:string,orderGid:string,configuration:TopUpConfiguration){
 return verifyPaidTopUp(await readNativeTopUpOrder(admin,shop,orderGid),customerGid,configuration);
}
