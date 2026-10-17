import {minorAmount} from './gift-card-native.server';
import {approvedTopUpPackage,WALLET_CREDIT_POLICY_VERSION} from './wallet-credit-policy';

type Money = {amount:string;currencyCode:string};
type MoneyBag = {shopMoney:Money};
export type TopUpOrder = {
 id:string;cancelledAt:string|null;displayFinancialStatus:string;currencyCode:string;
 customer:{id:string}|null;
 disputes:Array<{id:string;status:string}>;
 totalPriceSet:MoneyBag;totalReceivedSet:MoneyBag;totalRefundedSet:MoneyBag;
 totalDiscountsSet:MoneyBag;totalTaxSet:MoneyBag;totalShippingPriceSet:MoneyBag;
 lineItems:{pageInfo:{hasNextPage:boolean};nodes:Array<{
  quantity:number;requiresShipping:boolean;taxable:boolean;variant:{id:string}|null;product:{id:string;isGiftCard:boolean}|null;
  originalTotalSet:MoneyBag;discountedTotalSet:MoneyBag;
 }>};
 transactions:Array<{id:string;status:string;kind:string;gateway:string;amountSet:MoneyBag}>;
};
export type TopUpConfiguration = {
 productGid:string;
 variants:Readonly<Record<string,number>>;
 paymentGateways:ReadonlyArray<string>;
};

// Only a fresh native order and a server-owned catalogue allowlist can establish
// funding. Browser labels, prices, line properties and webhook payloads cannot.
function verifyPaidTopUpEvidence(order:TopUpOrder,customerGid:string,config:TopUpConfiguration,amountAllowed:(amount:number)=>boolean){
 const gid=(value:string,type:string)=>new RegExp('^gid://shopify/'+type+'/\\d+$').test(value);
 if(!gid(order.id,'Order')||!gid(customerGid,'Customer')||!gid(config.productGid,'Product')||order.customer?.id!==customerGid||order.cancelledAt||order.displayFinancialStatus!=='PAID'||order.currencyCode!=='SGD')throw new Error('Top-up order is not eligible');
 if(!Array.isArray(order.disputes)||order.disputes.length)throw new Error('Top-up dispute requires reconciliation');
 const minor=(bag:MoneyBag)=>{
  if(bag.shopMoney.currencyCode!==order.currencyCode)throw new Error('Top-up currency differs');
  return minorAmount(bag.shopMoney.amount);
 };
 if(order.lineItems.pageInfo.hasNextPage||order.lineItems.nodes.length!==1)throw new Error('Top-up requires one isolated checkout item');
 const line=order.lineItems.nodes[0],variantGid=line.variant?.id;
 const amount=variantGid?config.variants[variantGid]:undefined;
 if(!variantGid||!gid(variantGid,'ProductVariant')||typeof amount!=='number'||!Number.isSafeInteger(amount)||!amountAllowed(amount)||line.quantity!==1||line.requiresShipping!==false||line.taxable!==false||line.product?.id!==config.productGid||line.product.isGiftCard||minor(line.originalTotalSet)!==amount||minor(line.discountedTotalSet)!==amount)throw new Error('Top-up catalogue or amount differs');
 if([order.totalDiscountsSet,order.totalRefundedSet,order.totalTaxSet,order.totalShippingPriceSet].some(value=>minor(value)!==0)||minor(order.totalPriceSet)!==amount||minor(order.totalReceivedSet)!==amount)throw new Error('Top-up payment is adjusted or incomplete');
 const receipts=order.transactions.filter(transaction=>transaction.status==='SUCCESS'&&['SALE','CAPTURE'].includes(transaction.kind));
 // One verified capture avoids inventing allocation rules for split funding.
 if(receipts.length!==1||order.transactions.some(transaction=>transaction.status==='SUCCESS'&&['REFUND','VOID'].includes(transaction.kind)))throw new Error('Top-up payment needs reconciliation');
 const paid=receipts[0];
 if(!gid(paid.id,'OrderTransaction')||!config.paymentGateways.includes(paid.gateway)||['shopify_store_credit','gift_card','manual'].includes(paid.gateway.toLowerCase())||minor(paid.amountSet)!==amount)throw new Error('Top-up requires an approved external payment');
 return {orderGid:order.id,customerGid,currency:order.currencyCode,amountMinor:amount,paymentGid:paid.id};
}

// Preserve the earlier internal QA verifier; it cannot authorize the new packages.
export function verifyPaidTopUp(order:TopUpOrder,customerGid:string,config:TopUpConfiguration){
 return verifyPaidTopUpEvidence(order,customerGid,config,amount=>amount>=500&&amount<=50000);
}

// Read-only proof for the approved packages. This does not issue either balance
// or enable a checkout route. Bonuses must never be recorded as customer money.
export function verifyPaidApprovedTopUp(order:TopUpOrder,customerGid:string,config:TopUpConfiguration){
 const proof=verifyPaidTopUpEvidence(order,customerGid,config,amount=>{
  try{return approvedTopUpPackage(amount).paidMinor===amount;}catch{return false;}
 });
 const pack=approvedTopUpPackage(proof.amountMinor);
 return {...proof,creditPlan:{policyVersion:WALLET_CREDIT_POLICY_VERSION,packageId:pack.id,
  customerFundedMinor:pack.paidMinor,foodOnlyBonusMinor:pack.bonusMinor,totalMinor:pack.totalMinor,
  expiryYears:1,reminderMonthsBefore:1}};
}
