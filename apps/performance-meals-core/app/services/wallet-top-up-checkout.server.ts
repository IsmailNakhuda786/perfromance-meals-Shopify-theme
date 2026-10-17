import {assertShop} from './security.server';
import {parseWalletTopUpAmount} from './wallet-top-up-amount';
import {approvedTopUpPackage,WALLET_CREDIT_POLICY_VERSION} from './wallet-credit-policy';

export const TOP_UP_VARIANT_QUERY=`#graphql
query WalletTopUpVariant($id:ID!) {
 shop { myshopifyDomain }
 productVariant(id:$id) {
  id taxable requiresComponents
  inventoryItem { requiresShipping }
  product { id isGiftCard requiresSellingPlan }
 }
}`;

type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
type Variant={id:string;taxable:boolean;requiresComponents:boolean;inventoryItem:{requiresShipping:boolean};product:{id:string;isGiftCard:boolean;requiresSellingPlan:boolean}};
type Catalogue={productGid:string;variantGid:string};

// Internal preparation only. No public route, draft creation, checkout URL or
// payment-rule activation. The catalogue IDs must come from server configuration.
async function prepareDraft(admin:Admin,shop:string,customerGid:string,amount:{amountMinor:number;amount:string},catalogue:Catalogue){
 assertShop(shop);
 const gid=(id:string,type:string)=>new RegExp('^gid://shopify/'+type+'/\\d+$').test(id);
 if(!gid(customerGid,'Customer')||!gid(catalogue.productGid,'Product')||!gid(catalogue.variantGid,'ProductVariant'))throw new Error('Invalid Wallet top-up configuration');
 const response=await admin.graphql(TOP_UP_VARIANT_QUERY,{variables:{id:catalogue.variantGid}});
 const body=await response.json() as {errors?:unknown;data?:{shop:{myshopifyDomain:string};productVariant:Variant|null}};
 const variant=body.data?.productVariant;
 if(!response.ok||body.errors||body.data?.shop.myshopifyDomain!==shop||variant?.id!==catalogue.variantGid||variant.product.id!==catalogue.productGid||variant.taxable!==false||variant.inventoryItem?.requiresShipping!==false||variant.requiresComponents!==false||variant.product.isGiftCard!==false||variant.product.requiresSellingPlan!==false)throw new Error('Top-up requires a verified non-shippable, non-taxable, standalone native variant');
 return {
  amountMinor:amount.amountMinor,
  input:{
   purchasingEntity:{customerId:customerGid},
   presentmentCurrencyCode:'SGD',
   acceptAutomaticDiscounts:false,
   allowDiscountCodesInCheckout:false,
   discountCodes:[],
   lineItems:[{variantId:catalogue.variantGid,quantity:1,priceOverride:{amount:amount.amount,currencyCode:'SGD'}}],
  },
 };
}

// Retained for existing, disabled legacy QA intents. Never advertises old tiers.
export async function prepareWalletTopUpDraft(admin:Admin,shop:string,customerGid:string,value:unknown,catalogue:Catalogue){
 return prepareDraft(admin,shop,customerGid,parseWalletTopUpAmount(value),catalogue);
}
// Current merchant packages are server-owned. Request values cannot supply a
// bonus, price, marketing duration or expiry. This does not create a draft or
// enable checkout; paired principal/bonus settlement remains separately gated.
export async function prepareApprovedWalletTopUpDraft(admin:Admin,shop:string,customerGid:string,packagePaidMinor:number,catalogue:Catalogue){
 const pack=approvedTopUpPackage(packagePaidMinor);
 const amount={amountMinor:pack.paidMinor,amount:(pack.paidMinor/100).toFixed(2)};
 const prepared=await prepareDraft(admin,shop,customerGid,amount,catalogue);
 return {...prepared,creditPlan:{policyVersion:WALLET_CREDIT_POLICY_VERSION,packageId:pack.id,customerFundedMinor:pack.paidMinor,foodOnlyBonusMinor:pack.bonusMinor,totalMinor:pack.totalMinor,expiryYears:1,reminderMonthsBefore:1}};
}
