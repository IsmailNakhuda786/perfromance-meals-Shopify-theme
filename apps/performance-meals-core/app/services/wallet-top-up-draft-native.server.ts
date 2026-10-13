import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import type {DraftGateway} from './wallet-top-up-intent.server';

export const TOP_UP_DRAFT_CREATE=`#graphql
mutation WalletTopUpDraftCreate($input:DraftOrderInput!) {
 draftOrderCreate(input:$input) {
  draftOrder {
   id invoiceUrl currencyCode customer { id } order { id }
   totalPriceSet { shopMoney { amount currencyCode } }
   totalTaxSet { shopMoney { amount currencyCode } }
   totalShippingPriceSet { shopMoney { amount currencyCode } }
   totalDiscountsSet { shopMoney { amount currencyCode } }
   lineItems(first:2) { nodes { quantity requiresShipping taxable } pageInfo { hasNextPage } }
  }
  userErrors { field message }
 }
}`;
export const TOP_UP_DRAFT_READ=`#graphql
query WalletTopUpDraftRead($id:ID!) {
 shop { myshopifyDomain }
 draftOrder(id:$id) {
  id invoiceUrl currencyCode customer { id } order { id }
  totalPriceSet { shopMoney { amount currencyCode } }
  totalTaxSet { shopMoney { amount currencyCode } }
  totalShippingPriceSet { shopMoney { amount currencyCode } }
  totalDiscountsSet { shopMoney { amount currencyCode } }
  lineItems(first:2) { nodes { quantity requiresShipping taxable } pageInfo { hasNextPage } }
 }
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type MoneyBag={shopMoney:{amount:string;currencyCode:string}};
type NativeDraft={id:string;invoiceUrl:string;currencyCode:string;customer:{id:string}|null;order:{id:string}|null;totalPriceSet:MoneyBag;totalTaxSet:MoneyBag;totalShippingPriceSet:MoneyBag;totalDiscountsSet:MoneyBag;lineItems:{nodes:Array<{quantity:number;requiresShipping:boolean;taxable:boolean}>;pageInfo:{hasNextPage:boolean}}};

function receipt(draft:NativeDraft|null){
 if(!draft||!/^gid:\/\/shopify\/DraftOrder\/\d+$/.test(draft.id)||draft.currencyCode!=='SGD'||!draft.customer?.id||draft.lineItems.pageInfo.hasNextPage||draft.lineItems.nodes.length!==1)throw Error('Native top-up draft proof unavailable');
 const minor=(bag:MoneyBag)=>{if(bag.shopMoney.currencyCode!=='SGD')throw Error('Native draft currency differs');return minorAmount(bag.shopMoney.amount);};
 const line=draft.lineItems.nodes[0];
 if(line.quantity!==1||line.requiresShipping!==false||line.taxable!==false||[draft.totalTaxSet,draft.totalShippingPriceSet,draft.totalDiscountsSet].some(bag=>minor(bag)!==0))throw Error('Native top-up draft isolation differs');
 return {id:draft.id,customerGid:draft.customer.id,currency:draft.currencyCode,amountMinor:minor(draft.totalPriceSet),checkoutUrl:draft.invoiceUrl,orderGid:draft.order?.id||null};
}

// No draft completion or payment mutation. Creation is called only by the
// policy-gated, persistent intent orchestration; readback is store-scoped.
export function nativeTopUpDraftGateway(admin:Admin,shop:string):DraftGateway{
 assertShop(shop);
 return {
  create:async input=>{
   const response=await admin.graphql(TOP_UP_DRAFT_CREATE,{variables:{input}});
   const body=await response.json() as {errors?:unknown;data?:{draftOrderCreate:{draftOrder:NativeDraft|null;userErrors:unknown[]}}};
   const result=body.data?.draftOrderCreate;
   if(!response.ok||body.errors||!result||result.userErrors.length)throw Error('Native top-up draft creation unconfirmed');
   return receipt(result.draftOrder);
  },
  read:async id=>{
   if(!/^gid:\/\/shopify\/DraftOrder\/\d+$/.test(id))throw Error('Invalid top-up draft');
   const response=await admin.graphql(TOP_UP_DRAFT_READ,{variables:{id}});
   const body=await response.json() as {errors?:unknown;data?:{shop:{myshopifyDomain:string};draftOrder:NativeDraft|null}};
   if(!response.ok||body.errors||body.data?.shop.myshopifyDomain!==shop||body.data.draftOrder?.id!==id)throw Error('Native top-up draft proof unavailable');
   return receipt(body.data.draftOrder);
  },
 };
}
