export type QuoteExpectation={lines:Array<{variantGid:string;quantity:number;unitPriceMinor:number}>;shippingFeeMinor:number};
type Money={amount:string;currencyCode:string};
type Calculation={taxesIncluded:boolean;presentmentCurrencyCode:string;totalPriceSet:{shopMoney:Money};totalTaxSet:{shopMoney:Money};lineItems:Array<{quantity:number;taxable:boolean;variant:{id:string}|null;discountedTotalSet:{shopMoney:Money}}> ;availableShippingRates?:Array<{handle:string;title:string;price:Money}>};
function minor(money:Money){
 if(money?.currencyCode!=='SGD'||typeof money.amount!=='string'||!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(money.amount))throw Error('Invalid native quote money');
 const [whole,fraction='']=money.amount.split('.'),value=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(value>2147483647n)throw Error('Quote amount exceeds supported range');return Number(value);
}
// Evidence only. Calculations do not prove storefront or subscription acceptance.
export function reviewNativeQuote(calculation:Calculation,expected:QuoteExpectation){
 if(!calculation||typeof calculation.taxesIncluded!=='boolean'||calculation.presentmentCurrencyCode!=='SGD'||!Array.isArray(calculation.lineItems)||!Array.isArray(expected.lines)||!expected.lines.length||!Number.isSafeInteger(expected.shippingFeeMinor)||expected.shippingFeeMinor<0)throw Error('Incomplete quote context');
 if(new Set(expected.lines.map(l=>l.variantGid)).size!==expected.lines.length||expected.lines.some(l=>!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(l.variantGid)||!Number.isSafeInteger(l.quantity)||l.quantity<1||!Number.isSafeInteger(l.unitPriceMinor)||l.unitPriceMinor<=0))throw Error('Invalid quote expectation');
 if(calculation.lineItems.length!==expected.lines.length||new Set(calculation.lineItems.map(l=>l.variant?.id)).size!==calculation.lineItems.length)throw Error('Native quote lines differ');
 let basePriceMatches=true,approvedFoodMinor=0;
 for(const line of expected.lines){const actual=calculation.lineItems.find(l=>l.variant?.id===line.variantGid);if(!actual||actual.quantity!==line.quantity||typeof actual.taxable!=='boolean')throw Error('Native quote identity differs');
 const price=line.unitPriceMinor*line.quantity;if(!Number.isSafeInteger(price)||price>2147483647)throw Error('Quote exceeds supported range');approvedFoodMinor+=price;
 if(minor(actual.discountedTotalSet.shopMoney)!==price)basePriceMatches=false;
 }
 if(!Number.isSafeInteger(approvedFoodMinor)||approvedFoodMinor>2147483647)throw Error('Quote exceeds supported range');
 const totalMinor=minor(calculation.totalPriceSet.shopMoney),taxMinor=minor(calculation.totalTaxSet.shopMoney),rates=calculation.availableShippingRates;
 if(taxMinor>totalMinor)throw Error('Native quote tax exceeds total');
 if(rates!==undefined&&(!Array.isArray(rates)||new Set(rates.map(r=>r.handle)).size!==rates.length||rates.some(r=>typeof r.handle!=='string'||!r.handle||typeof r.title!=='string')))throw Error('Native shipping options incomplete');
 const offeredFeeMinor=rates?.map(rate=>minor(rate.price));
 return {currency:'SGD',approvedFoodMinor,basePriceMatches,taxesIncluded:calculation.taxesIncluded,taxMinor,totalMinor,
  taxEvidence:!calculation.taxesIncluded?'EXCLUSIVE_TAX_MODE':taxMinor===0?'ZERO_TAX_NOT_GST_PROOF':'INCLUSIVE_TAX_OBSERVED',
  shippingEvidence:offeredFeeMinor===undefined?'NOT_READ':!offeredFeeMinor.includes(expected.shippingFeeMinor)?'EXPECTED_FEE_MISSING':offeredFeeMinor.some(fee=>fee!==expected.shippingFeeMinor)?'EXPECTED_FEE_WITH_OTHER_FEES':'EXPECTED_FEE_OFFERED',offeredFeeMinor:offeredFeeMinor??[],expectedShippingFeeMinor:expected.shippingFeeMinor,
  checkoutAcceptance:false,subscriptionAcceptance:false};
}
